import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  CreditCard,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";
import { redirect } from "next/navigation";

import CheckoutAction from "@/components/billing/CheckoutAction";
import {
  BUSINESS_PLANS,
  getBusinessPlanPrice,
} from "@/lib/billing/business-catalog";
import { formatUsdPrice } from "@/lib/billing/catalog";
import {
  isBillingCycle,
  isBusinessPlanKey,
  isSelfServeBusinessPlan,
} from "@/lib/billing/checkout";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Review business plan",
  description: "Review one business subscription before secure provider checkout.",
  robots: { index: false, follow: false },
};

type CheckoutPageProps = {
  searchParams: Promise<{
    businessId?: string;
    plan?: string;
    cycle?: string;
  }>;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function CheckoutPage({
  searchParams,
}: CheckoutPageProps) {
  const { businessId, plan: rawPlan, cycle: rawCycle } = await searchParams;

  if (
    !businessId ||
    !UUID_PATTERN.test(businessId) ||
    !isBusinessPlanKey(rawPlan) ||
    rawPlan === "business_free" ||
    !isBillingCycle(rawCycle)
  ) {
    redirect("/business");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?redirectTo=${encodeURIComponent(
      `/billing/checkout?businessId=${businessId}&plan=${rawPlan}&cycle=${rawCycle}`,
    )}`);
  }

  const { data: business, error } = await supabase
    .from("businesses")
    .select("id,name,slug,owner_user_id,workspace_mode,country_code,status")
    .eq("id", businessId)
    .maybeSingle();

  if (error || !business || business.owner_user_id !== user.id) {
    redirect("/business");
  }

  const freeHref =
    business.workspace_mode === "simple_shop"
      ? `/business/${business.slug}/shop`
      : `/business/${business.slug}`;
  const choosePlanHref = `/billing/choose-plan?businessId=${business.id}`;
  const plan = BUSINESS_PLANS[rawPlan];
  const selfServe = isSelfServeBusinessPlan(rawPlan);
  const price = selfServe
    ? getBusinessPlanPrice(
        rawPlan,
        business.country_code ?? "US",
        rawCycle,
      )
    : null;
  const checkoutEnabled =
    process.env.BILLING_CHECKOUT_ENABLED === "true" &&
    Boolean(
      process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN &&
        process.env.PADDLE_API_KEY &&
        process.env.PADDLE_WEBHOOK_SECRET,
    );

  return (
    <main className="min-h-screen bg-background px-[var(--space-page)] py-8 sm:py-12">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-3">
          <Link
            href={choosePlanHref}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-text-secondary hover:bg-surface focus-visible:shadow-[var(--focus-ring)]"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Change plan
          </Link>
          <span className="inline-flex items-center gap-2 text-xs font-semibold text-text-muted">
            <LockKeyhole className="size-4" aria-hidden="true" />
            Provider-hosted payment
          </span>
        </header>

        <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <article className="rounded-3xl border border-border bg-surface p-6 shadow-soft sm:p-8">
            <span className="inline-flex items-center gap-2 rounded-full bg-primary-soft px-3 py-1 text-xs font-bold text-primary">
              <Building2 className="size-4" aria-hidden="true" />
              {business.name}
            </span>
            <h1 className="mt-5 text-balance text-3xl font-extrabold text-text-primary sm:text-5xl">
              Review {plan.name}.
            </h1>
            <p className="mt-3 text-sm leading-6 text-text-muted sm:text-base">
              This subscription belongs only to {business.name}. Personal
              finance and other companies are not included in this invoice.
            </p>

            <div className="mt-7 rounded-2xl border border-border bg-surface-inset p-5">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-sm font-bold text-text-primary">{plan.name}</p>
                  <p className="mt-1 text-sm text-text-muted">
                    {rawCycle === "annual" ? "Annual billing" : "Monthly billing"}
                  </p>
                </div>
                <strong className="text-3xl font-extrabold text-text-primary">
                  {price === null ? "Custom" : formatUsdPrice(price)}
                </strong>
              </div>

              <div className="mt-5 grid gap-3 text-sm text-text-secondary sm:grid-cols-2">
                <span>
                  {plan.includedSeats === null
                    ? "Custom team seats"
                    : `${plan.includedSeats} included seats`}
                </span>
                <span>
                  {plan.includedBranches === null
                    ? "Custom branches"
                    : `${plan.includedBranches} included branches`}
                </span>
              </div>
            </div>

            <div className="mt-6 grid gap-3 rounded-2xl bg-surface-inset p-4 text-sm text-text-secondary sm:grid-cols-2">
              <span className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-success" aria-hidden="true" />
                No AI processing for business data
              </span>
              <span className="flex items-center gap-2">
                <CreditCard className="size-4 text-primary" aria-hidden="true" />
                JALVORO stores no card details
              </span>
            </div>
          </article>

          <aside className="rounded-3xl border border-border bg-surface p-6 shadow-soft sm:p-8">
            <h2 className="text-xl font-extrabold text-text-primary">
              Secure checkout
            </h2>
            <p className="mt-3 text-sm leading-6 text-text-muted">
              The checkout adapter remains disabled until Paddle approval,
              products, regional price IDs, and webhook verification are
              complete. No payment can be attempted accidentally.
            </p>

            <div className="mt-6 space-y-3">
              {selfServe ? (
                <CheckoutAction
                  businessId={business.id}
                  plan={rawPlan}
                  cycle={rawCycle}
                  enabled={checkoutEnabled}
                />
              ) : (
                <button
                  type="button"
                  disabled
                  className="min-h-11 w-full rounded-xl border border-border bg-surface-inset px-4 text-sm font-bold text-text-muted"
                >
                  Enterprise contract setup pending
                </button>
              )}

              <Link
                href={freeHref}
                className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-border bg-surface-inset px-4 text-sm font-bold text-text-primary hover:border-border-strong"
              >
                Continue Free instead
              </Link>
            </div>

            <p className="mt-5 text-xs leading-5 text-text-muted">
              Final local currency, tax, and billing country will be confirmed
              by the payment provider before purchase.
            </p>
          </aside>
        </section>
      </div>
    </main>
  );
}
