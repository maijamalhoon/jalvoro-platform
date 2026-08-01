"use client";

import Link from "next/link";
import {
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  ChevronRight,
  Globe2,
  GraduationCap,
  Layers3,
  LockKeyhole,
  Network,
  ShieldCheck,
  Sparkles,
  UserRound,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState, type ChangeEvent } from "react";

import {
  BUSINESS_PLAN_ORDER,
  BUSINESS_PLANS,
  BUSINESS_SYSTEMS,
  PERSONAL_PLAN_ORDER,
  PERSONAL_PLANS,
  SUPPORTED_COUNTRY_CODES,
  formatUsdPrice,
  getBusinessAnnualSavings,
  getBusinessPlanPrice,
  getPersonalAnnualSavings,
  getPersonalPlanPrice,
  getPricingTier,
} from "@/lib/pricing/catalog";
import {
  BUSINESS_FEATURE_LABELS,
  BUSINESS_PLAN_MARKETING,
  PERSONAL_FEATURE_LABELS,
  PERSONAL_PLAN_MARKETING,
  PRICING_FAQS,
} from "@/lib/pricing/marketing";
import type {
  BillingCycle,
  BusinessFeatureKey,
  BusinessPlanKey,
  PaidBusinessPlanKey,
  PaidPersonalPlanKey,
  PersonalFeatureKey,
  PersonalPlanKey,
  PricingUniverse,
} from "@/lib/pricing/types";

const SUPPORTED_COUNTRIES = new Set<string>(SUPPORTED_COUNTRY_CODES);

function normalizeCountryCode(value?: string | null): string | null {
  const normalized = value?.trim().toUpperCase();
  return normalized && SUPPORTED_COUNTRIES.has(normalized) ? normalized : null;
}

function detectBrowserCountry(): string | null {
  if (typeof navigator === "undefined") return null;

  for (const locale of navigator.languages) {
    try {
      const region = normalizeCountryCode(new Intl.Locale(locale).region);
      if (region) return region;
    } catch {
      // Continue through the browser locale list.
    }
  }

  return null;
}

function selectionPath({
  universe,
  plan,
  cycle,
  country,
}: {
  universe: PricingUniverse;
  plan: PersonalPlanKey | BusinessPlanKey;
  cycle: BillingCycle;
  country: string;
}) {
  const params = new URLSearchParams({ universe, plan, cycle, country });
  return `/plan-selected?${params.toString()}`;
}

function signupPath(reviewPath: string, workspace?: PricingUniverse) {
  const params = new URLSearchParams({ mode: "signup", next: reviewPath });
  if (workspace) params.set("workspace", workspace);
  return `/login?${params.toString()}`;
}

function PlanIcon({
  universe,
  plan,
}: {
  universe: PricingUniverse;
  plan: PersonalPlanKey | BusinessPlanKey;
}) {
  if (universe === "personal") {
    if (plan === "student") {
      return <GraduationCap className="size-5 text-investment" aria-hidden="true" />;
    }
    if (plan === "pro") {
      return <Sparkles className="size-5 text-primary" aria-hidden="true" />;
    }
    if (plan === "free") {
      return <ShieldCheck className="size-5 text-success" aria-hidden="true" />;
    }
    return <UserRound className="size-5 text-transfer" aria-hidden="true" />;
  }

  if (plan === "business_free" || plan === "solo") {
    return <UserRound className="size-5 text-success" aria-hidden="true" />;
  }
  if (plan === "starter") {
    return <Users className="size-5 text-transfer" aria-hidden="true" />;
  }
  if (plan === "growth") {
    return <Building2 className="size-5 text-primary" aria-hidden="true" />;
  }
  if (plan === "scale") {
    return <Network className="size-5 text-investment" aria-hidden="true" />;
  }
  return <Layers3 className="size-5 text-payables" aria-hidden="true" />;
}

function PlanAction({
  href,
  featured,
  children,
}: {
  href: string;
  featured?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-4 text-sm font-extrabold transition focus-visible:shadow-[var(--focus-ring)] ${
        featured
          ? "bg-primary text-primary-foreground shadow-theme hover:bg-primary-hover"
          : "border border-border bg-surface-inset text-text-primary hover:border-border-strong hover:bg-surface"
      }`}
    >
      {children}
      <ArrowRight className="size-4" aria-hidden="true" />
    </Link>
  );
}

function FeatureList({
  entries,
}: {
  entries: Array<{ key: string; label: string; allowance: boolean | number }>;
}) {
  return (
    <ul className="flex-1 space-y-3 text-sm text-text-secondary">
      {entries.slice(0, 7).map(({ key, label, allowance }) => (
        <li key={key} className="flex gap-2.5">
          <Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
          <span className="leading-6">
            {label}
            {typeof allowance === "number" ? ` (${allowance}/month)` : ""}
          </span>
        </li>
      ))}
    </ul>
  );
}

function PersonalPlanCards({
  countryCode,
  billingCycle,
}: {
  countryCode: string;
  billingCycle: BillingCycle;
}) {
  return (
    <section aria-labelledby="personal-plan-heading" className="space-y-8">
      <div className="mx-auto max-w-3xl text-center">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-primary">
          Personal Finance plans
        </p>
        <h2
          id="personal-plan-heading"
          className="mt-3 text-balance text-3xl font-extrabold tracking-tight text-text-primary sm:text-5xl"
        >
          Start simple, then add depth when your financial life needs it.
        </h2>
        <p className="mt-4 text-pretty text-sm leading-7 text-text-muted sm:text-base">
          Every plan stays inside Personal Finance. Business, POS, restaurant,
          dealership, company, and enterprise records remain outside personal AI.
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-5">
        {PERSONAL_PLAN_ORDER.map((planKey) => {
          const plan = PERSONAL_PLANS[planKey];
          const marketing = PERSONAL_PLAN_MARKETING[planKey];
          const paidPlan = planKey === "free" ? null : (planKey as PaidPersonalPlanKey);
          const price = paidPlan
            ? getPersonalPlanPrice(paidPlan, countryCode, billingCycle)
            : 0;
          const savings = paidPlan
            ? getPersonalAnnualSavings(paidPlan, countryCode)
            : 0;
          const reviewPath = selectionPath({
            universe: "personal",
            plan: planKey,
            cycle: billingCycle,
            country: countryCode,
          });
          const features = Object.entries(plan.features)
            .filter(([, value]) => value === true || (typeof value === "number" && value > 0))
            .map(([key, allowance]) => ({
              key,
              label: PERSONAL_FEATURE_LABELS[key as PersonalFeatureKey],
              allowance: allowance as boolean | number,
            }));

          return (
            <article
              key={planKey}
              className={`relative flex min-h-full flex-col overflow-hidden rounded-[1.75rem] border bg-surface p-5 shadow-soft transition duration-300 hover:-translate-y-1 hover:shadow-premium sm:p-6 ${
                plan.recommended
                  ? "border-primary ring-1 ring-primary/15"
                  : "border-border"
              }`}
            >
              {plan.recommended ? (
                <div className="absolute inset-x-0 top-0 bg-primary px-3 py-2 text-center text-xs font-extrabold text-primary-foreground">
                  Best value for most people
                </div>
              ) : null}

              <div className={plan.recommended ? "pt-8" : ""}>
                <div className="flex items-center justify-between gap-3">
                  <span className="inline-flex size-10 items-center justify-center rounded-2xl bg-surface-inset">
                    <PlanIcon universe="personal" plan={planKey} />
                  </span>
                  {marketing.badge ? (
                    <span className="rounded-full bg-primary-soft px-2.5 py-1 text-[0.7rem] font-extrabold text-primary">
                      {marketing.badge}
                    </span>
                  ) : null}
                </div>
                <p className="mt-5 text-xs font-bold uppercase tracking-[0.14em] text-text-muted">
                  {marketing.audience}
                </p>
                <h3 className="mt-2 text-2xl font-extrabold text-text-primary">
                  {plan.name}
                </h3>
                <p className="mt-3 min-h-20 text-sm leading-6 text-text-muted">
                  {marketing.summary}
                </p>
              </div>

              <div className="mt-6 border-y border-border py-5">
                <div className="flex items-end gap-1">
                  <strong className="text-3xl font-extrabold tracking-[-0.04em] text-text-primary">
                    {formatUsdPrice(price)}
                  </strong>
                  <span className="pb-1 text-sm text-text-muted">
                    /{billingCycle === "annual" ? "year" : "month"}
                  </span>
                </div>
                <p className="mt-1 text-xs leading-5 text-text-muted">
                  {planKey === "free"
                    ? "Permanent access. No card required."
                    : billingCycle === "annual"
                      ? `Save about ${savings}% annually.`
                      : "Payment collection is not active yet."}
                </p>
              </div>

              <div className="mt-5 flex flex-1 flex-col">
                <FeatureList entries={features} />
                <div className="mt-6 grid gap-2">
                  <PlanAction
                    href={signupPath(reviewPath, "personal")}
                    featured={plan.recommended}
                  >
                    {planKey === "free" ? "Continue Free" : `Choose ${plan.name}`}
                  </PlanAction>
                  <Link
                    href={`/pricing/personal/${planKey}?cycle=${billingCycle}&country=${countryCode}`}
                    className="inline-flex min-h-11 items-center justify-center gap-1 rounded-xl px-3 text-sm font-bold text-primary transition hover:bg-primary-soft focus-visible:shadow-[var(--focus-ring)]"
                  >
                    Explore full plan
                    <ChevronRight className="size-4" aria-hidden="true" />
                  </Link>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function BusinessPlanCards({
  countryCode,
  billingCycle,
}: {
  countryCode: string;
  billingCycle: BillingCycle;
}) {
  return (
    <section aria-labelledby="business-plan-heading" className="space-y-8">
      <div className="mx-auto max-w-3xl text-center">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-primary">
          Business plans
        </p>
        <h2
          id="business-plan-heading"
          className="mt-3 text-balance text-3xl font-extrabold tracking-tight text-text-primary sm:text-5xl"
        >
          Choose capacity for the business you operate today.
        </h2>
        <p className="mt-4 text-pretty text-sm leading-7 text-text-muted sm:text-base">
          Each company keeps its own team, permissions, plan choice, and future
          invoice. Business and Enterprise data receive no AI entitlement.
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {BUSINESS_PLAN_ORDER.map((planKey) => {
          const plan = BUSINESS_PLANS[planKey];
          const marketing = BUSINESS_PLAN_MARKETING[planKey];
          const paidPlan =
            planKey === "business_free" || planKey === "enterprise"
              ? null
              : (planKey as PaidBusinessPlanKey);
          const price = paidPlan
            ? getBusinessPlanPrice(paidPlan, countryCode, billingCycle)
            : 0;
          const savings = paidPlan
            ? getBusinessAnnualSavings(paidPlan, countryCode)
            : 0;
          const reviewPath = selectionPath({
            universe: "business",
            plan: planKey,
            cycle: billingCycle,
            country: countryCode,
          });
          const features = Object.entries(plan.features)
            .filter(([, value]) => value === true || (typeof value === "number" && value > 0))
            .map(([key, allowance]) => ({
              key,
              label: BUSINESS_FEATURE_LABELS[key as BusinessFeatureKey],
              allowance: allowance as boolean | number,
            }));

          return (
            <article
              key={planKey}
              className={`relative flex min-h-full flex-col overflow-hidden rounded-[1.75rem] border bg-surface p-5 shadow-soft transition duration-300 hover:-translate-y-1 hover:shadow-premium sm:p-6 ${
                plan.recommended
                  ? "border-primary ring-1 ring-primary/15"
                  : "border-border"
              }`}
            >
              {plan.recommended ? (
                <div className="absolute inset-x-0 top-0 bg-primary px-3 py-2 text-center text-xs font-extrabold text-primary-foreground">
                  Best for growing companies
                </div>
              ) : null}

              <div className={plan.recommended ? "pt-8" : ""}>
                <div className="flex items-center justify-between gap-3">
                  <span className="inline-flex size-10 items-center justify-center rounded-2xl bg-surface-inset">
                    <PlanIcon universe="business" plan={planKey} />
                  </span>
                  {marketing.badge ? (
                    <span className="rounded-full bg-primary-soft px-2.5 py-1 text-[0.7rem] font-extrabold text-primary">
                      {marketing.badge}
                    </span>
                  ) : null}
                </div>
                <p className="mt-5 text-xs font-bold uppercase tracking-[0.14em] text-text-muted">
                  {marketing.audience}
                </p>
                <h3 className="mt-2 text-2xl font-extrabold text-text-primary">
                  {plan.name}
                </h3>
                <p className="mt-3 min-h-24 text-sm leading-6 text-text-muted">
                  {marketing.summary}
                </p>
              </div>

              <div className="mt-6 border-y border-border py-5">
                {plan.customPricing ? (
                  <strong className="text-3xl font-extrabold text-text-primary">
                    Custom
                  </strong>
                ) : (
                  <div className="flex items-end gap-1">
                    <strong className="text-3xl font-extrabold tracking-[-0.04em] text-text-primary">
                      {formatUsdPrice(price)}
                    </strong>
                    <span className="pb-1 text-sm text-text-muted">
                      /{billingCycle === "annual" ? "year" : "month"}
                    </span>
                  </div>
                )}
                <p className="mt-1 text-xs leading-5 text-text-muted">
                  {plan.customPricing
                    ? "Reviewed capacity and rollout plan."
                    : planKey === "business_free"
                      ? "Permanent access. No card required."
                      : billingCycle === "annual"
                        ? `Save about ${savings}% annually.`
                        : "Payment collection is not active yet."}
                </p>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2 text-xs font-bold text-text-secondary">
                <span className="rounded-xl bg-surface-inset px-3 py-3">
                  {plan.includedSeats === null
                    ? "Custom seats"
                    : `${plan.includedSeats} seat${plan.includedSeats === 1 ? "" : "s"}`}
                </span>
                <span className="rounded-xl bg-surface-inset px-3 py-3">
                  {plan.includedBranches === null
                    ? "Custom branches"
                    : `${plan.includedBranches} branch${plan.includedBranches === 1 ? "" : "es"}`}
                </span>
              </div>

              <div className="mt-5 flex flex-1 flex-col">
                <FeatureList entries={features} />
                <div className="mt-6 grid gap-2">
                  <PlanAction
                    href={signupPath(reviewPath, "business")}
                    featured={plan.recommended}
                  >
                    {planKey === "business_free"
                      ? "Continue Free"
                      : planKey === "enterprise"
                        ? "Plan enterprise rollout"
                        : `Choose ${plan.name}`}
                  </PlanAction>
                  <Link
                    href={`/pricing/business/${planKey}?cycle=${billingCycle}&country=${countryCode}`}
                    className="inline-flex min-h-11 items-center justify-center gap-1 rounded-xl px-3 text-sm font-bold text-primary transition hover:bg-primary-soft focus-visible:shadow-[var(--focus-ring)]"
                  >
                    Explore full plan
                    <ChevronRight className="size-4" aria-hidden="true" />
                  </Link>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function ComparisonTable({ universe }: { universe: PricingUniverse }) {
  if (universe === "personal") {
    const rows = Object.entries(PERSONAL_FEATURE_LABELS) as Array<
      [PersonalFeatureKey, string]
    >;

    return (
      <section className="space-y-5" aria-labelledby="personal-comparison-heading">
        <div className="text-center">
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-primary">
            Compare Personal plans
          </p>
          <h2 id="personal-comparison-heading" className="mt-2 text-3xl font-extrabold text-text-primary">
            Every included feature, side by side.
          </h2>
        </div>
        <div className="overflow-x-auto rounded-3xl border border-border bg-surface shadow-soft">
          <table className="min-w-[860px] w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-inset text-left">
                <th className="sticky left-0 z-10 bg-surface-inset px-5 py-4 font-extrabold text-text-primary">
                  Feature
                </th>
                {PERSONAL_PLAN_ORDER.map((plan) => (
                  <th key={plan} className="px-4 py-4 text-center font-extrabold text-text-primary">
                    {PERSONAL_PLANS[plan].name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(([feature, label]) => (
                <tr key={feature} className="border-b border-border last:border-b-0">
                  <th className="sticky left-0 z-10 bg-surface px-5 py-4 text-left font-semibold text-text-secondary">
                    {label}
                  </th>
                  {PERSONAL_PLAN_ORDER.map((plan) => {
                    const value = PERSONAL_PLANS[plan].features[feature];
                    return (
                      <td key={plan} className="px-4 py-4 text-center text-text-muted">
                        {typeof value === "number" && value > 0 ? (
                          <span className="font-bold text-text-primary">{value}/mo</span>
                        ) : value === true ? (
                          <CheckCircle2 className="mx-auto size-5 text-success" aria-label="Included" />
                        ) : (
                          <span aria-label="Not included">—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    );
  }

  const rows = Object.entries(BUSINESS_FEATURE_LABELS) as Array<
    [BusinessFeatureKey, string]
  >;

  return (
    <section className="space-y-5" aria-labelledby="business-comparison-heading">
      <div className="text-center">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-primary">
          Compare Business plans
        </p>
        <h2 id="business-comparison-heading" className="mt-2 text-3xl font-extrabold text-text-primary">
          Capacity and operating controls, side by side.
        </h2>
      </div>
      <div className="overflow-x-auto rounded-3xl border border-border bg-surface shadow-soft">
        <table className="min-w-[1040px] w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-inset text-left">
              <th className="sticky left-0 z-10 bg-surface-inset px-5 py-4 font-extrabold text-text-primary">
                Feature
              </th>
              {BUSINESS_PLAN_ORDER.map((plan) => (
                <th key={plan} className="px-4 py-4 text-center font-extrabold text-text-primary">
                  {BUSINESS_PLANS[plan].name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(([feature, label]) => (
              <tr key={feature} className="border-b border-border last:border-b-0">
                <th className="sticky left-0 z-10 bg-surface px-5 py-4 text-left font-semibold text-text-secondary">
                  {label}
                </th>
                {BUSINESS_PLAN_ORDER.map((plan) => (
                  <td key={plan} className="px-4 py-4 text-center text-text-muted">
                    {BUSINESS_PLANS[plan].features[feature] === true ? (
                      <CheckCircle2 className="mx-auto size-5 text-success" aria-label="Included" />
                    ) : (
                      <span aria-label="Not included">—</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function PricingExperience({
  initialCountryCode,
}: {
  initialCountryCode?: string | null;
}) {
  const serverCountry = normalizeCountryCode(initialCountryCode);
  const [countryCode, setCountryCode] = useState(serverCountry ?? "US");
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("annual");
  const [universe, setUniverse] = useState<PricingUniverse>("personal");

  useEffect(() => {
    if (serverCountry) return;
    const browserCountry = detectBrowserCountry();
    if (browserCountry) setCountryCode(browserCountry);
  }, [serverCountry]);

  const countryNames = useMemo(
    () => new Intl.DisplayNames(["en"], { type: "region" }),
    [],
  );
  const countries = useMemo(
    () =>
      SUPPORTED_COUNTRY_CODES.map((code) => ({
        code,
        name: countryNames.of(code) ?? code,
      })).sort((left, right) => left.name.localeCompare(right.name)),
    [countryNames],
  );
  const countryName = countryNames.of(countryCode) ?? countryCode;
  const tier = getPricingTier(countryCode);

  return (
    <div className="space-y-20">
      <section className="mx-auto grid max-w-5xl gap-4 rounded-3xl border border-border bg-surface p-4 shadow-soft lg:grid-cols-[auto_1fr_auto] lg:items-end lg:p-6">
        <div
          className="grid grid-cols-2 rounded-xl border border-border bg-surface-inset p-1"
          aria-label="Pricing universe"
        >
          {(["personal", "business"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setUniverse(value)}
              aria-pressed={universe === value}
              className={`min-h-11 rounded-lg px-4 text-sm font-bold capitalize transition ${
                universe === value
                  ? "bg-primary text-primary-foreground shadow-theme"
                  : "text-text-secondary hover:bg-surface"
              }`}
            >
              {value}
            </button>
          ))}
        </div>

        <label className="grid gap-2 text-sm font-semibold text-text-primary">
          Pricing country
          <select
            value={countryCode}
            onChange={(event: ChangeEvent<HTMLSelectElement>) =>
              setCountryCode(event.target.value)
            }
            className="min-h-11 rounded-xl border border-border bg-surface-inset px-3 text-sm font-medium outline-none focus-visible:shadow-[var(--focus-ring)]"
          >
            {countries.map(({ code, name }) => (
              <option key={code} value={code}>
                {name}
              </option>
            ))}
          </select>
          <span className="font-normal text-text-muted">
            {countryName} uses regional tier {tier}. Final tax and currency will
            be confirmed only after provider checkout is activated.
          </span>
        </label>

        <div
          className="grid grid-cols-2 rounded-xl border border-border bg-surface-inset p-1"
          aria-label="Billing cycle"
        >
          {(["monthly", "annual"] as const).map((cycle) => (
            <button
              key={cycle}
              type="button"
              onClick={() => setBillingCycle(cycle)}
              aria-pressed={billingCycle === cycle}
              className={`min-h-11 rounded-lg px-4 text-sm font-bold capitalize transition ${
                billingCycle === cycle
                  ? "bg-primary text-primary-foreground shadow-theme"
                  : "text-text-secondary hover:bg-surface"
              }`}
            >
              {cycle}
            </button>
          ))}
        </div>
      </section>

      {universe === "personal" ? (
        <PersonalPlanCards countryCode={countryCode} billingCycle={billingCycle} />
      ) : (
        <BusinessPlanCards countryCode={countryCode} billingCycle={billingCycle} />
      )}

      <section className="grid gap-5 md:grid-cols-3">
        {[
          {
            icon: ShieldCheck,
            title: "Free means permanent",
            copy: "Personal Free and Business Free do not expire. Upgrade only when advanced tools or capacity become useful.",
          },
          {
            icon: LockKeyhole,
            title: "Provider-ready, not provider-live",
            copy: "You can select a plan today, but real card collection remains disabled until the final approved payment launch.",
          },
          {
            icon: Globe2,
            title: "Built for global access",
            copy: "Regional price tiers improve accessibility while the final provider will confirm local currency and tax.",
          },
        ].map(({ icon: Icon, title, copy }) => (
          <article key={title} className="rounded-3xl border border-border bg-surface p-6 shadow-soft">
            <span className="inline-flex size-11 items-center justify-center rounded-2xl bg-primary-soft text-primary">
              <Icon className="size-5" aria-hidden="true" />
            </span>
            <h2 className="mt-5 text-xl font-extrabold text-text-primary">{title}</h2>
            <p className="mt-2 text-sm leading-7 text-text-muted">{copy}</p>
          </article>
        ))}
      </section>

      <ComparisonTable universe={universe} />

      {universe === "business" ? (
        <section className="rounded-[2rem] border border-border bg-surface p-5 shadow-soft sm:p-8">
          <div className="max-w-3xl">
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-primary">
              Nature-specific operating systems
            </p>
            <h2 className="mt-2 text-3xl font-extrabold text-text-primary sm:text-4xl">
              The plan provides capacity. The business nature shapes the system.
            </h2>
            <p className="mt-3 text-sm leading-7 text-text-muted sm:text-base">
              Shared finance foundations do not force every company into the same
              screens. POS, restaurant, dealership, construction, manufacturing,
              service, and enterprise operations remain purpose-built.
            </p>
          </div>
          <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {BUSINESS_SYSTEMS.map(([name, description]) => (
              <article key={name} className="rounded-2xl border border-border bg-surface-inset p-4">
                <h3 className="font-extrabold text-text-primary">{name}</h3>
                <p className="mt-1 text-sm leading-6 text-text-muted">{description}</p>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section className="mx-auto max-w-4xl" aria-labelledby="pricing-faq-heading">
        <div className="text-center">
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-primary">
            Questions before choosing
          </p>
          <h2 id="pricing-faq-heading" className="mt-2 text-3xl font-extrabold text-text-primary sm:text-4xl">
            Clear answers, including what is not live yet.
          </h2>
        </div>
        <div className="mt-7 space-y-3">
          {PRICING_FAQS.map(({ question, answer }) => (
            <details key={question} className="group rounded-2xl border border-border bg-surface px-5 py-4 shadow-soft">
              <summary className="cursor-pointer list-none font-extrabold text-text-primary">
                <span className="flex items-center justify-between gap-4">
                  {question}
                  <ChevronRight className="size-5 shrink-0 transition group-open:rotate-90" aria-hidden="true" />
                </span>
              </summary>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-text-muted">{answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="overflow-hidden rounded-[2rem] border border-primary/20 bg-primary px-6 py-9 text-primary-foreground shadow-premium sm:px-10 sm:py-12">
        <div className="grid gap-7 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.16em] opacity-80">
              Choose without payment pressure
            </p>
            <h2 className="mt-2 text-balance text-3xl font-extrabold sm:text-5xl">
              Create your account and save the plan that fits.
            </h2>
            <p className="mt-4 max-w-3xl text-sm leading-7 opacity-85 sm:text-base">
              Free access is available now. Paid collection stays off until the
              final provider catalog, approved domain, credentials, and sandbox
              lifecycle have been verified.
            </p>
          </div>
          <Link
            href={universe === "personal" ? "/login?mode=signup" : "/login?mode=signup&workspace=business"}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-surface px-5 text-sm font-extrabold text-text-primary transition hover:bg-surface-inset focus-visible:shadow-[var(--focus-ring)]"
          >
            Continue Free
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </section>
    </div>
  );
}
