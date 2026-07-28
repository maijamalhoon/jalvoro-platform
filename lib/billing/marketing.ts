import type {
  BusinessFeatureKey,
  BusinessPlanKey,
  FeatureKey,
  PlanKey,
} from "./types";

export type PlanMarketing = {
  badge?: string;
  audience: string;
  headline: string;
  summary: string;
  outcomes: readonly string[];
  idealFor: readonly string[];
  confidence: readonly string[];
};

export const PERSONAL_FEATURE_LABELS: Record<FeatureKey, string> = {
  core_tracking: "Income, expenses, accounts, goals, and investments",
  unlimited_accounts: "Unlimited personal finance accounts",
  recurring_transactions: "Recurring income, expense, and bill workflows",
  csv_export: "Portable CSV data export",
  advanced_reports: "Advanced personal finance reports",
  advanced_analytics: "Deeper trends and financial analytics",
  ai_insights: "Private Personal Finance AI insight allowance",
  forecasting: "Personal cash-flow and goal forecasting",
  priority_support: "Priority customer support",
};

export const BUSINESS_FEATURE_LABELS: Record<BusinessFeatureKey, string> = {
  business_core: "Nature-specific business operating system",
  invoicing: "Invoices, sales, and receivable records",
  expenses: "Purchases, expenses, and payable records",
  contacts: "Customer and supplier management",
  basic_reports: "Essential operating and finance reports",
  advanced_reports: "Advanced business reporting",
  inventory_ready: "Inventory workflows where relevant",
  crm_ready: "Customer relationship workflows where relevant",
  branch_management: "Multi-branch operations",
  department_controls: "Department-level operating controls",
  approval_workflows: "Structured approvals and review flows",
  audit_log: "Operational audit history",
  api_access: "Integration and API access",
  consolidated_reporting: "Group-level consolidated reporting",
  priority_support: "Priority customer support",
};

export const PERSONAL_PLAN_MARKETING: Record<PlanKey, PlanMarketing> = {
  free: {
    badge: "Start without a card",
    audience: "For building the habit",
    headline: "Know where your money goes.",
    summary:
      "A permanent starting point for private everyday finance tracking without a subscription deadline.",
    outcomes: [
      "Bring income, expenses, accounts, goals, and investments into one workspace.",
      "Build a clear personal money routine before upgrading.",
      "Keep Personal and Business records completely separate.",
    ],
    idealFor: ["First-time budgeters", "Simple personal tracking", "Long-term free use"],
    confidence: ["No expiry", "No card required", "Upgrade only when useful"],
  },
  go: {
    audience: "For consistent everyday tracking",
    headline: "Move from basic tracking to a dependable money system.",
    summary:
      "Unlock recurring records, unlimited accounts, and export tools for a cleaner monthly routine.",
    outcomes: [
      "Track every personal account without artificial account limits.",
      "Reduce repeated entry with recurring transaction workflows.",
      "Export your records whenever you need a portable copy.",
    ],
    idealFor: ["Salary earners", "Household tracking", "Multi-account users"],
    confidence: ["Affordable regional pricing", "Monthly or annual billing", "Cancel through billing management"],
  },
  student: {
    badge: "Verified students",
    audience: "For students building financial independence",
    headline: "Advanced money tools at a verified-student price.",
    summary:
      "Get Plus-level reporting and analytics with a focused Personal Finance AI allowance after eligibility verification.",
    outcomes: [
      "Understand spending patterns while studying or starting work.",
      "Use advanced reports and analytics without a full professional price.",
      "Receive Personal Finance AI insights inside the personal universe only.",
    ],
    idealFor: ["University students", "Early-career learners", "Verified student accounts"],
    confidence: ["Verification required", "Evidence stays private", "No Business data is sent to AI"],
  },
  plus: {
    badge: "Best value",
    audience: "For people who want deeper clarity",
    headline: "Turn financial records into decisions.",
    summary:
      "Advanced reports, analytics, and a larger Personal Finance AI allowance for users who actively manage their money.",
    outcomes: [
      "See trends beyond simple income and expense totals.",
      "Use advanced analytics to understand changing financial behavior.",
      "Receive more Personal Finance AI insights without crossing into Business data.",
    ],
    idealFor: ["Active budget managers", "Goal-driven savers", "Users wanting deeper analytics"],
    confidence: ["Recommended personal plan", "Private universe separation", "Regional monthly and annual options"],
  },
  pro: {
    badge: "14-day no-card trial",
    audience: "For power users and long-term planners",
    headline: "Plan forward, not only backward.",
    summary:
      "The complete Personal Finance workspace with forecasting, the largest AI allowance, and priority support.",
    outcomes: [
      "Forecast cash flow and financial goals using your Personal Finance records.",
      "Use the highest Personal Finance AI insight allowance.",
      "Get priority help for advanced personal workflows.",
    ],
    idealFor: ["Power users", "Detailed planners", "People managing complex personal finances"],
    confidence: ["Trial starts manually", "No card for the trial", "No automatic trial charge"],
  },
};

export const BUSINESS_PLAN_MARKETING: Record<BusinessPlanKey, PlanMarketing> = {
  business_free: {
    badge: "Permanent free workspace",
    audience: "For validating the operating system",
    headline: "Start running the business in one structured workspace.",
    summary:
      "Use the selected nature-specific system with essential business records, one seat, and one branch.",
    outcomes: [
      "Start with the workflow designed for your business nature.",
      "Record invoices, expenses, customers, suppliers, and core reports.",
      "Keep this company isolated from Personal Finance and every other company.",
    ],
    idealFor: ["New businesses", "One operator", "Trying the business system"],
    confidence: ["No expiry", "No card required", "No AI processing for Business data"],
  },
  solo: {
    audience: "For owners operating independently",
    headline: "Run a serious one-person business without enterprise complexity.",
    summary:
      "A focused operating workspace for freelancers, shop owners, consultants, and independent professionals.",
    outcomes: [
      "Use invoicing, expenses, contacts, and core reporting in one place.",
      "Enable inventory or CRM workflows when the selected business nature needs them.",
      "Add a second seat while the owner remains in control.",
    ],
    idealFor: ["Freelancers", "Shop owners", "Independent professionals"],
    confidence: ["Two included seats", "One included branch", "Business data remains AI-free"],
  },
  starter: {
    audience: "For small teams building repeatable operations",
    headline: "Give a growing team structure before work becomes chaotic.",
    summary:
      "Add team capacity, advanced reports, and approval workflows to the selected business operating system.",
    outcomes: [
      "Coordinate up to five included operating seats.",
      "Use advanced reporting and structured approvals.",
      "Keep permissions and workflows aligned with the company’s nature.",
    ],
    idealFor: ["Small teams", "Early-stage companies", "Owner-led operations"],
    confidence: ["Five included seats", "One included branch", "Separate company subscription and invoice"],
  },
  growth: {
    badge: "Best for growing companies",
    audience: "For companies adding departments and branches",
    headline: "Scale operations without losing control.",
    summary:
      "Departments, branches, approvals, audit history, and deeper reporting for a company entering its next stage.",
    outcomes: [
      "Coordinate multiple branches and department-level controls.",
      "Create structured approval paths and retain an audit history.",
      "Give more teams one consistent operating source of truth.",
    ],
    idealFor: ["Growing companies", "Multi-department teams", "Branch-based operations"],
    confidence: ["15 included seats", "Three included branches", "14-day no-card trial foundation"],
  },
  scale: {
    audience: "For large operating teams",
    headline: "Govern complex operations across teams and locations.",
    summary:
      "High-capacity seats and branches, audit controls, integrations, and priority support for large companies.",
    outcomes: [
      "Support many operating teams without mixing roles or permissions.",
      "Connect approved integrations through API access.",
      "Use stronger governance and priority support as complexity increases.",
    ],
    idealFor: ["Large companies", "Regional operations", "Integration-heavy teams"],
    confidence: ["50 included seats", "10 included branches", "Business and Personal billing remain separate"],
  },
  enterprise: {
    badge: "Reviewed rollout",
    audience: "For groups, franchises, and enterprise structures",
    headline: "Design a governed rollout across companies and branches.",
    summary:
      "Custom seats, consolidated reporting, contract controls, and reviewed implementation for complex organizations.",
    outcomes: [
      "Model multiple companies, branches, departments, and permission boundaries.",
      "Use consolidated reporting without collapsing operational separation.",
      "Plan implementation, support, and billing around the organization’s structure.",
    ],
    idealFor: ["Enterprise groups", "Franchises", "Multi-company organizations"],
    confidence: ["Custom capacity", "Contract billing", "Reviewed implementation plan"],
  },
};

export const PRICING_FAQS = [
  {
    question: "Can I keep using a Free plan permanently?",
    answer:
      "Yes. Personal Free and Business Free are designed as permanent starting points. Paid plans add capacity and advanced tools; they do not create an expiry date for Free access.",
  },
  {
    question: "Are Personal and Business subscriptions combined?",
    answer:
      "No. Personal Finance has its own billing account. Every business workspace has a separate subscription, users, permissions, and invoice. Enterprise groups also keep their own billing scope.",
  },
  {
    question: "Does JALVORO store card numbers or CVV details?",
    answer:
      "No. The planned payment flow uses provider-hosted checkout and billing management. JALVORO does not store card numbers, CVV values, or online-banking credentials.",
  },
  {
    question: "Is AI used for Business, POS, restaurant, dealership, or enterprise data?",
    answer:
      "No. AI entitlement is limited to eligible Personal Finance plans. Business and Enterprise plans contain no AI access through this billing system.",
  },
  {
    question: "Why can prices differ by country?",
    answer:
      "JALVORO uses deliberate regional pricing tiers to keep plans accessible across markets. Final currency, tax, and billing-country confirmation happens at provider checkout when payments are activated.",
  },
  {
    question: "Can I change or cancel a paid plan later?",
    answer:
      "The planned billing-management flow uses a secure provider-hosted customer portal for plan management, invoices, payment methods, and cancellation. Access changes are confirmed through verified provider events.",
  },
] as const;
