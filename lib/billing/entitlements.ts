import { PLANS } from "./catalog";
import type {
  BillingSubscriptionSnapshot,
  FeatureAllowance,
  FeatureKey,
  PlanKey,
} from "./types";

const DEFAULT_PAST_DUE_GRACE_DAYS = 7;

function parseDate(value?: string | null): number | null {
  if (!value) return null;
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? null : timestamp;
}

function addDays(timestamp: number, days: number): number {
  return timestamp + days * 24 * 60 * 60 * 1000;
}

export function resolveAccessPlan(
  subscription: BillingSubscriptionSnapshot | null | undefined,
  now = new Date(),
): PlanKey {
  if (!subscription || subscription.planKey === "free") return "free";

  const nowTimestamp = now.getTime();
  const trialEnd = parseDate(subscription.trialEndsAt);
  const periodEnd = parseDate(subscription.currentPeriodEndsAt);
  const explicitGraceEnd = parseDate(subscription.gracePeriodEndsAt);

  switch (subscription.status) {
    case "trialing":
      return trialEnd !== null && trialEnd > nowTimestamp
        ? subscription.planKey
        : "free";
    case "active":
      return periodEnd === null || periodEnd > nowTimestamp
        ? subscription.planKey
        : "free";
    case "cancelled":
      return periodEnd !== null && periodEnd > nowTimestamp
        ? subscription.planKey
        : "free";
    case "past_due": {
      const graceEnd = explicitGraceEnd ??
        (periodEnd === null ? null : addDays(periodEnd, DEFAULT_PAST_DUE_GRACE_DAYS));
      return graceEnd !== null && graceEnd > nowTimestamp
        ? subscription.planKey
        : "free";
    }
    case "paused":
    case "expired":
    case "incomplete":
    case "free":
      return "free";
  }
}

export function getFeatureAllowance(
  planKey: PlanKey,
  featureKey: FeatureKey,
): FeatureAllowance {
  return PLANS[planKey].features[featureKey] ?? false;
}

export function canUseFeature(
  planKey: PlanKey,
  featureKey: FeatureKey,
  usedQuantity = 0,
): boolean {
  const allowance = getFeatureAllowance(planKey, featureKey);
  if (typeof allowance === "boolean") return allowance;
  return allowance > usedQuantity;
}

export function getRemainingUsage(
  planKey: PlanKey,
  featureKey: FeatureKey,
  usedQuantity: number,
): number | null {
  const allowance = getFeatureAllowance(planKey, featureKey);
  if (typeof allowance === "boolean") return allowance ? null : 0;
  return Math.max(0, allowance - Math.max(0, usedQuantity));
}
