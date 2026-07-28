"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Globe2, Layers3, ShieldCheck, Store } from "lucide-react";
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

const BASE_CURRENCIES = [
  "PKR",
  "USD",
  "INR",
  "EUR",
  "GBP",
  "JPY",
  "CNY",
] as const;

type WorkspaceMode = "simple_shop" | "advanced_company";

export default function CreateBusinessWorkspaceForm() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [name, setName] = useState("");
  const [businessType, setBusinessType] = useState("retail");
  const [workspaceMode, setWorkspaceMode] =
    useState<WorkspaceMode>("simple_shop");
  const [countryCode, setCountryCode] = useState("");
  const [baseCurrency, setBaseCurrency] = useState("PKR");
  const [timezone, setTimezone] = useState("UTC");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (detected) setTimezone(detected);
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
        console.error("Business workspace creation failed", {
          code: error?.code,
        });
        toast.error("Business workspace could not be created. Please try again.");
        return;
      }

      setName("");
      toast.success(
        workspaceMode === "simple_shop"
          ? "Simple Shop created. Choose Free or a plan to continue."
          : "Advanced Company created. Choose Free or a plan to continue.",
      );
      router.replace(`/billing/choose-plan?businessId=${businessId}`);
      router.refresh();
    } catch {
      toast.error(
        "Business workspace could not be created. Check your connection and try again.",
      );
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
            Choose a fast shop workflow or the full company ERP. Both use
            isolated tenants, verified accounting, inventory, currency, and
            roles.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        <fieldset className="space-y-3">
          <legend className="text-sm font-bold text-text-primary">
            Workspace style
          </legend>
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
                <strong className="text-sm">Simple Shop</strong>
              </span>
              <span className="mt-2 block text-xs leading-5 opacity-80">
                Quick sale, purchase, stock, expenses, balances, returns, daily
                cash, and profit.
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
                <strong className="text-sm">Advanced Company</strong>
              </span>
              <span className="mt-2 block text-xs leading-5 opacity-80">
                Full accounting, contacts, sales, purchases, inventory, CRM,
                and reports modules.
              </span>
            </button>
          </div>
        </fieldset>

        <div className="grid gap-4 lg:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-bold text-text-primary">
              Business name
            </span>
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={
                workspaceMode === "simple_shop"
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
            <span className="text-sm font-bold text-text-primary">
              Nature of business
            </span>
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
            <span className="text-sm font-bold text-text-primary">
              Base currency
            </span>
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
            <span className="text-sm font-bold text-text-primary">
              Country code
            </span>
            <Input
              value={countryCode}
              onChange={(event) =>
                setCountryCode(event.target.value.toUpperCase())
              }
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
            Tenant-isolated data and accounting
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
          loadingLabel="Creating workspace..."
          className="w-full sm:w-auto"
        >
          {workspaceMode === "simple_shop" ? (
            <Store aria-hidden="true" />
          ) : (
            <Building2 aria-hidden="true" />
          )}
          Create {workspaceMode === "simple_shop" ? "Simple Shop" : "Advanced Company"}
        </Button>
      </form>
    </section>
  );
}
