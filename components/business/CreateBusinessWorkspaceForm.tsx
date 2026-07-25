"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Globe2, ShieldCheck, Store } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  getProductExperience,
  type ProductExperienceSlug,
} from "@/lib/product-experiences";
import { createClient } from "@/lib/supabase/client";
import {
  getBusinessSetupDefaults,
  isBusinessExperience,
} from "@/lib/workspaces/domain";

const BUSINESS_TYPES = [
  { value: "retail", label: "Retail" },
  { value: "wholesale", label: "Wholesale" },
  { value: "services", label: "Services" },
  { value: "manufacturing", label: "Manufacturing" },
  { value: "restaurant", label: "Restaurant / Food" },
  { value: "ecommerce", label: "E-commerce" },
  { value: "construction", label: "Construction" },
  { value: "professional_services", label: "Professional services" },
  { value: "other", label: "Other" },
] as const;

const BASE_CURRENCIES = ["PKR", "USD", "INR", "EUR", "GBP", "JPY", "CNY"] as const;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type BusinessExperience = Exclude<ProductExperienceSlug, "personal">;

type CreateBusinessWorkspaceFormProps = {
  initialExperience?: ProductExperienceSlug | null;
  onboardingSessionId?: string | null;
};

export default function CreateBusinessWorkspaceForm({
  initialExperience,
  onboardingSessionId,
}: CreateBusinessWorkspaceFormProps) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const businessExperience: BusinessExperience = isBusinessExperience(initialExperience)
    ? initialExperience
    : "small-business";
  const experience = getProductExperience(businessExperience);
  const setupDefaults = getBusinessSetupDefaults(businessExperience);
  const workspaceMode = setupDefaults.workspaceMode;
  const validSessionId =
    onboardingSessionId && UUID_PATTERN.test(onboardingSessionId)
      ? onboardingSessionId
      : null;

  const [name, setName] = useState("");
  const [businessType, setBusinessType] = useState(setupDefaults.businessType);
  const [countryCode, setCountryCode] = useState("");
  const [baseCurrency, setBaseCurrency] = useState("PKR");
  const [timezone, setTimezone] = useState("UTC");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (detected) setTimezone(detected);
  }, []);

  useEffect(() => {
    setBusinessType(setupDefaults.businessType);
  }, [businessExperience, setupDefaults.businessType]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;

    const cleanName = name.trim();
    const cleanCountry = countryCode.trim().toUpperCase();

    if (cleanName.length < 2 || cleanName.length > 120) {
      toast.error(
        businessExperience === "freelancer"
          ? "Professional name must contain 2 to 120 characters."
          : "Business name must contain 2 to 120 characters.",
      );
      return;
    }

    if (cleanCountry && !/^[A-Z]{2}$/.test(cleanCountry)) {
      toast.error("Use a two-letter country code, for example PK, US, or AE.");
      return;
    }

    setSaving(true);

    try {
      const { data: businessId, error } = await supabase.rpc(
        "create_business_workspace_for_experience",
        {
          p_name: cleanName,
          p_business_type: businessType,
          p_experience: businessExperience,
          p_country_code: cleanCountry || null,
          p_base_currency: baseCurrency,
          p_timezone: timezone,
          p_session_id: validSessionId,
        },
      );

      if (error || typeof businessId !== "string") {
        console.error("Atomic business workspace creation failed", { code: error?.code });
        toast.error(
          "Workspace setup could not be completed. Nothing was partially created; check your details or connection and try again.",
        );
        return;
      }

      const { data: business, error: businessError } = await supabase
        .from("businesses")
        .select("slug, workspace_mode")
        .eq("id", businessId)
        .single();

      if (businessError || !business?.slug) {
        console.error("Created business could not be resolved", {
          code: businessError?.code,
        });
        toast.success("Business workspace created with tailored setup ready.");
        router.replace("/business");
        router.refresh();
        return;
      }

      setName("");
      toast.success(
        `${experience?.productName ?? "Business workspace"} created with isolated data and modules ready.`,
      );
      router.replace(
        business.workspace_mode === "simple_shop"
          ? `/business/${business.slug}/shop`
          : `/business/${business.slug}`,
      );
      router.refresh();
    } catch {
      toast.error(
        "Workspace setup could not be completed. Nothing was partially created; check your connection and try again.",
      );
    } finally {
      setSaving(false);
    }
  }

  const WorkspaceIcon = workspaceMode === "simple_shop" ? Store : Building2;
  const workspaceStyleLabel =
    workspaceMode === "simple_shop" ? "Simple Shop" : "Advanced Company";
  const workspaceStyleDescription =
    workspaceMode === "simple_shop"
      ? "Fast counter sales, purchases, stock, returns, daily cash, and profit."
      : "Connected accounting, contacts, sales, purchasing, inventory, CRM, reports, and team controls.";

  return (
    <section className="rounded-[var(--radius-card)] bg-surface px-4 py-5 shadow-[var(--shadow-sm)] sm:px-6 sm:py-6">
      <div className="flex items-start gap-3">
        <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-[var(--radius-button)] bg-primary-soft text-primary">
          <WorkspaceIcon aria-hidden="true" className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-primary">
            {experience?.label ?? "For Small Businesses"}
          </p>
          <h2 className="mt-1 text-base font-black tracking-tight text-text-primary sm:text-lg">
            {businessExperience === "freelancer"
              ? "Set up your independent work"
              : `Create ${experience?.productName ?? "a business workspace"}`}
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-text-secondary">
            Your selected experience sets a compatible starting workflow and module foundation.
            Creation is atomic: tailored setup must succeed before any workspace is kept.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        <section
          className="rounded-[var(--radius-button)] bg-primary-soft px-4 py-4"
          aria-labelledby="starting-workflow-heading"
        >
          <div className="flex items-start gap-3">
            <WorkspaceIcon className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
            <div>
              <p
                id="starting-workflow-heading"
                className="text-sm font-black text-text-primary"
              >
                Starting workflow: {workspaceStyleLabel}
              </p>
              <p className="mt-1 text-xs leading-5 text-text-secondary">
                {workspaceStyleDescription} Choose a different experience from the selector when a
                different operating model is required.
              </p>
            </div>
          </div>
        </section>

        <div className="grid gap-4 lg:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-bold text-text-primary">
              {businessExperience === "freelancer" ? "Professional name" : "Business name"}
            </span>
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={
                businessExperience === "freelancer"
                  ? "Example: Ali Design Studio"
                  : workspaceMode === "simple_shop"
                    ? "Example: Jamal General Store"
                    : "Example: Jamal Traders"
              }
              autoComplete="organization"
              maxLength={120}
              disabled={saving}
              required
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-bold text-text-primary">Nature of business</span>
            <select
              value={businessType}
              onChange={(event) => setBusinessType(event.target.value as typeof businessType)}
              className="field-input min-h-11 w-full"
              disabled={saving}
            >
              {BUSINESS_TYPES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-sm font-bold text-text-primary">Base currency</span>
            <select
              value={baseCurrency}
              onChange={(event) => setBaseCurrency(event.target.value)}
              className="field-input min-h-11 w-full"
              disabled={saving}
            >
              {BASE_CURRENCIES.map((currency) => (
                <option key={currency} value={currency}>
                  {currency}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-sm font-bold text-text-primary">Country code</span>
            <Input
              value={countryCode}
              onChange={(event) => setCountryCode(event.target.value.toUpperCase())}
              placeholder="PK"
              inputMode="text"
              autoCapitalize="characters"
              maxLength={2}
              disabled={saving}
            />
          </label>

          <label className="space-y-2 lg:col-span-2">
            <span className="text-sm font-bold text-text-primary">Timezone</span>
            <Input
              value={timezone}
              onChange={(event) => setTimezone(event.target.value)}
              placeholder="Asia/Karachi"
              autoComplete="off"
              maxLength={80}
              disabled={saving}
              required
            />
          </label>
        </div>

        <div className="grid gap-3 rounded-[var(--radius-button)] bg-surface-secondary px-4 py-4 text-sm text-text-secondary sm:grid-cols-2">
          <span className="flex items-center gap-2">
            <ShieldCheck aria-hidden="true" className="size-4 text-success" />
            Tenant-isolated data and membership
          </span>
          <span className="flex items-center gap-2">
            <Globe2 aria-hidden="true" className="size-4 text-primary" />
            Atomic workspace and module setup
          </span>
        </div>

        <Button
          type="submit"
          size="lg"
          loading={saving}
          loadingLabel="Creating workspace..."
          className="w-full sm:w-auto"
        >
          <WorkspaceIcon aria-hidden="true" />
          Create {experience?.productName ?? "Business workspace"}
        </Button>
      </form>
    </section>
  );
}
