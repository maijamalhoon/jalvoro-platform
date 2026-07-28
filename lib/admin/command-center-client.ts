import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import {
  CONTROL_PLANE_SUPABASE_PUBLISHABLE_KEY,
  CONTROL_PLANE_SUPABASE_URL,
  parseControlPlaneAccess,
} from "@/lib/control-plane/config";
import { createClient as createApplicationClient } from "@/lib/supabase/server";

type RpcError = {
  code: string;
  message: string;
  details?: string | null;
  hint?: string | null;
};

type GatewayEnvelope =
  | { ok: true; data: unknown }
  | { ok: false; error: RpcError };

const forbidden: RpcError = {
  code: "42501",
  message: "Command Center dual authorization is required.",
};

const unavailable: RpcError = {
  code: "CCG01",
  message: "Command Center security gateway is unavailable.",
};

function normalizeEmail(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

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

export async function createCommandCenterClient() {
  const cookieStore = await cookies();
  const application = await createApplicationClient();
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

  const [applicationUser, applicationSession, controlUser, controlSession] =
    await Promise.all([
      application.auth.getUser(),
      application.auth.getSession(),
      controlPlane.auth.getUser(),
      controlPlane.auth.getSession(),
    ]);

  let proofError: RpcError | null = null;
  const mainUser = applicationUser.data.user;
  const controlUserValue = controlUser.data.user;
  const mainToken = applicationSession.data.session?.access_token ?? "";
  const controlToken = controlSession.data.session?.access_token ?? "";

  if (
    applicationUser.error ||
    controlUser.error ||
    !mainUser ||
    !controlUserValue ||
    !mainToken ||
    !controlToken ||
    !normalizeEmail(mainUser.email) ||
    normalizeEmail(mainUser.email) !== normalizeEmail(controlUserValue.email)
  ) {
    proofError = forbidden;
  }

  if (!proofError) {
    const assurance = await controlPlane.auth.mfa
      .getAuthenticatorAssuranceLevel()
      .catch(() => ({ data: null, error: new Error("assurance_unavailable") }));
    const access = await controlPlane.rpc("get_my_control_plane_access");

    if (
      assurance.error ||
      assurance.data?.currentLevel !== "aal2" ||
      access.error ||
      !parseControlPlaneAccess(access.data)
    ) {
      proofError = forbidden;
    }
  }

  return {
    auth: application.auth,
    async rpc(operation: string, args: Record<string, unknown> = {}) {
      if (proofError || !mainToken || !controlToken) {
        return { data: null, error: proofError ?? forbidden };
      }

      const invocation = await application.functions.invoke(
        "command-center-gateway",
        {
          body: { operation, arguments: args },
          headers: {
            Authorization: `Bearer ${mainToken}`,
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
    },
  };
}
