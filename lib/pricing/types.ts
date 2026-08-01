export type PricingUniverse = "personal" | "business";

export type BillingCycle = "monthly" | "annual";

export type PricingTierKey = "A" | "B" | "C" | "D" | "E";

export type PersonalPlanKey = "free" | "go" | "student" | "plus" | "pro";

export type PaidPersonalPlanKey = Exclude<PersonalPlanKey, "free">;

export type BusinessPlanKey =
  | "business_free"
  | "solo"
  | "starter"
  | "growth"
  | "scale"
  | "enterprise";

export type PaidBusinessPlanKey = Exclude<
  BusinessPlanKey,
  "business_free" | "enterprise"
>;

export type PersonalFeatureKey =
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

export type PersonalPlan = {
  key: PersonalPlanKey;
  name: string;
  description: string;
  recommended?: boolean;
  studentOnly?: boolean;
  features: Partial<Record<PersonalFeatureKey, FeatureAllowance>>;
};

export type BusinessPlan = {
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
