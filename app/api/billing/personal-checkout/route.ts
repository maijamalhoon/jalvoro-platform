import { NextResponse } from "next/server";

import {
  isBillingCycle,
  isPaidPlanKey,
  personalPlanCode,
} from "@/lib/billing/checkout";
import { isPaddleCheckoutConfigured } from "@/lib/billing/launch-readiness";
import {
  createPersonalCheckoutTransaction,
  getPersonalPaddlePriceId,
} from "@/lib/billing/paddle-api";
import { getCurrentBillingAccess } from "@/lib/billing/server-access";
import { createClient } from "@/lib/supabase/server";

function noStoreJson(body: object, status: number) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return noStoreJson({ error: "Invalid checkout request." }, 400);
  }

  if (typeof body !== "object" || body === null) {
    return noStoreJson({ error: "Invalid checkout request." }, 400);
  }

  const record = body as Record<string, unknown>;
  const plan = record.plan;
  const cycle = record.cycle;

  if (!isPaidPlanKey(plan)) {
    return noStoreJson(
      { error: "This personal plan is not available for paid checkout." },
      400,
    );
  }

  if (!isBillingCycle(cycle)) {
    return noStoreJson({ error: "Invalid billing cycle." }, 400);
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return noStoreJson({ error: "Authentication required." }, 401);
  }

  const access = await getCurrentBillingAccess();
  if (
    access.state !== "ready" ||
    access.accountKind !== "personal" ||
    access.universe !== "personal" ||
    !access.accountId ||
    access.userId !== user.id
  ) {
    return noStoreJson(
      { error: "Personal billing account is not ready. No payment was attempted." },
      503,
    );
  }

  if (
    access.subscriptionStatus === "active" ||
    access.subscriptionStatus === "past_due" ||
    access.subscriptionStatus === "paused" ||
    access.subscriptionStatus === "cancelled"
  ) {
    return noStoreJson(
      {
        error:
          "This personal workspace already has a provider subscription. Use billing management instead of creating another subscription.",
      },
      409,
    );
  }

  if (plan === "student") {
    const { data: eligibility, error: eligibilityError } = await supabase.rpc(
      "get_my_student_verification_status",
    );

    if (eligibilityError) {
      return noStoreJson(
        {
          error:
            "Student eligibility could not be verified. No payment was attempted.",
        },
        503,
      );
    }

    if (eligibility !== "verified") {
      return noStoreJson(
        {
          error:
            "A current verified-student status is required before choosing the Student plan.",
        },
        403,
      );
    }
  }

  if (!isPaddleCheckoutConfigured()) {
    return noStoreJson(
      {
        error:
          "Secure checkout is not fully configured yet. Continue Free remains available and no payment was attempted.",
      },
      503,
    );
  }

  const planCode = personalPlanCode(plan, cycle);

  try {
    const priceId = getPersonalPaddlePriceId(plan, cycle);
    const checkout = await createPersonalCheckoutTransaction({
      accountId: access.accountId,
      userId: user.id,
      planCode,
      priceId,
    });

    return noStoreJson(
      {
        checkoutUrl: checkout.checkoutUrl,
        transactionId: checkout.transactionId,
      },
      200,
    );
  } catch {
    return noStoreJson(
      {
        error:
          "Secure checkout could not be created. No subscription was changed and Continue Free remains available.",
      },
      503,
    );
  }
}
