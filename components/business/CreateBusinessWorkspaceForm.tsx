"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Globe2, Layers3, ShieldCheck, Store } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

const BUSINESS_TYPES = [
  { value: "retail", label: "Retail and shops" },
  { value: "wholesale", label: "Wholesale and distribution" },
  { value: "services", label: "Services" },
  { value: "manufacturing", label: "Manufacturing" },
  { value: "restaurant", label: "Restaurant and food" },
  { value: "ecommerce", label: "E-commerce" },
  { value: "construction", label: "Construction" },
  { value: "professional_services", label: "Professional services" },
  { value: "other", label: "Other" },
] as const;

const BASE_CURRENCIES = [
  "PKR",
  "AED",
  "SAR",
  "USD",
  "CAD",
  "AUD",
  "INR",
  "EUR",
  "GBP",
  "JPY",
  "CNY",
] as const;

const STRUCTURE_LABELS: Record<string, string> = {
  solo: "One-person business",
  small_business: "Small business",
  growing_business: "Growing business",
  multi_branch: "Multi-branch business",
  franchise: "Dealership or franchise",
  enterprise: "Enterprise",
};

const MODULE_LABELS: Record<string, string> = {
  accounting: "Accounting",
  invoicing: "Invoicing",
  inventory: "Inventory",
  pos: "POS",
  restaurant: "Restaurant operations",
  crm: "CRM",
  team: "Teams and permissions",
  payroll: "Payroll readiness",
  branches: "Branches",
  warehouse: "Warehouses",
};

type WorkspaceMode = "simple_shop" | "advanced_company";

function isBusinessType(value: string): value is (typeof BUSINESS_TYPES)[number]["value"] {
  return BUSINESS_TYPES.some((item) => item.value === value);
}

function isBaseCurrency(value: string): value is (typeof BASE_CURRENCIES)[number] {
  return BASE_CURRENCIES.includes(value as (typeof BASE_CURRENCIES)[number]);
}

function isWorkspaceMode(value: string): value is WorkspaceMode {
  return value === "simple_shop" || value === "advanced_company";
}

export default function CreateBusinessWorkspaceForm() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [name, setName] = useState("");
  const [businessType, setBusinessType] = useState<(typeof BUSINESS_TYPES)[number]["value"]>("retail");
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>("simple_shop");
  const [countryCode, setCountryCode] = useState("");
  const [baseCurrency, setBaseCurrency] = useState<(typeof BASE_CURRENCIES)[number]>("PKR");
  const [timezone, setTimezone] = useState("UTC");
  const [requestedStructure, setRequestedStructure] = useState("");
  const [requestedModules, setRequestedModules] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const requestedTimezone = params.get("timezone")?.trim();
    const requestedType = params.get("business_type")?.trim() ?? "";
    const requestedMode = params.get("workspace_mode")?.trim() ?? "";
    const requestedCountry = params.get("country")?.trim().toUpperCase() ?? "";
    const requestedCurrency = params.get("currency")?.trim().toUpperCase() ?? "";
    const structure = params.get("structure")?.trim() ?? "";
    const modules = (params.get("modules") ?? "")
      .split(",")
      .map((item) => item.trim())
      .filter((item) => Boolean(MODULE_LABELS[item]));

    setTimezone(requestedTimezone || detectedTimezone || "UTC");
    if (isBusinessType(requestedType)) setBusinessType(requestedType);
    if (isWorkspaceMode(requestedMode)) setWorkspaceMode(requestedMode);
    if (/^[A-Z]{2}$/.test(requestedCountry)) setCountryCode(requestedCountry);
    if (isBaseCurrency(requestedCurrency)) setBaseCurrency(requestedCurrency);
    if (STRUCTURE_LABELS[structure]) setRequestedStructure(structure);
    setRequestedModules(Array.from(new Set(modules)));
  }, []);

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
        "create_business_workspace_with_mode",
        {
          p_name: cleanName,
          p_business_type: businessType,
          p_workspace_mode: workspaceMode,
          p_country_code: cleanCountry || null,
          p_base_currency: baseCurrency,
          p_timezone: timezone,
        },
      );

      if (error || typeof businessId !== "string") {
        console.error("Business workspace creation failed", { code: error?.code });
        toast.error("Business workspace could not be created. Please try again.");
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
        toast.success("Business workspace created.");
        router.replace("/business");
        router.refresh();
        return;
      }

      setName("");
      toast.success(
        workspaceMode === "simple_shop"
          ? "Fast commerce workspace created with stock, cash, and accounting ready."
          : "Advanced business workspace created with its operational foundation.",
      );
      router.replace(
        business.workspace_mode === "simple_shop"
          ? `/business/${business.slug}/shop`
          : `/business/${business.slug}`,
      );
      router.refresh();
    } catch {
      toast.error("Business workspace could not be created. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-[var(--radius-card)] bg-surface px-4 py-5 shadow-[var(--shadow-sm)] sm:px-6 sm:py-6">
      <div className="flex items-start gap-3">
        <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-[var(--radius-button)] bg-primary-soft text-primary">
          {workspaceMode === "simple_shop" ? (
            <Store aria-hidden="true" className="size-5" />
          ) : (
            <Building2 aria-hidden="true" className="size-5" />
          )}
        </span>
        <div className="min-w-0">
          <h2 className="text-base font-black tracking-tight text-text-primary sm:text-lg">
            Create a business workspace
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-text-secondary">
            Confirm the business foundation recommended by the discovery journey. Every workspace uses isolated tenants, verified accounting boundaries, currency, and roles.
          </p>
        </div>
      </div>

      {requestedStructure || requestedModules.length > 0 ? (
        <div className="mt-5 rounded-[var(--radius-card)] bg-primary-soft px-4 py-4 text-sm text-primary">
          <strong className="block text-text-primary">Discovery setup retained</strong>
          <p className="mt-1 leading-6">
            {requestedStructure ? STRUCTURE_LABELS[requestedStructure] : "Business workspace"}
            {requestedModules.length > 0
              ? ` · Requested systems: ${requestedModules.map((item) => MODULE_LABELS[item]).join(", ")}`
              : ""}
          </p>
          <p className="mt-2 text-xs leading-5 text-text-secondary">
            Requested systems are setup intent only. Final module access remains controlled by released capabilities, plan entitlements, organization role, and verified permissions.
          </p>
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        <fieldset className="space-y-3">
          <legend className="text-sm font-bold text-text-primary">Workspace foundation</legend>
          <div className="grid gap-3 md:grid-cols-2">
            <button
              type="button"
              onClick={() => setWorkspaceMode("simple_shop")}
              disabled={saving}
              className={`finance-focus rounded-[var(--radius-button)] px-4 py-4 text-left transition-colors ${
                workspaceMode === "simple_shop"
                  ? "bg-primary-soft text-primary"
                  : "bg-surface-secondary text-text-secondary"
              }`}
            >
              <span className="flex items-center gap-3">
                <Store aria-hidden="true" className="size-5 shrink-0" />
                <strong className="text-sm">Fast commerce workspace</strong>
              </span>
              <span className="mt-2 block text-xs leading-5 opacity-80">
                Quick sales, purchases, stock, expenses, balances, returns, daily cash, and profit.
              </span>
            </button>
            <button
              type="button"
              onClick={() => setWorkspaceMode("advanced_company")}
              disabled={saving}
              className={`finance-focus rounded-[var(--radius-button)] px-4 py-4 text-left transition-colors ${
                workspaceMode === "advanced_company"
                  ? "bg-primary-soft text-primary"
                  : "bg-surface-secondary text-text-secondary"
              }`}
            >
              <span className="flex items-center gap-3">
                <Layers3 aria-hidden="true" className="size-5 shrink-0" />
                <strong className="text-sm">Advanced business workspace</strong>
              </span>
              <span className="mt-2 block text-xs leading-5 opacity-80">
                Full accounting, contacts, sales, purchases, inventory, CRM, roles, and reporting foundations.
              </span>
            </button>
          </div>
        </fieldset>

        <div className="grid gap-4 lg:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-bold text-text-primary">Business name</span>
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={workspaceMode === "simple_shop" ? "Example: JALVORO General Store" : "Example: JALVORO Traders"}
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
              onChange={(event) => {
                const value = event.target.value;
                if (isBusinessType(value)) setBusinessType(value);
              }}
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
              onChange={(event) => {
                const value = event.target.value;
                if (isBaseCurrency(value)) setBaseCurrency(value);
              }}
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
            Tenant-isolated business data and accounting
          </span>
          <span className="flex items-center gap-2">
            <Globe2 aria-hidden="true" className="size-4 text-primary" />
            Country, currency, and timezone-aware foundation
          </span>
        </div>

        <Button
          type="submit"
          size="lg"
          loading={saving}
          loadingLabel="Creating workspace..."
          className="w-full sm:w-auto"
        >
          {workspaceMode === "simple_shop" ? (
            <Store aria-hidden="true" />
          ) : (
            <Building2 aria-hidden="true" />
          )}
          Create {workspaceMode === "simple_shop" ? "commerce workspace" : "business workspace"}
        </Button>
      </form>
    </section>
  );
}
