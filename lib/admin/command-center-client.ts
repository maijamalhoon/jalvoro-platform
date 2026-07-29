import "server-only";

import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

import {
  CONTROL_PLANE_SUPABASE_PUBLISHABLE_KEY,
  CONTROL_PLANE_SUPABASE_URL,
  parseControlPlaneAccess,
} from "@/lib/control-plane/config";

type RpcError = {
  code: string;
  message: string;
  details?: string | null;
  hint?: string | null;
};

type GatewayEnvelope =
  | { ok: true; data: unknown }
  | { ok: false; error: RpcError };

const COMMAND_CENTER_OPERATIONS = new Set([
  "get_platform_admin_snapshot",
  "get_command_center_user_360",
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

const forbidden: RpcError = {
  code: "42501",
  message: "A verified isolated Command Center session is required.",
};

const unavailable: RpcError = {
  code: "CCG01",
  message: "Command Center security gateway is unavailable.",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseEnvelope(value: unknown): GatewayEnvelope | null {
  if (!isRecord(value) || typeof value.ok !== "boolean") return null;
  if (value.ok === true) return { ok: true, data: value.data };
  if (!isRecord(value.error)) return null;

  const code = typeof value.error.code === "string" ? value.error.code : "CCG01";
  const message =
    typeof value.error.message === "string"
      ? value.error.message
      : "Command Center operation failed.";

  return {
    ok: false,
    error: {
      code,
      message,
      details:
        typeof value.error.details === "string" ? value.error.details : null,
      hint: typeof value.error.hint === "string" ? value.error.hint : null,
    },
  };
}

export function isCommandCenterOperation(operation: string) {
  return COMMAND_CENTER_OPERATIONS.has(operation);
}

export async function invokeCommandCenterRpc(
  application: SupabaseClient,
  operation: string,
  args: unknown,
) {
  if (!isCommandCenterOperation(operation)) {
    return { data: null, error: unavailable };
  }

  const cookieStore = await cookies();
  const controlPlane = createServerClient(
    CONTROL_PLANE_SUPABASE_URL,
    CONTROL_PLANE_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {}
        },
      },
    },
  );

  const controlSession = await controlPlane.auth.getSession();
  const controlToken = controlSession.data.session?.access_token ?? "";
  if (controlSession.error || !controlToken) {
    return { data: null, error: forbidden };
  }

  const [controlUser, assurance, access] = await Promise.all([
    controlPlane.auth.getUser(controlToken),
    controlPlane.auth.mfa
      .getAuthenticatorAssuranceLevel()
      .catch(() => ({ data: null, error: new Error("assurance_unavailable") })),
    controlPlane.rpc("get_my_control_plane_access"),
  ]);

  if (
    controlUser.error ||
    !controlUser.data.user ||
    assurance.error ||
    assurance.data?.currentLevel !== "aal2" ||
    access.error ||
    !parseControlPlaneAccess(access.data)
  ) {
    return { data: null, error: forbidden };
  }

  const invocation = await application.functions.invoke(
    "command-center-gateway",
    {
      body: {
        operation,
        arguments: isRecord(args) ? args : {},
      },
      headers: {
        "x-control-plane-authorization": `Bearer ${controlToken}`,
      },
    },
  );

  if (invocation.error) return { data: null, error: unavailable };
  const envelope = parseEnvelope(invocation.data);
  if (!envelope) return { data: null, error: unavailable };
  return envelope.ok
    ? { data: envelope.data, error: null }
    : { data: null, error: envelope.error };
}
