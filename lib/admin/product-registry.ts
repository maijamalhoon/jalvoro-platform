export const PRODUCT_MANIFEST_SCHEMA_VERSION = "1.0" as const;

export const COMMAND_CENTER_ENVIRONMENTS = [
  "development",
  "preview",
  "production",
] as const;

export const PRODUCT_LIFECYCLE_STATUSES = [
  "concept",
  "internal_development",
  "internal_testing",
  "alpha",
  "beta",
  "limited_release",
  "public_release",
  "maintenance",
  "deprecated",
  "retired",
] as const;

export const PRODUCT_REGISTRATION_STATUSES = [
  "draft",
  "validation_pending",
  "approved",
  "active",
  "suspended",
  "rejected",
] as const;

export const DATA_CLASSIFICATIONS = [
  "public",
  "internal",
  "confidential",
  "restricted",
] as const;

export const PRODUCT_PLATFORMS = [
  "web",
  "android",
  "ios",
  "windows",
  "macos",
  "linux",
  "pos_terminal",
  "api",
] as const;

export type CommandCenterEnvironment =
  (typeof COMMAND_CENTER_ENVIRONMENTS)[number];
export type ProductLifecycleStatus =
  (typeof PRODUCT_LIFECYCLE_STATUSES)[number];
export type ProductRegistrationStatus =
  (typeof PRODUCT_REGISTRATION_STATUSES)[number];
export type DataClassification = (typeof DATA_CLASSIFICATIONS)[number];
export type ProductPlatform = (typeof PRODUCT_PLATFORMS)[number];

export type ProductApplicationManifest = {
  applicationId: string;
  applicationKey: string;
  name: string;
  platforms: ProductPlatform[];
  currentVersions: string[];
};

export type ProductModuleManifest = {
  moduleId: string;
  moduleKey: string;
  name: string;
  description: string;
  lifecycleStatus: ProductLifecycleStatus;
  enabled: boolean;
  requiredPermissions: string[];
};

export type ProductNavigationManifest = {
  navigationId: string;
  moduleKey: string;
  label: string;
  href: string;
  iconKey: string;
  order: number;
  requiredPermissions: string[];
  environments: CommandCenterEnvironment[];
};

export type ProductManifestV1 = {
  schemaVersion: typeof PRODUCT_MANIFEST_SCHEMA_VERSION;
  productId: string;
  productKey: string;
  productFamilyKey: string;
  categoryKey: string;
  name: string;
  description: string;
  iconKey: string;
  lifecycleStatus: ProductLifecycleStatus;
  registrationStatus: ProductRegistrationStatus;
  availability: {
    environments: CommandCenterEnvironment[];
    countries: string[];
    regions: string[];
    currencies: string[];
    languages: string[];
    platforms: ProductPlatform[];
  };
  applications: ProductApplicationManifest[];
  modules: ProductModuleManifest[];
  serviceDependencies: string[];
  subscriptionPlanKeys: string[];
  analyticsMetricKeys: string[];
  eventSchemaKeys: string[];
  healthCheckKeys: string[];
  errorSourceKeys: string[];
  featureFlagKeys: string[];
  supportCategoryKeys: string[];
  securityPolicyKeys: string[];
  dataGovernance: {
    classification: DataClassification;
    retentionDays: number;
    residencyRegionKeys: string[];
  };
  ownership: {
    teamKey: string;
    documentationReference: string;
  };
  admin: {
    requiredPermissions: string[];
    navigation: ProductNavigationManifest[];
  };
};

export type ProductManifestValidationIssue = {
  path: string;
  code: string;
  message: string;
};

export type ProductManifestValidationResult =
  | { ok: true; manifest: ProductManifestV1 }
  | { ok: false; issues: ProductManifestValidationIssue[] };

export type CommandCenterNavigationContext = {
  environment: CommandCenterEnvironment;
  permissions: ReadonlySet<string>;
  includeUnreleased?: boolean;
};

export type CommandCenterNavigationItem = ProductNavigationManifest & {
  productKey: string;
  productName: string;
};

const KEY_PATTERN = /^[a-z][a-z0-9]*(?:[-_][a-z0-9]+)*$/;
const PRODUCT_ID_PATTERN = /^prd_[a-z0-9_]{3,64}$/;
const APPLICATION_ID_PATTERN = /^app_[a-z0-9_]{3,64}$/;
const MODULE_ID_PATTERN = /^mod_[a-z0-9_]{3,64}$/;
const PERMISSION_PATTERN = /^[a-z][a-z0-9-]*(?::[a-z][a-z0-9-]*){2,4}$/;
const ADMIN_ROUTE_PATTERN = /^\/admin(?:\/[a-z0-9][a-z0-9/_-]*)?$/;
const DOCUMENTATION_REFERENCE_PATTERN = /^docs\/[a-z0-9][a-z0-9/_.-]*\.md$/;
const VERSION_PATTERN = /^[0-9A-Za-z][0-9A-Za-z._+-]{0,63}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(isNonEmptyString);
}

function isMember<T extends readonly string[]>(
  value: unknown,
  allowed: T,
): value is T[number] {
  return typeof value === "string" && allowed.includes(value);
}

function hasUniqueValues(values: readonly string[]) {
  return new Set(values).size === values.length;
}

function hasPermissions(
  granted: ReadonlySet<string>,
  required: readonly string[],
) {
  return granted.has("*") || required.every((permission) => granted.has(permission));
}

function collectKeyedArrayIssues(
  issues: ProductManifestValidationIssue[],
  path: string,
  value: unknown,
) {
  if (!isStringArray(value)) {
    issues.push({
      path,
      code: "invalid_string_array",
      message: `${path} must be an array of non-empty strings.`,
    });
    return;
  }

  if (!value.every((entry) => KEY_PATTERN.test(entry))) {
    issues.push({
      path,
      code: "invalid_key",
      message: `${path} contains an invalid stable key.`,
    });
  }

  if (!hasUniqueValues(value)) {
    issues.push({
      path,
      code: "duplicate_key",
      message: `${path} must not contain duplicate keys.`,
    });
  }
}

export function validateProductManifest(
  value: unknown,
): ProductManifestValidationResult {
  const issues: ProductManifestValidationIssue[] = [];

  if (!isRecord(value)) {
    return {
      ok: false,
      issues: [
        {
          path: "$",
          code: "invalid_manifest",
          message: "Product manifest must be an object.",
        },
      ],
    };
  }

  if (value.schemaVersion !== PRODUCT_MANIFEST_SCHEMA_VERSION) {
    issues.push({
      path: "schemaVersion",
      code: "unsupported_schema_version",
      message: `schemaVersion must be ${PRODUCT_MANIFEST_SCHEMA_VERSION}.`,
    });
  }

  if (!isNonEmptyString(value.productId) || !PRODUCT_ID_PATTERN.test(value.productId)) {
    issues.push({
      path: "productId",
      code: "invalid_product_id",
      message: "productId must be a stable prd_ identifier.",
    });
  }

  for (const key of ["productKey", "productFamilyKey", "categoryKey"] as const) {
    if (!isNonEmptyString(value[key]) || !KEY_PATTERN.test(value[key])) {
      issues.push({
        path: key,
        code: "invalid_key",
        message: `${key} must be a stable lowercase key.`,
      });
    }
  }

  for (const field of ["name", "description", "iconKey"] as const) {
    if (!isNonEmptyString(value[field])) {
      issues.push({
        path: field,
        code: "required",
        message: `${field} is required.`,
      });
    }
  }

  if (!isMember(value.lifecycleStatus, PRODUCT_LIFECYCLE_STATUSES)) {
    issues.push({
      path: "lifecycleStatus",
      code: "invalid_lifecycle_status",
      message: "lifecycleStatus is not supported.",
    });
  }

  if (!isMember(value.registrationStatus, PRODUCT_REGISTRATION_STATUSES)) {
    issues.push({
      path: "registrationStatus",
      code: "invalid_registration_status",
      message: "registrationStatus is not supported.",
    });
  }

  const availability = value.availability;
  if (!isRecord(availability)) {
    issues.push({
      path: "availability",
      code: "invalid_availability",
      message: "availability is required.",
    });
  } else {
    if (
      !Array.isArray(availability.environments) ||
      !availability.environments.every((environment) =>
        isMember(environment, COMMAND_CENTER_ENVIRONMENTS),
      ) ||
      !hasUniqueValues(availability.environments as string[])
    ) {
      issues.push({
        path: "availability.environments",
        code: "invalid_environments",
        message: "availability.environments must contain unique supported environments.",
      });
    }

    if (
      !Array.isArray(availability.platforms) ||
      !availability.platforms.every((platform) =>
        isMember(platform, PRODUCT_PLATFORMS),
      ) ||
      !hasUniqueValues(availability.platforms as string[])
    ) {
      issues.push({
        path: "availability.platforms",
        code: "invalid_platforms",
        message: "availability.platforms must contain unique supported platforms.",
      });
    }

    if (
      !isStringArray(availability.countries) ||
      !availability.countries.every(
        (country) => country === "*" || /^[A-Z]{2}$/.test(country),
      )
    ) {
      issues.push({
        path: "availability.countries",
        code: "invalid_countries",
        message: "Countries must use ISO alpha-2 codes or *.",
      });
    }

    if (
      !isStringArray(availability.currencies) ||
      !availability.currencies.every(
        (currency) => currency === "*" || /^[A-Z]{3}$/.test(currency),
      )
    ) {
      issues.push({
        path: "availability.currencies",
        code: "invalid_currencies",
        message: "Currencies must use ISO alpha-3 codes or *.",
      });
    }

    if (!isStringArray(availability.regions)) {
      issues.push({
        path: "availability.regions",
        code: "invalid_regions",
        message: "availability.regions must be an array of region keys.",
      });
    }

    if (!isStringArray(availability.languages)) {
      issues.push({
        path: "availability.languages",
        code: "invalid_languages",
        message: "availability.languages must be an array of language tags.",
      });
    }
  }

  const applications = value.applications;
  if (!Array.isArray(applications)) {
    issues.push({
      path: "applications",
      code: "invalid_applications",
      message: "applications must be an array.",
    });
  } else {
    const applicationIds: string[] = [];
    const applicationKeys: string[] = [];
    applications.forEach((application, index) => {
      const path = `applications.${index}`;
      if (!isRecord(application)) {
        issues.push({ path, code: "invalid_application", message: "Application must be an object." });
        return;
      }
      if (!isNonEmptyString(application.applicationId) || !APPLICATION_ID_PATTERN.test(application.applicationId)) {
        issues.push({ path: `${path}.applicationId`, code: "invalid_application_id", message: "applicationId must be a stable app_ identifier." });
      } else {
        applicationIds.push(application.applicationId);
      }
      if (!isNonEmptyString(application.applicationKey) || !KEY_PATTERN.test(application.applicationKey)) {
        issues.push({ path: `${path}.applicationKey`, code: "invalid_key", message: "applicationKey must be a stable key." });
      } else {
        applicationKeys.push(application.applicationKey);
      }
      if (!isNonEmptyString(application.name)) {
        issues.push({ path: `${path}.name`, code: "required", message: "Application name is required." });
      }
      if (!Array.isArray(application.platforms) || !application.platforms.every((platform) => isMember(platform, PRODUCT_PLATFORMS))) {
        issues.push({ path: `${path}.platforms`, code: "invalid_platforms", message: "Application platforms are invalid." });
      }
      if (!isStringArray(application.currentVersions) || !application.currentVersions.every((version) => VERSION_PATTERN.test(version))) {
        issues.push({ path: `${path}.currentVersions`, code: "invalid_versions", message: "Application versions are invalid." });
      }
    });
    if (!hasUniqueValues(applicationIds) || !hasUniqueValues(applicationKeys)) {
      issues.push({ path: "applications", code: "duplicate_application", message: "Application identifiers and keys must be unique." });
    }
  }

  const modules = value.modules;
  const moduleKeys: string[] = [];
  if (!Array.isArray(modules)) {
    issues.push({
      path: "modules",
      code: "invalid_modules",
      message: "modules must be an array.",
    });
  } else {
    const moduleIds: string[] = [];
    modules.forEach((module, index) => {
      const path = `modules.${index}`;
      if (!isRecord(module)) {
        issues.push({ path, code: "invalid_module", message: "Module must be an object." });
        return;
      }
      if (!isNonEmptyString(module.moduleId) || !MODULE_ID_PATTERN.test(module.moduleId)) {
        issues.push({ path: `${path}.moduleId`, code: "invalid_module_id", message: "moduleId must be a stable mod_ identifier." });
      } else {
        moduleIds.push(module.moduleId);
      }
      if (!isNonEmptyString(module.moduleKey) || !KEY_PATTERN.test(module.moduleKey)) {
        issues.push({ path: `${path}.moduleKey`, code: "invalid_key", message: "moduleKey must be a stable key." });
      } else {
        moduleKeys.push(module.moduleKey);
      }
      if (!isNonEmptyString(module.name) || !isNonEmptyString(module.description)) {
        issues.push({ path, code: "required", message: "Module name and description are required." });
      }
      if (!isMember(module.lifecycleStatus, PRODUCT_LIFECYCLE_STATUSES)) {
        issues.push({ path: `${path}.lifecycleStatus`, code: "invalid_lifecycle_status", message: "Module lifecycle status is invalid." });
      }
      if (typeof module.enabled !== "boolean") {
        issues.push({ path: `${path}.enabled`, code: "invalid_enabled", message: "Module enabled must be boolean." });
      }
      if (!isStringArray(module.requiredPermissions) || !module.requiredPermissions.every((permission) => PERMISSION_PATTERN.test(permission))) {
        issues.push({ path: `${path}.requiredPermissions`, code: "invalid_permissions", message: "Module permissions are invalid." });
      }
    });
    if (!hasUniqueValues(moduleIds) || !hasUniqueValues(moduleKeys)) {
      issues.push({ path: "modules", code: "duplicate_module", message: "Module identifiers and keys must be unique." });
    }
  }

  const admin = value.admin;
  if (!isRecord(admin)) {
    issues.push({ path: "admin", code: "invalid_admin", message: "admin registration metadata is required." });
  } else {
    if (!isStringArray(admin.requiredPermissions) || !admin.requiredPermissions.every((permission) => PERMISSION_PATTERN.test(permission))) {
      issues.push({ path: "admin.requiredPermissions", code: "invalid_permissions", message: "Product admin permissions are invalid." });
    }

    if (!Array.isArray(admin.navigation)) {
      issues.push({ path: "admin.navigation", code: "invalid_navigation", message: "admin.navigation must be an array." });
    } else {
      const navigationIds: string[] = [];
      const navigationHrefs: string[] = [];
      admin.navigation.forEach((entry, index) => {
        const path = `admin.navigation.${index}`;
        if (!isRecord(entry)) {
          issues.push({ path, code: "invalid_navigation_entry", message: "Navigation entry must be an object." });
          return;
        }
        if (!isNonEmptyString(entry.navigationId) || !KEY_PATTERN.test(entry.navigationId)) {
          issues.push({ path: `${path}.navigationId`, code: "invalid_key", message: "navigationId must be a stable key." });
        } else {
          navigationIds.push(entry.navigationId);
        }
        if (!isNonEmptyString(entry.moduleKey) || !moduleKeys.includes(entry.moduleKey)) {
          issues.push({ path: `${path}.moduleKey`, code: "unknown_module", message: "Navigation must reference a registered module." });
        }
        if (!isNonEmptyString(entry.label) || !isNonEmptyString(entry.iconKey)) {
          issues.push({ path, code: "required", message: "Navigation label and iconKey are required." });
        }
        if (!isNonEmptyString(entry.href) || !ADMIN_ROUTE_PATTERN.test(entry.href)) {
          issues.push({ path: `${path}.href`, code: "unsafe_route", message: "Navigation href must be a clean internal /admin route." });
        } else {
          navigationHrefs.push(entry.href);
        }
        if (!Number.isInteger(entry.order) || (entry.order as number) < 0 || (entry.order as number) > 10_000) {
          issues.push({ path: `${path}.order`, code: "invalid_order", message: "Navigation order must be an integer between 0 and 10000." });
        }
        if (!isStringArray(entry.requiredPermissions) || !entry.requiredPermissions.every((permission) => PERMISSION_PATTERN.test(permission))) {
          issues.push({ path: `${path}.requiredPermissions`, code: "invalid_permissions", message: "Navigation permissions are invalid." });
        }
        if (!Array.isArray(entry.environments) || !entry.environments.every((environment) => isMember(environment, COMMAND_CENTER_ENVIRONMENTS))) {
          issues.push({ path: `${path}.environments`, code: "invalid_environments", message: "Navigation environments are invalid." });
        }
      });
      if (!hasUniqueValues(navigationIds) || !hasUniqueValues(navigationHrefs)) {
        issues.push({ path: "admin.navigation", code: "duplicate_navigation", message: "Navigation identifiers and routes must be unique." });
      }
    }
  }

  for (const path of [
    "serviceDependencies",
    "subscriptionPlanKeys",
    "analyticsMetricKeys",
    "eventSchemaKeys",
    "healthCheckKeys",
    "errorSourceKeys",
    "featureFlagKeys",
    "supportCategoryKeys",
    "securityPolicyKeys",
  ] as const) {
    collectKeyedArrayIssues(issues, path, value[path]);
  }

  const governance = value.dataGovernance;
  if (!isRecord(governance)) {
    issues.push({ path: "dataGovernance", code: "invalid_governance", message: "dataGovernance is required." });
  } else {
    if (!isMember(governance.classification, DATA_CLASSIFICATIONS)) {
      issues.push({ path: "dataGovernance.classification", code: "invalid_classification", message: "Data classification is invalid." });
    }
    if (!Number.isInteger(governance.retentionDays) || (governance.retentionDays as number) < 1 || (governance.retentionDays as number) > 3650) {
      issues.push({ path: "dataGovernance.retentionDays", code: "invalid_retention", message: "Retention must be between 1 and 3650 days." });
    }
    if (!isStringArray(governance.residencyRegionKeys)) {
      issues.push({ path: "dataGovernance.residencyRegionKeys", code: "invalid_residency", message: "Residency region keys must be an array." });
    }
  }

  const ownership = value.ownership;
  if (!isRecord(ownership)) {
    issues.push({ path: "ownership", code: "invalid_ownership", message: "ownership is required." });
  } else {
    if (!isNonEmptyString(ownership.teamKey) || !KEY_PATTERN.test(ownership.teamKey)) {
      issues.push({ path: "ownership.teamKey", code: "invalid_key", message: "Ownership teamKey must be a stable key." });
    }
    if (!isNonEmptyString(ownership.documentationReference) || !DOCUMENTATION_REFERENCE_PATTERN.test(ownership.documentationReference)) {
      issues.push({ path: "ownership.documentationReference", code: "invalid_documentation_reference", message: "Documentation must reference a repository docs/*.md file." });
    }
  }

  if (issues.length > 0) return { ok: false, issues };
  return { ok: true, manifest: value as ProductManifestV1 };
}

const RELEASED_LIFECYCLE_STATUSES = new Set<ProductLifecycleStatus>([
  "limited_release",
  "public_release",
  "maintenance",
  "deprecated",
]);

export function buildCommandCenterNavigation(
  manifests: readonly unknown[],
  context: CommandCenterNavigationContext,
): CommandCenterNavigationItem[] {
  const navigation: CommandCenterNavigationItem[] = [];

  for (const candidate of manifests) {
    const validation = validateProductManifest(candidate);
    if (!validation.ok) continue;

    const manifest = validation.manifest;
    if (manifest.registrationStatus !== "active") continue;
    if (!manifest.availability.environments.includes(context.environment)) continue;
    if (
      !context.includeUnreleased &&
      !RELEASED_LIFECYCLE_STATUSES.has(manifest.lifecycleStatus)
    ) {
      continue;
    }
    if (!hasPermissions(context.permissions, manifest.admin.requiredPermissions)) {
      continue;
    }

    const modules = new Map(
      manifest.modules.map((module) => [module.moduleKey, module] as const),
    );

    for (const entry of manifest.admin.navigation) {
      const productModule = modules.get(entry.moduleKey);
      if (!productModule?.enabled) continue;
      if (!entry.environments.includes(context.environment)) continue;
      if (!hasPermissions(context.permissions, productModule.requiredPermissions)) continue;
      if (!hasPermissions(context.permissions, entry.requiredPermissions)) continue;

      navigation.push({
        ...entry,
        productKey: manifest.productKey,
        productName: manifest.name,
      });
    }
  }

  return navigation.sort(
    (left, right) =>
      left.order - right.order ||
      left.productName.localeCompare(right.productName) ||
      left.label.localeCompare(right.label),
  );
}
