"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ShieldCheck } from "lucide-react";

import AuthShell from "@/components/auth/AuthShell";
import { AuthFeedback } from "@/components/auth/AuthControls";
import { isBusinessInvitationAcceptancePath } from "@/lib/business/invitations";
import { createClient } from "@/lib/supabase/client";
import { sanitizeInternalRedirect } from "@/lib/supabase/session";

type Realm = "individual" | "business";
type Mode = "login" | "signup";
type Product = "solo_business" | "retail_pos" | "growing_business" | "enterprise";
type AccountRealm = Realm | "legacy_dual";

function normalizeProduct(value: string | null): Product | null {
  return value === "solo_business" ||
    value === "retail_pos" ||
    value === "growing_business" ||
    value === "enterprise"
    ? value
    : null;
}

function accountRealmAllows(current: unknown, requested: Realm): current is AccountRealm {
  return current === requested || current === "legacy_dual";
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
      const acceptingInvitation =
        realm === "business" && isBusinessInvitationAcceptancePath(next);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (!active) return;

      if (userError || !user) {
        router.replace(realm === "business" ? "/business/login" : "/individual/login");
        return;
      }

      // The invitation RPC validates the signed token, invited email, status, and
      // expiry before it claims Business realm. Do not claim from an unverified URL.
      if (acceptingInvitation) {
        router.replace(next);
        router.refresh();
        return;
      }

      let shouldPrepareNewIdentity = mode === "signup";

      if (mode === "signup") {
        const { error: realmError } = await supabase.rpc("claim_account_realm", {
          p_realm: realm,
        });

        if (realmError) {
          await supabase.auth.signOut({ scope: "local" });
          router.replace(
            `${realm === "business" ? "/business/login" : "/individual/login"}?error=wrong_realm`,
          );
          return;
        }
      } else {
        const { data: currentRealm, error: realmError } = await supabase.rpc(
          "get_my_account_realm",
        );

        if (realmError) {
          setError("Account type could not be verified right now. Try signing in again.");
          return;
        }

        if (currentRealm === null && realm === "individual") {
          const { error: claimError } = await supabase.rpc("claim_account_realm", {
            p_realm: "individual",
          });
          if (claimError) {
            setError("Your new Individual account could not be prepared. Try signing in again.");
            return;
          }
          shouldPrepareNewIdentity = true;
        } else if (!accountRealmAllows(currentRealm, realm)) {
          await supabase.auth.signOut({ scope: "local" });
          router.replace(
            `${realm === "business" ? "/business/login" : "/individual/login"}?error=wrong_realm`,
          );
          return;
        }
      }

      if (realm === "business" && mode === "login") {
        const { data, error: membershipError } = await supabase
          .from("business_members")
          .select("business_id, status")
          .eq("user_id", user.id)
          .limit(100);

        if (membershipError) {
          setError("Business access could not be verified right now. Try signing in again.");
          return;
        }

        const memberships = data ?? [];
        const hasActiveMembership = memberships.some(
          (membership) => membership.status === "active",
        );

        if (!hasActiveMembership && memberships.length > 0) {
          await supabase.auth.signOut({ scope: "local" });
          router.replace("/business/login?error=no_access");
          return;
        }

        if (!hasActiveMembership) {
          router.replace("/business?setup=1");
          router.refresh();
          return;
        }
      }

      if (shouldPrepareNewIdentity) {
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
        return;
      }

      router.replace(next);
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
        <div
          className="flex items-center justify-center gap-3 py-6 text-sm font-bold text-text-secondary"
          role="status"
        >
          <span
            className="size-5 animate-spin rounded-full border-2 border-primary border-r-transparent"
            aria-hidden="true"
          />
          Completing secure setup…
        </div>
      )}
    </AuthShell>
  );
}
