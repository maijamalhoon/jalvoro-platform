import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";

import { verifyImageUploadMetadata } from "@/lib/security/file-verification";
import { createClient } from "@/lib/supabase/server";

const AVATAR_BUCKET = "avatars";
const MAX_AVATAR_BYTES = 3 * 1024 * 1024;
const ALLOWED_CONTENT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

function readPathFromAvatarUrl(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return null;

  try {
    const parsed = new URL(value, "https://jamals-finance.local");
    if (parsed.pathname === "/api/profile/avatar") {
      return parsed.searchParams.get("path");
    }
  } catch {
    return null;
  }

  for (const marker of [
    "/storage/v1/object/public/avatars/",
    "/storage/v1/object/authenticated/avatars/",
  ]) {
    const markerIndex = value.indexOf(marker);
    if (markerIndex >= 0) {
      return value.slice(markerIndex + marker.length).split(/[?#]/, 1)[0] ?? null;
    }
  }

  return null;
}

function validateOwnedAvatarPath(value: unknown, userId: string) {
  if (typeof value !== "string") return null;

  let decoded: string;
  try {
    decoded = decodeURIComponent(value).replace(/^\/+/, "");
  } catch {
    return null;
  }

  if (decoded.length > 180 || decoded.includes("\\") || decoded.includes("..")) {
    return null;
  }

  const match = decoded.match(
    /^([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\/profile\.(jpe?g|png|webp)$/i,
  );
  if (!match || match[1].toLowerCase() !== userId.toLowerCase()) return null;

  return decoded;
}

function contentTypeForPath(path: string, blobType: string) {
  if (ALLOWED_CONTENT_TYPES.has(blobType)) return blobType;
  if (/\.png$/i.test(path)) return "image/png";
  if (/\.webp$/i.test(path)) return "image/webp";
  return "image/jpeg";
}

function uploadError(
  status: 400 | 401 | 413 | 415 | 422 | 500,
  code: string,
  message: string,
) {
  return NextResponse.json(
    { error: code, message },
    {
      status,
      headers: {
        "Cache-Control": "private, no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
}

export async function POST(request: NextRequest) {
  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_AVATAR_BYTES + 128 * 1024) {
    return uploadError(413, "avatar_too_large", "The avatar exceeds the 3 MB limit.");
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return uploadError(401, "authentication_required", "Authentication required.");
  }

  const form = await request.formData().catch(() => null);
  const upload = form?.get("file");
  if (!(upload instanceof File)) {
    return uploadError(400, "avatar_required", "Choose an avatar image.");
  }
  if (upload.size <= 0 || upload.size > MAX_AVATAR_BYTES) {
    return uploadError(413, "avatar_too_large", "The avatar exceeds the 3 MB limit.");
  }

  const source = new Uint8Array(await upload.arrayBuffer());
  const verified = verifyImageUploadMetadata({
    bytes: source,
    clientContentType: upload.type,
    filename: upload.name,
  });
  if (!verified) {
    return uploadError(
      415,
      "avatar_type_mismatch",
      "Use a valid JPEG, PNG, or WebP image whose content matches its extension.",
    );
  }

  let sanitized: Buffer;
  try {
    const decoder = sharp(source, {
      failOn: "error",
      limitInputPixels: 25_000_000,
      sequentialRead: true,
    }).rotate();
    const metadata = await decoder.metadata();
    if (
      metadata.format !== verified.format ||
      !metadata.width ||
      !metadata.height ||
      (metadata.pages ?? 1) !== 1
    ) {
      return uploadError(422, "avatar_decode_failed", "The avatar image is corrupt or unsupported.");
    }
    const normalized = decoder.resize({
      width: 2048,
      height: 2048,
      fit: "inside",
      withoutEnlargement: true,
    });
    sanitized =
      verified.format === "jpeg"
        ? await normalized.jpeg({ quality: 88, mozjpeg: true }).toBuffer()
        : verified.format === "png"
          ? await normalized.png({ compressionLevel: 9 }).toBuffer()
          : await normalized.webp({ quality: 88 }).toBuffer();
  } catch {
    return uploadError(422, "avatar_decode_failed", "The avatar image is corrupt or unsupported.");
  }

  if (sanitized.length <= 0 || sanitized.length > MAX_AVATAR_BYTES) {
    return uploadError(413, "avatar_too_large", "The processed avatar exceeds the 3 MB limit.");
  }

  const path = `${user.id}/profile.${verified.extension}`;
  const { data, error } = await supabase.storage.from(AVATAR_BUCKET).upload(
    path,
    sanitized,
    {
      contentType: verified.contentType,
      cacheControl: "0",
      upsert: true,
    },
  );
  if (error || !data) {
    return uploadError(500, "avatar_store_failed", "The avatar could not be stored.");
  }

  return NextResponse.json(
    { path: data.path, url: `/api/profile/avatar?path=${encodeURIComponent(data.path)}` },
    {
      status: 201,
      headers: {
        "Cache-Control": "private, no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
}

function privateError(status: 401 | 404) {
  return NextResponse.json(
    {
      error: status === 401 ? "Authentication required" : "Avatar not found",
      code: status === 401 ? "authentication_required" : "avatar_not_found",
    },
    {
      status,
      headers: {
        "Cache-Control": "private, no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) return privateError(401);

  const metadata = user.user_metadata ?? {};
  const requestedPath =
    request.nextUrl.searchParams.get("path") ??
    (typeof metadata.avatar_path === "string" ? metadata.avatar_path : null) ??
    readPathFromAvatarUrl(metadata.avatar_url);
  const path = validateOwnedAvatarPath(requestedPath, user.id);
  if (!path) return privateError(404);

  const { data: avatar, error } = await supabase.storage
    .from(AVATAR_BUCKET)
    .download(path);
  if (error || !avatar || avatar.size <= 0 || avatar.size > MAX_AVATAR_BYTES) {
    return privateError(404);
  }

  const body = await avatar.arrayBuffer();
  const filename = path.slice(path.lastIndexOf("/") + 1);

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Cache-Control": "private, no-store, max-age=0, must-revalidate",
      "CDN-Cache-Control": "no-store",
      "Vercel-CDN-Cache-Control": "no-store",
      "Content-Type": contentTypeForPath(path, avatar.type),
      "Content-Length": String(body.byteLength),
      "Content-Disposition": `inline; filename="${filename}"`,
      "X-Content-Type-Options": "nosniff",
      "Cross-Origin-Resource-Policy": "same-origin",
      Vary: "Cookie, Authorization",
    },
  });
}
