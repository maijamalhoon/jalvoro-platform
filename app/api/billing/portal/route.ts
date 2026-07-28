import { NextResponse } from "next/server";

import { createPaddlePortalSession } from "@/lib/billing/paddle-api";
import { createClient } from "@/lib/supabase/server";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CUSTOMER_ID_PATTERN = /^ctm_[a-z0-9]{26}$/;
const SUBSCRIPTION_ID_PATTERN = /^sub_[a-z0-9]{26}$/;

function noStoreJson(body: object, status: number) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}

function parseManagementRefs(value: unknown): {
  provider: "paddle";
  customerId: string;
  subscriptionId: string | null;
} | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;
  if (
    record.provider !== "paddle" ||
    typeof record.providerCustomerId !== "string" ||
    !CUSTOMER_ID_PATTERN.test(record.providerCustomerId)
  ) {
    return null;
  }

  const subscriptionId = record.providerSubscriptionId;
  if (
    subscriptionId !== null &&
    subscriptionId !== undefined &&
    (typeof subscriptionId !== "string" ||
      !SUBSCRIPTION_ID_PATTERN.test(subscriptionId))
  ) {
    return null;
  }

  return {
    provider: "paddle",
    customerId: record.providerCustomerId,
    subscriptionId:
      typeof subscriptionId === "string" ? subscriptionId : null,
  };
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return noStoreJson({ error: "Invalid billing management request." }, 400);
  }

  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return noStoreJson({ error: "Invalid billing management request." }, 400);
  }

  const record = body as Record<string, unknown>;
  const scope = record.scope;
  const businessId = record.businessId;
  if (scope !== "personal" && scope !== "business") {
    return noStoreJson({ error: "Invalid billing scope." }, 400);
  }
  if (
    scope === "business" &&
    (typeof businessId !== "string" || !UUID_PATTERN.test(businessId))
  ) {
    return noStoreJson({ error: "Invalid business ID." }, 400);
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return noStoreJson({ error: "Authentication required." }, 401);
  }

  const result =
    scope === "personal"
      ? await supabase.rpc("get_my_billing_management_refs")
      : await supabase.rpc("get_business_billing_management_refs", {
          target_business_id: businessId as string,
        });

  if (result.error) {
    return noStoreJson(
      { error: "Billing management is unavailable for this account." },
      403,
    );
  }

  const refs = parseManagementRefs(result.data);
  if (!refs) {
    return noStoreJson(
      {
        error:
          "No active Paddle billing profile exists for this account yet.",
      },
      409,
    );
  }

  try {
    const portalUrl = await createPaddlePortalSession({
      customerId: refs.customerId,
      subscriptionId: refs.subscriptionId,
    });
    return noStoreJson({ portalUrl }, 200);
  } catch {
    return noStoreJson(
      { error: "Secure billing management could not be opened." },
      503,
    );
  }
}
