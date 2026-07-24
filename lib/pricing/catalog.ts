import type {
  BillingCycle,
  BusinessPlan,
  BusinessPlanKey,
  PaidBusinessPlanKey,
  PaidPersonalPlanKey,
  PersonalPlan,
  PersonalPlanKey,
  PricingTierKey,
  RegionalPrice,
} from "./types";

export const PERSONAL_TRIAL_DAYS = 14;
export const BUSINESS_TRIAL_DAYS = 14;

export const PERSONAL_PLAN_ORDER: PersonalPlanKey[] = [
  "free",
  "go",
  "student",
  "plus",
  "pro",
];

export const BUSINESS_PLAN_ORDER: BusinessPlanKey[] = [
  "business_free",
  "solo",
  "starter",
  "growth",
  "scale",
  "enterprise",
];

export const PERSONAL_PLANS: Record<PersonalPlanKey, PersonalPlan> = {
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
    description: "Everyday tracking with unlimited accounts and exports.",
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
    description: "Advanced tools at an accessible verified-student price.",
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
    description: "Advanced reports, analytics, and personal AI insights.",
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
    description: "Forecasting, the largest AI allowance, and priority support.",
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

export const BUSINESS_PLANS: Record<BusinessPlanKey, BusinessPlan> = {
  business_free: {
    key: "business_free",
    name: "Business Free",
    description: "Essential records for one operator and one branch.",
    includedSeats: 1,
    includedBranches: 1,
    features: {
      business_core: true,
      invoicing: true,
      expenses: true,
      contacts: true,
      basic_reports: true,
    },
  },
  solo: {
    key: "solo",
    name: "Solo",
    description: "For freelancers, shop owners, and independent professionals.",
    includedSeats: 2,
    includedBranches: 1,
    features: {
      business_core: true,
      invoicing: true,
      expenses: true,
      contacts: true,
      basic_reports: true,
      inventory_ready: true,
      crm_ready: true,
    },
  },
  starter: {
    key: "starter",
    name: "Starter",
    description: "For a small team that needs permissions and approvals.",
    includedSeats: 5,
    includedBranches: 1,
    features: {
      business_core: true,
      invoicing: true,
      expenses: true,
      contacts: true,
      basic_reports: true,
      advanced_reports: true,
      inventory_ready: true,
      crm_ready: true,
      approval_workflows: true,
    },
  },
  growth: {
    key: "growth",
    name: "Growth",
    description: "For growing companies with departments and branches.",
    includedSeats: 15,
    includedBranches: 3,
    recommended: true,
    features: {
      business_core: true,
      invoicing: true,
      expenses: true,
      contacts: true,
      basic_reports: true,
      advanced_reports: true,
      inventory_ready: true,
      crm_ready: true,
      branch_management: true,
      department_controls: true,
      approval_workflows: true,
      audit_log: true,
    },
  },
  scale: {
    key: "scale",
    name: "Scale",
    description: "For large operating teams that need integrations and governance.",
    includedSeats: 50,
    includedBranches: 10,
    features: {
      business_core: true,
      invoicing: true,
      expenses: true,
      contacts: true,
      basic_reports: true,
      advanced_reports: true,
      inventory_ready: true,
      crm_ready: true,
      branch_management: true,
      department_controls: true,
      approval_workflows: true,
      audit_log: true,
      api_access: true,
      priority_support: true,
    },
  },
  enterprise: {
    key: "enterprise",
    name: "Enterprise",
    description: "For groups, franchises, and multi-company organizations.",
    includedSeats: null,
    includedBranches: null,
    customPricing: true,
    features: {
      business_core: true,
      invoicing: true,
      expenses: true,
      contacts: true,
      basic_reports: true,
      advanced_reports: true,
      inventory_ready: true,
      crm_ready: true,
      branch_management: true,
      department_controls: true,
      approval_workflows: true,
      audit_log: true,
      api_access: true,
      consolidated_reporting: true,
      priority_support: true,
    },
  },
};

const PERSONAL_REGIONAL_PRICES: Record<
  PricingTierKey,
  Record<PaidPersonalPlanKey, RegionalPrice>
> = {
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

const BUSINESS_REGIONAL_PRICES: Record<
  PricingTierKey,
  Record<PaidBusinessPlanKey, RegionalPrice>
> = {
  A: {
    solo: { monthly: 7.99, annual: 72 },
    starter: { monthly: 19.99, annual: 180 },
    growth: { monthly: 59, annual: 540 },
    scale: { monthly: 149, annual: 1380 },
  },
  B: {
    solo: { monthly: 6.99, annual: 60 },
    starter: { monthly: 16.99, annual: 144 },
    growth: { monthly: 49, annual: 420 },
    scale: { monthly: 119, annual: 1080 },
  },
  C: {
    solo: { monthly: 4.99, annual: 45 },
    starter: { monthly: 12.99, annual: 108 },
    growth: { monthly: 39, annual: 336 },
    scale: { monthly: 99, annual: 900 },
  },
  D: {
    solo: { monthly: 3.99, annual: 36 },
    starter: { monthly: 9.99, annual: 84 },
    growth: { monthly: 29, annual: 252 },
    scale: { monthly: 79, annual: 720 },
  },
  E: {
    solo: { monthly: 2.99, annual: 27 },
    starter: { monthly: 7.99, annual: 66 },
    growth: { monthly: 22, annual: 192 },
    scale: { monthly: 59, annual: 540 },
  },
};

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
  "AE", "AF", "AL", "AM", "AR", "AT", "AU", "AZ", "BA", "BD", "BE",
  "BF", "BH", "BI", "BJ", "BM", "BN", "BO", "BR", "BT", "BW", "CA",
  "CD", "CF", "CG", "CH", "CI", "CL", "CM", "CN", "CO", "CR", "CY",
  "CZ", "DE", "DK", "DO", "DZ", "EC", "EE", "EG", "ER", "ES", "ET",
  "FI", "FJ", "FR", "GB", "GE", "GG", "GH", "GM", "GN", "GR", "GT",
  "GW", "HK", "HN", "HR", "HT", "HU", "ID", "IE", "IL", "IM", "IN",
  "IQ", "IS", "IT", "JE", "JO", "JP", "KE", "KG", "KH", "KR", "KW",
  "KY", "KZ", "LA", "LB", "LI", "LK", "LR", "LS", "LT", "LU", "LV",
  "MA", "MC", "MG", "MK", "ML", "MM", "MN", "MR", "MU", "MW", "MX",
  "MY", "MZ", "NA", "NE", "NG", "NI", "NL", "NO", "NP", "NZ", "OM",
  "PA", "PE", "PH", "PK", "PL", "PR", "PT", "PY", "QA", "RO", "RS",
  "RU", "RW", "SA", "SD", "SE", "SG", "SI", "SK", "SL", "SM", "SN",
  "SO", "SS", "SV", "SY", "TD", "TG", "TH", "TN", "TR", "TZ", "UA",
  "UG", "US", "UY", "UZ", "VA", "VI", "VN", "YE", "ZA", "ZM", "ZW",
] as const;

export const BUSINESS_SYSTEMS = [
  ["Simple Shop", "Sales, stock, cash, returns, expenses, and daily profit."],
  ["Retail & POS", "Cashier roles, shifts, stock, receipts, and returns."],
  ["Restaurant", "Tables, kitchen flow, recipes, wastage, and shifts."],
  ["Dealership", "Units, deals, commissions, inventory, and controls."],
  ["Wholesale & Distribution", "Price levels, warehouses, dispatch, and receivables."],
  ["E-commerce", "Orders, channels, fulfilment, returns, and settlements."],
  ["Service Business", "Clients, jobs, appointments, quotations, and invoices."],
  ["Professional Services", "Projects, retainers, time, expenses, and approvals."],
  ["Construction", "Projects, sites, contractors, materials, and progress."],
  ["Manufacturing", "Materials, production, costing, quality, and warehouses."],
  ["General Company", "Departments, roles, accounting, CRM, and reporting."],
  ["Enterprise Group", "Multiple companies, central controls, and group reporting."],
] as const;

export function getPricingTier(countryCode?: string | null): PricingTierKey {
  const code = countryCode?.trim().toUpperCase();
  if (!code) return "A";
  if (TIER_E_COUNTRIES.has(code)) return "E";
  if (TIER_D_COUNTRIES.has(code)) return "D";
  if (TIER_C_COUNTRIES.has(code)) return "C";
  if (TIER_B_COUNTRIES.has(code)) return "B";
  if (TIER_A_COUNTRIES.has(code)) return "A";
  return "C";
}

export function getPersonalPlanPrice(
  plan: PaidPersonalPlanKey,
  countryCode: string | null | undefined,
  cycle: BillingCycle,
): number {
  return PERSONAL_REGIONAL_PRICES[getPricingTier(countryCode)][plan][cycle];
}

export function getBusinessPlanPrice(
  plan: PaidBusinessPlanKey,
  countryCode: string | null | undefined,
  cycle: BillingCycle,
): number {
  return BUSINESS_REGIONAL_PRICES[getPricingTier(countryCode)][plan][cycle];
}

export function getPersonalAnnualSavings(
  plan: PaidPersonalPlanKey,
  countryCode?: string | null,
): number {
  const price = PERSONAL_REGIONAL_PRICES[getPricingTier(countryCode)][plan];
  return Math.round((1 - price.annual / (price.monthly * 12)) * 100);
}

export function getBusinessAnnualSavings(
  plan: PaidBusinessPlanKey,
  countryCode?: string | null,
): number {
  const price = BUSINESS_REGIONAL_PRICES[getPricingTier(countryCode)][plan];
  return Math.round((1 - price.annual / (price.monthly * 12)) * 100);
}

export function formatUsdPrice(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount);
}
