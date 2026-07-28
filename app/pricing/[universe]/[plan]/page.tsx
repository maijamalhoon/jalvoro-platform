import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  CircleDollarSign,
  Globe2,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { headers } from "next/headers";
import { notFound } from "next/navigation";

import {
  BUSINESS_PLANS,
  getBusinessAnnualSavingsPercent,
  getBusinessPlanPrice,
} from "@/lib/billing/business-catalog";
import {
  formatUsdPrice,
  getAnnualSavingsPercent,
  getPlanPrice,
  PLANS,
  SUPPORTED_COUNTRY_CODES,
  TRIAL_LENGTH_DAYS,
} from "@/lib/billing/catalog";
import {
  BUSINESS_FEATURE_LABELS,
  BUSINESS_PLAN_MARKETING,
  PERSONAL_FEATURE_LABELS,
  PERSONAL_PLAN_MARKETING,
} from "@/lib/billing/marketing";
import type {
  BillingCycle,
  BusinessPlanKey,
  PaidPlanKey,
  PlanKey,
  PricedBusinessPlanKey,
} from "@/lib/billing/types";

const COUNTRY_CODES = new Set<string>(SUPPORTED_COUNTRY_CODES);

type PricingUniverse = "personal" | "business";

type PageProps = {
  params: Promise<{ universe: string; plan: string }>;
  searchParams: Promise<{ cycle?: string; country?: string }>;
};

function isUniverse(value: string): value is PricingUniverse {
  return value === "personal" || value === "business";
}

function isPersonalPlan(value: string): value is PlanKey {
  return Object.prototype.hasOwnProperty.call(PLANS, value);
}

function isBusinessPlan(value: string): value is BusinessPlanKey {
  return Object.prototype.hasOwnProperty.call(BUSINESS_PLANS, value);
}

function normalizeCountry(value?: string | null): string | null {
  const normalized = value?.trim().toUpperCase();
  return normalized && COUNTRY_CODES.has(normalized) ? normalized : null;
}

function normalizeCycle(value?: string): BillingCycle {
  return value === "monthly" ? "monthly" : "annual";
}

function featureEntries(
  features: Record<string, boolean | number | undefined>,
  labels: Record<string, string>,
) {
  return Object.entries(features)
    .filter(
      ([, allowance]) =>
        allowance === true ||
        (typeof allowance === "number" && allowance > 0),
    )
    .map(([key, allowance]) => ({
      key,
      label: labels[key] ?? key,
      allowance: typeof allowance === "number" ? allowance : null,
    }));
}

function personalCta(plan: PlanKey, cycle: BillingCycle, country: string) {
  if (plan === "free") {
    return { href: "/login?mode=signup", label: "Start Personal Free" };
  }

  if (plan === "pro") {
    return {
      href: `/login?mode=signup&next=${encodeURIComponent("/billing/personal-trial")}`,
      label: `Start ${TRIAL_LENGTH_DAYS}-day no-card trial`,
    };
  }

  const checkoutPath = `/billing/personal-checkout?plan=${plan}&cycle=${cycle}&country=${country}`;
  return {
    href: `/login?mode=signup&next=${encodeURIComponent(checkoutPath)}`,
    label: `Choose ${PLANS[plan].name}`,
  };
}

function businessCta(plan: BusinessPlanKey) {
  if (plan === "business_free") {
    return {
      href: "/login?mode=signup&workspace=business",
      label: "Start Business Free",
    };
  }

  if (plan === "enterprise") {
    return {
      href: "/login?mode=signup&workspace=business&intent=enterprise",
      label: "Plan enterprise rollout",
    };
  }

  return {
    href: `/login?mode=signup&workspace=business&intent=upgrade&plan=${plan}`,
    label: `Choose ${BUSINESS_PLANS[plan].name}`,
  };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { universe, plan } = await params;

  if (universe === "personal" && isPersonalPlan(plan)) {
    return {
      title: `${PLANS[plan].name} Personal Finance plan`,
      description: PERSONAL_PLAN_MARKETING[plan].summary,
      robots: { index: true, follow: true },
    };
  }

  if (universe === "business" && isBusinessPlan(plan)) {
    return {
      title: `${BUSINESS_PLANS[plan].name} Business plan`,
      description: BUSINESS_PLAN_MARKETING[plan].summary,
      robots: { index: true, follow: true },
    };
  }

  return { title: "Plan not found", robots: { index: false, follow: false } };
}

export default async function PricingPlanPage({
  params,
  searchParams,
}: PageProps) {
  const [{ universe, plan: rawPlan }, query, requestHeaders] = await Promise.all([
    params,
    searchParams,
    headers(),
  ]);

  if (!isUniverse(universe)) notFound();

  const cycle = normalizeCycle(query.cycle);
  const country =
    normalizeCountry(query.country) ??
    normalizeCountry(requestHeaders.get("x-vercel-ip-country")) ??
    "US";

  const personal = universe === "personal";
  if (personal && !isPersonalPlan(rawPlan)) notFound();
  if (!personal && !isBusinessPlan(rawPlan)) notFound();

  const personalPlan = personal ? (rawPlan as PlanKey) : null;
  const businessPlan = personal ? null : (rawPlan as BusinessPlanKey);
  const definition = personal
    ? PLANS[personalPlan as PlanKey]
    : BUSINESS_PLANS[businessPlan as BusinessPlanKey];
  const marketing = personal
    ? PERSONAL_PLAN_MARKETING[personalPlan as PlanKey]
    : BUSINESS_PLAN_MARKETING[businessPlan as BusinessPlanKey];
  const labels = personal ? PERSONAL_FEATURE_LABELS : BUSINESS_FEATURE_LABELS;
  const features = featureEntries(definition.features, labels);

  let price: number | null = 0;
  let savings = 0;

  if (personal && personalPlan !== "free") {
    price = getPlanPrice(personalPlan as PaidPlanKey, country, cycle);
    savings = getAnnualSavingsPercent(personalPlan as PaidPlanKey, country);
  } else if (
    !personal &&
    businessPlan !== "business_free" &&
    businessPlan !== "enterprise"
  ) {
    price = getBusinessPlanPrice(
      businessPlan as PricedBusinessPlanKey,
      country,
      cycle,
    );
    savings = getBusinessAnnualSavingsPercent(
      businessPlan as PricedBusinessPlanKey,
      country,
    );
  } else if (businessPlan === "enterprise") {
    price = null;
  }

  const cta = personal
    ? personalCta(personalPlan as PlanKey, cycle, country)
    : businessCta(businessPlan as BusinessPlanKey);
  const alternateCycle: BillingCycle = cycle === "annual" ? "monthly" : "annual";
  const currentPath = `/pricing/${universe}/${rawPlan}`;

  return (
    <main className="min-h-screen overflow-hidden bg-background text-text-primary">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-0 h-[38rem] bg-[radial-gradient(circle_at_top_left,var(--primary-soft),transparent_40%),radial-gradient(circle_at_top_right,var(--surface-inset),transparent_35%)]" />

      <div className="relative z-10 mx-auto max-w-[92rem] px-[var(--space-page)] py-6 sm:py-10">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/pricing"
            className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-text-secondary transition hover:bg-surface focus-visible:shadow-[var(--focus-ring)]"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            All plans
          </Link>
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-text-muted">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface/80 px-3 py-2">
              <Globe2 className="size-4" aria-hidden="true" />
              Regional pricing
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface/80 px-3 py-2">
              <LockKeyhole className="size-4" aria-hidden="true" />
              Provider-hosted payment later
            </span>
          </div>
        </header>

        <section className="grid gap-8 py-12 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-start lg:py-20">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full bg-primary-soft px-3 py-1.5 text-xs font-bold text-primary">
                {personal ? (
                  <Sparkles className="size-4" aria-hidden="true" />
                ) : (
                  <Building2 className="size-4" aria-hidden="true" />
                )}
                {personal ? "Personal Finance" : "Business Operations"}
              </span>
              {marketing.badge ? (
                <span className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-bold text-text-secondary">
                  {marketing.badge}
                </span>
              ) : null}
            </div>

            <p className="mt-8 text-sm font-bold uppercase tracking-[0.18em] text-primary">
              {marketing.audience}
            </p>
            <h1 className="mt-3 max-w-5xl text-balance text-4xl font-extrabold tracking-[-0.04em] sm:text-6xl lg:text-7xl">
              {marketing.headline}
            </h1>
            <p className="mt-6 max-w-3xl text-pretty text-base leading-8 text-text-muted sm:text-xl">
              {marketing.summary}
            </p>

            <div className="mt-9 grid gap-3 sm:grid-cols-3">
              {marketing.confidence.map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-border bg-surface/85 p-4 shadow-soft"
                >
                  <ShieldCheck
                    className="size-5 text-success"
                    aria-hidden="true"
                  />
                  <p className="mt-3 text-sm font-bold leading-6">{item}</p>
                </div>
              ))}
            </div>
          </div>

          <aside className="rounded-[2rem] border border-border bg-surface p-5 shadow-premium sm:p-7 lg:sticky lg:top-6">
            <p className="text-sm font-bold text-text-muted">{definition.name}</p>
            <div className="mt-3 flex items-end gap-2">
              <strong className="text-4xl font-extrabold tracking-[-0.04em] sm:text-5xl">
                {price === null ? "Custom" : formatUsdPrice(price)}
              </strong>
              {price !== null ? (
                <span className="pb-1 text-sm text-text-muted">
                  /{cycle === "annual" ? "year" : "month"}
                </span>
              ) : null}
            </div>
            <p className="mt-2 text-xs leading-5 text-text-muted">
              {price === null
                ? "Reviewed contract, capacity, implementation, and billing."
                : price === 0
                  ? "Permanent Free access with no card required."
                  : cycle === "annual"
                    ? `Save about ${savings}% compared with monthly billing.`
                    : "Switch to annual billing when you want the best yearly value."}
            </p>

            {price !== null && price > 0 ? (
              <div className="mt-5 grid grid-cols-2 rounded-xl border border-border bg-surface-inset p-1">
                {(["monthly", "annual"] as const).map((value) => (
                  <Link
                    key={value}
                    href={`${currentPath}?cycle=${value}&country=${country}`}
                    aria-current={cycle === value ? "page" : undefined}
                    className={`inline-flex min-h-10 items-center justify-center rounded-lg px-3 text-sm font-bold capitalize transition ${
                      cycle === value
                        ? "bg-primary text-primary-foreground shadow-theme"
                        : "text-text-secondary hover:bg-surface"
                    }`}
                  >
                    {value}
                  </Link>
                ))}
              </div>
            ) : null}

            {!personal ? (
              <div className="mt-5 grid grid-cols-2 gap-2 text-xs font-semibold text-text-secondary">
                <span className="rounded-xl bg-surface-inset px-3 py-3">
                  {"includedSeats" in definition && definition.includedSeats !== null
                    ? `${definition.includedSeats} seats`
                    : "Custom seats"}
                </span>
                <span className="rounded-xl bg-surface-inset px-3 py-3">
                  {"includedBranches" in definition &&
                  definition.includedBranches !== null
                    ? `${definition.includedBranches} branches`
                    : "Custom branches"}
                </span>
              </div>
            ) : null}

            <Link
              href={cta.href}
              className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-primary px-5 text-sm font-extrabold text-primary-foreground transition hover:bg-primary-hover focus-visible:shadow-[var(--focus-ring)]"
            >
              {cta.label}
            </Link>
            <Link
              href="/login?mode=signup"
              className="mt-3 inline-flex min-h-12 w-full items-center justify-center rounded-xl border border-border bg-surface-inset px-5 text-sm font-bold transition hover:border-border-strong"
            >
              Continue Free instead
            </Link>
            <p className="mt-4 text-center text-xs leading-5 text-text-muted">
              Payment processing remains disabled until the final provider launch.
              No charge can happen from this page today.
            </p>
          </aside>
        </section>

        <section className="grid gap-4 pb-14 md:grid-cols-3">
          {marketing.outcomes.map((outcome, index) => (
            <article
              key={outcome}
              className="rounded-3xl border border-border bg-surface p-6 shadow-soft"
            >
              <span className="inline-flex size-10 items-center justify-center rounded-2xl bg-primary-soft text-sm font-extrabold text-primary">
                {index + 1}
              </span>
              <p className="mt-5 text-base font-bold leading-7">{outcome}</p>
            </article>
          ))}
        </section>

        <section className="grid gap-6 rounded-[2rem] border border-border bg-surface p-5 shadow-soft sm:p-8 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-primary">
              What is included
            </p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
              Clear features. No hidden universe mixing.
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-7 text-text-muted sm:text-base">
              {personal
                ? "These tools apply only to the authenticated user’s Personal Finance workspace."
                : "These tools apply only to the selected company. Business records stay outside Personal Finance and AI processing."}
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              {marketing.idealFor.map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-border bg-surface-inset px-3 py-2 text-xs font-bold text-text-secondary"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {features.map((feature) => (
              <div
                key={feature.key}
                className="flex gap-3 rounded-2xl border border-border bg-surface-inset p-4"
              >
                <CheckCircle2
                  className="mt-0.5 size-5 shrink-0 text-success"
                  aria-hidden="true"
                />
                <p className="text-sm font-semibold leading-6 text-text-secondary">
                  {feature.label}
                  {feature.allowance !== null
                    ? ` (${feature.allowance}/month)`
                    : ""}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-4 py-14 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              icon: ShieldCheck,
              title: "Privacy-first scope",
              body: personal
                ? "Personal subscription access never grants access to a company workspace."
                : "Each company keeps separate users, roles, permissions, subscription, and invoice.",
            },
            {
              icon: LockKeyhole,
              title: "No card storage",
              body: "The final payment flow uses provider-hosted checkout. JALVORO does not store card numbers or CVV values.",
            },
            {
              icon: CircleDollarSign,
              title: "Regional value",
              body: "Displayed pricing follows the selected country tier. Final tax and currency are confirmed before payment.",
            },
            {
              icon: personal ? Sparkles : Users,
              title: personal ? "Personal-only AI" : "Business stays AI-free",
              body: personal
                ? "Eligible AI allowance remains within Personal Finance entitlements."
                : "Business, POS, restaurant, dealership, company, and enterprise data receive no AI entitlement.",
            },
          ].map(({ icon: Icon, title, body }) => (
            <article
              key={title}
              className="rounded-3xl border border-border bg-surface p-5 shadow-soft"
            >
              <Icon className="size-6 text-primary" aria-hidden="true" />
              <h2 className="mt-5 text-lg font-extrabold">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-text-muted">{body}</p>
            </article>
          ))}
        </section>

        <section className="rounded-[2rem] bg-text-primary px-5 py-10 text-background sm:px-10 sm:py-14 lg:flex lg:items-center lg:justify-between lg:gap-10">
          <div className="max-w-3xl">
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-primary-soft">
              Ready when you are
            </p>
            <h2 className="mt-3 text-balance text-3xl font-extrabold tracking-tight sm:text-5xl">
              Start with the right scope and upgrade only when the value is clear.
            </h2>
            <p className="mt-4 text-sm leading-7 text-background/70 sm:text-base">
              The complete page structure is ready now. Real payment collection
              stays safely disabled until Paddle products, credentials, webhooks,
              and sandbox verification are connected at the final launch stage.
            </p>
          </div>
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:mt-0 lg:w-80 lg:grid-cols-1">
            <Link
              href={cta.href}
              className="inline-flex min-h-12 items-center justify-center rounded-xl bg-primary px-5 text-sm font-extrabold text-primary-foreground transition hover:bg-primary-hover"
            >
              {cta.label}
            </Link>
            <Link
              href={`${currentPath}?cycle=${alternateCycle}&country=${country}`}
              className="inline-flex min-h-12 items-center justify-center rounded-xl border border-background/20 px-5 text-sm font-bold text-background transition hover:bg-background/10"
            >
              View {alternateCycle} pricing
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
