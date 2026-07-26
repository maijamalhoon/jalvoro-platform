import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.108.1";

const COMMAND_CENTER_URL = "https://zzvpovvuybfihwgjrder.supabase.co";
const COMMAND_CENTER_PUBLISHABLE_KEY =
  "sb_publishable_U-iYfkTi8yfRN4gKPdRDhQ_Rlnlxkql";
const MAX_REQUEST_BYTES = 256;
const exactOrigins = new Set([
  "https://jalvoro-app.vercel.app",
  "https://jamals-finance-sable.vercel.app",
  "https://jalvoro-jamal-s-projects18.vercel.app",
  "https://jalvoro-git-main-jamal-s-projects18.vercel.app",
  "https://jalvoro-git-release-stabilization-20260726-jamal-s-projects18.vercel.app",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
]);
const projectPreviewOrigin =
  /^https:\/\/jalvoro(?:-[a-z0-9-]+)?-jamal-s-projects18\.vercel\.app$/;

type CommandCenterAccess = {
  role?: unknown;
  isOwner?: unknown;
  sessionAssurance?: unknown;
};

function resolveOrigin(request: Request) {
  const raw = request.headers.get("Origin");
  if (!raw) return { origin: null, allowed: false };

  try {
    const origin = new URL(raw).origin;
    return {
      origin,
      allowed: exactOrigins.has(origin) || projectPreviewOrigin.test(origin),
    };
  } catch {
    return { origin: null, allowed: false };
  }
}

function headers(origin: string | null) {
  const result: Record<string, string> = {
    "Access-Control-Allow-Headers": "authorization, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "600",
    "Cache-Control": "private, no-store, max-age=0",
    "Content-Type": "application/json",
    "Referrer-Policy": "no-referrer",
    Vary: "Origin",
    "X-Content-Type-Options": "nosniff",
  };
  if (origin) result["Access-Control-Allow-Origin"] = origin;
  return result;
}

function json(
  payload: Record<string, unknown>,
  status: number,
  origin: string | null,
) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: headers(origin),
  });
}

Deno.serve(async (request: Request) => {
  const requestOrigin = resolveOrigin(request);
  if (!requestOrigin.allowed) {
    return json({ error: "origin_not_allowed" }, 403, null);
  }
  const origin = requestOrigin.origin;

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: headers(origin) });
  }
  if (request.method !== "POST") {
    return json({ error: "method_not_allowed" }, 405, origin);
  }

  const declaredLength = Number(request.headers.get("Content-Length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_REQUEST_BYTES) {
    return json({ error: "request_too_large" }, 413, origin);
  }

  const authorization = request.headers.get("Authorization") ?? "";
  if (!authorization.startsWith("Bearer ")) {
    return json({ error: "authentication_required" }, 401, origin);
  }
  const token = authorization.slice("Bearer ".length).trim();
  if (!token) return json({ error: "authentication_required" }, 401, origin);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")?.trim() ?? "";
  const serviceRoleKey =
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim() ?? "";
  if (!supabaseUrl || !serviceRoleKey) {
    return json({ error: "bridge_configuration_unavailable" }, 503, origin);
  }

  const commandCenter = createClient(
    COMMAND_CENTER_URL,
    COMMAND_CENTER_PUBLISHABLE_KEY,
    {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );

  const userResult = await commandCenter.auth.getUser(token);
  const commandUser = userResult.data.user;
  const email = commandUser?.email?.trim().toLowerCase() ?? "";
  if (userResult.error || !commandUser || !email) {
    return json({ error: "authentication_required" }, 401, origin);
  }

  const accessResult = await commandCenter.rpc("get_my_command_center_access");
  const access = accessResult.data as CommandCenterAccess | null;
  if (
    accessResult.error ||
    access?.role !== "owner" ||
    access?.isOwner !== true ||
    access?.sessionAssurance !== "password"
  ) {
    return json({ error: "command_center_access_required" }, 403, origin);
  }

  const production = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const targetResult = await production.rpc(
    "resolve_command_center_bridge_target",
    { p_email: email },
  );
  const target = targetResult.data as {
    email?: unknown;
    role?: unknown;
  } | null;
  if (
    targetResult.error ||
    typeof target?.email !== "string" ||
    target.email.toLowerCase() !== email ||
    target.role !== "owner"
  ) {
    return json({ error: "command_center_owner_not_registered" }, 403, origin);
  }

  const linkResult = await production.auth.admin.generateLink({
    type: "magiclink",
    email,
  });
  const properties = linkResult.data.properties as {
    hashed_token?: unknown;
  } | null;
  const tokenHash =
    typeof properties?.hashed_token === "string"
      ? properties.hashed_token.trim()
      : "";
  const linkedEmail = linkResult.data.user?.email?.trim().toLowerCase() ?? "";

  if (linkResult.error || !tokenHash || linkedEmail !== email) {
    return json({ error: "website_session_creation_failed" }, 503, origin);
  }

  return json({ tokenHash }, 200, origin);
});
