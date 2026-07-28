export type PlanKey = "free" | "go" | "student" | "plus" | "pro";

export type PaidPlanKey = Exclude<PlanKey, "free">;

export type BusinessPlanKey =
  | "business_free"
  | "solo"
  | "starter"
  | "growth"
  | "scale"
  | "enterprise";

export type PricedBusinessPlanKey = Exclude<
  BusinessPlanKey,
  "business_free" | "enterprise"
>;

export type BillingCycle = "monthly" | "annual";

export type PricingTierKey = "A" | "B" | "C" | "D" | "E";

export type BillingUniverse = "personal" | "business" | "enterprise";

export type BillingAccountKind =
  | "personal"
  | "business"
  | "enterprise_group";

export type SubscriptionStatus =
  | "free"
  | "trialing"
  | "active"
  | "past_due"
  | "paused"
  | "cancelled"
  | "expired"
  | "incomplete";

export type FeatureKey =
  | "core_tracking"
  | "unlimited_accounts"
  | "recurring_transactions"
  | "csv_export"
  | "advanced_reports"
  | "advanced_analytics"
  | "ai_insights"
  | "forecasting"
  | "priority_support";

export type BusinessFeatureKey =
  | "business_core"
  | "invoicing"
  | "expenses"
  | "contacts"
  | "basic_reports"
  | "advanced_reports"
  | "inventory_ready"
  | "crm_ready"
  | "branch_management"
  | "department_controls"
  | "approval_workflows"
  | "audit_log"
  | "api_access"
  | "consolidated_reporting"
  | "priority_support";

export type FeatureAllowance = boolean | number;

export type PlanDefinition = {
  key: PlanKey;
  name: string;
  description: string;
  recommended?: boolean;
  studentOnly?: boolean;
  features: Partial<Record<FeatureKey, FeatureAllowance>>;
};

export type BusinessPlanDefinition = {
  key: BusinessPlanKey;
  name: string;
  description: string;
  includedSeats: number | null;
  includedBranches: number | null;
  customPricing?: boolean;
  recommended?: boolean;
  features: Partial<Record<BusinessFeatureKey, FeatureAllowance>>;
};

export type RegionalPrice = {
  monthly: number;
  annual: number;
};

export type RegionalPlanPrices = Record<PaidPlanKey, RegionalPrice>;

export type BusinessRegionalPlanPrices = Record<
  PricedBusinessPlanKey,
  RegionalPrice
>;

export type BillingSubscriptionSnapshot = {
  planKey: PlanKey;
  status: SubscriptionStatus;
  trialEndsAt?: string | null;
  currentPeriodEndsAt?: string | null;
  gracePeriodEndsAt?: string | null;
};

export type BillingScope =
  | { kind: "personal" }
  | { kind: "business"; businessId: string }
  | { kind: "enterprise"; enterpriseGroupId: string };
