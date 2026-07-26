import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.108.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

function json(payload: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
      "Cache-Control": "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function validUuid(value: unknown): value is string {
  return typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

type RecoveryAction = "inspect_mfa" | "reset_mfa";

type RecoveryContext = {
  business_id: string;
  target_user_id: string;
  target_name: string;
  target_email: string | null;
  target_status: "active" | "suspended";
};

type AdminFactor = {
  id?: unknown;
  status?: unknown;
  factor_type?: unknown;
  friendly_name?: unknown;
  created_at?: unknown;
  updated_at?: unknown;
};

function cleanAction(value: unknown): RecoveryAction | null {
  return value === "inspect_mfa" || value === "reset_mfa" ? value : null;
}

function cleanFactor(factor: AdminFactor) {
  return {
    type: typeof factor.factor_type === "string" ? factor.factor_type : "unknown",
    status: typeof factor.status === "string" ? factor.status : "unknown",
    friendlyName: typeof factor.friendly_name === "string" ? factor.friendly_name : null,
    createdAt: typeof factor.created_at === "string" ? factor.created_at : null,
    updatedAt: typeof factor.updated_at === "string" ? factor.updated_at : null,
  };
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const authorization = request.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return json({ error: "authentication_required" }, 401);
  }

  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const businessId = body?.businessId;
  const targetUserId = body?.targetUserId;
  const action = cleanAction(body?.action);
  if (!validUuid(businessId) || !validUuid(targetUserId) || !action) {
    return json({ error: "invalid_identity_recovery_request" }, 400);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const publishableKeys = JSON.parse(
    Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") ?? "{}",
  ) as Record<string, string>;
  const publishableKey = publishableKeys.default || Deno.env.get("SUPABASE_ANON_KEY") || "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!supabaseUrl || !publishableKey || !serviceRoleKey) {
    return json({ error: "identity_recovery_configuration_unavailable" }, 503);
  }

  const userClient = createClient(supabaseUrl, publishableKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const token = authorization.slice("Bearer ".length);
  const userResult = await userClient.auth.getUser(token);
  if (userResult.error || !userResult.data.user) {
    return json({ error: "authentication_required" }, 401);
  }

  const contextResult = await userClient.rpc("get_business_identity_recovery_context", {
    p_business_id: businessId,
    p_target_user_id: targetUserId,
    p_action: action,
  });
  if (contextResult.error || !contextResult.data) {
    const code = contextResult.error?.code;
    return json(
      { error: code === "MFA02" ? "owner_aal2_required" : "identity_recovery_not_allowed" },
      403,
    );
  }
  const context = contextResult.data as RecoveryContext;

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const factorsResult = await adminClient.auth.admin.mfa.listFactors({
    userId: targetUserId,
  });
  if (factorsResult.error) {
    await userClient.rpc("record_business_identity_recovery_result", {
      p_business_id: businessId,
      p_target_user_id: targetUserId,
      p_action: action,
      p_outcome: "failed",
      p_factor_count: 0,
      p_verified_factor_count: 0,
      p_deleted_factor_count: 0,
      p_error_code: "factor_directory_unavailable",
    });
    return json({ error: "factor_directory_unavailable" }, 503);
  }

  const factors = (factorsResult.data?.factors ?? []) as AdminFactor[];
  const validFactors = factors.filter((factor) => validUuid(factor.id));
  const verifiedCount = validFactors.filter((factor) => factor.status === "verified").length;

  if (action === "inspect_mfa") {
    await userClient.rpc("record_business_identity_recovery_result", {
      p_business_id: businessId,
      p_target_user_id: targetUserId,
      p_action: action,
      p_outcome: "success",
      p_factor_count: validFactors.length,
      p_verified_factor_count: verifiedCount,
      p_deleted_factor_count: 0,
      p_error_code: null,
    });
    return json({
      ok: true,
      target: context,
      factors: validFactors.map(cleanFactor),
    });
  }

  let deletedCount = 0;
  for (const factor of validFactors) {
    const factorId = factor.id as string;
    const deleteResult = await adminClient.auth.admin.mfa.deleteFactor({
      userId: targetUserId,
      id: factorId,
    });
    if (deleteResult.error) {
      await userClient.rpc("record_business_identity_recovery_result", {
        p_business_id: businessId,
        p_target_user_id: targetUserId,
        p_action: action,
        p_outcome: "failed",
        p_factor_count: validFactors.length,
        p_verified_factor_count: verifiedCount,
        p_deleted_factor_count: deletedCount,
        p_error_code: "factor_delete_failed",
      });
      return json({ error: "factor_delete_failed", deletedCount }, 502);
    }
    deletedCount += 1;
  }

  const auditResult = await userClient.rpc("record_business_identity_recovery_result", {
    p_business_id: businessId,
    p_target_user_id: targetUserId,
    p_action: action,
    p_outcome: "success",
    p_factor_count: validFactors.length,
    p_verified_factor_count: verifiedCount,
    p_deleted_factor_count: deletedCount,
    p_error_code: null,
  });
  if (auditResult.error) {
    return json({ error: "identity_recovery_audit_failed" }, 503);
  }

  return json({
    ok: true,
    target: context,
    deletedCount,
    sessionsRevokedBySupabase: verifiedCount > 0,
  });
});
