"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  Globe2,
  Landmark,
  PackageSearch,
  ShieldCheck,
  ShoppingCart,
  Store,
  UsersRound,
  UtensilsCrossed,
  Warehouse,
  type LucideIcon,
} from "lucide-react";

import {
  JalvoroInvoiceIcon,
  JalvoroLockIcon,
  JalvoroTaxIcon,
  JalvoroUsersIcon,
} from "@/components/icons/jalvoro";

type StructureId =
  | "solo"
  | "small_business"
  | "growing_business"
  | "multi_branch"
  | "franchise"
  | "enterprise";

type IndustryId =
  | "retail"
  | "restaurant"
  | "services"
  | "professional_services"
  | "ecommerce"
  | "wholesale"
  | "manufacturing"
  | "construction"
  | "other";

type ModuleId =
  | "accounting"
  | "invoicing"
  | "inventory"
  | "pos"
  | "restaurant"
  | "crm"
  | "team"
  | "payroll"
  | "branches"
  | "warehouse";

type Step = 1 | 2 | 3 | 4;

type Choice<T extends string> = {
  id: T;
  title: string;
  copy: string;
  icon: LucideIcon;
};

const structures: Choice<StructureId>[] = [
  {
    id: "solo",
    title: "One-person business",
    copy: "Freelancers, consultants, independent sellers, and sole proprietors.",
    icon: Store,
  },
  {
    id: "small_business",
    title: "Small business",
    copy: "Shops, salons, restaurants, offices, and local service teams.",
    icon: ShoppingCart,
  },
  {
    id: "growing_business",
    title: "Growing business",
    copy: "Expanding teams with departments, approvals, and wider operations.",
    icon: Building2,
  },
  {
    id: "multi_branch",
    title: "Multi-branch business",
    copy: "Multiple locations with centralized control and branch accountability.",
    icon: Warehouse,
  },
  {
    id: "franchise",
    title: "Dealership or franchise",
    copy: "Distributed networks, outlets, territories, and controlled operations.",
    icon: Landmark,
  },
  {
    id: "enterprise",
    title: "Enterprise",
    copy: "Large organizations with advanced governance, security, and integrations.",
    icon: UsersRound,
  },
];

const industries: Choice<IndustryId>[] = [
  { id: "retail", title: "Retail and shops", copy: "Counters, products, stock, sales, and returns.", icon: ShoppingCart },
  { id: "restaurant", title: "Restaurant and food", copy: "Tables, orders, kitchen, staff, inventory, and payments.", icon: UtensilsCrossed },
  { id: "services", title: "Services", copy: "Appointments, jobs, customers, billing, and teams.", icon: UsersRound },
  { id: "professional_services", title: "Professional services", copy: "Consulting, legal, accounting, agencies, and independent experts.", icon: Landmark },
  { id: "ecommerce", title: "E-commerce", copy: "Online orders, customers, fulfillment, stock, and reporting.", icon: Globe2 },
  { id: "wholesale", title: "Wholesale and distribution", copy: "Bulk orders, suppliers, warehouses, credit, and delivery.", icon: Warehouse },
  { id: "manufacturing", title: "Manufacturing", copy: "Materials, production, inventory, costs, and quality controls.", icon: PackageSearch },
  { id: "construction", title: "Construction", copy: "Projects, procurement, costs, teams, approvals, and assets.", icon: Building2 },
  { id: "other", title: "Another industry", copy: "Start with a flexible business foundation and configure it further.", icon: Store },
];

const moduleChoices: Array<{
  id: ModuleId;
  title: string;
  copy: string;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
}> = [
  { id: "accounting", title: "Accounting and expenses", copy: "Cash, banking, expenses, approvals, and reports.", icon: JalvoroTaxIcon },
  { id: "invoicing", title: "Invoices and payments", copy: "Quotes, invoices, receivables, payments, and records.", icon: JalvoroInvoiceIcon },
  { id: "inventory", title: "Inventory", copy: "Products, purchasing, stock movement, valuation, and alerts.", icon: PackageSearch },
  { id: "pos", title: "Point of sale", copy: "Fast sales, returns, cash shifts, receipts, and counter operations.", icon: ShoppingCart },
  { id: "restaurant", title: "Restaurant operations", copy: "Tables, menus, modifiers, kitchen flow, and order status.", icon: UtensilsCrossed },
  { id: "crm", title: "CRM and customers", copy: "Leads, customers, follow-ups, opportunities, and ownership.", icon: JalvoroUsersIcon },
  { id: "team", title: "Teams and permissions", copy: "Employees, roles, departments, responsibilities, and access.", icon: UsersRound },
  { id: "payroll", title: "Payroll readiness", copy: "Attendance, shifts, payroll inputs, approvals, and records.", icon: JalvoroLockIcon },
  { id: "branches", title: "Branches", copy: "Locations, branch reporting, controls, transfers, and performance.", icon: Building2 },
  { id: "warehouse", title: "Warehouses", copy: "Multi-location stock, receiving, dispatch, and replenishment.", icon: Warehouse },
];

const countries = [
  { code: "PK", name: "Pakistan", currency: "PKR", timezone: "Asia/Karachi" },
  { code: "AE", name: "United Arab Emirates", currency: "AED", timezone: "Asia/Dubai" },
  { code: "SA", name: "Saudi Arabia", currency: "SAR", timezone: "Asia/Riyadh" },
  { code: "GB", name: "United Kingdom", currency: "GBP", timezone: "Europe/London" },
  { code: "US", name: "United States", currency: "USD", timezone: "America/New_York" },
  { code: "CA", name: "Canada", currency: "CAD", timezone: "America/Toronto" },
  { code: "AU", name: "Australia", currency: "AUD", timezone: "Australia/Sydney" },
  { code: "IN", name: "India", currency: "INR", timezone: "Asia/Kolkata" },
] as const;

function defaultModules(structure: StructureId, industry: IndustryId): ModuleId[] {
  const values = new Set<ModuleId>(["accounting", "invoicing", "crm"]);

  if (["retail", "ecommerce", "wholesale", "manufacturing", "restaurant"].includes(industry)) {
    values.add("inventory");
  }
  if (industry === "retail") values.add("pos");
  if (industry === "restaurant") {
    values.add("pos");
    values.add("restaurant");
  }
  if (["small_business", "growing_business", "multi_branch", "franchise", "enterprise"].includes(structure)) {
    values.add("team");
  }
  if (["growing_business", "multi_branch", "franchise", "enterprise"].includes(structure)) {
    values.add("payroll");
  }
  if (["multi_branch", "franchise", "enterprise"].includes(structure)) values.add("branches");
  if (["wholesale", "manufacturing"].includes(industry)) values.add("warehouse");

  return Array.from(values);
}

function recommendedWorkspaceMode(structure: StructureId, industry: IndustryId) {
  if (structure === "solo" && ["retail", "ecommerce"].includes(industry)) return "simple_shop";
  if (structure === "small_business" && industry === "retail") return "simple_shop";
  return "advanced_company";
}

function StepHeader({ step, title, copy }: { step: Step; title: string; copy: string }) {
  return (
    <div>
      <p className="text-xs font-black uppercase tracking-[0.18em] text-primary">Step {step} of 4</p>
      <h2 className="mt-2 text-2xl font-black tracking-tight text-text-primary sm:text-3xl">{title}</h2>
      <p className="mt-2 max-w-2xl text-sm leading-7 text-text-secondary sm:text-base">{copy}</p>
    </div>
  );
}

export default function BusinessDiscoveryWizard() {
  const [step, setStep] = useState<Step>(1);
  const [structure, setStructure] = useState<StructureId>("small_business");
  const [industry, setIndustry] = useState<IndustryId>("retail");
  const [countryCode, setCountryCode] = useState("PK");
  const [modules, setModules] = useState<ModuleId[]>(() => defaultModules("small_business", "retail"));

  const country = countries.find((item) => item.code === countryCode) ?? countries[0];
  const mode = recommendedWorkspaceMode(structure, industry);
  const selectedStructure = structures.find((item) => item.id === structure) ?? structures[0];
  const selectedIndustry = industries.find((item) => item.id === industry) ?? industries[0];

  const signupHref = useMemo(() => {
    const destination = new URLSearchParams({
      setup: "1",
      structure,
      business_type: industry,
      workspace_mode: mode,
      country: country.code,
      currency: country.currency,
      timezone: country.timezone,
      modules: modules.join(","),
    });
    const login = new URLSearchParams({
      mode: "signup",
      intent: "business",
      next: `/business?${destination.toString()}`,
    });
    return `/login?${login.toString()}`;
  }, [country, industry, mode, modules, structure]);

  function selectStructure(value: StructureId) {
    setStructure(value);
    setModules(defaultModules(value, industry));
  }

  function selectIndustry(value: IndustryId) {
    setIndustry(value);
    setModules(defaultModules(structure, value));
  }

  function toggleModule(value: ModuleId) {
    setModules((current) =>
      current.includes(value) ? current.filter((item) => item !== value) : [...current, value],
    );
  }

  return (
    <div className="rounded-[calc(var(--radius-card)+0.25rem)] bg-surface p-4 shadow-[var(--shadow-lg)] sm:p-6 lg:p-8">
      <div className="mb-7 grid grid-cols-4 gap-2" aria-label={`Business discovery progress: step ${step} of 4`}>
        {[1, 2, 3, 4].map((item) => (
          <span
            key={item}
            className={`h-1.5 rounded-full ${item <= step ? "bg-primary" : "bg-surface-secondary"}`}
            aria-hidden="true"
          />
        ))}
      </div>

      {step === 1 ? (
        <section>
          <StepHeader
            step={1}
            title="What kind of business structure do you run?"
            copy="Choose the structure that matches your operations today. JALVORO will keep the foundation ready for future growth."
          />
          <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {structures.map((item) => {
              const Icon = item.icon;
              const selected = structure === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => selectStructure(item.id)}
                  aria-pressed={selected}
                  className={`finance-focus min-h-44 rounded-[var(--radius-card)] p-5 text-left transition-[background-color,transform,box-shadow] hover:-translate-y-0.5 ${
                    selected
                      ? "bg-primary-soft text-primary shadow-[var(--shadow-sm)]"
                      : "bg-surface-secondary text-text-secondary"
                  }`}
                >
                  <span className="flex items-start justify-between gap-3">
                    <span className="grid size-11 place-items-center rounded-[var(--radius-button)] bg-surface text-primary">
                      <Icon className="size-5" aria-hidden="true" />
                    </span>
                    {selected ? <Check className="size-5" aria-hidden="true" /> : null}
                  </span>
                  <strong className="mt-5 block text-base text-text-primary">{item.title}</strong>
                  <span className="mt-2 block text-sm leading-6">{item.copy}</span>
                </button>
              );
            })}
          </div>
        </section>
      ) : null}

      {step === 2 ? (
        <section>
          <StepHeader
            step={2}
            title="Which industry best matches your business?"
            copy="Industry selection changes the recommended workflow. A restaurant should not receive the same system as a consultant or warehouse."
          />
          <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {industries.map((item) => {
              const Icon = item.icon;
              const selected = industry === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => selectIndustry(item.id)}
                  aria-pressed={selected}
                  className={`finance-focus rounded-[var(--radius-card)] p-4 text-left transition-[background-color,transform] hover:-translate-y-0.5 ${
                    selected ? "bg-primary-soft text-primary" : "bg-surface-secondary text-text-secondary"
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <span className="grid size-10 place-items-center rounded-[var(--radius-button)] bg-surface text-primary">
                      <Icon className="size-5" aria-hidden="true" />
                    </span>
                    <strong className="text-sm text-text-primary">{item.title}</strong>
                    {selected ? <Check className="ml-auto size-4" aria-hidden="true" /> : null}
                  </span>
                  <span className="mt-3 block text-xs leading-5">{item.copy}</span>
                </button>
              );
            })}
          </div>
        </section>
      ) : null}

      {step === 3 ? (
        <section>
          <StepHeader
            step={3}
            title="Where will this business operate first?"
            copy="Pakistan is fully supported as the first-class starting market, while country rules remain configurable for worldwide expansion."
          />
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {countries.map((item) => {
              const selected = countryCode === item.code;
              return (
                <button
                  key={item.code}
                  type="button"
                  onClick={() => setCountryCode(item.code)}
                  aria-pressed={selected}
                  className={`finance-focus rounded-[var(--radius-card)] p-4 text-left ${
                    selected ? "bg-primary-soft text-primary" : "bg-surface-secondary text-text-secondary"
                  }`}
                >
                  <span className="flex items-center justify-between gap-3">
                    <strong className="text-sm text-text-primary">{item.name}</strong>
                    <span className="text-xs font-black">{item.code}</span>
                  </span>
                  <span className="mt-3 block text-xs leading-5">{item.currency} · {item.timezone}</span>
                </button>
              );
            })}
          </div>
          <div className="mt-5 rounded-[var(--radius-card)] bg-success-soft p-4 text-sm leading-6 text-success">
            <strong className="block">Pakistan-first readiness</strong>
            PKR, Asia/Karachi, Pakistani phone and address formats, local tax and invoicing readiness, Urdu/English foundations, and regional payment integration readiness are part of the architecture.
          </div>
        </section>
      ) : null}

      {step === 4 ? (
        <section>
          <StepHeader
            step={4}
            title="Choose the systems your business needs"
            copy="These selections create the setup intent. Access will still be controlled by the final plan, organization role, and verified permissions."
          />
          <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {moduleChoices.map((item) => {
              const Icon = item.icon;
              const selected = modules.includes(item.id);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => toggleModule(item.id)}
                  aria-pressed={selected}
                  className={`finance-focus rounded-[var(--radius-card)] p-4 text-left ${
                    selected ? "bg-primary-soft text-primary" : "bg-surface-secondary text-text-secondary"
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <span className="grid size-10 place-items-center rounded-[var(--radius-button)] bg-surface text-primary">
                      <Icon className="size-5" aria-hidden={true} />
                    </span>
                    <strong className="text-sm text-text-primary">{item.title}</strong>
                    {selected ? <Check className="ml-auto size-4" aria-hidden="true" /> : null}
                  </span>
                  <span className="mt-3 block text-xs leading-5">{item.copy}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-6 rounded-[var(--radius-card)] bg-surface-secondary p-5">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">Recommended starting foundation</p>
            <h3 className="mt-2 text-xl font-black text-text-primary">{selectedStructure.title} · {selectedIndustry.title}</h3>
            <p className="mt-2 text-sm leading-6 text-text-secondary">
              {country.name} · {country.currency} · {mode === "simple_shop" ? "Fast commerce workspace" : "Advanced business workspace"} · {modules.length} selected systems
            </p>
            <div className="mt-4 grid gap-2 text-xs text-text-secondary sm:grid-cols-3">
              <span className="flex items-center gap-2"><ShieldCheck className="size-4 text-success" aria-hidden="true" /> Tenant-isolated data</span>
              <span className="flex items-center gap-2"><Globe2 className="size-4 text-primary" aria-hidden="true" /> Country-aware setup</span>
              <span className="flex items-center gap-2"><UsersRound className="size-4 text-primary" aria-hidden="true" /> Permission-ready roles</span>
            </div>
          </div>
        </section>
      ) : null}

      <div className="mt-8 flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
        {step > 1 ? (
          <button
            type="button"
            onClick={() => setStep((current) => Math.max(1, current - 1) as Step)}
            className="finance-focus inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--radius-button)] px-4 text-sm font-black text-text-secondary hover:bg-surface-secondary"
          >
            <ArrowLeft className="size-4" aria-hidden="true" /> Back
          </button>
        ) : (
          <span />
        )}

        {step < 4 ? (
          <button
            type="button"
            onClick={() => setStep((current) => Math.min(4, current + 1) as Step)}
            className="finance-focus inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--radius-button)] bg-primary px-5 text-sm font-black text-primary-foreground shadow-[var(--shadow-sm)]"
          >
            Continue <ArrowRight className="size-4" aria-hidden="true" />
          </button>
        ) : (
          <Link
            href={signupHref}
            className="finance-focus inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--radius-button)] bg-primary px-5 text-sm font-black text-primary-foreground shadow-[var(--shadow-sm)]"
          >
            Create secure business account <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        )}
      </div>
    </div>
  );
}
