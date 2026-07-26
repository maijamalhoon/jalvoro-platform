"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BriefcaseBusiness,
  Building2,
  Globe2,
  Network,
  ShieldCheck,
  Store,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

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

export type BusinessProductTier =
  | "solo_business"
  | "retail_pos"
  | "growing_business"
  | "enterprise";

type WorkspaceMode = "simple_shop" | "advanced_company";

type BusinessProductOption = {
  key: BusinessProductTier;
  label: string;
  copy: string;
  icon: typeof Building2;
  defaultBusinessType: (typeof BUSINESS_TYPES)[number]["value"];
  workspaceMode: WorkspaceMode;
};

const BUSINESS_PRODUCTS: readonly BusinessProductOption[] = [
  {
    key: "solo_business",
    label: "Solo Business",
    copy: "For freelancers, consultants, and owner-operated services with optional staff invitations later.",
    icon: BriefcaseBusiness,
    defaultBusinessType: "professional_services",
    workspaceMode: "advanced_company",
  },
  {
    key: "retail_pos",
    label: "Retail & POS",
    copy: "For shops, restaurants, counters, registers, stock, daily cash, and scoped cashier access.",
    icon: Store,
    defaultBusinessType: "retail",
    workspaceMode: "simple_shop",
  },
  {
    key: "growing_business",
    label: "Growing Business",
    copy: "For small and mid-sized teams using accounting, CRM, inventory, payroll, branches, and approvals.",
    icon: Building2,
    defaultBusinessType: "other",
    workspaceMode: "advanced_company",
  },
  {
    key: "enterprise",
    label: "Enterprise Operations",
    copy: "For departments, advanced controls, audit requirements, approval chains, and future SSO provisioning.",
    icon: Network,
    defaultBusinessType: "other",
    workspaceMode: "advanced_company",
  },
];

function getProductOption(product: BusinessProductTier) {
  return BUSINESS_PRODUCTS.find((option) => option.key === product) ?? BUSINESS_PRODUCTS[2];
}

export default function CreateBusinessWorkspaceForm({
  initialProduct = "growing_business",
}: {
  initialProduct?: BusinessProductTier;
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const initialOption = getProductOption(initialProduct);
  const [name, setName] = useState("");
  const [productTier, setProductTier] = useState<BusinessProductTier>(initialOption.key);
  const [businessType, setBusinessType] = useState(initialOption.defaultBusinessType);
  const [countryCode, setCountryCode] = useState("");
  const [baseCurrency, setBaseCurrency] = useState("PKR");
  const [timezone, setTimezone] = useState("UTC");
  const [saving, setSaving] = useState(false);

  const selectedProduct = getProductOption(productTier);
  const workspaceMode = selectedProduct.workspaceMode;
  const ProductIcon = selectedProduct.icon;

  useEffect(() => {
    const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (detected) setTimezone(detected);
  }, []);

  function chooseProduct(product: BusinessProductTier) {
    if (saving) return;
    const option = getProductOption(product);
    setProductTier(product);
    setBusinessType(option.defaultBusinessType);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;

    const cleanName = name.trim();
    const cleanCountry = countryCode.trim().toUpperCase();

    if (cleanName.length < 2 || cleanName.length > 120) {
      toast.error("Business name must contain 2 to 120 characters.");
      return;
    }

    if (cleanCountry && !/^[A-Z]{2}$/.test(cleanCountry)) {
      toast.error("Use a two-letter country code, for example PK, US, or AE.");
      return;
    }

    setSaving(true);

    try {
      const { data: businessId, error } = await supabase.rpc(
        "create_business_organization",
        {
          p_name: cleanName,
          p_business_type: businessType,
          p_workspace_mode: workspaceMode,
          p_country_code: cleanCountry || null,
          p_base_currency: baseCurrency,
          p_timezone: timezone,
          p_product_tier: productTier,
        },
      );

      if (error || typeof businessId !== "string") {
        console.error("Business organization creation failed", { code: error?.code });
        toast.error("Business organization could not be created. Please try again.");
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
        toast.success(`${selectedProduct.label} organization created.`);
        router.replace("/business");
        router.refresh();
        return;
      }

      setName("");
      toast.success(`${selectedProduct.label} organization created. You are the Organization Owner.`);
      router.replace(
        business.workspace_mode === "simple_shop"
          ? `/business/${business.slug}/shop`
          : `/business/${business.slug}`,
      );
      router.refresh();
    } catch {
      toast.error("Business organization could not be created. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-[var(--radius-card)] bg-surface px-4 py-5 shadow-[var(--shadow-sm)] sm:px-6 sm:py-6">
      <div className="flex items-start gap-3">
        <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-[var(--radius-button)] bg-primary-soft text-primary">
          <ProductIcon aria-hidden="true" className="size-5" />
        </span>
        <div className="min-w-0">
          <h2 className="text-base font-black tracking-tight text-text-primary sm:text-lg">
            Register the organization
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-text-secondary">
            This signed-in identity becomes Organization Owner. Administrators, managers, and
            employees are invited after the organization is created.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        <fieldset className="space-y-3">
          <legend className="text-sm font-bold text-text-primary">Business product</legend>
          <div className="grid gap-3 md:grid-cols-2">
            {BUSINESS_PRODUCTS.map((option) => {
              const Icon = option.icon;
              const selected = option.key === productTier;
              return (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => chooseProduct(option.key)}
                  disabled={saving}
                  aria-pressed={selected}
                  className={`finance-focus rounded-[var(--radius-button)] px-4 py-4 text-left transition-colors ${
                    selected
                      ? "bg-primary-soft text-primary"
                      : "bg-surface-secondary text-text-secondary"
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <Icon aria-hidden="true" className="size-5 shrink-0" />
                    <strong className="text-sm">{option.label}</strong>
                  </span>
                  <span className="mt-2 block text-xs leading-5 opacity-80">{option.copy}</span>
                </button>
              );
            })}
          </div>
        </fieldset>

        <div className="grid gap-4 lg:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-bold text-text-primary">Organization name</span>
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={productTier === "retail_pos" ? "Example: Jamal General Store" : "Example: Jamal Traders"}
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
              onChange={(event) => setBusinessType(event.target.value)}
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
            Organization tenant and owner membership
          </span>
          <span className="flex items-center gap-2">
            <Globe2 aria-hidden="true" className="size-4 text-primary" />
            Global currency and timezone foundation
          </span>
        </div>

        <Button
          type="submit"
          size="lg"
          loading={saving}
          loadingLabel="Creating organization..."
          className="w-full sm:w-auto"
        >
          <ProductIcon aria-hidden="true" />
          Create {selectedProduct.label}
        </Button>
      </form>
    </section>
  );
}
