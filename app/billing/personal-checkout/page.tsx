import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  CreditCard,
  GraduationCap,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";
import { redirect } from "next/navigation";

import PersonalCheckoutAction from "@/components/billing/PersonalCheckoutAction";
import PersonalTrialAction from "@/components/billing/PersonalTrialAction";
import {
  formatUsdPrice,
  getPlanPrice,
  PLANS,
  TRIAL_LENGTH_DAYS,
} from "@/lib/billing/catalog";
import { isBillingCycle, isPaidPlanKey } from "@/lib/billing/checkout";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Review personal plan",
  description: "Review one personal plan before trial or secure provider checkout.",
  robots: { index: false, follow: false },
};

type PersonalCheckoutPageProps = {
  searchParams: Promise<{
    plan?: string;
    cycle?: string;
    country?: string;
  }>;
};

function normalizeCountry(value: string | undefined): string {
  const normalized = value?.trim().toUpperCase();
  return normalized && /^[A-Z]{2}$/.test(normalized) ? normalized : "US";
}

export default async function PersonalCheckoutPage({
  searchParams,
}: PersonalCheckoutPageProps) {
  const { plan: rawPlan, cycle: rawCycle, country } = await searchParams;

  if (!isPaidPlanKey(rawPlan) || !isBillingCycle(rawCycle)) {
    redirect("/pricing");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const currentPath = `/billing/personal-checkout?plan=${encodeURIComponent(rawPlan)}&cycle=${encodeURIComponent(rawCycle)}&country=${encodeURIComponent(normalizeCountry(country))}`;
  if (!user) {
    redirect(
      `/login?mode=signup&next=${encodeURIComponent(currentPath)}`,
    );
  }

  const plan = PLANS[rawPlan];
  const countryCode = normalizeCountry(country);
  const price = getPlanPrice(rawPlan, countryCode, rawCycle);
  const proTrial = rawPlan === "pro";
  const { data: studentEligibility } =
    rawPlan === "student"
      ? await supabase.rpc("get_my_student_verification_status")
      : { data: null };
  const studentVerified =
    rawPlan !== "student" || studentEligibility === "verified";
  const checkoutEnabled =
    !proTrial &&
    studentVerified &&
    process.env.BILLING_CHECKOUT_ENABLED === "true" &&
    Boolean(
      process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN &&
        process.env.PADDLE_API_KEY &&
        process.env.PADDLE_WEBHOOK_SECRET,
    );
  const trialEnabled =
    proTrial && process.env.BILLING_TRIAL_ENABLED === "true";

  return (
    <main className="min-h-screen bg-background px-[var(--space-page)] py-8 sm:py-12">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/pricing"
            className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-text-secondary hover:bg-surface focus-visible:shadow-[var(--focus-ring)]"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Change plan
          </Link>
          <span className="inline-flex items-center gap-2 text-xs font-semibold text-text-muted">
            <LockKeyhole className="size-4" aria-hidden="true" />
            {proTrial ? "No-card trial" : "Provider-hosted payment"}
          </span>
        </header>

        <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <article className="rounded-3xl border border-border bg-surface p-6 shadow-soft sm:p-8">
            <span className="inline-flex items-center gap-2 rounded-full bg-primary-soft px-3 py-1 text-xs font-bold text-primary">
              {rawPlan === "student" ? (
                <GraduationCap className="size-4" aria-hidden="true" />
              ) : rawPlan === "pro" ? (
                <Sparkles className="size-4" aria-hidden="true" />
              ) : (
                <UserRound className="size-4" aria-hidden="true" />
              )}
              Personal Finance
            </span>
            <h1 className="mt-5 text-balance text-3xl font-extrabold text-text-primary sm:text-5xl">
              Review {plan.name}.
            </h1>
            <p className="mt-3 text-sm leading-6 text-text-muted sm:text-base">
              This plan belongs only to your Personal Finance workspace. No
              business, POS, dealership, restaurant, company, or enterprise
              workspace is included.
            </p>

            <div className="mt-7 rounded-2xl border border-border bg-surface-inset p-5">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-sm font-bold text-text-primary">{plan.name}</p>
                  <p className="mt-1 text-sm text-text-muted">
                    {proTrial
                      ? `${TRIAL_LENGTH_DAYS}-day trial, started manually`
                      : rawCycle === "annual"
                        ? "Annual billing"
                        : "Monthly billing"}
                  </p>
                </div>
                <strong className="text-3xl font-extrabold text-text-primary">
                  {proTrial ? "$0 trial" : formatUsdPrice(price)}
                </strong>
              </div>
              <p className="mt-4 text-sm leading-6 text-text-secondary">
                {proTrial
                  ? "No card is required, no automatic charge is scheduled, and the workspace returns to Free when the trial ends."
                  : plan.description}
              </p>
            </div>

            <div className="mt-6 grid gap-3 rounded-2xl bg-surface-inset p-4 text-sm text-text-secondary sm:grid-cols-2">
              <span className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-success" aria-hidden="true" />
                AI remains inside Personal Finance only
              </span>
              <span className="flex items-center gap-2">
                <CreditCard className="size-4 text-primary" aria-hidden="true" />
                {proTrial ? "No card and no automatic charge" : "JALVORO stores no card details"}
              </span>
            </div>
          </article>

          <aside className="rounded-3xl border border-border bg-surface p-6 shadow-soft sm:p-8">
            <h2 className="text-xl font-extrabold text-text-primary">
              {proTrial ? "Start Pro trial" : "Secure checkout"}
            </h2>
            <p className="mt-3 text-sm leading-6 text-text-muted">
              {proTrial
                ? "The trial starts only when you press the button. It cannot charge you now or later."
                : "Final billing country, tax, currency, and payment method will be confirmed by the payment provider before purchase."}
            </p>

            {rawPlan === "student" && !studentVerified ? (
              <div className="mt-5 rounded-2xl border border-warning/30 bg-warning/10 p-4 text-sm leading-6 text-text-secondary">
                A current verified-student status is required before Student
                checkout can open. No payment has been attempted.
              </div>
            ) : null}

            <div className="mt-6 space-y-3">
              {proTrial ? (
                <PersonalTrialAction enabled={trialEnabled} />
              ) : (
                <PersonalCheckoutAction
                  plan={rawPlan}
                  cycle={rawCycle}
                  enabled={checkoutEnabled}
                />
              )}

              <Link
                href="/dashboard"
                className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-border bg-surface-inset px-4 text-sm font-bold text-text-primary hover:border-border-strong"
              >
                Continue Free instead
              </Link>
            </div>

            <p className="mt-5 text-xs leading-5 text-text-muted">
              {proTrial
                ? "Trial activation remains disabled until its database migration is applied through the controlled deployment process."
                : "Checkout remains disabled until Paddle products, regional price IDs, webhook verification, and sandbox lifecycle tests are complete."}
            </p>
          </aside>
        </section>
      </div>
    </main>
  );
}
