import { NextRequest, NextResponse } from "next/server";

const USER_AGENT =
  "JALVORO/1.0 (account logo image proxy; https://github.com/maijamalhoon/jalvoro-platform)";
const CACHE_CONTROL =
  "public, max-age=86400, s-maxage=604800, stale-while-revalidate=2592000";
const MISS_CACHE_CONTROL =
  "public, max-age=60, s-maxage=300, stale-while-revalidate=3600";
const MAX_LOGO_BYTES = 2_000_000;
const RESOLVER_RETRY_WINDOW_MS = 5 * 60 * 1000;

const SAFE_IMAGE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "image/x-icon",
  "image/vnd.microsoft.icon",
]);

function inferImageContentType(bytes: Uint8Array) {
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return "image/png";
  }

  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  ) {
    return "image/jpeg";
  }

  if (
    bytes.length >= 6 &&
    bytes[0] === 0x47 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x38
  ) {
    return "image/gif";
  }

  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }

  if (
    bytes.length >= 4 &&
    bytes[0] === 0x00 &&
    bytes[1] === 0x00 &&
    bytes[2] === 0x01 &&
    bytes[3] === 0x00
  ) {
    return "image/x-icon";
  }

  return null;
}

function getSafeImageContentType(
  rawContentType: string | null,
  bytes: Uint8Array,
) {
  const contentType = rawContentType
    ?.split(";")[0]
    ?.trim()
    .toLowerCase();

  if (contentType && SAFE_IMAGE_TYPES.has(contentType)) {
    return contentType;
  }

  return inferImageContentType(bytes);
}

function logoNotFound() {
  return NextResponse.json(
    { error: "No verified account logo is currently available." },
    {
      status: 404,
      headers: {
        "Cache-Control": MISS_CACHE_CONTROL,
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
}

export async function GET(request: NextRequest) {
  const name = request.nextUrl.searchParams.get("name")?.trim().slice(0, 120);
  if (!name) return logoNotFound();

  const resolverUrl = new URL("/api/account-logo", request.nextUrl.origin);
  resolverUrl.searchParams.set("name", name);

  const type = request.nextUrl.searchParams.get("type")?.trim().slice(0, 40);
  const iconKey = request.nextUrl.searchParams
    .get("iconKey")
    ?.trim()
    .slice(0, 120);
  const version = request.nextUrl.searchParams.get("v")?.trim().slice(0, 40);

  if (type) resolverUrl.searchParams.set("type", type);
  if (iconKey) resolverUrl.searchParams.set("iconKey", iconKey);
  if (version) resolverUrl.searchParams.set("v", version);

  resolverUrl.searchParams.set(
    "retry",
    Math.floor(Date.now() / RESOLVER_RETRY_WINDOW_MS).toString(),
  );

  const upstreamHeaders: Record<string, string> = {
    Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
    "User-Agent": USER_AGENT,
  };
  const cookie = request.headers.get("cookie");
  const authorization = request.headers.get("authorization");
  if (cookie) upstreamHeaders.Cookie = cookie;
  if (authorization) upstreamHeaders.Authorization = authorization;

  try {
    const upstream = await fetch(resolverUrl, {
      headers: upstreamHeaders,
      redirect: "follow",
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    });

    if (!upstream.ok) return logoNotFound();

    const declaredLength = Number(upstream.headers.get("content-length") ?? 0);
    if (Number.isFinite(declaredLength) && declaredLength > MAX_LOGO_BYTES) {
      return logoNotFound();
    }

    const body = await upstream.arrayBuffer();
    if (body.byteLength === 0 || body.byteLength > MAX_LOGO_BYTES) {
      return logoNotFound();
    }

    const bytes = new Uint8Array(body);
    const contentType = getSafeImageContentType(
      upstream.headers.get("content-type"),
      bytes,
    );
    if (!contentType) return logoNotFound();

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Cache-Control": CACHE_CONTROL,
        "Content-Type": contentType,
        "Content-Length": body.byteLength.toString(),
        "Content-Disposition": "inline",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return logoNotFound();
  }
}
