"use client";

import Link from "next/link";
import {
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
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
import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type ReactNode,
} from "react";

import {
  BUSINESS_PLAN_ORDER,
  BUSINESS_PLANS,
  BUSINESS_SYSTEMS,
  BUSINESS_TRIAL_LENGTH_DAYS,
  getBusinessAnnualSavingsPercent,
  getBusinessPlanPrice,
} from "@/lib/billing/business-catalog";
import {
  SUPPORTED_COUNTRY_CODES,
  formatUsdPrice,
  getAnnualSavingsPercent,
  getPlanPrice,
  getPricingTier,
  PLAN_ORDER,
  PLANS,
  TRIAL_LENGTH_DAYS,
} from "@/lib/billing/catalog";
import {
  BUSINESS_FEATURE_LABELS,
  BUSINESS_PLAN_MARKETING,
  PERSONAL_FEATURE_LABELS,
  PERSONAL_PLAN_MARKETING,
  PRICING_FAQS,
} from "@/lib/billing/marketing";
import type {
  BillingCycle,
  BusinessPlanKey,
  PaidPlanKey,
  PlanKey,
  PricedBusinessPlanKey,
} from "@/lib/billing/types";

const SUPPORTED_COUNTRIES = new Set<string>(SUPPORTED_COUNTRY_CODES);

type PricingUniverse = "personal" | "business";

type RegionalPricingProps = {
  initialCountryCode?: string | null;
};

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

function ChoiceButton({
  href,
  featured,
  children,
}: {
  href: string;
  featured?: boolean;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex min-h-12 items-center justify-center rounded-xl px-4 text-sm font-extrabold transition focus-visible:shadow-[var(--focus-ring)] ${
        featured
          ? "bg-primary text-primary-foreground shadow-theme hover:bg-primary-hover"
          : "border border-border bg-surface-inset text-text-primary hover:border-border-strong hover:bg-surface"
      }`}
    >
      {children}
    </Link>
  );
}

function FeatureList({
  features,
  copy,
  limit = 6,
}: {
  features: Record<string, boolean | number | undefined>;
  copy: Record<string, string>;
  limit?: number;
}) {
  return (
    <ul className="flex-1 space-y-3 text-sm text-text-secondary">
      {Object.entries(features)
        .filter(
          ([, allowance]) =>
            allowance === true ||
            (typeof allowance === "number" && allowance > 0),
        )
        .slice(0, limit)
        .map(([feature, allowance]) => (
          <li key={feature} className="flex gap-2.5">
            <Check
              className="mt-0.5 size-4 shrink-0 text-success"
              aria-hidden="true"
            />
            <span className="leading-6">
              {copy[feature] ?? feature}
              {typeof allowance === "number"
                ? ` (${allowance}/month)`
                : ""}
            </span>
          </li>
        ))}
    </ul>
  );
}

function PersonalPlanIcon({ planKey }: { planKey: PlanKey }) {
  if (planKey === "student") {
    return <GraduationCap className="size-5 text-investment" aria-hidden="true" />;
  }
  if (planKey === "pro") {
    return <Sparkles className="size-5 text-primary" aria-hidden="true" />;
  }
  if (planKey === "free") {
    return <ShieldCheck className="size-5 text-success" aria-hidden="true" />;
  }
  return <UserRound className="size-5 text-transfer" aria-hidden="true" />;
}

function BusinessIcon({ planKey }: { planKey: BusinessPlanKey }) {
  if (planKey === "business_free" || planKey === "solo") {
    return <UserRound className="size-5 text-success" aria-hidden="true" />;
  }
  if (planKey === "starter") {
    return <Users className="size-5 text-transfer" aria-hidden="true" />;
  }
  if (planKey === "growth") {
    return <Building2 className="size-5 text-primary" aria-hidden="true" />;
  }
  if (planKey === "scale") {
    return <Network className="size-5 text-investment" aria-hidden="true" />;
  }
  return <Layers3 className="size-5 text-payables" aria-hidden="true" />;
}

function DetailLink({ href }: { href: string }) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-11 items-center justify-center gap-1 rounded-xl px-3 text-sm font-bold text-primary transition hover:bg-primary-soft focus-visible:shadow-[var(--focus-ring)]"
    >
      Explore full plan
      <ChevronRight className="size-4" aria-hidden="true" />
    </Link>
  );
}

function PersonalPricing({
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
          Every plan stays inside your Personal Finance universe. Business, POS,
          restaurant, dealership, company, and enterprise records are never
          included in a personal subscription.
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-5">
        {PLAN_ORDER.map((planKey) => {
          const plan = PLANS[planKey];
          const marketing = PERSONAL_PLAN_MARKETING[planKey];
          const paidPlanKey =
            planKey === "free" ? null : (planKey as PaidPlanKey);
          const price = paidPlanKey
            ? getPlanPrice(paidPlanKey, countryCode, billingCycle)
            : 0;
          const savings = paidPlanKey
            ? getAnnualSavingsPercent(paidPlanKey, countryCode)
            : 0;
          const personalCheckoutPath = paidPlanKey
            ? `/billing/personal-checkout?plan=${paidPlanKey}&cycle=${billingCycle}&country=${countryCode}`
            : null;
          const detailHref = `/pricing/personal/${planKey}?cycle=${billingCycle}&country=${countryCode}`;
          const ctaHref =
            planKey === "free"
              ? "/login?mode=signup"
              : planKey === "pro"
                ? `/login?mode=signup&next=${encodeURIComponent("/billing/personal-trial")}`
                : `/login?mode=signup&next=${encodeURIComponent(personalCheckoutPath ?? "/pricing")}`;

          return (
            <article
              key={plan.key}
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
                    <PersonalPlanIcon planKey={planKey} />
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
                      : "Final tax and currency confirmed before payment."}
                </p>
              </div>

              <div className="mt-5 flex flex-1 flex-col">
                <FeatureList
                  features={plan.features}
                  copy={PERSONAL_FEATURE_LABELS}
                />
                <div className="mt-6 grid gap-2">
                  <ChoiceButton href={ctaHref} featured={plan.recommended}>
                    {planKey === "free"
                      ? "Continue Free"
                      : planKey === "pro"
                        ? `Try Pro for ${TRIAL_LENGTH_DAYS} days`
                        : `Choose ${plan.name}`}
                  </ChoiceButton>
                  <DetailLink href={detailHref} />
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export function BusinessPlanGrid({
  countryCode,
  billingCycle,
  businessId,
  freeHref,
}: {
  countryCode: string;
  billingCycle: BillingCycle;
  businessId?: string;
  freeHref?: string;
}) {
  return (
    <section
      className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6"
      aria-label="Business subscription plans"
    >
      {BUSINESS_PLAN_ORDER.map((planKey) => {
        const plan = BUSINESS_PLANS[planKey];
        const marketing = BUSINESS_PLAN_MARKETING[planKey];
        const pricedPlanKey =
          planKey === "business_free" || planKey === "enterprise"
            ? null
            : (planKey as PricedBusinessPlanKey);
        const price = pricedPlanKey
          ? getBusinessPlanPrice(pricedPlanKey, countryCode, billingCycle)
          : 0;
        const savings = pricedPlanKey
          ? getBusinessAnnualSavingsPercent(pricedPlanKey, countryCode)
          : 0;
        const intent = businessId
          ? `&businessId=${encodeURIComponent(businessId)}`
          : "";
        const detailHref = `/pricing/business/${planKey}?cycle=${billingCycle}&country=${countryCode}`;

        return (
          <article
            key={plan.key}
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
                  <BusinessIcon planKey={planKey} />
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
                  ? "Reviewed contract, capacity, and implementation."
                  : planKey === "business_free"
                    ? "Permanent access. No card required."
                    : billingCycle === "annual" && pricedPlanKey
                      ? `Save about ${savings}% annually.`
                      : "Base workspace price before final tax."}
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
              <FeatureList
                features={plan.features}
                copy={BUSINESS_FEATURE_LABELS}
              />
              <div className="mt-6 grid gap-2">
                <ChoiceButton
                  href={
                    planKey === "business_free"
                      ? freeHref ?? "/login?mode=signup&workspace=business"
                      : planKey === "enterprise"
                        ? `/login?mode=signup&workspace=business&intent=enterprise${intent}`
                        : `/login?mode=signup&workspace=business&intent=upgrade&plan=${planKey}${intent}`
                  }
                  featured={plan.recommended}
                >
                  {planKey === "enterprise"
                    ? "Plan enterprise rollout"
                    : planKey === "business_free"
                      ? "Continue Free"
                      : planKey === "growth"
                        ? `Try Growth for ${BUSINESS_TRIAL_LENGTH_DAYS} days`
                        : `Choose ${plan.name}`}
                </ChoiceButton>
                <DetailLink href={detailHref} />
              </div>
            </div>
          </article>
        );
      })}
    </section>
  );
}

function BusinessPricing({
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
          Choose capacity for the company you operate today.
        </h2>
        <p className="mt-4 text-pretty text-sm leading-7 text-text-muted sm:text-base">
          Every company receives its own nature-specific system, users, roles,
          permissions, subscription, and invoice. Business and Enterprise plans
          contain no AI entitlement.
        </p>
      </div>

      <BusinessPlanGrid
        countryCode={countryCode}
        billingCycle={billingCycle}
      />
    </section>
  );
}

function FeatureValue({ value }: { value: boolean | number | undefined }) {
  if (typeof value === "number" && value > 0) {
    return <span className="font-bold text-primary">{value}/mo</span>;
  }
  if (value === true) {
    return (
      <CheckCircle2 className="mx-auto size-5 text-success" aria-label="Included" />
    );
  }
  return <span className="text-text-muted">—</span>;
}

function PersonalComparison() {
  return (
    <div className="overflow-x-auto rounded-3xl border border-border bg-surface shadow-soft">
      <table className="min-w-[58rem] w-full border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-border bg-surface-inset">
            <th className="sticky left-0 z-10 min-w-72 bg-surface-inset px-5 py-4 font-extrabold text-text-primary">
              Personal feature
            </th>
            {PLAN_ORDER.map((planKey) => (
              <th key={planKey} className="min-w-28 px-4 py-4 text-center font-extrabold">
                {PLANS[planKey].name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Object.entries(PERSONAL_FEATURE_LABELS).map(([feature, label]) => (
            <tr key={feature} className="border-b border-border last:border-b-0">
              <th className="sticky left-0 z-10 bg-surface px-5 py-4 font-semibold text-text-secondary">
                {label}
              </th>
              {PLAN_ORDER.map((planKey) => (
                <td key={planKey} className="px-4 py-4 text-center">
                  <FeatureValue
                    value={
                      PLANS[planKey].features[
                        feature as keyof typeof PLANS.free.features
                      ]
                    }
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BusinessComparison() {
  return (
    <div className="overflow-x-auto rounded-3xl border border-border bg-surface shadow-soft">
      <table className="min-w-[74rem] w-full border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-border bg-surface-inset">
            <th className="sticky left-0 z-10 min-w-72 bg-surface-inset px-5 py-4 font-extrabold text-text-primary">
              Business feature
            </th>
            {BUSINESS_PLAN_ORDER.map((planKey) => (
              <th key={planKey} className="min-w-32 px-4 py-4 text-center font-extrabold">
                {BUSINESS_PLANS[planKey].name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Object.entries(BUSINESS_FEATURE_LABELS).map(([feature, label]) => (
            <tr key={feature} className="border-b border-border last:border-b-0">
              <th className="sticky left-0 z-10 bg-surface px-5 py-4 font-semibold text-text-secondary">
                {label}
              </th>
              {BUSINESS_PLAN_ORDER.map((planKey) => (
                <td key={planKey} className="px-4 py-4 text-center">
                  <FeatureValue
                    value={
                      BUSINESS_PLANS[planKey].features[
                        feature as keyof typeof BUSINESS_PLANS.business_free.features
                      ]
                    }
                  />
                </td>
              ))}
            </tr>
          ))}
          <tr className="border-t border-border bg-surface-inset/60">
            <th className="sticky left-0 z-10 bg-surface-inset px-5 py-4 font-extrabold">
              Included seats / branches
            </th>
            {BUSINESS_PLAN_ORDER.map((planKey) => {
              const plan = BUSINESS_PLANS[planKey];
              return (
                <td key={planKey} className="px-4 py-4 text-center text-xs font-bold text-text-secondary">
                  {plan.includedSeats ?? "Custom"} / {plan.includedBranches ?? "Custom"}
                </td>
              );
            })}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function TrustAndProcess({ universe }: { universe: PricingUniverse }) {
  const steps = [
    {
      title: "Choose the right scope",
      body:
        universe === "personal"
          ? "Select a Personal Finance plan for one authenticated person."
          : "Create or select the company that will own the subscription.",
    },
    {
      title: "Review before payment",
      body: "See the selected plan, billing cycle, scope, included capacity, and regional price before checkout.",
    },
    {
      title: "Provider confirms access",
      body: "When payments launch, access changes only after a verified provider event—not from a browser redirect.",
    },
  ];

  return (
    <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="rounded-[2rem] bg-text-primary p-6 text-background shadow-premium sm:p-9">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-primary-soft">
          A buying journey people can trust
        </p>
        <h2 className="mt-3 text-balance text-3xl font-extrabold tracking-tight sm:text-5xl">
          Clear scope, clear price, clear next step.
        </h2>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-background/70 sm:text-base">
          The complete customer-facing structure is ready now. Real collection
          remains disabled until Paddle is connected and independently verified
          at the final launch stage.
        </p>

        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          {[
            [ShieldCheck, "Privacy-first separation"],
            [LockKeyhole, "No card data stored by JALVORO"],
            [Globe2, "Regional plan presentation"],
          ].map(([Icon, label]) => {
            const TrustIcon = Icon as typeof ShieldCheck;
            return (
              <div
                key={label as string}
                className="rounded-2xl border border-background/15 bg-background/5 p-4"
              >
                <TrustIcon className="size-5 text-primary-soft" aria-hidden="true" />
                <p className="mt-3 text-sm font-bold leading-6">{label as string}</p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-[2rem] border border-border bg-surface p-6 shadow-soft sm:p-9">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-primary">
          How it works
        </p>
        <div className="mt-6 space-y-5">
          {steps.map((step, index) => (
            <div key={step.title} className="flex gap-4">
              <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-sm font-extrabold text-primary">
                {index + 1}
              </span>
              <div>
                <h3 className="font-extrabold text-text-primary">{step.title}</h3>
                <p className="mt-1 text-sm leading-6 text-text-muted">{step.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function BusinessSystemsSection() {
  return (
    <section className="rounded-[2rem] border border-border bg-surface p-5 shadow-soft sm:p-8">
      <div className="max-w-4xl">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-primary">
          Nature-specific systems
        </p>
        <h2 className="mt-3 text-balance text-3xl font-extrabold tracking-tight text-text-primary sm:text-5xl">
          The plan controls capacity. The business nature controls the operating experience.
        </h2>
        <p className="mt-4 text-sm leading-7 text-text-muted sm:text-base">
          A restaurant should not feel like a dealership. A construction company
          should not feel like a retail shop. JALVORO can reuse verified finance
          primitives while preserving purpose-built screens, roles, conditions,
          and workflows.
        </p>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {BUSINESS_SYSTEMS.map((system) => (
          <article
            key={system.code}
            className="rounded-2xl border border-border bg-surface-inset p-5 transition hover:border-border-strong"
          >
            <Building2 className="size-5 text-primary" aria-hidden="true" />
            <h3 className="mt-4 font-extrabold text-text-primary">{system.name}</h3>
            <p className="mt-2 text-sm leading-6 text-text-muted">
              {system.description}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}

function FaqSection() {
  return (
    <section className="grid gap-8 lg:grid-cols-[0.7fr_1.3fr] lg:items-start">
      <div>
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-primary">
          Pricing questions
        </p>
        <h2 className="mt-3 text-balance text-3xl font-extrabold tracking-tight text-text-primary sm:text-5xl">
          Important answers before a customer commits.
        </h2>
        <p className="mt-4 text-sm leading-7 text-text-muted sm:text-base">
          No invented testimonials, hidden conditions, or misleading payment
          claims—only the rules the product structure actually supports.
        </p>
      </div>

      <div className="space-y-3">
        {PRICING_FAQS.map((item) => (
          <details
            key={item.question}
            className="group rounded-2xl border border-border bg-surface p-5 shadow-soft open:border-primary/40"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-extrabold text-text-primary">
              {item.question}
              <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-surface-inset text-primary transition group-open:rotate-45">
                +
              </span>
            </summary>
            <p className="mt-4 border-t border-border pt-4 text-sm leading-7 text-text-muted">
              {item.answer}
            </p>
          </details>
        ))}
      </div>
    </section>
  );
}

export default function RegionalPricing({
  initialCountryCode,
}: RegionalPricingProps) {
  const serverCountry = normalizeCountryCode(initialCountryCode);
  const [countryCode, setCountryCode] = useState(serverCountry ?? "US");
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("annual");
  const [universe, setUniverse] = useState<PricingUniverse>("personal");
  const tier = getPricingTier(countryCode);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requestedUniverse = params.get("universe");
    const requestedCycle = params.get("cycle");

    if (requestedUniverse === "personal" || requestedUniverse === "business") {
      setUniverse(requestedUniverse);
    }
    if (requestedCycle === "monthly" || requestedCycle === "annual") {
      setBillingCycle(requestedCycle);
    }

    if (serverCountry) return;
    const requestedCountry = normalizeCountryCode(params.get("country"));
    const browserCountry = requestedCountry ?? detectBrowserCountry();
    if (browserCountry) setCountryCode(browserCountry);
  }, [serverCountry]);

  const countryNames = useMemo(
    () => new Intl.DisplayNames(["en"], { type: "region" }),
    [],
  );
  const countryOptions = useMemo(
    () =>
      SUPPORTED_COUNTRY_CODES.map((code) => ({
        code,
        name: countryNames.of(code) ?? code,
      })).sort((left, right) => left.name.localeCompare(right.name)),
    [countryNames],
  );
  const countryName = countryNames.of(countryCode) ?? countryCode;

  return (
    <div className="space-y-16 sm:space-y-20">
      <section className="mx-auto max-w-6xl rounded-[2rem] border border-border bg-surface/95 p-4 shadow-premium backdrop-blur lg:sticky lg:top-4 lg:z-30 lg:grid lg:grid-cols-[auto_1fr_auto] lg:items-end lg:gap-5 lg:p-5">
        <div
          className="grid grid-cols-2 rounded-xl border border-border bg-surface-inset p-1"
          aria-label="Product universe"
        >
          {(["personal", "business"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setUniverse(value)}
              aria-pressed={universe === value}
              className={`min-h-11 rounded-lg px-4 text-sm font-extrabold capitalize transition ${
                universe === value
                  ? "bg-primary text-primary-foreground shadow-theme"
                  : "text-text-secondary hover:bg-surface"
              }`}
            >
              {value}
            </button>
          ))}
        </div>

        <label className="mt-4 grid gap-2 text-sm font-bold text-text-primary lg:mt-0">
          Pricing country
          <select
            value={countryCode}
            onChange={(event: ChangeEvent<HTMLSelectElement>) =>
              setCountryCode(event.target.value)
            }
            className="min-h-11 rounded-xl border border-border bg-surface-inset px-3 text-sm font-semibold outline-none focus-visible:shadow-[var(--focus-ring)]"
          >
            {countryOptions.map(({ code, name }) => (
              <option key={code} value={code}>
                {name}
              </option>
            ))}
          </select>
          <span className="font-normal text-text-muted">
            {countryName} · Regional tier {tier}
          </span>
        </label>

        <div
          className="mt-4 grid grid-cols-2 rounded-xl border border-border bg-surface-inset p-1 lg:mt-0"
          aria-label="Billing cycle"
        >
          {(["monthly", "annual"] as const).map((cycle) => (
            <button
              key={cycle}
              type="button"
              onClick={() => setBillingCycle(cycle)}
              aria-pressed={billingCycle === cycle}
              className={`relative min-h-11 rounded-lg px-4 text-sm font-extrabold capitalize transition ${
                billingCycle === cycle
                  ? "bg-primary text-primary-foreground shadow-theme"
                  : "text-text-secondary hover:bg-surface"
              }`}
            >
              {cycle}
              {cycle === "annual" ? (
                <span className="absolute -right-2 -top-2 rounded-full bg-success px-2 py-0.5 text-[0.6rem] font-extrabold text-white">
                  Save
                </span>
              ) : null}
            </button>
          ))}
        </div>
      </section>

      {universe === "personal" ? (
        <PersonalPricing
          countryCode={countryCode}
          billingCycle={billingCycle}
        />
      ) : (
        <BusinessPricing
          countryCode={countryCode}
          billingCycle={billingCycle}
        />
      )}

      <TrustAndProcess universe={universe} />

      <section className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-3xl">
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-primary">
              Compare every feature
            </p>
            <h2 className="mt-3 text-balance text-3xl font-extrabold tracking-tight text-text-primary sm:text-5xl">
              See exactly what changes between plans.
            </h2>
          </div>
          <span className="inline-flex items-center gap-2 text-xs font-semibold text-text-muted">
            <ArrowRight className="size-4" aria-hidden="true" />
            Swipe horizontally on smaller screens
          </span>
        </div>
        {universe === "personal" ? (
          <PersonalComparison />
        ) : (
          <BusinessComparison />
        )}
      </section>

      {universe === "business" ? <BusinessSystemsSection /> : null}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            icon: ShieldCheck,
            title: "Continue Free remains visible",
            body: "Customers are never forced into a paid plan before they understand the product.",
          },
          {
            icon: CircleDollarSign,
            title: "Regional pricing structure",
            body: "Country tiers keep the commercial model accessible across different markets.",
          },
          {
            icon: LockKeyhole,
            title: "Payment provider boundary",
            body: "JALVORO stores no card number, CVV, or online-banking credential.",
          },
          {
            icon: universe === "personal" ? Sparkles : Building2,
            title:
              universe === "personal"
                ? "AI only in Personal Finance"
                : "Business data stays AI-free",
            body:
              universe === "personal"
                ? "AI allowance is an explicit Personal Finance entitlement on eligible plans."
                : "No Business or Enterprise plan receives AI access through this billing structure.",
          },
        ].map(({ icon: Icon, title, body }) => (
          <article
            key={title}
            className="rounded-3xl border border-border bg-surface p-5 shadow-soft"
          >
            <Icon className="size-6 text-primary" aria-hidden="true" />
            <h2 className="mt-5 text-lg font-extrabold text-text-primary">
              {title}
            </h2>
            <p className="mt-2 text-sm leading-6 text-text-muted">{body}</p>
          </article>
        ))}
      </section>

      <FaqSection />

      <section className="rounded-[2rem] bg-primary px-5 py-10 text-primary-foreground shadow-premium sm:px-10 sm:py-14 lg:flex lg:items-center lg:justify-between lg:gap-10">
        <div className="max-w-3xl">
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-primary-foreground/70">
            Built to earn trust before asking for payment
          </p>
          <h2 className="mt-3 text-balance text-3xl font-extrabold tracking-tight sm:text-5xl">
            Let customers explore the value, choose confidently, and continue Free whenever needed.
          </h2>
          <p className="mt-4 text-sm leading-7 text-primary-foreground/75 sm:text-base">
            Pages, plans, comparison, regional presentation, and checkout-ready
            journeys are structured now. Paddle collection remains a final-stage
            connection and cannot charge anyone today.
          </p>
        </div>
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:mt-0 lg:w-80 lg:grid-cols-1">
          <Link
            href={
              universe === "personal"
                ? "/login?mode=signup"
                : "/login?mode=signup&workspace=business"
            }
            className="inline-flex min-h-12 items-center justify-center rounded-xl bg-background px-5 text-sm font-extrabold text-text-primary transition hover:bg-surface-inset"
          >
            Start Free
          </Link>
          <a
            href="#personal-plan-heading"
            className="inline-flex min-h-12 items-center justify-center rounded-xl border border-primary-foreground/25 px-5 text-sm font-bold transition hover:bg-primary-foreground/10"
          >
            Review plans again
          </a>
        </div>
      </section>
    </div>
  );
}
