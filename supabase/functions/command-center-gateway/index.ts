import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.108.1";

const CONTROL_PLANE_URL = "https://zzvpovvuybfihwgjrder.supabase.co";
const CONTROL_PLANE_PUBLISHABLE_KEY =
  "sb_publishable_U-iYfkTi8yfRN4gKPdRDhQ_Rlnlxkql";
const MAX_REQUEST_BYTES = 16_384;
const allowedOperations = new Set([
  "get_platform_admin_snapshot",
  "get_command_center_navigation",
  "get_command_center_organization_operations_snapshot",
  "create_command_center_organization_by_email",
  "transition_command_center_organization",
  "create_command_center_organization_membership_by_email",
  "transition_command_center_organization_membership",
  "grant_command_center_organization_permission_by_email",
  "revoke_command_center_permission",
  "apply_billing_plan_operation",
  "apply_privacy_request_workflow",
  "approve_admin_release",
  "revoke_admin_release",
  "create_platform_security_incident",
  "apply_platform_security_incident_workflow",
  "apply_admin_compliance_review",
  "create_platform_admin_invitation",
  "apply_platform_admin_member_action",
  "revoke_platform_admin_invitation",
  "accept_platform_admin_invitation",
]);

function allowedOrigins() {
  const configured = (Deno.env.get("COMMAND_CENTER_ALLOWED_ORIGINS") ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  return new Set([
    "https://jamals-finance-sable.vercel.app",
    "https://jalvoro-app.vercel.app",
    ...configured,
  ]);
}

function resolveOrigin(request: Request) {
  const origin = request.headers.get("Origin");
  if (!origin) return { origin: null, allowed: true };
  try {
    const normalized = new URL(origin).origin;
    return { origin: normalized, allowed: allowedOrigins().has(normalized) };
  } catch {
    return { origin: null, allowed: false };
  }
}

function headers(origin: string | null) {
  const value: Record<string, string> = {
    "Access-Control-Allow-Headers":
      "authorization, x-control-plane-authorization, apikey, content-type, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "600",
    "Cache-Control": "private, no-store, max-age=0",
    "Content-Type": "application/json",
    "Referrer-Policy": "no-referrer",
    "Vary": "Origin",
    "X-Content-Type-Options": "nosniff",
  };
  if (origin) value["Access-Control-Allow-Origin"] = origin;
  return value;
}

function json(payload: Record<string, unknown>, origin: string | null, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: headers(origin),
  });
}

function bearer(value: string | null) {
  return value?.startsWith("Bearer ") ? value.slice(7).trim() : "";
}

function normalizeEmail(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function readBody(request: Request) {
  const contentType = request.headers.get("Content-Type")?.toLowerCase() ?? "";
  if (!contentType.startsWith("application/json")) return null;
  const declared = Number(request.headers.get("Content-Length"));
  if (Number.isFinite(declared) && declared > MAX_REQUEST_BYTES) return null;
  const raw = await request.text().catch(() => "");
  if (new TextEncoder().encode(raw).byteLength > MAX_REQUEST_BYTES) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

Deno.serve(async (request) => {
  const requestOrigin = resolveOrigin(request);
  if (!requestOrigin.allowed) {
    return json(
      { ok: false, error: { code: "42501", message: "Origin not allowed." } },
      null,
      403,
    );
  }
  const origin = requestOrigin.origin;

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: headers(origin) });
  }
  if (request.method !== "POST") {
    return json(
      { ok: false, error: { code: "405", message: "Method not allowed." } },
      origin,
      405,
    );
  }

  const controlToken = bearer(
    request.headers.get("x-control-plane-authorization"),
  );
  if (!controlToken) {
    return json(
      {
        ok: false,
        error: {
          code: "42501",
          message: "Isolated Command Center authorization is required.",
        },
      },
      origin,
      401,
    );
  }

  const body = await readBody(request);
  const operation = typeof body?.operation === "string" ? body.operation : "";
  const args = isRecord(body?.arguments) ? body.arguments : {};
  if (!body || !allowedOperations.has(operation)) {
    return json(
      {
        ok: false,
        error: { code: "22023", message: "Unsupported Command Center operation." },
      },
      origin,
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!supabaseUrl || !serviceRoleKey) {
    return json(
      {
        ok: false,
        error: { code: "CCG02", message: "Gateway configuration unavailable." },
      },
      origin,
      503,
    );
  }

  const controlClient = createClient(
    CONTROL_PLANE_URL,
    CONTROL_PLANE_PUBLISHABLE_KEY,
    {
      global: { headers: { Authorization: `Bearer ${controlToken}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );

  const [controlUserResult, controlAccessResult] = await Promise.all([
    controlClient.auth.getUser(controlToken),
    controlClient.rpc("get_my_control_plane_access"),
  ]);

  const controlUser = controlUserResult.data.user;
  const controlAccess = controlAccessResult.data as
    | { sessionAssurance?: unknown }
    | null;
  const controlEmail = normalizeEmail(controlUser?.email);

  if (
    controlUserResult.error ||
    controlAccessResult.error ||
    !controlUser ||
    !controlEmail ||
    controlAccess?.sessionAssurance !== "aal2"
  ) {
    return json(
      {
        ok: false,
        error: {
          code: "42501",
          message: "Command Center identity proof rejected.",
        },
      },
      origin,
      403,
    );
  }

  const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const actorResult = await serviceClient.rpc(
    "resolve_command_center_actor_by_email",
    { p_email: controlEmail },
  );
  const actor = isRecord(actorResult.data) ? actorResult.data : null;
  const actorUserId = typeof actor?.userId === "string" ? actor.userId : "";

  if (actorResult.error || !actorUserId) {
    return json(
      {
        ok: false,
        error: {
          code: "42501",
          message: "This isolated identity is not an active platform administrator.",
        },
      },
      origin,
      403,
    );
  }

  const result = await serviceClient.rpc("execute_command_center_operation", {
    p_actor_user_id: actorUserId,
    p_operation: operation,
    p_arguments: args,
  });

  if (result.error) {
    return json(
      {
        ok: false,
        error: {
          code: result.error.code ?? "CCG03",
          message: result.error.message ?? "Command Center operation failed.",
          details: result.error.details ?? null,
          hint: result.error.hint ?? null,
        },
      },
      origin,
    );
  }

  return json({ ok: true, data: result.data }, origin);
});
