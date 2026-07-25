import {
  createClient,
  type SupabaseClient,
  type User,
} from "@supabase/supabase-js";
import type { NextRequest } from "next/server";

import { AI_CONSENT_VERSION } from "@/lib/ai-insights/consent";

type NativeAuthSuccess = {
  ok: true;
  supabase: SupabaseClient;
  user: User;
};

type NativeAuthFailure = {
  ok: false;
  status: 401 | 503;
  code: "authentication_required" | "native_auth_unavailable";
  message: string;
};

export type NativeAuthResult = NativeAuthSuccess | NativeAuthFailure;

export type NativeConsentResult =
  | { ok: true }
  | {
      ok: false;
      status: 403 | 503;
      code: "ai_consent_required" | "ai_consent_unavailable";
      message: string;
    };

function bearerToken(request: NextRequest) {
  const authorization = request.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(authorization);
  return match?.[1]?.trim() ?? "";
}

function createBearerClient(token: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!url || !publishableKey) {
    throw new Error("Native AI server configuration is unavailable.");
  }

  return createClient(url, publishableKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: { Authorization: `Bearer ${token}` },
    },
  });
}

export async function authenticateNativeAIRequest(
  request: NextRequest,
): Promise<NativeAuthResult> {
  const token = bearerToken(request);
  if (!token) {
    return {
      ok: false,
      status: 401,
      code: "authentication_required",
      message: "Please log in before using AI insights.",
    };
  }

  try {
    const supabase = createBearerClient(token);
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      return {
        ok: false,
        status: 401,
        code: "authentication_required",
        message: "Your secure session has expired. Please sign in again.",
      };
    }

    return { ok: true, supabase, user };
  } catch (error) {
    console.error("Native AI authentication unavailable", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
    return {
      ok: false,
      status: 503,
      code: "native_auth_unavailable",
      message: "Authentication is temporarily unavailable.",
    };
  }
}

export async function requireNativeAIConsent(
  supabase: SupabaseClient,
  userId: string,
): Promise<NativeConsentResult> {
  const { data, error } = await supabase
    .from("ai_consents")
    .select("version, accepted_at, revoked_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("Native AI consent check failed", { code: error.code });
    return {
      ok: false,
      status: 503,
      code: "ai_consent_unavailable",
      message: "AI consent could not be verified.",
    };
  }

  const accepted =
    data?.version === AI_CONSENT_VERSION &&
    typeof data.accepted_at === "string" &&
    data.revoked_at === null;

  return accepted
    ? { ok: true }
    : {
        ok: false,
        status: 403,
        code: "ai_consent_required",
        message: "AI consent is required before using AI insights.",
      };
}

export async function consumeNativeAIRateLimit(
  supabase: SupabaseClient,
  scope: string,
  limit: number,
  windowSeconds: number,
) {
  const { data, error } = await supabase.rpc("consume_api_rate_limit", {
    p_scope: scope,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });

  if (error) {
    console.error("Native AI rate-limit check failed", { code: error.code });
    return {
      ok: false as const,
      status: 503 as const,
      code: "rate_limit_unavailable",
      message: "Security control is temporarily unavailable.",
      retryAfter: null,
    };
  }

  if (data !== true) {
    return {
      ok: false as const,
      status: 429 as const,
      code: "rate_limit_exceeded",
      message: "Too many AI requests. Please try again shortly.",
      retryAfter: windowSeconds,
    };
  }

  return { ok: true as const };
}
