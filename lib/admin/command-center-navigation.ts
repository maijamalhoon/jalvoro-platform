import type { CommandCenterEnvironment } from "./product-registry";

export type ResolvedCommandCenterNavigationItem = {
  productKey: string;
  productName: string;
  navigationId: string;
  moduleKey: string;
  label: string;
  href: string;
  iconKey: string;
  order: number;
};

const KEY_PATTERN = /^[a-z][a-z0-9]*(?:[-_][a-z0-9]+)*$/;
const ADMIN_ROUTE_PATTERN = /^\/admin(?:\/[a-z0-9][a-z0-9/_-]*)?$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function parseResolvedCommandCenterNavigation(
  value: unknown,
): ResolvedCommandCenterNavigationItem[] | null {
  if (!Array.isArray(value)) return null;

  const navigation: ResolvedCommandCenterNavigationItem[] = [];
  const identities = new Set<string>();

  for (const candidate of value) {
    if (!isRecord(candidate)) return null;

    const {
      productKey,
      productName,
      navigationId,
      moduleKey,
      label,
      href,
      iconKey,
      order,
    } = candidate;

    if (
      !isNonEmptyString(productKey) ||
      !KEY_PATTERN.test(productKey) ||
      !isNonEmptyString(productName) ||
      !isNonEmptyString(navigationId) ||
      !KEY_PATTERN.test(navigationId) ||
      !isNonEmptyString(moduleKey) ||
      !KEY_PATTERN.test(moduleKey) ||
      !isNonEmptyString(label) ||
      !isNonEmptyString(href) ||
      !ADMIN_ROUTE_PATTERN.test(href) ||
      href.includes("?") ||
      href.includes("#") ||
      !isNonEmptyString(iconKey) ||
      !Number.isInteger(order) ||
      order < 0 ||
      order > 100_000
    ) {
      return null;
    }

    const identity = `${productKey}:${navigationId}`;
    if (identities.has(identity)) return null;
    identities.add(identity);

    navigation.push({
      productKey,
      productName,
      navigationId,
      moduleKey,
      label,
      href,
      iconKey,
      order,
    });
  }

  return navigation.sort(
    (left, right) =>
      left.order - right.order ||
      left.productName.localeCompare(right.productName) ||
      left.label.localeCompare(right.label),
  );
}

export function resolveCommandCenterEnvironment(): CommandCenterEnvironment {
  const vercelEnvironment =
    process.env.VERCEL_ENV ?? process.env.NEXT_PUBLIC_VERCEL_ENV;

  if (vercelEnvironment === "preview") return "preview";
  if (vercelEnvironment === "production" || process.env.NODE_ENV === "production") {
    return "production";
  }
  return "development";
}
