import type {
  BillingCycle,
  BusinessPlanKey,
  PaidPlanKey,
  PricedBusinessPlanKey,
} from "./types";

const SELF_SERVE_BUSINESS_PLANS = new Set<PricedBusinessPlanKey>([
  "solo",
  "starter",
  "growth",
  "scale",
]);

const PERSONAL_PAID_PLANS = new Set<PaidPlanKey>([
  "go",
  "student",
  "plus",
  "pro",
]);

export function isBillingCycle(value: unknown): value is BillingCycle {
  return value === "monthly" || value === "annual";
}

export function isPaidPlanKey(value: unknown): value is PaidPlanKey {
  return PERSONAL_PAID_PLANS.has(value as PaidPlanKey);
}

export function isBusinessPlanKey(value: unknown): value is BusinessPlanKey {
  return (
    value === "business_free" ||
    value === "solo" ||
    value === "starter" ||
    value === "growth" ||
    value === "scale" ||
    value === "enterprise"
  );
}

export function isSelfServeBusinessPlan(
  value: BusinessPlanKey,
): value is PricedBusinessPlanKey {
  return SELF_SERVE_BUSINESS_PLANS.has(value as PricedBusinessPlanKey);
}

export function personalPlanCode(
  plan: PaidPlanKey,
  cycle: BillingCycle,
): string {
  return `${plan}_${cycle === "annual" ? "year" : "month"}`;
}

export function businessPlanCode(
  plan: PricedBusinessPlanKey,
  cycle: BillingCycle,
): string {
  return `${plan}_${cycle === "annual" ? "year" : "month"}`;
}
