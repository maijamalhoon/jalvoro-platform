import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "A business ID is required." }, { status: 400 });
  }

  const businessId =
    typeof body === "object" &&
    body !== null &&
    "businessId" in body &&
    typeof body.businessId === "string"
      ? body.businessId
      : "";

  if (!UUID_PATTERN.test(businessId)) {
    return NextResponse.json({ error: "Invalid business ID." }, { status: 400 });
  }

  const { data, error } = await supabase.rpc("claim_my_business_growth_trial", {
    target_business_id: businessId,
  });

  if (error) {
    const message = error.message.toLowerCase();
    const alreadyUsed = message.includes("trial_already_used");
    const alreadySubscribed = message.includes("subscription_already_active");
    const ownerRequired = message.includes("business_owner_required");

    return NextResponse.json(
      {
        error: alreadyUsed
          ? "This business has already used its free trial."
          : alreadySubscribed
            ? "This business already has subscription access."
            : ownerRequired
              ? "Only the business owner can start the trial."
              : "The business trial could not be started.",
      },
      {
        status:
          alreadyUsed || alreadySubscribed
            ? 409
            : ownerRequired
              ? 403
              : 500,
      },
    );
  }

  return NextResponse.json(
    { subscription: data },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
