import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const NO_STORE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  Expires: "0",
  Pragma: "no-cache",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
};

type InviteRequest =
  | {
      action?: "create";
      businessId: string;
      email: string;
      role: string;
      permissions?: string[];
      expiresDays?: number;
    }
  | {
      action: "resend";
      businessId: string;
      invitationId: string;
      expiresDays?: number;
    };

type InvitationResult = {
  id: string;
  email: string;
  token: string;
  expires_at: string;
  role: string;
};

function response(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, { status, headers: NO_STORE_HEADERS });
}

function validUuid(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
  );
}

function cleanOrigin(request: Request) {
  const requestUrl = new URL(request.url);
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (!configured) return requestUrl.origin;

  try {
    return new URL(configured).origin;
  } catch {
    return requestUrl.origin;
  }
}

function safeDatabaseMessage(code: string | undefined) {
  if (code === "23505") return "A pending invitation already exists for this email.";
  if (code === "42501") return "You do not have permission to manage this team.";
  if (code === "55000") return "Please wait before resending this invitation.";
  if (code === "54000") return "This invitation reached its resend limit. Cancel it and create a new one.";
  if (code === "P0002") return "The invitation is no longer available.";
  return "The invitation could not be prepared. No team membership was changed.";
}

export async function POST(request: Request) {
  const requestOrigin = request.headers.get("origin");
  const actualOrigin = new URL(request.url).origin;
  if (requestOrigin && requestOrigin !== actualOrigin) {
    return response({ ok: false, message: "Cross-site invitation requests are blocked." }, 403);
  }

  let body: InviteRequest;
  try {
    body = (await request.json()) as InviteRequest;
  } catch {
    return response({ ok: false, message: "Invitation request is invalid." }, 400);
  }

  if (!validUuid(body.businessId)) {
    return response({ ok: false, message: "Business workspace is invalid." }, 400);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return response({ ok: false, message: "Sign in again before managing invitations." }, 401);
  }

  const expiresDays = Number.isInteger(body.expiresDays)
    ? Math.min(30, Math.max(1, Number(body.expiresDays)))
    : 7;

  let invitation: InvitationResult | null = null;
  let inviteError: { code?: string } | null = null;

  if (body.action === "resend") {
    if (!validUuid(body.invitationId)) {
      return response({ ok: false, message: "Invitation is invalid." }, 400);
    }

    const result = await supabase.rpc("resend_business_invitation", {
      p_business_id: body.businessId,
      p_invitation_id: body.invitationId,
      p_expires_days: expiresDays,
    });
    invitation = result.data as InvitationResult | null;
    inviteError = result.error;
  } else {
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const role = typeof body.role === "string" ? body.role.trim().toLowerCase() : "";
    const permissions = Array.isArray(body.permissions)
      ? body.permissions.filter((value): value is string => typeof value === "string")
      : null;

    if (!email || email.length > 320 || !email.includes("@")) {
      return response({ ok: false, message: "Enter a valid team member email." }, 400);
    }

    const result = await supabase.rpc("create_business_invitation", {
      p_business_id: body.businessId,
      p_email: email,
      p_role: role,
      p_permissions: permissions,
      p_expires_days: expiresDays,
    });
    invitation = result.data as InvitationResult | null;
    inviteError = result.error;
  }

  if (inviteError || !invitation?.id || !invitation.email || !invitation.token) {
    console.error("Business invitation preparation failed", { code: inviteError?.code });
    return response(
      { ok: false, message: safeDatabaseMessage(inviteError?.code) },
      inviteError?.code === "42501" ? 403 : 400,
    );
  }

  const origin = cleanOrigin(request);
  const acceptPath = `/business/invitations/accept?token=${encodeURIComponent(invitation.token)}`;
  const acceptUrl = new URL(acceptPath, origin).toString();
  const callbackUrl = new URL("/auth/callback", origin);
  callbackUrl.searchParams.set("next", acceptPath);

  const deliveryClient = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    },
  );

  const { error: deliveryError } = await deliveryClient.auth.signInWithOtp({
    email: invitation.email,
    options: {
      emailRedirectTo: callbackUrl.toString(),
      shouldCreateUser: true,
    },
  });

  const deliveryStatus = deliveryError ? "failed" : "sent";
  const deliveryUpdate = await supabase.rpc("set_business_invitation_delivery", {
    p_business_id: body.businessId,
    p_invitation_id: invitation.id,
    p_delivery_status: deliveryStatus,
    p_error: deliveryError ? "Supabase email delivery was unavailable." : null,
  });

  if (deliveryUpdate.error) {
    console.error("Invitation delivery status update failed", { code: deliveryUpdate.error.code });
  }

  if (deliveryError) {
    console.error("Business invitation email failed", { code: deliveryError.code });
    return response(
      {
        ok: false,
        invitationCreated: true,
        invitationId: invitation.id,
        manualUrl: acceptUrl,
        expiresAt: invitation.expires_at,
        message: "Invitation was saved, but email delivery is temporarily unavailable. Copy the secure link instead.",
      },
      502,
    );
  }

  return response({
    ok: true,
    invitationId: invitation.id,
    expiresAt: invitation.expires_at,
    message: body.action === "resend" ? "Invitation email sent again." : "Invitation email sent.",
  });
}
