import type { ResolvedCommandCenterNavigationItem } from "./command-center-navigation";

export const COMMAND_CENTER_GROUPS = [
  "command",
  "operations",
  "governance",
  "infrastructure",
  "ecosystem",
] as const;

export const COMMAND_CENTER_BASE_PATH = "/commandcenter";

export type CommandCenterGroup = (typeof COMMAND_CENTER_GROUPS)[number];

export type CommandCenterExperienceItem =
  ResolvedCommandCenterNavigationItem & {
    group: CommandCenterGroup;
    groupLabel: string;
    description: string;
    keywords: string[];
    compactLabel: string;
  };

const GROUP_LABELS: Record<CommandCenterGroup, string> = {
  command: "Command",
  operations: "Global operations",
  governance: "Governance",
  infrastructure: "Infrastructure",
  ecosystem: "Ecosystem",
};

const MODULE_EXPERIENCE: Record<
  string,
  {
    group: CommandCenterGroup;
    description: string;
    keywords: string[];
    compactLabel?: string;
  }
> = {
  "global-overview": {
    group: "command",
    description:
      "Executive pulse for users, billing, access, incidents, security and operating health.",
    keywords: ["overview", "users", "billing", "security", "incidents", "health"],
    compactLabel: "Overview",
  },
  "global-operations": {
    group: "operations",
    description:
      "Products, subscriptions, regions, devices and runtime distribution across the ecosystem.",
    keywords: ["products", "subscriptions", "regions", "devices", "runtime"],
    compactLabel: "Global",
  },
  organizations: {
    group: "operations",
    description:
      "Organization lifecycle, memberships, tenant-scoped access and audit history.",
    keywords: ["organizations", "tenants", "members", "permissions", "audit"],
    compactLabel: "Orgs",
  },
  "icon-system": {
    group: "infrastructure",
    description:
      "Versioned design infrastructure and symbol governance for every JALVORO product.",
    keywords: ["icons", "design", "symbols", "interface", "library"],
    compactLabel: "Icons",
  },
};

function fallbackGroup(item: ResolvedCommandCenterNavigationItem) {
  if (item.order < 100) return "operations" as const;
  if (item.order < 500) return "governance" as const;
  if (item.order < 900) return "infrastructure" as const;
  return "ecosystem" as const;
}

function normalizeSearchValue(value: string) {
  return value.trim().toLocaleLowerCase("en-US");
}

export function canonicalCommandCenterHref(href: string) {
  if (href === "/admin") return COMMAND_CENTER_BASE_PATH;
  if (href.startsWith("/admin/")) {
    return `${COMMAND_CENTER_BASE_PATH}${href.slice("/admin".length)}`;
  }
  return href;
}

export function enrichCommandCenterNavigation(
  navigation: ResolvedCommandCenterNavigationItem[],
): CommandCenterExperienceItem[] {
  return navigation.map((item) => {
    const experience = MODULE_EXPERIENCE[item.moduleKey];
    const group = experience?.group ?? fallbackGroup(item);

    return {
      ...item,
      href: canonicalCommandCenterHref(item.href),
      group,
      groupLabel: GROUP_LABELS[group],
      description:
        experience?.description ??
        `${item.label} operations for ${item.productName}.`,
      keywords: experience?.keywords ?? [item.label, item.moduleKey, item.productName],
      compactLabel: experience?.compactLabel ?? item.label,
    };
  });
}

export function groupCommandCenterNavigation(
  navigation: CommandCenterExperienceItem[],
) {
  return COMMAND_CENTER_GROUPS.map((group) => ({
    group,
    label: GROUP_LABELS[group],
    items: navigation.filter((item) => item.group === group),
  })).filter((entry) => entry.items.length > 0);
}

export function filterCommandCenterNavigation(
  navigation: CommandCenterExperienceItem[],
  query: string,
) {
  const normalized = normalizeSearchValue(query);
  if (!normalized) return navigation;

  return navigation.filter((item) =>
    [
      item.label,
      item.compactLabel,
      item.description,
      item.moduleKey,
      item.productName,
      ...item.keywords,
    ]
      .map(normalizeSearchValue)
      .some((value) => value.includes(normalized)),
  );
}

export function resolveActiveCommandCenterItem(
  navigation: CommandCenterExperienceItem[],
  pathname: string,
) {
  return (
    navigation
      .filter((item) =>
        item.href === COMMAND_CENTER_BASE_PATH
          ? pathname === COMMAND_CENTER_BASE_PATH
          : pathname === item.href || pathname.startsWith(`${item.href}/`),
      )
      .sort((left, right) => right.href.length - left.href.length)[0] ?? null
  );
}
