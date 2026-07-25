"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowRight, RotateCcw, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  getProductExperience,
  type ProductExperienceSlug,
} from "@/lib/product-experiences";
import { createClient } from "@/lib/supabase/client";
import { getBusinessWorkspaceHref, isBusinessExperience } from "@/lib/workspaces/domain";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const FINALIZATION_TIMEOUT_MS = 15_000;

type BusinessExperience = Exclude<ProductExperienceSlug, "personal">;

type FinalizeBusinessWorkspaceSetupProps = {
  businessId: string;
  experience: ProductExperienceSlug;
  onboardingSessionId?: string | null;
};

type FinalizationState = "idle" | "saving" | "error";

export default function FinalizeBusinessWorkspaceSetup({
  businessId,
  experience,
  onboardingSessionId,
}: FinalizeBusinessWorkspaceSetupProps) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const businessExperience: BusinessExperience = isBusinessExperience(experience)
    ? experience
    : "small-business";
  const product = getProductExperience(businessExperience);
  const validBusinessId = UUID_PATTERN.test(businessId) ? businessId : null;
  const validSessionId =
    onboardingSessionId && UUID_PATTERN.test(onboardingSessionId)
      ? onboardingSessionId
      : null;
  const [state, setState] = useState<FinalizationState>("idle");

  async function finalize() {
    if (state === "saving") return;
    if (!validBusinessId) {
      setState("error");
      return;
    }

    setState("saving");

    try {
      const request = supabase.rpc("apply_business_entry_experience", {
        p_business_id: validBusinessId,
        p_experience: businessExperience,
        p_session_id: validSessionId,
      });
      const timeout = new Promise<{ error: { code: string } }>((resolve) => {
        window.setTimeout(() => {
          resolve({ error: { code: "client_timeout" } });
        }, FINALIZATION_TIMEOUT_MS);
      });
      const result = await Promise.race([request, timeout]);

      if (result.error) {
        console.error("Business setup finalization failed", {
          code: result.error.code,
        });
        setState("error");
        return;
      }

      const { data: business, error: businessError } = await supabase
        .from("businesses")
        .select("slug, workspace_mode")
        .eq("id", validBusinessId)
        .single();

      if (businessError || !business?.slug) {
        console.error("Finalized business could not be resolved", {
          code: businessError?.code,
        });
        toast.success("Workspace setup finalized.");
        router.replace("/business");
        router.refresh();
        return;
      }

      toast.success(
        `${product?.productName ?? "Business workspace"} setup finalized with tailored modules ready.`,
      );
      router.replace(
        getBusinessWorkspaceHref(business.slug, business.workspace_mode),
      );
      router.refresh();
    } catch {
      setState("error");
    }
  }

  return (
    <section
      className="rounded-[var(--radius-card)] bg-warning-soft px-4 py-5 shadow-[var(--shadow-sm)] sm:px-6 sm:py-6"
      aria-labelledby="workspace-finalization-heading"
    >
      <div className="flex items-start gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-[var(--radius-button)] bg-warning text-white">
          <AlertTriangle className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-warning">
            Setup confirmation required
          </p>
          <h2
            id="workspace-finalization-heading"
            className="mt-1 text-lg font-black text-text-primary"
          >
            Finish {product?.productName ?? "business workspace"} setup
          </h2>
          <p className="mt-2 text-sm leading-6 text-text-secondary">
            The core organization workspace already exists. JALVORO has paused before claiming that
            its tailored modules and resumable setup state are ready. Retrying updates the same
            workspace and will not create a duplicate.
          </p>
        </div>
      </div>

      {state === "error" ? (
        <div className="mt-4 rounded-[var(--radius-button)] bg-danger-soft px-4 py-3 text-sm text-danger" role="alert">
          Setup could not be finalized. Your existing workspace and records were not deleted or
          merged. Check your connection and try again.
        </div>
      ) : null}

      <div className="mt-5 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
        <Button
          type="button"
          size="lg"
          loading={state === "saving"}
          loadingLabel="Finalizing setup..."
          onClick={finalize}
          className="w-full"
        >
          {state === "error" ? (
            <RotateCcw aria-hidden="true" />
          ) : (
            <ShieldCheck aria-hidden="true" />
          )}
          {state === "error" ? "Retry tailored setup" : "Finalize tailored setup"}
        </Button>
        <Link
          href="/business"
          className="finance-focus inline-flex min-h-12 items-center justify-center gap-2 rounded-[var(--radius-button)] bg-surface px-4 text-sm font-black text-text-primary shadow-[var(--shadow-sm)]"
        >
          Workspace list <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
