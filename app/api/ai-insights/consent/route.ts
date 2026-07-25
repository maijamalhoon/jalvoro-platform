import { NextRequest, NextResponse } from "next/server";

import {
  AI_CONSENT_VERSION,
  type AIConsentState,
} from "@/lib/ai-insights/consent";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function json(payload: Record<string, unknown>, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function cleanMigrationSource(value: unknown) {
  return typeof value === "string"
    ? value.replace(/\s+/g, " ").trim().slice(0, 80) || null
    : null;
}

async function authenticatedClient() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  return { supabase, user: error ? null : user };
}

function mapConsent(row: {
  version?: unknown;
  accepted_at?: unknown;
  revoked_at?: unknown;
} | null): AIConsentState {
  const version = typeof row?.version === "string" ? row.version : "";
  const acceptedAt =
    typeof row?.accepted_at === "string" ? row.accepted_at : null;
  const revokedAt = typeof row?.revoked_at === "string" ? row.revoked_at : null;

  return {
    accepted:
      version === AI_CONSENT_VERSION && Boolean(acceptedAt) && revokedAt === null,
    version: AI_CONSENT_VERSION,
    acceptedAt,
    revokedAt,
  };
}

export async function GET() {
  const { supabase, user } = await authenticatedClient();
  if (!user) {
    return json(
      {
        error: "authentication_required",
        message: "Please log in before reviewing AI consent.",
      },
      401,
    );
  }

  const { data, error } = await supabase
    .from("ai_consents")
    .select("version, accepted_at, revoked_at")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("AI consent read failed", {
      code: error.code,
      message: error.message,
    });
    return json(
      {
        error: "consent_unavailable",
        message: "AI consent could not be checked. Please try again.",
      },
      503,
    );
  }

  return json({ consent: mapConsent(data) });
}

export async function PUT(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as unknown;
  const migratedFrom =
    body && typeof body === "object"
      ? cleanMigrationSource((body as { migratedFrom?: unknown }).migratedFrom)
      : null;
  const { supabase, user } = await authenticatedClient();

  if (!user) {
    return json(
      {
        error: "authentication_required",
        message: "Please log in before enabling AI Insights.",
      },
      401,
    );
  }

  const acceptedAt = new Date().toISOString();
  const { data, error } = await supabase
    .from("ai_consents")
    .upsert(
      {
        user_id: user.id,
        version: AI_CONSENT_VERSION,
        accepted_at: acceptedAt,
        revoked_at: null,
        migrated_from: migratedFrom,
        updated_at: acceptedAt,
      },
      { onConflict: "user_id" },
    )
    .select("version, accepted_at, revoked_at")
    .single();

  if (error) {
    console.error("AI consent save failed", {
      code: error.code,
      message: error.message,
    });
    return json(
      {
        error: "consent_unavailable",
        message: "AI consent could not be saved. Please try again.",
      },
      503,
    );
  }

  return json({ saved: true, consent: mapConsent(data) });
}

export async function DELETE() {
  const { supabase, user } = await authenticatedClient();
  if (!user) {
    return json(
      {
        error: "authentication_required",
        message: "Please log in before disabling AI Insights.",
      },
      401,
    );
  }

  const revokedAt = new Date().toISOString();
  const { data, error } = await supabase
    .from("ai_consents")
    .update({ revoked_at: revokedAt, updated_at: revokedAt })
    .eq("user_id", user.id)
    .select("version, accepted_at, revoked_at")
    .maybeSingle();

  if (error) {
    console.error("AI consent revoke failed", {
      code: error.code,
      message: error.message,
    });
    return json(
      {
        error: "consent_unavailable",
        message: "AI Insights could not be disabled. Please try again.",
      },
      503,
    );
  }

  return json({ revoked: true, consent: mapConsent(data) });
}
