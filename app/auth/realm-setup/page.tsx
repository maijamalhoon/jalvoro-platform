"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ShieldCheck } from "lucide-react";

import AuthShell from "@/components/auth/AuthShell";
import { AuthFeedback } from "@/components/auth/AuthControls";
import { createClient } from "@/lib/supabase/client";
import { sanitizeInternalRedirect } from "@/lib/supabase/session";

type Realm = "individual" | "business";
type Mode = "login" | "signup";
type Product = "solo_business" | "retail_pos" | "growing_business" | "enterprise";

function normalizeProduct(value: string | null): Product | null {
  return value === "solo_business" ||
    value === "retail_pos" ||
    value === "growing_business" ||
    value === "enterprise"
    ? value
    : null;
}

export default function RealmSetupPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function completeSetup() {
      const params = new URLSearchParams(window.location.search);
      const realm: Realm = params.get("realm") === "business" ? "business" : "individual";
      const mode: Mode = params.get("mode") === "login" ? "login" : "signup";
      const product = normalizeProduct(params.get("product"));
      const fallback = realm === "business" ? "/business" : "/dashboard";
      const next = sanitizeInternalRedirect(params.get("next"), fallback);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (!active) return;

      if (userError || !user) {
        router.replace(realm === "business" ? "/business/login" : "/individual/login");
        return;
      }

      if (realm === "business" && mode === "login") {
        const { data, error: membershipError } = await supabase
          .from("business_members")
          .select("business_id")
          .eq("user_id", user.id)
          .eq("status", "active")
          .limit(1)
          .maybeSingle();

        if (membershipError) {
          setError("Business access could not be verified right now. Try signing in again.");
          return;
        }

        if (!data?.business_id) {
          await supabase.auth.signOut({ scope: "local" });
          router.replace("/business/login?error=no_access");
          return;
        }

        router.replace(next);
        router.refresh();
        return;
      }

      const choice = realm === "business" ? "business" : "personal";
      const { error: preferenceError } = await supabase
        .from("business_workspace_preferences")
        .upsert({
          user_id: user.id,
          default_workspace: choice,
          active_business_id: null,
          onboarding_choice: choice,
          updated_at: new Date().toISOString(),
        });

      if (preferenceError) {
        setError("The selected account type could not be prepared. Try signing in again.");
        return;
      }

      if (realm === "business") {
        const destination = new URLSearchParams({ setup: "1" });
        if (product) destination.set("product", product);
        router.replace(`/business?${destination.toString()}`);
      } else {
        router.replace(`/onboarding?next=${encodeURIComponent(next)}`);
      }
      router.refresh();
    }

    void completeSetup();
    return () => {
      active = false;
    };
  }, [router, supabase]);

  return (
    <AuthShell
      eyebrow="Secure account setup"
      title="Preparing your workspace"
      description="Verifying the selected product and account access."
      icon={ShieldCheck}
      minimal
    >
      {error ? (
        <AuthFeedback tone="danger">{error}</AuthFeedback>
      ) : (
        <div className="flex items-center justify-center gap-3 py-6 text-sm font-bold text-text-secondary" role="status">
          <span className="size-5 animate-spin rounded-full border-2 border-primary border-r-transparent" aria-hidden="true" />
          Completing secure setup…
        </div>
      )}
    </AuthShell>
  );
}
