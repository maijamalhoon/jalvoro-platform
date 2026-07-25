import type {
  ProductExperienceSlug,
  ProductWorkspaceKind,
} from "@/lib/product-experiences";

export const WORKSPACE_MODULE_KEYS = [
  "accounting",
  "contacts",
  "sales",
  "purchases",
  "inventory",
  "crm",
  "reports",
  "pos",
  "team",
  "payroll",
  "budgeting",
  "banking",
  "fixed_assets",
  "fx",
  "branches",
  "approvals",
  "documents",
  "projects",
  "tax",
  "notifications",
  "ecommerce",
] as const;

export type WorkspaceModuleKey = (typeof WORKSPACE_MODULE_KEYS)[number];
export type WorkspaceMembershipRole =
  | "personal"
  | "owner"
  | "admin"
  | "accountant"
  | "manager"
  | "sales"
  | "cashier"
  | "inventory"
  | "viewer";

export type PersonalWorkspaceReference = {
  kind: "personal";
  ownerUserId: string;
};

export type BusinessWorkspaceReference = {
  kind: "business";
  businessId: string;
  slug: string;
};

export type WorkspaceReference =
  | PersonalWorkspaceReference
  | BusinessWorkspaceReference;

export type WorkspaceOnboardingStatus =
  | "not_started"
  | "in_progress"
  | "completed"
  | "abandoned";

export type WorkspaceOnboardingSession = {
  id: string;
  userId: string;
  experience: ProductExperienceSlug;
  workspaceKind: ProductWorkspaceKind;
  businessId: string | null;
  status: WorkspaceOnboardingStatus;
  currentStep: number;
  completedSteps: readonly string[];
  nextPath: string | null;
};

export type BusinessSetupDefaults = {
  workspaceMode: "simple_shop" | "advanced_company";
  businessType:
    | "retail"
    | "wholesale"
    | "services"
    | "manufacturing"
    | "restaurant"
    | "ecommerce"
    | "construction"
    | "professional_services"
    | "other";
  modules: readonly WorkspaceModuleKey[];
};

const INTERNAL_ORIGIN = "https://jalvoro.local";
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001f\u007f]/;

const EXPERIENCE_MODULE_DEFAULTS: Record<
  Exclude<ProductExperienceSlug, "personal">,
  BusinessSetupDefaults
> = {
  freelancer: {
    workspaceMode: "advanced_company",
    businessType: "professional_services",
    modules: [
      "accounting",
      "contacts",
      "sales",
      "crm",
      "reports",
      "projects",
      "team",
    ],
  },
  "small-business": {
    workspaceMode: "advanced_company",
    businessType: "services",
    modules: [
      "accounting",
      "contacts",
      "sales",
      "purchases",
      "inventory",
      "crm",
      "reports",
      "team",
    ],
  },
  "retail-pos": {
    workspaceMode: "simple_shop",
    businessType: "retail",
    modules: [
      "pos",
      "inventory",
      "sales",
      "purchases",
      "accounting",
      "reports",
      "team",
    ],
  },
  enterprise: {
    workspaceMode: "advanced_company",
    businessType: "other",
    modules: [
      "accounting",
      "contacts",
      "sales",
      "purchases",
      "inventory",
      "crm",
      "reports",
      "team",
      "payroll",
      "budgeting",
      "banking",
      "fixed_assets",
      "fx",
      "branches",
      "approvals",
      "documents",
      "projects",
      "tax",
      "notifications",
    ],
  },
};

const ROLE_LABELS: Record<WorkspaceMembershipRole, string> = {
  personal: "Personal",
  owner: "Owner",
  admin: "Admin",
  accountant: "Accountant",
  manager: "Manager",
  sales: "Sales",
  cashier: "Cashier",
  inventory: "Inventory",
  viewer: "Viewer",
};

function parseInternalWorkspacePath(value: string | null | undefined) {
  if (
    !value ||
    CONTROL_CHARACTER_PATTERN.test(value) ||
    value.includes("\\") ||
    !value.startsWith("/") ||
    value.startsWith("//")
  ) {
    return null;
  }

  try {
    const parsed = new URL(value, INTERNAL_ORIGIN);
    return parsed.origin === INTERNAL_ORIGIN ? parsed : null;
  } catch {
    return null;
  }
}

export function isWorkspaceModuleKey(value: string): value is WorkspaceModuleKey {
  return WORKSPACE_MODULE_KEYS.includes(value as WorkspaceModuleKey);
}

export function isBusinessExperience(
  experience: ProductExperienceSlug | null | undefined,
): experience is Exclude<ProductExperienceSlug, "personal"> {
  return Boolean(experience && experience !== "personal");
}

export function getBusinessSetupDefaults(
  experience: ProductExperienceSlug | null | undefined,
): BusinessSetupDefaults {
  if (isBusinessExperience(experience)) {
    return EXPERIENCE_MODULE_DEFAULTS[experience];
  }

  return EXPERIENCE_MODULE_DEFAULTS["small-business"];
}

export function getMembershipRoleLabel(role: string | null | undefined) {
  if (role && role in ROLE_LABELS) {
    return ROLE_LABELS[role as WorkspaceMembershipRole];
  }

  return "Member";
}

export function getBusinessWorkspaceHref(
  slug: string,
  workspaceMode: "simple_shop" | "advanced_company",
) {
  return workspaceMode === "simple_shop"
    ? `/business/${slug}/shop`
    : `/business/${slug}`;
}

export function isInternalWorkspacePath(value: string | null | undefined) {
  return Boolean(parseInternalWorkspacePath(value));
}

export function isPathWithinRoute(
  value: string | null | undefined,
  route: string,
) {
  const parsedValue = parseInternalWorkspacePath(value);
  const parsedRoute = parseInternalWorkspacePath(route);
  if (!parsedValue || !parsedRoute) return false;

  const routePath = parsedRoute.pathname.replace(/\/$/, "") || "/";
  const valuePath = parsedValue.pathname.replace(/\/$/, "") || "/";

  return valuePath === routePath || valuePath.startsWith(`${routePath}/`);
}

export function appendOnboardingSession(
  destination: string,
  sessionId: string | null | undefined,
) {
  if (!sessionId) return destination;

  const parsed = parseInternalWorkspacePath(destination);
  if (!parsed) return destination;

  parsed.searchParams.set("session", sessionId);
  return `${parsed.pathname}${parsed.search}${parsed.hash}`;
}
