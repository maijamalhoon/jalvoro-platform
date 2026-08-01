import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Globe2,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";

import {
  BUSINESS_PLAN_ORDER,
  BUSINESS_PLANS,
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

const COUNTRY_CODES = new Set<string>(SUPPORTED_COUNTRY_CODES);

type PlanPageProps = {
  params: Promise<{ universe: string; plan: string }>;
  searchParams: Promise<{ cycle?: string | string[]; country?: string | string[] }>;
};

function first(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function cycleFrom(value?: string | string[]): BillingCycle {
  return first(value) === "monthly" ? "monthly" : "annual";
}

function countryFrom(value?: string | string[]) {
  const code = first(value)?.trim().toUpperCase();
  return code && COUNTRY_CODES.has(code) ? code : "US";
}

function isUniverse(value: string): value is PricingUniverse {
  return value === "personal" || value === "business";
}

function isPersonalPlan(value: string): value is PersonalPlanKey {
  return PERSONAL_PLAN_ORDER.includes(value as PersonalPlanKey);
}

function isBusinessPlan(value: string): value is BusinessPlanKey {
  return BUSINESS_PLAN_ORDER.includes(value as BusinessPlanKey);
}

function reviewPath({
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

function signupPath(next: string, universe: PricingUniverse) {
  const params = new URLSearchParams({ mode: "signup", next, workspace: universe });
  return `/login?${params.toString()}`;
}

export function generateStaticParams() {
  return [
    ...PERSONAL_PLAN_ORDER.map((plan) => ({ universe: "personal", plan })),
    ...BUSINESS_PLAN_ORDER.map((plan) => ({ universe: "business", plan })),
  ];
}

export async function generateMetadata({ params }: PlanPageProps): Promise<Metadata> {
  const { universe, plan } = await params;

  if (universe === "personal" && isPersonalPlan(plan)) {
    return {
      title: `${PERSONAL_PLANS[plan].name} Personal Finance plan | JALVORO`,
      description: PERSONAL_PLAN_MARKETING[plan].summary,
      alternates: { canonical: `/pricing/personal/${plan}` },
    };
  }

  if (universe === "business" && isBusinessPlan(plan)) {
    return {
      title: `${BUSINESS_PLANS[plan].name} Business plan | JALVORO`,
      description: BUSINESS_PLAN_MARKETING[plan].summary,
      alternates: { canonical: `/pricing/business/${plan}` },
    };
  }

  return { title: "Plan not found | JALVORO" };
}

export default async function PlanDetailPage({ params, searchParams }: PlanPageProps) {
  const { universe: rawUniverse, plan: rawPlan } = await params;
  const query = await searchParams;

  if (!isUniverse(rawUniverse)) notFound();

  const cycle = cycleFrom(query.cycle);
  const country = countryFrom(query.country);
  const countryName =
    new Intl.DisplayNames(["en"], { type: "region" }).of(country) ?? country;
  const tier = getPricingTier(country);

  if (rawUniverse === "personal") {
    if (!isPersonalPlan(rawPlan)) notFound();

    const plan = PERSONAL_PLANS[rawPlan];
    const marketing = PERSONAL_PLAN_MARKETING[rawPlan];
    const paidPlan = rawPlan === "free" ? null : (rawPlan as PaidPersonalPlanKey);
    const price = paidPlan ? getPersonalPlanPrice(paidPlan, country, cycle) : 0;
    const savings = paidPlan ? getPersonalAnnualSavings(paidPlan, country) : 0;
    const selectedPath = reviewPath({
      universe: "personal",
      plan: rawPlan,
      cycle,
      country,
    });

    return (
      <PlanDetailLayout
        universe="personal"
        planKey={rawPlan}
        planName={plan.name}
        badge={marketing.badge}
        audience={marketing.audience}
        headline={marketing.headline}
        summary={marketing.summary}
        outcomes={marketing.outcomes}
        idealFor={marketing.idealFor}
        confidence={marketing.confidence}
        features={Object.entries(plan.features).map(([key, value]) => ({
          label: PERSONAL_FEATURE_LABELS[key as PersonalFeatureKey],
          value: value ?? false,
        }))}
        price={formatUsdPrice(price)}
        priceNote={
          rawPlan === "free"
            ? "Permanent access. No card required."
            : cycle === "annual"
              ? `Annual price saves about ${savings}% compared with monthly billing.`
              : "Displayed regional price; payment collection is not active yet."
        }
        cycle={cycle}
        country={country}
        countryName={countryName}
        tier={tier}
        seats={null}
        branches={null}
        customPrice={false}
        recommended={Boolean(plan.recommended)}
        actionLabel={rawPlan === "free" ? "Continue Free" : `Choose ${plan.name}`}
        actionHref={signupPath(selectedPath, "personal")}
      />
    );
  }

  if (!isBusinessPlan(rawPlan)) notFound();

  const plan = BUSINESS_PLANS[rawPlan];
  const marketing = BUSINESS_PLAN_MARKETING[rawPlan];
  const paidPlan =
    rawPlan === "business_free" || rawPlan === "enterprise"
      ? null
      : (rawPlan as PaidBusinessPlanKey);
  const price = paidPlan ? getBusinessPlanPrice(paidPlan, country, cycle) : 0;
  const savings = paidPlan ? getBusinessAnnualSavings(paidPlan, country) : 0;
  const selectedPath = reviewPath({
    universe: "business",
    plan: rawPlan,
    cycle,
    country,
  });

  return (
    <PlanDetailLayout
      universe="business"
      planKey={rawPlan}
      planName={plan.name}
      badge={marketing.badge}
      audience={marketing.audience}
      headline={marketing.headline}
      summary={marketing.summary}
      outcomes={marketing.outcomes}
      idealFor={marketing.idealFor}
      confidence={marketing.confidence}
      features={Object.entries(plan.features).map(([key, value]) => ({
        label: BUSINESS_FEATURE_LABELS[key as BusinessFeatureKey],
        value: value ?? false,
      }))}
      price={plan.customPricing ? "Custom" : formatUsdPrice(price)}
      priceNote={
        plan.customPricing
          ? "Capacity, implementation, support, and contract pricing are reviewed together."
          : rawPlan === "business_free"
            ? "Permanent access. No card required."
            : cycle === "annual"
              ? `Annual price saves about ${savings}% compared with monthly billing.`
              : "Displayed regional price; payment collection is not active yet."
      }
      cycle={cycle}
      country={country}
      countryName={countryName}
      tier={tier}
      seats={plan.includedSeats}
      branches={plan.includedBranches}
      customPrice={Boolean(plan.customPricing)}
      recommended={Boolean(plan.recommended)}
      actionLabel={
        rawPlan === "business_free"
          ? "Continue Free"
          : rawPlan === "enterprise"
            ? "Plan enterprise rollout"
            : `Choose ${plan.name}`
      }
      actionHref={signupPath(selectedPath, "business")}
    />
  );
}

function PlanDetailLayout({
  universe,
  planKey,
  planName,
  badge,
  audience,
  headline,
  summary,
  outcomes,
  idealFor,
  confidence,
  features,
  price,
  priceNote,
  cycle,
  country,
  countryName,
  tier,
  seats,
  branches,
  customPrice,
  recommended,
  actionLabel,
  actionHref,
}: {
  universe: PricingUniverse;
  planKey: string;
  planName: string;
  badge?: string;
  audience: string;
  headline: string;
  summary: string;
  outcomes: readonly string[];
  idealFor: readonly string[];
  confidence: readonly string[];
  features: Array<{ label: string; value: boolean | number }>;
  price: string;
  priceNote: string;
  cycle: BillingCycle;
  country: string;
  countryName: string;
  tier: string;
  seats: number | null;
  branches: number | null;
  customPrice: boolean;
  recommended: boolean;
  actionLabel: string;
  actionHref: string;
}) {
  const monthlyHref = `/pricing/${universe}/${planKey}?cycle=monthly&country=${country}`;
  const annualHref = `/pricing/${universe}/${planKey}?cycle=annual&country=${country}`;

  return (
    <main className="min-h-screen bg-background px-[var(--space-page)] py-8 sm:py-12">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <Link
            href={`/pricing?universe=${universe}`}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-text-secondary hover:bg-surface focus-visible:shadow-[var(--focus-ring)]"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back to all plans
          </Link>
          <div className="flex flex-wrap gap-2 text-xs font-bold text-text-muted">
            <span className="rounded-full border border-border bg-surface px-3 py-2 capitalize">
              {universe} universe
            </span>
            <span className="rounded-full border border-border bg-surface px-3 py-2">
              Tier {tier} · {countryName}
            </span>
          </div>
        </header>

        <section className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_25rem] lg:items-start">
          <div className="overflow-hidden rounded-[2rem] border border-border bg-surface p-6 shadow-premium sm:p-9">
            <div className="flex flex-wrap items-center gap-3">
              {badge ? (
                <span className="rounded-full bg-primary-soft px-3 py-2 text-xs font-extrabold uppercase tracking-[0.12em] text-primary">
                  {badge}
                </span>
              ) : null}
              {recommended ? (
                <span className="rounded-full bg-success/10 px-3 py-2 text-xs font-extrabold text-success">
                  Recommended
                </span>
              ) : null}
            </div>

            <p className="mt-7 text-sm font-bold uppercase tracking-[0.16em] text-primary">
              {audience}
            </p>
            <h1 className="mt-3 text-balance text-4xl font-extrabold tracking-[-0.045em] text-text-primary sm:text-6xl">
              {headline}
            </h1>
            <p className="mt-5 max-w-3xl text-pretty text-base leading-8 text-text-muted sm:text-lg">
              {summary}
            </p>

            <div className="mt-9 grid gap-4 sm:grid-cols-3">
              {outcomes.map((outcome) => (
                <div key={outcome} className="rounded-2xl border border-border bg-surface-inset p-4">
                  <CheckCircle2 className="size-5 text-success" aria-hidden="true" />
                  <p className="mt-3 text-sm leading-6 text-text-secondary">{outcome}</p>
                </div>
              ))}
            </div>
          </div>

          <aside className="rounded-[2rem] border border-primary/20 bg-surface p-6 shadow-premium lg:sticky lg:top-6">
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-primary">
              {planName} plan
            </p>
            <div className="mt-4 flex items-end gap-1">
              <strong className="text-4xl font-extrabold tracking-[-0.05em] text-text-primary">
                {price}
              </strong>
              {!customPrice ? (
                <span className="pb-1 text-sm text-text-muted">
                  /{cycle === "annual" ? "year" : "month"}
                </span>
              ) : null}
            </div>
            <p className="mt-2 text-xs leading-5 text-text-muted">{priceNote}</p>

            {!customPrice ? (
              <div className="mt-5 grid grid-cols-2 rounded-xl border border-border bg-surface-inset p-1">
                <Link
                  href={monthlyHref}
                  aria-current={cycle === "monthly" ? "page" : undefined}
                  className={`min-h-10 rounded-lg px-3 py-2 text-center text-sm font-bold ${
                    cycle === "monthly"
                      ? "bg-primary text-primary-foreground"
                      : "text-text-secondary hover:bg-surface"
                  }`}
                >
                  Monthly
                </Link>
                <Link
                  href={annualHref}
                  aria-current={cycle === "annual" ? "page" : undefined}
                  className={`min-h-10 rounded-lg px-3 py-2 text-center text-sm font-bold ${
                    cycle === "annual"
                      ? "bg-primary text-primary-foreground"
                      : "text-text-secondary hover:bg-surface"
                  }`}
                >
                  Annual
                </Link>
              </div>
            ) : null}

            {universe === "business" ? (
              <div className="mt-4 grid grid-cols-2 gap-2 text-xs font-bold text-text-secondary">
                <span className="rounded-xl bg-surface-inset px-3 py-3">
                  {seats === null ? "Custom seats" : `${seats} included seat${seats === 1 ? "" : "s"}`}
                </span>
                <span className="rounded-xl bg-surface-inset px-3 py-3">
                  {branches === null
                    ? "Custom branches"
                    : `${branches} included branch${branches === 1 ? "" : "es"}`}
                </span>
              </div>
            ) : null}

            <Link
              href={actionHref}
              className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-extrabold text-primary-foreground shadow-theme transition hover:bg-primary-hover focus-visible:shadow-[var(--focus-ring)]"
            >
              {actionLabel}
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
            <p className="mt-3 text-center text-xs leading-5 text-text-muted">
              This saves your selection through signup. No real payment is collected.
            </p>
          </aside>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-[2rem] border border-border bg-surface p-6 shadow-soft sm:p-8">
            <h2 className="text-2xl font-extrabold text-text-primary">Everything included</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {features.map(({ label, value }) => {
                const included = value === true || (typeof value === "number" && value > 0);
                return (
                  <div
                    key={label}
                    className={`flex gap-3 rounded-2xl border p-4 ${
                      included
                        ? "border-border bg-surface-inset"
                        : "border-border/60 bg-background/40 opacity-60"
                    }`}
                  >
                    {included ? (
                      <Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
                    ) : (
                      <span className="mt-0.5 inline-flex size-4 shrink-0 items-center justify-center text-text-muted">
                        —
                      </span>
                    )}
                    <span className="text-sm leading-6 text-text-secondary">
                      {label}
                      {typeof value === "number" && value > 0 ? ` (${value}/month)` : ""}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-6">
            <section className="rounded-[2rem] border border-border bg-surface p-6 shadow-soft">
              <h2 className="text-xl font-extrabold text-text-primary">Ideal for</h2>
              <ul className="mt-4 space-y-3">
                {idealFor.map((item) => (
                  <li key={item} className="flex gap-2 text-sm text-text-secondary">
                    <Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
            </section>

            <section className="rounded-[2rem] border border-border bg-surface p-6 shadow-soft">
              <h2 className="text-xl font-extrabold text-text-primary">Plan confidence</h2>
              <ul className="mt-4 space-y-3">
                {confidence.map((item) => (
                  <li key={item} className="flex gap-2 text-sm text-text-secondary">
                    <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            {
              icon: LockKeyhole,
              title: "No card data here",
              copy: "These pages do not collect card numbers, CVV values, bank passwords, provider keys, or webhook secrets.",
            },
            {
              icon: Globe2,
              title: "Regional price context",
              copy: `${countryName} is displayed using commercial tier ${tier}. Final local currency and tax will be confirmed only after provider launch.`,
            },
            {
              icon: ShieldCheck,
              title: "Strict universe boundary",
              copy:
                universe === "personal"
                  ? "Personal AI applies only to eligible Personal Finance features. Business records remain outside it."
                  : "Business and Enterprise data receive no AI entitlement through this plan system.",
            },
          ].map(({ icon: Icon, title, copy }) => (
            <article key={title} className="rounded-3xl border border-border bg-surface p-6 shadow-soft">
              <Icon className="size-5 text-primary" aria-hidden="true" />
              <h2 className="mt-4 text-lg font-extrabold text-text-primary">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-text-muted">{copy}</p>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
