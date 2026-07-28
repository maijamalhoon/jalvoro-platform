"use client";

import Link from "next/link";
import {
  Building2,
  Check,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";
import { useState } from "react";

import {
  BUSINESS_PLAN_ORDER,
  BUSINESS_PLANS,
  getBusinessAnnualSavingsPercent,
  getBusinessPlanPrice,
} from "@/lib/billing/business-catalog";
import { formatUsdPrice } from "@/lib/billing/catalog";
import type {
  BillingCycle,
  PricedBusinessPlanKey,
} from "@/lib/billing/types";

type WorkspacePlanSelectionProps = {
  businessId: string;
  businessName: string;
  businessSystemName: string;
  countryCode: string;
  freeHref: string;
};

const FEATURE_COPY: Record<string, string> = {
  business_core: "Your nature-specific business system",
  invoicing: "Invoices and sales records",
  expenses: "Expenses and purchases",
  contacts: "Customers and suppliers",
  basic_reports: "Essential business reports",
  advanced_reports: "Advanced reporting",
  inventory_ready: "Inventory workflows where relevant",
  crm_ready: "CRM workflows where relevant",
  branch_management: "Multiple branches",
  department_controls: "Departments and operating controls",
  approval_workflows: "Approval workflows",
  audit_log: "Audit history",
  api_access: "API access",
  consolidated_reporting: "Group-level consolidated reporting",
  priority_support: "Priority support",
};

export default function WorkspacePlanSelection({
  businessId,
  businessName,
  businessSystemName,
  countryCode,
  freeHref,
}: WorkspacePlanSelectionProps) {
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("annual");

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-border bg-surface p-5 shadow-soft sm:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full bg-primary-soft px-3 py-1 text-xs font-bold text-primary">
              <Building2 className="size-4" aria-hidden="true" />
              {businessSystemName}
            </span>
            <h1 className="mt-4 text-balance text-3xl font-extrabold tracking-tight text-text-primary sm:text-5xl">
              Choose the plan for {businessName}.
            </h1>
            <p className="mt-3 text-sm leading-6 text-text-muted sm:text-base">
              The company name, system, users, permissions, subscription, and
              invoice stay scoped to this workspace. Continue Free is always
              available.
            </p>
          </div>

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
                className={`min-h-10 rounded-lg px-4 text-sm font-semibold capitalize transition ${
                  billingCycle === cycle
                    ? "bg-primary text-primary-foreground shadow-theme"
                    : "text-text-secondary hover:bg-surface"
                }`}
              >
                {cycle}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 grid gap-3 rounded-2xl bg-surface-inset p-4 text-sm text-text-secondary sm:grid-cols-2">
          <span className="flex items-center gap-2">
            <LockKeyhole className="size-4 text-primary" aria-hidden="true" />
            Business data is isolated from personal finance
          </span>
          <span className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-success" aria-hidden="true" />
            No AI entitlement or AI processing for business data
          </span>
        </div>
      </section>

      <section
        className="grid gap-4 lg:grid-cols-3 2xl:grid-cols-6"
        aria-label={`Plans for ${businessName}`}
      >
        {BUSINESS_PLAN_ORDER.map((planKey) => {
          const plan = BUSINESS_PLANS[planKey];
          const pricedPlan =
            planKey === "business_free" || planKey === "enterprise"
              ? null
              : (planKey as PricedBusinessPlanKey);
          const price = pricedPlan
            ? getBusinessPlanPrice(pricedPlan, countryCode, billingCycle)
            : 0;
          const savings = pricedPlan
            ? getBusinessAnnualSavingsPercent(pricedPlan, countryCode)
            : 0;
          const checkoutHref = `/billing/checkout?businessId=${encodeURIComponent(
            businessId,
          )}&plan=${encodeURIComponent(planKey)}&cycle=${billingCycle}`;

          return (
            <article
              key={planKey}
              className={`relative flex min-h-full flex-col rounded-3xl border bg-surface p-5 shadow-soft ${
                plan.recommended
                  ? "border-primary shadow-premium"
                  : "border-border"
              }`}
            >
              {plan.recommended ? (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-xs font-bold text-primary-foreground">
                  Best for growth
                </span>
              ) : null}

              <h2 className="text-xl font-bold text-text-primary">
                {plan.name}
              </h2>
              <p className="mt-2 min-h-20 text-sm leading-6 text-text-muted">
                {plan.description}
              </p>

              <div className="my-5">
                {plan.customPricing ? (
                  <strong className="text-3xl font-extrabold text-text-primary">
                    Custom
                  </strong>
                ) : (
                  <div className="flex items-end gap-1">
                    <strong className="text-3xl font-extrabold text-text-primary">
                      {formatUsdPrice(price)}
                    </strong>
                    <span className="pb-1 text-sm text-text-muted">
                      /{billingCycle === "annual" ? "year" : "month"}
                    </span>
                  </div>
                )}
                <p className="mt-1 text-xs text-text-muted">
                  {plan.customPricing
                    ? "Contract pricing"
                    : billingCycle === "annual" && pricedPlan
                      ? `Save about ${savings}% annually`
                      : "Base workspace price"}
                </p>
              </div>

              <div className="mb-4 grid grid-cols-2 gap-2 text-xs font-semibold text-text-secondary">
                <span className="rounded-lg bg-surface-inset px-2 py-2">
                  {plan.includedSeats === null
                    ? "Custom seats"
                    : `${plan.includedSeats} seats`}
                </span>
                <span className="rounded-lg bg-surface-inset px-2 py-2">
                  {plan.includedBranches === null
                    ? "Custom branches"
                    : `${plan.includedBranches} branches`}
                </span>
              </div>

              <ul className="mb-6 flex-1 space-y-3 text-sm text-text-secondary">
                {Object.entries(plan.features)
                  .filter(([, enabled]) => enabled === true)
                  .slice(0, 8)
                  .map(([feature]) => (
                    <li key={feature} className="flex gap-2">
                      <Check
                        className="mt-0.5 size-4 shrink-0 text-success"
                        aria-hidden="true"
                      />
                      <span>{FEATURE_COPY[feature] ?? feature}</span>
                    </li>
                  ))}
              </ul>

              <Link
                href={
                  planKey === "business_free" ? freeHref : checkoutHref
                }
                className={`inline-flex min-h-11 items-center justify-center rounded-xl px-4 text-sm font-bold transition focus-visible:shadow-[var(--focus-ring)] ${
                  plan.recommended
                    ? "bg-primary text-primary-foreground hover:bg-primary-hover"
                    : "border border-border bg-surface-inset text-text-primary hover:border-border-strong"
                }`}
              >
                {planKey === "business_free"
                  ? "Continue Free"
                  : planKey === "enterprise"
                    ? "Review enterprise setup"
                    : `Choose ${plan.name}`}
              </Link>
            </article>
          );
        })}
      </section>

      <p className="mx-auto max-w-4xl text-center text-sm leading-6 text-text-muted">
        Paid checkout uses the verified billing country and a provider-hosted
        payment screen. Card details are never stored by JALVORO.
      </p>
    </div>
  );
}
