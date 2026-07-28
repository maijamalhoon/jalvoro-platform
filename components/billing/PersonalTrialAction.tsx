"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

type PersonalTrialActionProps = {
  enabled: boolean;
};

export default function PersonalTrialAction({
  enabled,
}: PersonalTrialActionProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function startTrial() {
    if (!enabled || loading) return;
    setLoading(true);

    try {
      const response = await fetch("/api/billing/trial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const result = (await response.json()) as { error?: string };

      if (!response.ok) {
        toast.error(result.error ?? "The Pro trial could not be started.");
        return;
      }

      toast.success("Your 14-day Pro trial is active. No card was charged.");
      router.replace("/dashboard");
      router.refresh();
    } catch {
      toast.error("The Pro trial could not be started. Check your connection.");
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
      loadingLabel="Starting your Pro trial..."
      disabled={!enabled}
      onClick={startTrial}
    >
      {enabled ? "Start 14-day Pro trial" : "Trial activation pending"}
    </Button>
  );
}
