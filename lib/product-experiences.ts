export const PRODUCT_EXPERIENCE_SLUGS = [
  "personal",
  "freelancer",
  "small-business",
  "retail-pos",
  "enterprise",
] as const;

export type ProductExperienceSlug = (typeof PRODUCT_EXPERIENCE_SLUGS)[number];
export type ProductWorkspaceKind = "personal" | "business";

export type ProductExperience = {
  slug: ProductExperienceSlug;
  label: string;
  productName: string;
  audience: string;
  summary: string;
  previewTitle: string;
  capabilities: readonly [string, string, string, string];
  workspaceKind: ProductWorkspaceKind;
  destination: string;
  previewPath: string;
  loginPath: string;
  signupPath: string;
  onboardingPath: string;
  authContext: string;
  setupNote: string;
};

const PRODUCT_EXPERIENCES: readonly ProductExperience[] = [
  {
    slug: "personal",
    label: "For Individuals",
    productName: "Personal Finance",
    audience: "Individuals and households",
    summary:
      "Manage accounts, spending, goals, investments, liabilities, and everyday financial decisions in a private personal workspace.",
    previewTitle: "Your complete personal money workspace",
    capabilities: [
      "Accounts and cash flow",
      "Budgets and spending",
      "Goals and investments",
      "Personal reports and insights",
    ],
    workspaceKind: "personal",
    destination: "/dashboard",
    previewPath: "/start/personal",
    loginPath: "/login/personal",
    signupPath: "/signup/personal",
    onboardingPath: "/onboarding/personal",
    authContext:
      "This access path opens your personal workspace only. Business records remain separate until you explicitly switch workspaces.",
    setupNote: "Set up your identity, profile, and first personal account.",
  },
  {
    slug: "freelancer",
    label: "For Freelancers & Self-Employed",
    productName: "Independent Work",
    audience: "Freelancers, consultants, contractors, and solo professionals",
    summary:
      "Keep clients, projects, invoices, expenses, and business money organized without mixing them into personal finance.",
    previewTitle: "A focused operating workspace for independent work",
    capabilities: [
      "Clients and projects",
      "Invoices and collections",
      "Business expenses",
      "Tax-ready records",
    ],
    workspaceKind: "business",
    destination: "/business?setup=1&experience=freelancer",
    previewPath: "/start/freelancer",
    loginPath: "/login/freelancer",
    signupPath: "/signup/freelancer",
    onboardingPath: "/onboarding/freelancer",
    authContext:
      "This access path opens an independent-work business workspace. Personal finance remains separate and unchanged.",
    setupNote: "Set up your professional identity and first independent-work workspace.",
  },
  {
    slug: "small-business",
    label: "For Small Businesses",
    productName: "Small Business Operations",
    audience: "Local businesses, growing teams, service firms, and startups",
    summary:
      "Connect customers, sales, purchasing, inventory, accounting, team access, and daily operations in one isolated company workspace.",
    previewTitle: "Run the whole business from one connected workspace",
    capabilities: [
      "Sales and customers",
      "Purchasing and expenses",
      "Inventory and accounting",
      "Team roles and reports",
    ],
    workspaceKind: "business",
    destination: "/business?setup=1&experience=small-business",
    previewPath: "/start/small-business",
    loginPath: "/login/small-business",
    signupPath: "/signup/small-business",
    onboardingPath: "/onboarding/small-business",
    authContext:
      "This access path opens a small-business workspace. Personal finance and other organizations remain isolated.",
    setupNote: "Set up your company identity, operating mode, and first business workspace.",
  },
  {
    slug: "retail-pos",
    label: "Retail & Point of Sale",
    productName: "Retail & POS",
    audience: "Shops, retail teams, counters, outlets, and multi-location sellers",
    summary:
      "Sell quickly, manage products and stock, issue receipts, control cash, and grow from one counter to multiple locations.",
    previewTitle: "Fast checkout connected to real business operations",
    capabilities: [
      "Counter sales and receipts",
      "Products and stock",
      "Cash and daily close",
      "Stores and locations",
    ],
    workspaceKind: "business",
    destination: "/business?setup=1&experience=retail-pos",
    previewPath: "/start/retail-pos",
    loginPath: "/login/retail-pos",
    signupPath: "/signup/retail-pos",
    onboardingPath: "/onboarding/retail-pos",
    authContext:
      "This access path opens a retail operating workspace. Personal finance and unrelated companies stay separate.",
    setupNote: "Set up your store identity, selling mode, and first POS workspace.",
  },
  {
    slug: "enterprise",
    label: "Enterprise Operations",
    productName: "Enterprise Operations",
    audience: "Larger companies, departments, branches, and controlled teams",
    summary:
      "Coordinate finance, operations, approvals, reporting, people, branches, and governance across a controlled organization workspace.",
    previewTitle: "Govern complex operations without losing clarity",
    capabilities: [
      "Departments and branches",
      "Approvals and permissions",
      "Advanced finance and reporting",
      "Operational governance",
    ],
    workspaceKind: "business",
    destination: "/business?setup=1&experience=enterprise",
    previewPath: "/start/enterprise",
    loginPath: "/login/enterprise",
    signupPath: "/signup/enterprise",
    onboardingPath: "/onboarding/enterprise",
    authContext:
      "This access path opens an enterprise workspace. Every organization and personal workspace remains tenant-isolated.",
    setupNote: "Set up your organization identity and controlled enterprise workspace.",
  },
] as const;

export function listProductExperiences() {
  return PRODUCT_EXPERIENCES;
}

export function isProductExperienceSlug(
  value: string | null | undefined,
): value is ProductExperienceSlug {
  return PRODUCT_EXPERIENCE_SLUGS.includes(value as ProductExperienceSlug);
}

export function getProductExperience(value: string | null | undefined) {
  if (!isProductExperienceSlug(value)) return null;
  return PRODUCT_EXPERIENCES.find((experience) => experience.slug === value) ?? null;
}

export function getProductExperienceFromPathname(pathname: string | null | undefined) {
  if (!pathname) return null;
  const segments = pathname.split("/").filter(Boolean);
  return segments.map((segment) => getProductExperience(segment)).find(Boolean) ?? null;
}

export function inferProductExperienceFromDestination(destination: string | null | undefined) {
  if (!destination) return null;

  try {
    const parsed = new URL(destination, "https://jalvoro.local");
    const explicitExperience = getProductExperience(parsed.searchParams.get("experience"));
    if (explicitExperience) return explicitExperience;

    const pathExperience = getProductExperienceFromPathname(parsed.pathname);
    if (pathExperience) return pathExperience;

    if (parsed.pathname.startsWith("/dashboard")) return getProductExperience("personal");
    if (parsed.pathname.startsWith("/business")) return getProductExperience("small-business");
  } catch {
    return null;
  }

  return null;
}
