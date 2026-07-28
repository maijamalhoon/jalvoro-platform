import "server-only";

import { businessPlanKeyFromPlanCode } from "./business-catalog";
import { planKeyFromPlanCode } from "./catalog";
import { resolveAccessPlan } from "./entitlements";
import type {
  BillingAccountKind,
  BillingScope,
  BillingUniverse,
  BusinessPlanKey,
  PlanKey,
  SubscriptionStatus,
} from "./types";
import { createClient } from "@/lib/supabase/server";

type ReadyAccessBase = {
  state: "ready";
  userId: string;
  accountId: string | null;
  accountKind: BillingAccountKind;
  universe: BillingUniverse;
  planCode: string;
  subscriptionStatus: SubscriptionStatus;
  currentPeriodEndsAt: string | null;
  trialEndsAt: string | null;
};

export type PersonalBillingAccessResult =
  | (ReadyAccessBase & {
      accountKind: "personal";
      universe: "personal";
      planKey: PlanKey;
    })
  | {
      state: "unauthenticated";
      planKey: "free";
    }
  | {
      state: "unavailable";
      planKey: null;
    };

export type BusinessBillingAccessResult =
  | (ReadyAccessBase & {
      accountKind: "business";
      universe: "business";
      businessId: string;
      planKey: BusinessPlanKey;
    })
  | {
      state: "unauthenticated";
      planKey: "business_free";
    }
  | {
      state: "unavailable";
      planKey: null;
    };

export type EnterpriseBillingAccessResult =
  | (ReadyAccessBase & {
      accountKind: "enterprise_group";
      universe: "enterprise";
      enterpriseGroupId: string;
      planKey: "enterprise" | "business_free";
    })
  | {
      state: "unauthenticated";
      planKey: "business_free";
    }
  | {
      state: "unavailable";
      planKey: null;
    };

export type BillingAccessResult =
  | PersonalBillingAccessResult
  | BusinessBillingAccessResult
  | EnterpriseBillingAccessResult;

type BillingSnapshot = {
  accountId: string | null;
  accountKind: BillingAccountKind | null;
  productUniverse: BillingUniverse | null;
  planCode: string;
  status: SubscriptionStatus;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  gracePeriodEnd: string | null;
};

const SUBSCRIPTION_STATUSES = new Set<SubscriptionStatus>([
  "free",
  "trialing",
  "active",
  "past_due",
  "paused",
  "cancelled",
  "expired",
  "incomplete",
]);

const ACCOUNT_KINDS = new Set<BillingAccountKind>([
  "personal",
  "business",
  "enterprise_group",
]);

const UNIVERSES = new Set<BillingUniverse>([
  "personal",
  "business",
  "enterprise",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function optionalDate(value: unknown): string | null | undefined {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string" || Number.isNaN(Date.parse(value))) return undefined;
  return value;
}

function optionalString(value: unknown): string | null | undefined {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") return undefined;
  const normalized = value.trim();
  return normalized ? normalized : undefined;
}

function parseBillingSnapshot(value: unknown): BillingSnapshot | null {
  if (!isRecord(value)) return null;

  const accountId = optionalString(value.accountId);
  const accountKind = value.accountKind;
  const productUniverse = value.productUniverse;
  const planCode = typeof value.planCode === "string" ? value.planCode.trim() : "";
  const status = value.status;
  const trialEndsAt = optionalDate(value.trialEndsAt);
  const currentPeriodEnd = optionalDate(value.currentPeriodEnd);
  const gracePeriodEnd = optionalDate(value.gracePeriodEnd);

  if (
    accountId === undefined ||
    (accountKind !== null &&
      accountKind !== undefined &&
      (typeof accountKind !== "string" ||
        !ACCOUNT_KINDS.has(accountKind as BillingAccountKind))) ||
    (productUniverse !== null &&
      productUniverse !== undefined &&
      (typeof productUniverse !== "string" ||
        !UNIVERSES.has(productUniverse as BillingUniverse))) ||
    !planCode ||
    typeof status !== "string" ||
    !SUBSCRIPTION_STATUSES.has(status as SubscriptionStatus) ||
    trialEndsAt === undefined ||
    currentPeriodEnd === undefined ||
    gracePeriodEnd === undefined
  ) {
    return null;
  }

  return {
    accountId,
    accountKind:
      typeof accountKind === "string"
        ? (accountKind as BillingAccountKind)
        : null,
    productUniverse:
      typeof productUniverse === "string"
        ? (productUniverse as BillingUniverse)
        : null,
    planCode,
    status: status as SubscriptionStatus,
    trialEndsAt,
    currentPeriodEnd,
    gracePeriodEnd,
  };
}

function dateIsFuture(value: string | null, now: Date): boolean {
  return value !== null && Date.parse(value) > now.getTime();
}

function resolveBusinessAccessPlan(
  planKey: BusinessPlanKey,
  snapshot: BillingSnapshot,
  now = new Date(),
): BusinessPlanKey {
  if (planKey === "business_free") return "business_free";

  switch (snapshot.status) {
    case "trialing":
      return dateIsFuture(snapshot.trialEndsAt, now)
        ? planKey
        : "business_free";
    case "active":
      return snapshot.currentPeriodEnd === null ||
        dateIsFuture(snapshot.currentPeriodEnd, now)
        ? planKey
        : "business_free";
    case "cancelled":
      return dateIsFuture(snapshot.currentPeriodEnd, now)
        ? planKey
        : "business_free";
    case "past_due": {
      const graceEnd =
        snapshot.gracePeriodEnd ??
        (snapshot.currentPeriodEnd
          ? new Date(
              Date.parse(snapshot.currentPeriodEnd) + 7 * 24 * 60 * 60 * 1000,
            ).toISOString()
          : null);
      return dateIsFuture(graceEnd, now) ? planKey : "business_free";
    }
    case "free":
    case "paused":
    case "expired":
    case "incomplete":
      return "business_free";
  }
}

async function getAuthenticatedUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  return { supabase, user: error ? null : user };
}

export async function getCurrentBillingAccess(): Promise<PersonalBillingAccessResult> {
  const { supabase, user } = await getAuthenticatedUser();

  if (!user) {
    return { state: "unauthenticated", planKey: "free" };
  }

  const { data, error } = await supabase.rpc("get_my_billing_snapshot");
  if (error) {
    return { state: "unavailable", planKey: null };
  }

  const snapshot = parseBillingSnapshot(data);
  const subscribedPlanKey = snapshot
    ? planKeyFromPlanCode(snapshot.planCode)
    : null;

  if (!snapshot || !subscribedPlanKey) {
    return { state: "unavailable", planKey: null };
  }

  return {
    state: "ready",
    userId: user.id,
    accountId: snapshot.accountId,
    accountKind: "personal",
    universe: "personal",
    planKey: resolveAccessPlan({
      planKey: subscribedPlanKey,
      status: snapshot.status,
      trialEndsAt: snapshot.trialEndsAt,
      currentPeriodEndsAt: snapshot.currentPeriodEnd,
      gracePeriodEndsAt: snapshot.gracePeriodEnd,
    }),
    planCode: snapshot.planCode,
    subscriptionStatus: snapshot.status,
    currentPeriodEndsAt: snapshot.currentPeriodEnd,
    trialEndsAt: snapshot.trialEndsAt,
  };
}

export async function getBusinessBillingAccess(
  businessId: string,
): Promise<BusinessBillingAccessResult> {
  const { supabase, user } = await getAuthenticatedUser();

  if (!user) {
    return { state: "unauthenticated", planKey: "business_free" };
  }

  const { data, error } = await supabase.rpc("get_business_billing_snapshot", {
    target_business_id: businessId,
  });

  if (error) {
    return { state: "unavailable", planKey: null };
  }

  const snapshot = parseBillingSnapshot(data);
  const subscribedPlanKey = snapshot
    ? businessPlanKeyFromPlanCode(snapshot.planCode)
    : null;

  if (!snapshot || !subscribedPlanKey) {
    return { state: "unavailable", planKey: null };
  }

  return {
    state: "ready",
    userId: user.id,
    businessId,
    accountId: snapshot.accountId,
    accountKind: "business",
    universe: "business",
    planKey: resolveBusinessAccessPlan(subscribedPlanKey, snapshot),
    planCode: snapshot.planCode,
    subscriptionStatus: snapshot.status,
    currentPeriodEndsAt: snapshot.currentPeriodEnd,
    trialEndsAt: snapshot.trialEndsAt,
  };
}

export async function getEnterpriseBillingAccess(
  enterpriseGroupId: string,
): Promise<EnterpriseBillingAccessResult> {
  const { supabase, user } = await getAuthenticatedUser();

  if (!user) {
    return { state: "unauthenticated", planKey: "business_free" };
  }

  const { data, error } = await supabase.rpc(
    "get_enterprise_group_billing_snapshot",
    { target_group_id: enterpriseGroupId },
  );

  if (error) {
    return { state: "unavailable", planKey: null };
  }

  const snapshot = parseBillingSnapshot(data);
  const subscribedPlanKey = snapshot
    ? businessPlanKeyFromPlanCode(snapshot.planCode)
    : null;

  if (!snapshot || !subscribedPlanKey) {
    return { state: "unavailable", planKey: null };
  }

  const resolved = resolveBusinessAccessPlan(subscribedPlanKey, snapshot);

  return {
    state: "ready",
    userId: user.id,
    enterpriseGroupId,
    accountId: snapshot.accountId,
    accountKind: "enterprise_group",
    universe: "enterprise",
    planKey: resolved === "enterprise" ? "enterprise" : "business_free",
    planCode: snapshot.planCode,
    subscriptionStatus: snapshot.status,
    currentPeriodEndsAt: snapshot.currentPeriodEnd,
    trialEndsAt: snapshot.trialEndsAt,
  };
}

export async function getBillingAccess(
  scope: BillingScope,
): Promise<BillingAccessResult> {
  if (scope.kind === "business") {
    return getBusinessBillingAccess(scope.businessId);
  }

  if (scope.kind === "enterprise") {
    return getEnterpriseBillingAccess(scope.enterpriseGroupId);
  }

  return getCurrentBillingAccess();
}
