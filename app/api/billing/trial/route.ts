import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

function noStoreJson(body: object, status: number) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}

export async function POST() {
  if (process.env.BILLING_TRIAL_ENABLED !== "true") {
    return noStoreJson(
      {
        error:
          "The Pro trial is not active yet. Continue Free remains available.",
      },
      503,
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return noStoreJson({ error: "Authentication required." }, 401);
  }

  const { data, error } = await supabase.rpc("claim_my_pro_trial");

  if (error) {
    const message = error.message.toLowerCase();
    const alreadyUsed = message.includes("trial_already_used");
    const alreadySubscribed = message.includes("subscription_already_active");

    return noStoreJson(
      {
        error: alreadyUsed
          ? "This account has already used its free trial."
          : alreadySubscribed
            ? "This account already has subscription access."
            : "The trial could not be started.",
      },
      alreadyUsed || alreadySubscribed ? 409 : 500,
    );
  }

  return noStoreJson({ subscription: data }, 200);
}
