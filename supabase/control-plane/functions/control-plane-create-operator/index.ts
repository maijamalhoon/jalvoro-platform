import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.108.1";

const MAX_REQUEST_BYTES = 4_096;
const defaultAllowedOrigins = [
  "https://jalvoro-app.vercel.app",
  "https://jamals-finance-sable.vercel.app",
  "https://jalvoro-jamal-s-projects18.vercel.app",
  "https://jalvoro-git-main-jamal-s-projects18.vercel.app",
  "https://jalvoro-git-design-command-center-dec-a2911b-jamal-s-projects18.vercel.app",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
];
const existingUserErrorCodes = new Set([
  "email_exists",
  "user_already_exists",
  "user_already_registered",
]);
const existingUserErrorMessages = new Set([
  "user already registered",
  "a user with this email address has already been registered",
  "email address already registered",
  "user with this email already exists",
]);

type AuthAdminErrorLike = {
  code?: unknown;
  message?: unknown;
};

function allowedOrigins() {
  const configured = (Deno.env.get("CONTROL_PLANE_ALLOWED_ORIGINS") ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  return new Set([...defaultAllowedOrigins, ...configured]);
}

function resolveRequestOrigin(request: Request) {
  const origin = request.headers.get("Origin");
  if (!origin) return { origin: null, allowed: true };

  try {
    const normalized = new URL(origin).origin;
    return { origin: normalized, allowed: allowedOrigins().has(normalized) };
  } catch {
    return { origin: null, allowed: false };
  }
}

function responseHeaders(origin: string | null) {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "600",
    "Cache-Control": "private, no-store, max-age=0",
    "Content-Type": "application/json",
    "Referrer-Policy": "no-referrer",
    "Vary": "Origin",
    "X-Content-Type-Options": "nosniff",
  };
  if (origin) headers["Access-Control-Allow-Origin"] = origin;
  return headers;
}

function json(
  payload: Record<string, unknown>,
  status = 200,
  origin: string | null = null,
) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: responseHeaders(origin),
  });
}

function base64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/g, "");
}

function randomToken(byteLength: number) {
  return base64Url(crypto.getRandomValues(new Uint8Array(byteLength)));
}

async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");
}

function cleanEmail(value: unknown) {
  if (typeof value !== "string") return "";
  const email = value.trim().toLowerCase();
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ? email
    : "";
}

function cleanRole(value: unknown) {
  return value === "admin" || value === "analyst" || value === "support"
    ? value
    : null;
}

function cleanExpiry(value: unknown) {
  const hours = Number(value);
  return Number.isInteger(hours) && hours >= 1 && hours <= 168 ? hours : null;
}

function normalizeErrorText(value: unknown) {
  return typeof value === "string"
    ? value.trim().toLowerCase().replace(/\s+/g, " ")
    : "";
}

function isExistingUserError(error: AuthAdminErrorLike | null | undefined) {
  if (!error) return false;
  const code = normalizeErrorText(error.code);
  const message = normalizeErrorText(error.message);
  return (
    existingUserErrorCodes.has(code) ||
    existingUserErrorMessages.has(message)
  );
}

function parsePublishableKeys(value: string | undefined) {
  if (!value) return {} as Record<string, string>;
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {} as Record<string, string>;
    }

    return Object.fromEntries(
      Object.entries(parsed).flatMap(([key, candidate]) => {
        if (typeof candidate !== "string") return [];
        const normalized = candidate.trim();
        return normalized ? [[key, normalized]] : [];
      }),
    );
  } catch {
    return {} as Record<string, string>;
  }
}

async function readBody(request: Request, origin: string | null) {
  const contentType = request.headers.get("Content-Type")?.toLowerCase() ?? "";
  if (!contentType.startsWith("application/json")) {
    return { body: null, response: json({ error: "json_required" }, 415, origin) };
  }

  const declaredLength = Number(request.headers.get("Content-Length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_REQUEST_BYTES) {
    return { body: null, response: json({ error: "request_too_large" }, 413, origin) };
  }

  const raw = await request.text().catch(() => "");
  if (new TextEncoder().encode(raw).byteLength > MAX_REQUEST_BYTES) {
    return { body: null, response: json({ error: "request_too_large" }, 413, origin) };
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { body: null, response: json({ error: "invalid_json" }, 400, origin) };
    }
    return { body: parsed as Record<string, unknown>, response: null };
  } catch {
    return { body: null, response: json({ error: "invalid_json" }, 400, origin) };
  }
}

Deno.serve(async (request: Request) => {
  const requestOrigin = resolveRequestOrigin(request);
  if (!requestOrigin.allowed) {
    return json({ error: "origin_not_allowed" }, 403);
  }
  const origin = requestOrigin.origin;

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: responseHeaders(origin) });
  }
  if (request.method !== "POST") {
    return json({ error: "method_not_allowed" }, 405, origin);
  }

  const authorization = request.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return json({ error: "authentication_required" }, 401, origin);
  }

  const bodyResult = await readBody(request, origin);
  if (bodyResult.response) return bodyResult.response;
  const body = bodyResult.body;
  if (!body) return json({ error: "invalid_json" }, 400, origin);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const publishableKeys = parsePublishableKeys(
    Deno.env.get("SUPABASE_PUBLISHABLE_KEYS"),
  );
  const publishableKey =
    publishableKeys.default || Deno.env.get("SUPABASE_ANON_KEY")?.trim() || "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim() ?? "";

  if (!supabaseUrl || !publishableKey || !serviceRoleKey) {
    return json({ error: "control_plane_configuration_unavailable" }, 503, origin);
  }

  const userClient = createClient(supabaseUrl, publishableKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const token = authorization.slice("Bearer ".length);
  const userResult = await userClient.auth.getUser(token);
  if (userResult.error || !userResult.data.user) {
    return json({ error: "authentication_required" }, 401, origin);
  }

  const accessResult = await userClient.rpc("get_my_control_plane_access");
  const access = accessResult.data as
    | { role?: unknown; isRootOwner?: unknown; sessionAssurance?: unknown }
    | null;
  if (
    accessResult.error ||
    access?.role !== "owner" ||
    access?.isRootOwner !== true ||
    access?.sessionAssurance !== "aal2"
  ) {
    return json({ error: "root_owner_reauthentication_required" }, 403, origin);
  }

  const email = cleanEmail(body.email);
  const role = cleanRole(body.role);
  const expiresInHours = cleanExpiry(body.expiresInHours);
  if (!email || !role || expiresInHours === null) {
    return json({ error: "invalid_operator_invitation" }, 400, origin);
  }

  const invitationToken = randomToken(32);
  const tokenSha256 = await sha256Hex(invitationToken);
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let accountCreated = false;
  let createdUserId = "";
  let authTokenHash = "";
  const authLinkResult = await adminClient.auth.admin.generateLink({
    type: "invite",
    email,
    options: { data: { control_plane_invited: true } },
  });

  if (authLinkResult.error) {
    if (!isExistingUserError(authLinkResult.error)) {
      return json({ error: "operator_account_creation_failed" }, 400, origin);
    }
  } else {
    createdUserId = authLinkResult.data.user?.id ?? "";
    const properties = authLinkResult.data.properties as
      | { hashed_token?: unknown }
      | null;
    authTokenHash =
      typeof properties?.hashed_token === "string"
        ? properties.hashed_token.trim()
        : "";
    accountCreated = Boolean(createdUserId && authTokenHash);
    if (!accountCreated) {
      if (createdUserId) {
        await adminClient.auth.admin.deleteUser(createdUserId).catch(
          () => undefined,
        );
      }
      return json({ error: "operator_account_creation_failed" }, 500, origin);
    }
  }

  const invitationResult = await userClient.rpc(
    "create_control_plane_invitation",
    {
      p_email: email,
      p_role: role,
      p_token_sha256: tokenSha256,
      p_expires_in_hours: expiresInHours,
    },
  );

  if (invitationResult.error || !invitationResult.data) {
    if (accountCreated && createdUserId) {
      await adminClient.auth.admin.deleteUser(createdUserId).catch(
        () => undefined,
      );
    }
    return json({ error: "operator_invitation_creation_failed" }, 400, origin);
  }

  return json({
    invitation: invitationResult.data,
    invitationToken,
    accountCreated,
    authTokenHash: accountCreated ? authTokenHash : null,
  }, 200, origin);
});
