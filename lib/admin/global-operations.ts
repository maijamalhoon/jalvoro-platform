import type { PlatformAdminRole } from "./control-center";
import {
  COMMAND_CENTER_ENVIRONMENTS,
  DATA_CLASSIFICATIONS,
  PRODUCT_LIFECYCLE_STATUSES,
  PRODUCT_PLATFORMS,
  PRODUCT_REGISTRATION_STATUSES,
  type CommandCenterEnvironment,
  type DataClassification,
  type ProductLifecycleStatus,
  type ProductPlatform,
  type ProductRegistrationStatus,
} from "./product-registry";

export type AdminGlobalOperationsProduct = {
  productKey: string;
  name: string;
  familyName: string;
  categoryKey: string;
  lifecycleStatus: ProductLifecycleStatus;
  registrationStatus: ProductRegistrationStatus;
  dataClassification: DataClassification;
  retentionDays: number;
  applications: number;
  enabledApplications: number;
  modules: number;
  enabledModules: number;
  services: number;
  environments: CommandCenterEnvironment[];
  regions: string[];
  platforms: ProductPlatform[];
};

export type AdminGlobalOperationsEnvironment = {
  environmentKey: CommandCenterEnvironment;
  name: string;
  active: boolean;
  products: number;
};

export type AdminGlobalOperationsConfiguredRegion = {
  regionKey: string;
  name: string;
  active: boolean;
  products: number;
};

export type AdminGlobalOperationsSignal = {
  key: string;
  activeUsers: number;
  events: number;
};

export type AdminGlobalOperationsCountrySignal = {
  countryCode: string;
  activeUsers: number;
  events: number;
};

export type AdminGlobalOperationsRegionSignal = {
  regionCode: string;
  activeUsers: number;
  events: number;
};

export type AdminGlobalOperationsSnapshot = {
  generatedAt: string;
  adminRole: PlatformAdminRole;
  products: {
    total: number;
    active: number;
    suspended: number;
    families: number;
    applications: number;
    enabledApplications: number;
    modules: number;
    enabledModules: number;
    services: number;
    items: AdminGlobalOperationsProduct[];
    environments: AdminGlobalOperationsEnvironment[];
  };
  organizations: {
    sourceStatus: "not_registered";
    reason: "organization_data_source_not_registered";
    total: 0;
    active: 0;
    suspended: 0;
  };
  subscriptions: {
    total: number;
    free: number;
    trialing: number;
    activePaid: number;
    pastDue: number;
    cancelled: number;
    cancelAtPeriodEnd: number;
  };
  regionalOperations: {
    configuredRegions: AdminGlobalOperationsConfiguredRegion[];
    countries30d: AdminGlobalOperationsCountrySignal[];
    regionCodes30d: AdminGlobalOperationsRegionSignal[];
    rawIpStored: false;
  };
  platformAnalytics: {
    devices30d: AdminGlobalOperationsSignal[];
    operatingSystems30d: AdminGlobalOperationsSignal[];
    browsers30d: AdminGlobalOperationsSignal[];
    applicationVersions30d: AdminGlobalOperationsSignal[];
    sessionReplayEnabled: false;
  };
};

const ADMIN_ROLES = new Set<PlatformAdminRole>([
  "owner",
  "admin",
  "analyst",
  "support",
]);
const KEY_PATTERN = /^[a-z][a-z0-9]*(?:[-_][a-z0-9]+)*$/;
const COUNTRY_PATTERN = /^[A-Z]{2}$/;
const REGION_CODE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,31}$/;
const FORBIDDEN_KEYS = new Set([
  "email",
  "userid",
  "subjectid",
  "sessionid",
  "providerid",
  "providercustomerid",
  "providersubscriptionid",
  "rawip",
  "ipaddress",
  "city",
  "financecontent",
  "payload",
  "metadata",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readCount(value: unknown) {
  const count = typeof value === "number" ? value : Number(value);
  return Number.isSafeInteger(count) && count >= 0 ? count : null;
}

function readString(value: unknown, maximumLength = 120) {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized.length > 0 && normalized.length <= maximumLength
    ? normalized
    : null;
}

function isMember<T extends readonly string[]>(
  value: unknown,
  allowed: T,
): value is T[number] {
  return typeof value === "string" && allowed.includes(value);
}

function containsForbiddenKey(value: unknown, depth = 0): boolean {
  if (depth > 8 || value === null || typeof value !== "object") return false;
  if (Array.isArray(value)) {
    return value.some((entry) => containsForbiddenKey(entry, depth + 1));
  }

  return Object.entries(value).some(([key, entry]) => {
    const normalized = key.replaceAll(/[^a-z0-9]/gi, "").toLowerCase();
    return (
      FORBIDDEN_KEYS.has(normalized) || containsForbiddenKey(entry, depth + 1)
    );
  });
}

function readStringArray(
  value: unknown,
  options: {
    maximumItems: number;
    maximumLength?: number;
    pattern?: RegExp;
  },
) {
  if (!Array.isArray(value) || value.length > options.maximumItems) return null;
  const parsed: string[] = [];

  for (const entry of value) {
    const item = readString(entry, options.maximumLength ?? 80);
    if (!item || (options.pattern && !options.pattern.test(item))) return null;
    parsed.push(item);
  }

  return new Set(parsed).size === parsed.length ? parsed : null;
}

function readProductItems(value: unknown): AdminGlobalOperationsProduct[] | null {
  if (!Array.isArray(value) || value.length > 50) return null;
  const parsed: AdminGlobalOperationsProduct[] = [];

  for (const entry of value) {
    if (!isRecord(entry)) return null;

    const productKey = readString(entry.productKey, 80);
    const name = readString(entry.name, 120);
    const familyName = readString(entry.familyName, 120);
    const categoryKey = readString(entry.categoryKey, 80);
    const retentionDays = readCount(entry.retentionDays);
    const applications = readCount(entry.applications);
    const enabledApplications = readCount(entry.enabledApplications);
    const modules = readCount(entry.modules);
    const enabledModules = readCount(entry.enabledModules);
    const services = readCount(entry.services);
    const environments = readStringArray(entry.environments, {
      maximumItems: COMMAND_CENTER_ENVIRONMENTS.length,
      maximumLength: 32,
    });
    const regions = readStringArray(entry.regions, {
      maximumItems: 24,
      maximumLength: 64,
      pattern: KEY_PATTERN,
    });
    const platforms = readStringArray(entry.platforms, {
      maximumItems: PRODUCT_PLATFORMS.length,
      maximumLength: 32,
    });

    if (
      !productKey ||
      !KEY_PATTERN.test(productKey) ||
      !name ||
      !familyName ||
      !categoryKey ||
      !KEY_PATTERN.test(categoryKey) ||
      !isMember(entry.lifecycleStatus, PRODUCT_LIFECYCLE_STATUSES) ||
      !isMember(entry.registrationStatus, PRODUCT_REGISTRATION_STATUSES) ||
      !isMember(entry.dataClassification, DATA_CLASSIFICATIONS) ||
      retentionDays === null ||
      retentionDays < 1 ||
      retentionDays > 3650 ||
      applications === null ||
      enabledApplications === null ||
      enabledApplications > applications ||
      modules === null ||
      enabledModules === null ||
      enabledModules > modules ||
      services === null ||
      !environments ||
      !environments.every((item) =>
        COMMAND_CENTER_ENVIRONMENTS.includes(item as CommandCenterEnvironment),
      ) ||
      !regions ||
      !platforms ||
      !platforms.every((item) => PRODUCT_PLATFORMS.includes(item as ProductPlatform))
    ) {
      return null;
    }

    parsed.push({
      productKey,
      name,
      familyName,
      categoryKey,
      lifecycleStatus: entry.lifecycleStatus,
      registrationStatus: entry.registrationStatus,
      dataClassification: entry.dataClassification,
      retentionDays,
      applications,
      enabledApplications,
      modules,
      enabledModules,
      services,
      environments: environments as CommandCenterEnvironment[],
      regions,
      platforms: platforms as ProductPlatform[],
    });
  }

  return parsed;
}

function readEnvironmentItems(
  value: unknown,
): AdminGlobalOperationsEnvironment[] | null {
  if (!Array.isArray(value) || value.length > COMMAND_CENTER_ENVIRONMENTS.length) {
    return null;
  }

  const parsed: AdminGlobalOperationsEnvironment[] = [];
  for (const entry of value) {
    if (!isRecord(entry)) return null;
    const environmentKey = entry.environmentKey;
    const name = readString(entry.name, 80);
    const products = readCount(entry.products);
    if (
      !isMember(environmentKey, COMMAND_CENTER_ENVIRONMENTS) ||
      !name ||
      typeof entry.active !== "boolean" ||
      products === null
    ) {
      return null;
    }
    parsed.push({ environmentKey, name, active: entry.active, products });
  }
  return parsed;
}

function readConfiguredRegions(
  value: unknown,
): AdminGlobalOperationsConfiguredRegion[] | null {
  if (!Array.isArray(value) || value.length > 24) return null;
  const parsed: AdminGlobalOperationsConfiguredRegion[] = [];

  for (const entry of value) {
    if (!isRecord(entry)) return null;
    const regionKey = readString(entry.regionKey, 64);
    const name = readString(entry.name, 100);
    const products = readCount(entry.products);
    if (
      !regionKey ||
      !KEY_PATTERN.test(regionKey) ||
      !name ||
      typeof entry.active !== "boolean" ||
      products === null
    ) {
      return null;
    }
    parsed.push({ regionKey, name, active: entry.active, products });
  }
  return parsed;
}

function readSignals(value: unknown): AdminGlobalOperationsSignal[] | null {
  if (!Array.isArray(value) || value.length > 20) return null;
  const parsed: AdminGlobalOperationsSignal[] = [];
  for (const entry of value) {
    if (!isRecord(entry)) return null;
    const key = readString(entry.key, 80);
    const activeUsers = readCount(entry.activeUsers);
    const events = readCount(entry.events);
    if (!key || activeUsers === null || events === null) return null;
    parsed.push({ key, activeUsers, events });
  }
  return parsed;
}

function readCountrySignals(
  value: unknown,
): AdminGlobalOperationsCountrySignal[] | null {
  if (!Array.isArray(value) || value.length > 20) return null;
  const parsed: AdminGlobalOperationsCountrySignal[] = [];
  for (const entry of value) {
    if (!isRecord(entry)) return null;
    const countryCode = readString(entry.countryCode, 2);
    const activeUsers = readCount(entry.activeUsers);
    const events = readCount(entry.events);
    if (
      !countryCode ||
      !COUNTRY_PATTERN.test(countryCode) ||
      activeUsers === null ||
      events === null
    ) {
      return null;
    }
    parsed.push({ countryCode, activeUsers, events });
  }
  return parsed;
}

function readRegionSignals(
  value: unknown,
): AdminGlobalOperationsRegionSignal[] | null {
  if (!Array.isArray(value) || value.length > 20) return null;
  const parsed: AdminGlobalOperationsRegionSignal[] = [];
  for (const entry of value) {
    if (!isRecord(entry)) return null;
    const regionCode = readString(entry.regionCode, 32);
    const activeUsers = readCount(entry.activeUsers);
    const events = readCount(entry.events);
    if (
      !regionCode ||
      !REGION_CODE_PATTERN.test(regionCode) ||
      activeUsers === null ||
      events === null
    ) {
      return null;
    }
    parsed.push({ regionCode, activeUsers, events });
  }
  return parsed;
}

export function parseAdminGlobalOperationsSnapshot(
  value: unknown,
): AdminGlobalOperationsSnapshot | null {
  if (!isRecord(value) || containsForbiddenKey(value)) return null;

  const generatedAt = readString(value.generatedAt, 64);
  const adminRole = value.adminRole;
  const products = value.products;
  const organizations = value.organizations;
  const subscriptions = value.subscriptions;
  const regionalOperations = value.regionalOperations;
  const platformAnalytics = value.platformAnalytics;

  if (
    !generatedAt ||
    Number.isNaN(Date.parse(generatedAt)) ||
    typeof adminRole !== "string" ||
    !ADMIN_ROLES.has(adminRole as PlatformAdminRole) ||
    !isRecord(products) ||
    !isRecord(organizations) ||
    !isRecord(subscriptions) ||
    !isRecord(regionalOperations) ||
    !isRecord(platformAnalytics)
  ) {
    return null;
  }

  const total = readCount(products.total);
  const active = readCount(products.active);
  const suspended = readCount(products.suspended);
  const families = readCount(products.families);
  const applications = readCount(products.applications);
  const enabledApplications = readCount(products.enabledApplications);
  const modules = readCount(products.modules);
  const enabledModules = readCount(products.enabledModules);
  const services = readCount(products.services);
  const productItems = readProductItems(products.items);
  const environments = readEnvironmentItems(products.environments);

  const subscriptionTotal = readCount(subscriptions.total);
  const free = readCount(subscriptions.free);
  const trialing = readCount(subscriptions.trialing);
  const activePaid = readCount(subscriptions.activePaid);
  const pastDue = readCount(subscriptions.pastDue);
  const cancelled = readCount(subscriptions.cancelled);
  const cancelAtPeriodEnd = readCount(subscriptions.cancelAtPeriodEnd);

  const configuredRegions = readConfiguredRegions(
    regionalOperations.configuredRegions,
  );
  const countries30d = readCountrySignals(regionalOperations.countries30d);
  const regionCodes30d = readRegionSignals(regionalOperations.regionCodes30d);
  const devices30d = readSignals(platformAnalytics.devices30d);
  const operatingSystems30d = readSignals(
    platformAnalytics.operatingSystems30d,
  );
  const browsers30d = readSignals(platformAnalytics.browsers30d);
  const applicationVersions30d = readSignals(
    platformAnalytics.applicationVersions30d,
  );

  if (
    total === null ||
    active === null ||
    suspended === null ||
    active + suspended > total ||
    families === null ||
    applications === null ||
    enabledApplications === null ||
    enabledApplications > applications ||
    modules === null ||
    enabledModules === null ||
    enabledModules > modules ||
    services === null ||
    !productItems ||
    productItems.length > total ||
    !environments ||
    organizations.sourceStatus !== "not_registered" ||
    organizations.reason !== "organization_data_source_not_registered" ||
    organizations.total !== 0 ||
    organizations.active !== 0 ||
    organizations.suspended !== 0 ||
    subscriptionTotal === null ||
    free === null ||
    trialing === null ||
    activePaid === null ||
    pastDue === null ||
    cancelled === null ||
    cancelAtPeriodEnd === null ||
    !configuredRegions ||
    !countries30d ||
    !regionCodes30d ||
    regionalOperations.rawIpStored !== false ||
    !devices30d ||
    !operatingSystems30d ||
    !browsers30d ||
    !applicationVersions30d ||
    platformAnalytics.sessionReplayEnabled !== false
  ) {
    return null;
  }

  return {
    generatedAt,
    adminRole: adminRole as PlatformAdminRole,
    products: {
      total,
      active,
      suspended,
      families,
      applications,
      enabledApplications,
      modules,
      enabledModules,
      services,
      items: productItems,
      environments,
    },
    organizations: {
      sourceStatus: "not_registered",
      reason: "organization_data_source_not_registered",
      total: 0,
      active: 0,
      suspended: 0,
    },
    subscriptions: {
      total: subscriptionTotal,
      free,
      trialing,
      activePaid,
      pastDue,
      cancelled,
      cancelAtPeriodEnd,
    },
    regionalOperations: {
      configuredRegions,
      countries30d,
      regionCodes30d,
      rawIpStored: false,
    },
    platformAnalytics: {
      devices30d,
      operatingSystems30d,
      browsers30d,
      applicationVersions30d,
      sessionReplayEnabled: false,
    },
  };
}
