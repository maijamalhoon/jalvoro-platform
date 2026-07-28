import type {
  BillingCycle,
  PaidPlanKey,
  PlanDefinition,
  PlanKey,
  PricingTierKey,
  RegionalPlanPrices,
} from "./types";

export const TRIAL_LENGTH_DAYS = 14;

export const PLAN_ORDER: PlanKey[] = ["free", "go", "student", "plus", "pro"];

export const PLANS: Record<PlanKey, PlanDefinition> = {
  free: {
    key: "free",
    name: "Free",
    description: "Core personal-finance tracking with no expiry.",
    features: {
      core_tracking: true,
      unlimited_accounts: false,
      recurring_transactions: false,
      csv_export: false,
      advanced_reports: false,
      advanced_analytics: false,
      ai_insights: 0,
      forecasting: false,
      priority_support: false,
    },
  },
  go: {
    key: "go",
    name: "Go",
    description: "Everyday tracking with higher limits and exports.",
    features: {
      core_tracking: true,
      unlimited_accounts: true,
      recurring_transactions: true,
      csv_export: true,
      advanced_reports: false,
      advanced_analytics: false,
      ai_insights: 0,
      forecasting: false,
      priority_support: false,
    },
  },
  student: {
    key: "student",
    name: "Student",
    description: "Plus-level tools at an accessible verified-student price.",
    studentOnly: true,
    features: {
      core_tracking: true,
      unlimited_accounts: true,
      recurring_transactions: true,
      csv_export: true,
      advanced_reports: true,
      advanced_analytics: true,
      ai_insights: 25,
      forecasting: false,
      priority_support: false,
    },
  },
  plus: {
    key: "plus",
    name: "Plus",
    description: "Advanced reports, analytics, and a larger AI allowance.",
    recommended: true,
    features: {
      core_tracking: true,
      unlimited_accounts: true,
      recurring_transactions: true,
      csv_export: true,
      advanced_reports: true,
      advanced_analytics: true,
      ai_insights: 60,
      forecasting: false,
      priority_support: false,
    },
  },
  pro: {
    key: "pro",
    name: "Pro",
    description: "The complete forecasting and AI workspace for power users.",
    features: {
      core_tracking: true,
      unlimited_accounts: true,
      recurring_transactions: true,
      csv_export: true,
      advanced_reports: true,
      advanced_analytics: true,
      ai_insights: 200,
      forecasting: true,
      priority_support: true,
    },
  },
};

export const REGIONAL_PRICES: Record<PricingTierKey, RegionalPlanPrices> = {
  A: {
    go: { monthly: 1.99, annual: 18 },
    student: { monthly: 2.99, annual: 24 },
    plus: { monthly: 5.99, annual: 60 },
    pro: { monthly: 11.99, annual: 120 },
  },
  B: {
    go: { monthly: 1.99, annual: 18 },
    student: { monthly: 2.49, annual: 21 },
    plus: { monthly: 4.99, annual: 48 },
    pro: { monthly: 9.99, annual: 96 },
  },
  C: {
    go: { monthly: 1.49, annual: 14 },
    student: { monthly: 1.99, annual: 18 },
    plus: { monthly: 3.99, annual: 36 },
    pro: { monthly: 7.99, annual: 72 },
  },
  D: {
    go: { monthly: 1.49, annual: 12 },
    student: { monthly: 1.79, annual: 15 },
    plus: { monthly: 2.99, annual: 24 },
    pro: { monthly: 5.99, annual: 48 },
  },
  E: {
    go: { monthly: 1.49, annual: 12 },
    student: { monthly: 1.79, annual: 15 },
    plus: { monthly: 2.49, annual: 24 },
    pro: { monthly: 3.99, annual: 39 },
  },
};

// Commercial launch tiers, not an official economic classification. Unlisted
// countries safely fall back to the middle Tier C until a deliberate override is added.
const TIER_A_COUNTRIES = new Set([
  "AD", "AT", "AU", "BE", "BM", "CA", "CH", "CY", "DE", "DK", "ES",
  "FI", "FR", "GB", "GG", "HK", "IE", "IL", "IM", "IS", "IT", "JE",
  "JP", "KR", "KY", "LI", "LU", "MC", "NL", "NO", "NZ", "PR", "SE",
  "SG", "SM", "US", "VA", "VI",
]);

const TIER_B_COUNTRIES = new Set([
  "AE", "BH", "BN", "CL", "CN", "CR", "CZ", "EE", "GR", "HR", "HU",
  "KW", "LT", "LV", "MY", "OM", "PA", "PL", "PT", "QA", "RO", "SA",
  "SK", "SI", "TR", "UY",
]);

const TIER_C_COUNTRIES = new Set([
  "AL", "AM", "AR", "AZ", "BA", "BR", "BW", "CO", "DO", "DZ", "EC",
  "EG", "FJ", "GE", "ID", "IQ", "JO", "KZ", "LB", "LK", "MA", "MX",
  "MK", "MN", "MU", "NA", "PE", "PH", "PY", "RS", "TH", "TN", "UA",
  "UZ", "VN", "ZA",
]);

const TIER_D_COUNTRIES = new Set([
  "BD", "BO", "BT", "CI", "CM", "GH", "GT", "HN", "IN", "KE", "KH",
  "KG", "LA", "MM", "NG", "NI", "NP", "PK", "RW", "SN", "SV", "TZ",
  "UG", "ZM", "ZW",
]);

const TIER_E_COUNTRIES = new Set([
  "AF", "BF", "BI", "BJ", "CD", "CF", "CG", "ER", "ET", "GM", "GN",
  "GW", "HT", "LR", "LS", "MG", "ML", "MR", "MW", "MZ", "NE", "SL",
  "SO", "SS", "SD", "SY", "TD", "TG", "YE",
]);

export const SUPPORTED_COUNTRY_CODES = [
  "AD", "AE", "AF", "AG", "AI", "AL", "AM", "AO", "AQ", "AR", "AS", "AT", "AU", "AW", "AX", "AZ", "BA", "BB", "BD", "BE", "BF", "BG", "BH", "BI", "BJ", "BL", "BM", "BN", "BO", "BQ", "BR", "BS", "BT", "BV", "BW", "BY", "BZ", "CA", "CC", "CD", "CF", "CG", "CH", "CI", "CK", "CL", "CM", "CN", "CO", "CR", "CU", "CV", "CW", "CX", "CY", "CZ", "DE", "DJ", "DK", "DM", "DO", "DZ", "EC", "EE", "EG", "EH", "ER", "ES", "ET", "FI", "FJ", "FK", "FM", "FO", "FR", "GA", "GB", "GD", "GE", "GF", "GG", "GH", "GI", "GL", "GM", "GN", "GP", "GQ", "GR", "GS", "GT", "GU", "GW", "GY", "HK", "HM", "HN", "HR", "HT", "HU", "ID", "IE", "IL", "IM", "IN", "IO", "IQ", "IR", "IS", "IT", "JE", "JM", "JO", "JP", "KE", "KG", "KH", "KI", "KM", "KN", "KP", "KR", "KW", "KY", "KZ", "LA", "LB", "LC", "LI", "LK", "LR", "LS", "LT", "LU", "LV", "LY", "MA", "MC", "MD", "ME", "MF", "MG", "MH", "MK", "ML", "MM", "MN", "MO", "MP", "MQ", "MR", "MS", "MT", "MU", "MV", "MW", "MX", "MY", "MZ", "NA", "NC", "NE", "NF", "NG", "NI", "NL", "NO", "NP", "NR", "NU", "NZ", "OM", "PA", "PE", "PF", "PG", "PH", "PK", "PL", "PM", "PN", "PR", "PS", "PT", "PW", "PY", "QA", "RE", "RO", "RS", "RU", "RW", "SA", "SB", "SC", "SD", "SE", "SG", "SH", "SI", "SJ", "SK", "SL", "SM", "SN", "SO", "SR", "SS", "ST", "SV", "SX", "SY", "SZ", "TC", "TD", "TF", "TG", "TH", "TJ", "TK", "TL", "TM", "TN", "TO", "TR", "TT", "TV", "TW", "TZ", "UA", "UG", "UM", "US", "UY", "UZ", "VA", "VC", "VE", "VG", "VI", "VN", "VU", "WF", "WS", "YE", "YT", "ZA", "ZM", "ZW"
] as const;

export function planKeyFromPlanCode(planCode: string): PlanKey | null {
  if (planCode === "free") return "free";
  for (const planKey of ["go", "student", "plus", "pro"] as const) {
    if (planCode === planKey || planCode.startsWith(`${planKey}_`)) return planKey;
  }
  return null;
}

export function getPricingTier(countryCode?: string | null): PricingTierKey {
  const normalized = countryCode?.trim().toUpperCase();
  if (!normalized) return "A";
  if (TIER_E_COUNTRIES.has(normalized)) return "E";
  if (TIER_D_COUNTRIES.has(normalized)) return "D";
  if (TIER_C_COUNTRIES.has(normalized)) return "C";
  if (TIER_B_COUNTRIES.has(normalized)) return "B";
  if (TIER_A_COUNTRIES.has(normalized)) return "A";
  return "C";
}

export function getPlanPrice(
  planKey: PaidPlanKey,
  countryCode: string | null | undefined,
  billingCycle: BillingCycle,
): number {
  return REGIONAL_PRICES[getPricingTier(countryCode)][planKey][billingCycle];
}

export function getAnnualSavingsPercent(
  planKey: PaidPlanKey,
  countryCode?: string | null,
): number {
  const prices = REGIONAL_PRICES[getPricingTier(countryCode)][planKey];
  return Math.round((1 - prices.annual / (prices.monthly * 12)) * 100);
}

export function formatUsdPrice(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount);
}
