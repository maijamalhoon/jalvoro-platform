"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import type { BillingCycle, PaidPlanKey } from "@/lib/billing/types";

type PersonalCheckoutActionProps = {
  plan: PaidPlanKey;
  cycle: BillingCycle;
  enabled: boolean;
};

export default function PersonalCheckoutAction({
  plan,
  cycle,
  enabled,
}: PersonalCheckoutActionProps) {
  const [loading, setLoading] = useState(false);

  async function startCheckout() {
    if (!enabled || loading) return;
    setLoading(true);

    try {
      const response = await fetch("/api/billing/personal-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, cycle }),
      });
      const result = (await response.json()) as {
        checkoutUrl?: string;
        error?: string;
      };

      if (!response.ok || !result.checkoutUrl) {
        toast.error(result.error ?? "Checkout could not be started.");
        return;
      }

      window.location.assign(result.checkoutUrl);
    } catch {
      toast.error("Checkout could not be started. Check your connection.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      type="button"
      size="lg"
      className="w-full"
      loading={loading}
      loadingLabel="Opening secure checkout..."
      disabled={!enabled}
      onClick={startCheckout}
    >
      {enabled ? "Continue to secure checkout" : "Checkout activation pending"}
    </Button>
  );
}
