import { getPricingTier } from "./catalog";
import type {
  BillingCycle,
  BusinessPlanDefinition,
  BusinessPlanKey,
  BusinessRegionalPlanPrices,
  PricedBusinessPlanKey,
  PricingTierKey,
} from "./types";

export const BUSINESS_TRIAL_LENGTH_DAYS = 14;

export const BUSINESS_PLAN_ORDER: BusinessPlanKey[] = [
  "business_free",
  "solo",
  "starter",
  "growth",
  "scale",
  "enterprise",
];

export const BUSINESS_PLANS: Record<BusinessPlanKey, BusinessPlanDefinition> = {
  business_free: {
    key: "business_free",
    name: "Business Free",
    description:
      "Use the selected business system with essential records and one operating seat.",
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
    description:
      "For a one-person business, freelancer, shop owner, or independent professional.",
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
    description:
      "For a small team using its own nature-specific workflow, permissions, and controls.",
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
    description:
      "For a growing company with departments, branches, approvals, and deeper reporting.",
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
    description:
      "For a large company requiring governance, integrations, and many operating teams.",
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
    description:
      "For groups of companies requiring custom seats, consolidated billing, and contract controls.",
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

export const BUSINESS_REGIONAL_PRICES: Record<
  PricingTierKey,
  BusinessRegionalPlanPrices
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

export const BUSINESS_SYSTEMS = [
  {
    code: "simple_shop",
    name: "Simple Shop",
    category: "small_business",
    description:
      "Fast sales, purchases, stock, cash, returns, expenses, and daily profit.",
  },
  {
    code: "retail_pos",
    name: "Retail & POS",
    category: "retail",
    description:
      "Dedicated point-of-sale, cashier roles, shifts, stock, receipts, and returns.",
  },
  {
    code: "restaurant",
    name: "Restaurant",
    category: "hospitality",
    description:
      "Tables, orders, kitchen flow, recipes, wastage, shifts, and restaurant accounting.",
  },
  {
    code: "dealership",
    name: "Dealership",
    category: "dealership",
    description:
      "Units, deals, commissions, financing records, inventory, and dealership controls.",
  },
  {
    code: "wholesale_distribution",
    name: "Wholesale & Distribution",
    category: "wholesale",
    description:
      "Bulk sales, price levels, warehouses, purchasing, dispatch, and receivables.",
  },
  {
    code: "ecommerce",
    name: "E-commerce",
    category: "commerce",
    description:
      "Orders, channels, fulfilment, returns, inventory, settlements, and profitability.",
  },
  {
    code: "service_business",
    name: "Service Business",
    category: "services",
    description:
      "Clients, jobs, appointments, quotations, invoices, staff, and service delivery.",
  },
  {
    code: "professional_services",
    name: "Professional Services",
    category: "services",
    description:
      "Projects, retainers, time, expenses, billing, approvals, and client reporting.",
  },
  {
    code: "construction",
    name: "Construction",
    category: "construction",
    description:
      "Projects, sites, contractors, budgets, materials, billing, and progress tracking.",
  },
  {
    code: "manufacturing",
    name: "Manufacturing",
    category: "manufacturing",
    description:
      "Materials, production, work orders, costing, quality, warehouses, and sales.",
  },
  {
    code: "general_company",
    name: "General Company",
    category: "company",
    description:
      "Full company foundation with departments, roles, accounting, CRM, and reporting.",
  },
  {
    code: "enterprise_group",
    name: "Enterprise Group",
    category: "enterprise",
    description:
      "Multiple companies, central administration, consolidated billing, and group reporting.",
  },
  {
    code: "custom_business",
    name: "Custom Business",
    category: "custom",
    description:
      "A controlled starting point for a nature-specific system that needs custom configuration.",
  },
] as const;

export type BusinessSystemCode = (typeof BUSINESS_SYSTEMS)[number]["code"];

export function businessPlanKeyFromPlanCode(
  planCode: string,
): BusinessPlanKey | null {
  if (planCode === "business_free") return "business_free";
  if (planCode === "enterprise_contract" || planCode === "enterprise") {
    return "enterprise";
  }

  for (const planKey of ["solo", "starter", "growth", "scale"] as const) {
    if (planCode === planKey || planCode.startsWith(`${planKey}_`)) {
      return planKey;
    }
  }

  return null;
}

export function getBusinessPlanPrice(
  planKey: PricedBusinessPlanKey,
  countryCode: string | null | undefined,
  billingCycle: BillingCycle,
): number {
  return BUSINESS_REGIONAL_PRICES[getPricingTier(countryCode)][planKey][billingCycle];
}

export function getBusinessAnnualSavingsPercent(
  planKey: PricedBusinessPlanKey,
  countryCode?: string | null,
): number {
  const prices = BUSINESS_REGIONAL_PRICES[getPricingTier(countryCode)][planKey];
  return Math.round((1 - prices.annual / (prices.monthly * 12)) * 100);
}
