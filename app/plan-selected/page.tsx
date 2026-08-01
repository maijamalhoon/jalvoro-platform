import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, CheckCircle2, LockKeyhole, ShieldCheck } from "lucide-react";
import { notFound } from "next/navigation";

import {
  BUSINESS_PLAN_ORDER,
  BUSINESS_PLANS,
  PERSONAL_PLAN_ORDER,
  PERSONAL_PLANS,
  SUPPORTED_COUNTRY_CODES,
  formatUsdPrice,
  getBusinessPlanPrice,
  getPersonalPlanPrice,
  getPricingTier,
} from "@/lib/pricing/catalog";
import type {
  BillingCycle,
  BusinessPlanKey,
  PaidBusinessPlanKey,
  PaidPersonalPlanKey,
  PersonalPlanKey,
  PricingUniverse,
} from "@/lib/pricing/types";

export const metadata: Metadata = {
  title: "Plan selected | JALVORO",
  description: "Review a selected JALVORO plan before continuing to a workspace.",
  robots: { index: false, follow: false },
};

type SelectionPageProps = {
  searchParams: Promise<{
    universe?: string | string[];
    plan?: string | string[];
    cycle?: string | string[];
    country?: string | string[];
  }>;
};

function first(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function isUniverse(value?: string): value is PricingUniverse {
  return value === "personal" || value === "business";
}

function isPersonalPlan(value?: string): value is PersonalPlanKey {
  return Boolean(value && PERSONAL_PLAN_ORDER.includes(value as PersonalPlanKey));
}

function isBusinessPlan(value?: string): value is BusinessPlanKey {
  return Boolean(value && BUSINESS_PLAN_ORDER.includes(value as BusinessPlanKey));
}

export default async function PlanSelectedPage({ searchParams }: SelectionPageProps) {
  const query = await searchParams;
  const universe = first(query.universe);
  const planKey = first(query.plan);
  const cycle: BillingCycle = first(query.cycle) === "monthly" ? "monthly" : "annual";
  const requestedCountry = first(query.country)?.trim().toUpperCase();
  const country = SUPPORTED_COUNTRY_CODES.includes(
    requestedCountry as (typeof SUPPORTED_COUNTRY_CODES)[number],
  )
    ? requestedCountry!
    : "US";

  if (!isUniverse(universe)) notFound();

  const countryName =
    new Intl.DisplayNames(["en"], { type: "region" }).of(country) ?? country;
  const tier = getPricingTier(country);

  let planName: string;
  let price: string;
  let priceLabel: string;
  let continueHref: string;
  let freePlan = false;
  let customPlan = false;

  if (universe === "personal") {
    if (!isPersonalPlan(planKey)) notFound();
    const plan = PERSONAL_PLANS[planKey];
    planName = plan.name;
    freePlan = planKey === "free";
    price = freePlan
      ? formatUsdPrice(0)
      : formatUsdPrice(
          getPersonalPlanPrice(planKey as PaidPersonalPlanKey, country, cycle),
        );
    priceLabel = freePlan ? "Permanent free access" : `Displayed per ${cycle === "annual" ? "year" : "month"}`;
    continueHref = "/dashboard";
  } else {
    if (!isBusinessPlan(planKey)) notFound();
    const plan = BUSINESS_PLANS[planKey];
    planName = plan.name;
    freePlan = planKey === "business_free";
    customPlan = planKey === "enterprise";
    price = customPlan
      ? "Custom"
      : freePlan
        ? formatUsdPrice(0)
        : formatUsdPrice(
            getBusinessPlanPrice(planKey as PaidBusinessPlanKey, country, cycle),
          );
    priceLabel = customPlan
      ? "Reviewed rollout and contract pricing"
      : freePlan
        ? "Permanent free access"
        : `Displayed per ${cycle === "annual" ? "year" : "month"}`;
    continueHref = "/business";
  }

  return (
    <main className="min-h-screen bg-background px-[var(--space-page)] py-8 sm:py-12">
      <div className="mx-auto max-w-3xl">
        <Link
          href={`/pricing/${universe}/${planKey}?cycle=${cycle}&country=${country}`}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-text-secondary hover:bg-surface focus-visible:shadow-[var(--focus-ring)]"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Review plan details
        </Link>

        <section className="mt-7 overflow-hidden rounded-[2rem] border border-border bg-surface shadow-premium">
          <div className="border-b border-border bg-primary-soft px-6 py-6 sm:px-9">
            <span className="inline-flex items-center gap-2 rounded-full bg-surface px-3 py-2 text-xs font-extrabold uppercase tracking-[0.12em] text-primary">
              <CheckCircle2 className="size-4" aria-hidden="true" />
              Plan choice received
            </span>
            <h1 className="mt-5 text-balance text-3xl font-extrabold tracking-[-0.04em] text-text-primary sm:text-5xl">
              {planName} is selected for your {universe} journey.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-text-muted sm:text-base">
              Your plan, billing cycle, and country arrived safely through the
              signup link. This page does not activate a paid subscription and
              cannot charge a card.
            </p>
          </div>

          <div className="grid gap-6 px-6 py-7 sm:px-9 sm:py-9 md:grid-cols-[1fr_auto] md:items-start">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-text-muted">
                Selection summary
              </p>
              <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                {[
                  ["Universe", universe === "personal" ? "Personal Finance" : "Business"],
                  ["Plan", planName],
                  ["Cycle", customPlan ? "Contract" : cycle === "annual" ? "Annual" : "Monthly"],
                  ["Pricing country", `${countryName} · Tier ${tier}`],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-2xl border border-border bg-surface-inset p-4">
                    <dt className="text-xs font-bold uppercase tracking-[0.12em] text-text-muted">
                      {label}
                    </dt>
                    <dd className="mt-1 font-extrabold text-text-primary">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="rounded-2xl border border-primary/20 bg-background p-5 md:min-w-56">
              <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-primary">
                Displayed plan price
              </p>
              <strong className="mt-2 block text-4xl font-extrabold tracking-[-0.05em] text-text-primary">
                {price}
              </strong>
              <p className="mt-1 text-xs leading-5 text-text-muted">{priceLabel}</p>
            </div>
          </div>

          <div className="border-t border-border px-6 py-7 sm:px-9">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex gap-3 rounded-2xl border border-border bg-surface-inset p-4">
                <LockKeyhole className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
                <div>
                  <strong className="text-sm text-text-primary">Payment remains off</strong>
                  <p className="mt-1 text-xs leading-5 text-text-muted">
                    No provider checkout, card field, API key, or payment request is present here.
                  </p>
                </div>
              </div>
              <div className="flex gap-3 rounded-2xl border border-border bg-surface-inset p-4">
                <ShieldCheck className="mt-0.5 size-5 shrink-0 text-success" aria-hidden="true" />
                <div>
                  <strong className="text-sm text-text-primary">Workspace boundary preserved</strong>
                  <p className="mt-1 text-xs leading-5 text-text-muted">
                    Personal and Business journeys continue through separate protected workspaces.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link
                href={continueHref}
                className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-extrabold text-primary-foreground shadow-theme transition hover:bg-primary-hover focus-visible:shadow-[var(--focus-ring)]"
              >
                {universe === "personal" ? "Open Personal Finance" : "Create or open a business"}
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
              <Link
                href="/pricing"
                className="inline-flex min-h-12 items-center justify-center rounded-xl border border-border bg-surface-inset px-5 text-sm font-extrabold text-text-primary transition hover:border-border-strong hover:bg-surface focus-visible:shadow-[var(--focus-ring)]"
              >
                Compare again
              </Link>
            </div>

            {!freePlan ? (
              <p className="mt-4 text-center text-xs leading-5 text-text-muted">
                Paid access is not active yet. Continue into the workspace without entering payment details.
              </p>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}
