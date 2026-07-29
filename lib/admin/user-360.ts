export type CommandCenterUser360 = {
  generatedAt: string;
  viewerRole: "owner" | "admin" | "analyst" | "support";
  identity: {
    userReference: string;
    email: string;
    emailVisibility: "full" | "masked";
    maskedPhone: string | null;
    fullName: string | null;
    provider: string;
    preferredCurrency: string;
    onboardingStatus: "complete" | "pending";
    createdAt: string;
    emailConfirmedAt: string | null;
    phoneConfirmedAt: string | null;
    lastSignInAt: string | null;
    bannedUntil: string | null;
    accountStatus: "active" | "unconfirmed" | "banned";
  };
  billing: {
    planCode: string;
    planName: string;
    planKind: "free" | "paid";
    status:
      | "free"
      | "trialing"
      | "active"
      | "past_due"
      | "paused"
      | "cancelled"
      | "expired"
      | "incomplete";
    provider: "none" | "stripe" | "paddle" | "manual";
    trialEndsAt: string | null;
    currentPeriodStart: string | null;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
  };
  activity: {
    telemetryStatus: "available" | "not_observed";
    lastSeenAt: string | null;
    sessions30d: number;
    events30d: number;
    failedOperations30d: number;
    lastRoute: string | null;
    topRoutes: Array<{
      route: string;
      events: number;
      lastSeenAt: string;
    }>;
  };
  latestDevice: {
    countryCode: string | null;
    regionCode: string | null;
    city: string | null;
    locationPrecision:
      | "approximate_city"
      | "approximate_region"
      | "country"
      | "unknown";
    deviceType: "mobile" | "tablet" | "desktop" | "unknown";
    osFamily: string;
    browserFamily: string;
    appVersion: string | null;
    route: string;
    observedAt: string;
  } | null;
  recentSessions: Array<{
    sessionReference: string;
    countryCode: string | null;
    regionCode: string | null;
    city: string | null;
    deviceType: "mobile" | "tablet" | "desktop" | "unknown";
    osFamily: string;
    browserFamily: string;
    appVersion: string | null;
    lastRoute: string;
    lastSeenAt: string;
  }>;
  organizations: Array<{
    organizationCode: string;
    displayName: string;
    organizationStatus: "draft" | "active" | "suspended" | "closed";
    membershipCode: string;
    membershipRole:
      | "organization_owner"
      | "organization_admin"
      | "billing_admin"
      | "analyst"
      | "member";
    membershipStatus: "active" | "suspended" | "revoked";
    primaryCountryCode: string | null;
    regionKey: string | null;
    dataClassification: "public" | "internal" | "confidential" | "restricted";
  }>;
  riskSignals: {
    emailUnconfirmed: boolean;
    neverSignedIn: boolean;
    inactive90d: boolean;
    currentlyBanned: boolean;
    failedOperations30d: number;
    telemetryUnavailable: boolean;
  };
  privacyBoundary: {
    rawIpReturned: false;
    exactGpsReturned: false;
    financeValuesReturned: false;
    freeTextReturned: false;
    sessionReplayReturned: false;
    locationIsApproximate: true;
    lookupAudited: true;
    telemetryRetentionDays: number;
  };
};

const USER_REFERENCE = /^USR-[A-F0-9]{12}$/;
const SESSION_REFERENCE = /^SES-[A-F0-9]{12}$/;
const ORGANIZATION_REFERENCE = /^ORG-[A-F0-9]{12}$/;
const MEMBERSHIP_REFERENCE = /^MBR-[A-F0-9]{12}$/;
const COUNTRY_CODE = /^[A-Z]{2}$/;
const CURRENCY_CODE = /^[A-Z]{3}$/;
const ROUTE = /^\/[\x20-\x7E]{0,159}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function string(value: unknown, maximum = 160) {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized.length > 0 && normalized.length <= maximum
    ? normalized
    : null;
}

function nullableString(value: unknown, maximum = 160) {
  return value === null ? null : string(value, maximum);
}

function date(value: unknown) {
  const parsed = string(value, 64);
  return parsed && !Number.isNaN(Date.parse(parsed)) ? parsed : null;
}

function nullableDate(value: unknown): string | null | undefined {
  return value === null ? null : date(value) ?? undefined;
}

function count(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
}

function oneOf<T extends string>(value: unknown, values: readonly T[]): T | null {
  return typeof value === "string" && values.includes(value as T)
    ? (value as T)
    : null;
}

function optionalCode(value: unknown, pattern: RegExp) {
  if (value === null) return null;
  const parsed = string(value, 64);
  return parsed && pattern.test(parsed) ? parsed : undefined;
}

function parseRouteRows(value: unknown): CommandCenterUser360["activity"]["topRoutes"] | null {
  if (!Array.isArray(value) || value.length > 10) return null;
  const rows: CommandCenterUser360["activity"]["topRoutes"] = [];
  for (const item of value) {
    if (!isRecord(item)) return null;
    const route = string(item.route, 160);
    const events = count(item.events);
    const lastSeenAt = date(item.lastSeenAt);
    if (!route || !ROUTE.test(route) || events === null || !lastSeenAt) return null;
    rows.push({ route, events, lastSeenAt });
  }
  return rows;
}

function parseSessions(value: unknown): CommandCenterUser360["recentSessions"] | null {
  if (!Array.isArray(value) || value.length > 12) return null;
  const rows: CommandCenterUser360["recentSessions"] = [];
  for (const item of value) {
    if (!isRecord(item)) return null;
    const sessionReference = string(item.sessionReference, 16);
    const countryCode = optionalCode(item.countryCode, COUNTRY_CODE);
    const regionCode = nullableString(item.regionCode, 8);
    const city = nullableString(item.city, 80);
    const deviceType = oneOf(item.deviceType, ["mobile", "tablet", "desktop", "unknown"] as const);
    const osFamily = string(item.osFamily, 40);
    const browserFamily = string(item.browserFamily, 40);
    const appVersion = nullableString(item.appVersion, 64);
    const lastRoute = string(item.lastRoute, 160);
    const lastSeenAt = date(item.lastSeenAt);
    if (
      !sessionReference?.match(SESSION_REFERENCE) ||
      countryCode === undefined ||
      regionCode === undefined ||
      city === undefined ||
      !deviceType ||
      !osFamily ||
      !browserFamily ||
      appVersion === undefined ||
      !lastRoute?.match(ROUTE) ||
      !lastSeenAt
    ) return null;
    rows.push({
      sessionReference,
      countryCode,
      regionCode,
      city,
      deviceType,
      osFamily,
      browserFamily,
      appVersion,
      lastRoute,
      lastSeenAt,
    });
  }
  return rows;
}

function parseOrganizations(value: unknown): CommandCenterUser360["organizations"] | null {
  if (!Array.isArray(value) || value.length > 100) return null;
  const rows: CommandCenterUser360["organizations"] = [];
  for (const item of value) {
    if (!isRecord(item)) return null;
    const organizationCode = string(item.organizationCode, 16);
    const displayName = string(item.displayName, 120);
    const organizationStatus = oneOf(item.organizationStatus, ["draft", "active", "suspended", "closed"] as const);
    const membershipCode = string(item.membershipCode, 16);
    const membershipRole = oneOf(item.membershipRole, ["organization_owner", "organization_admin", "billing_admin", "analyst", "member"] as const);
    const membershipStatus = oneOf(item.membershipStatus, ["active", "suspended", "revoked"] as const);
    const primaryCountryCode = optionalCode(item.primaryCountryCode, COUNTRY_CODE);
    const regionKey = nullableString(item.regionKey, 64);
    const dataClassification = oneOf(item.dataClassification, ["public", "internal", "confidential", "restricted"] as const);
    if (
      !organizationCode?.match(ORGANIZATION_REFERENCE) ||
      !displayName ||
      !organizationStatus ||
      !membershipCode?.match(MEMBERSHIP_REFERENCE) ||
      !membershipRole ||
      !membershipStatus ||
      primaryCountryCode === undefined ||
      regionKey === undefined ||
      !dataClassification
    ) return null;
    rows.push({ organizationCode, displayName, organizationStatus, membershipCode, membershipRole, membershipStatus, primaryCountryCode, regionKey, dataClassification });
  }
  return rows;
}

export function parseCommandCenterUser360(value: unknown): CommandCenterUser360 | null {
  if (!isRecord(value)) return null;
  const identity = value.identity;
  const billing = value.billing;
  const activity = value.activity;
  const latestDevice = value.latestDevice;
  const riskSignals = value.riskSignals;
  const privacyBoundary = value.privacyBoundary;
  if (
    !isRecord(identity) ||
    !isRecord(billing) ||
    !isRecord(activity) ||
    (latestDevice !== null && !isRecord(latestDevice)) ||
    !isRecord(riskSignals) ||
    !isRecord(privacyBoundary)
  ) return null;

  const generatedAt = date(value.generatedAt);
  const viewerRole = oneOf(value.viewerRole, ["owner", "admin", "analyst", "support"] as const);
  const userReference = string(identity.userReference, 16);
  const email = string(identity.email, 254);
  const emailVisibility = oneOf(identity.emailVisibility, ["full", "masked"] as const);
  const maskedPhone = nullableString(identity.maskedPhone, 40);
  const fullName = nullableString(identity.fullName, 160);
  const provider = string(identity.provider, 40);
  const preferredCurrency = string(identity.preferredCurrency, 3);
  const onboardingStatus = oneOf(identity.onboardingStatus, ["complete", "pending"] as const);
  const createdAt = date(identity.createdAt);
  const emailConfirmedAt = nullableDate(identity.emailConfirmedAt);
  const phoneConfirmedAt = nullableDate(identity.phoneConfirmedAt);
  const lastSignInAt = nullableDate(identity.lastSignInAt);
  const bannedUntil = nullableDate(identity.bannedUntil);
  const accountStatus = oneOf(identity.accountStatus, ["active", "unconfirmed", "banned"] as const);

  const planCode = string(billing.planCode, 40);
  const planName = string(billing.planName, 80);
  const planKind = oneOf(billing.planKind, ["free", "paid"] as const);
  const billingStatus = oneOf(billing.status, ["free", "trialing", "active", "past_due", "paused", "cancelled", "expired", "incomplete"] as const);
  const billingProvider = oneOf(billing.provider, ["none", "stripe", "paddle", "manual"] as const);
  const trialEndsAt = nullableDate(billing.trialEndsAt);
  const currentPeriodStart = nullableDate(billing.currentPeriodStart);
  const currentPeriodEnd = nullableDate(billing.currentPeriodEnd);

  const telemetryStatus = oneOf(activity.telemetryStatus, ["available", "not_observed"] as const);
  const lastSeenAt = nullableDate(activity.lastSeenAt);
  const sessions30d = count(activity.sessions30d);
  const events30d = count(activity.events30d);
  const failedOperations30d = count(activity.failedOperations30d);
  const lastRoute = activity.lastRoute === null ? null : string(activity.lastRoute, 160);
  const topRoutes = parseRouteRows(activity.topRoutes);
  const recentSessions = parseSessions(value.recentSessions);
  const organizations = parseOrganizations(value.organizations);

  let parsedLatestDevice: CommandCenterUser360["latestDevice"] = null;
  if (latestDevice !== null && isRecord(latestDevice)) {
    const countryCode = optionalCode(latestDevice.countryCode, COUNTRY_CODE);
    const regionCode = nullableString(latestDevice.regionCode, 8);
    const city = nullableString(latestDevice.city, 80);
    const locationPrecision = oneOf(latestDevice.locationPrecision, ["approximate_city", "approximate_region", "country", "unknown"] as const);
    const deviceType = oneOf(latestDevice.deviceType, ["mobile", "tablet", "desktop", "unknown"] as const);
    const osFamily = string(latestDevice.osFamily, 40);
    const browserFamily = string(latestDevice.browserFamily, 40);
    const appVersion = nullableString(latestDevice.appVersion, 64);
    const route = string(latestDevice.route, 160);
    const observedAt = date(latestDevice.observedAt);
    if (
      countryCode === undefined || regionCode === undefined || city === undefined ||
      !locationPrecision || !deviceType || !osFamily || !browserFamily ||
      appVersion === undefined || !route?.match(ROUTE) || !observedAt
    ) return null;
    parsedLatestDevice = { countryCode, regionCode, city, locationPrecision, deviceType, osFamily, browserFamily, appVersion, route, observedAt };
  }

  const riskFailedOperations = count(riskSignals.failedOperations30d);
  const telemetryRetentionDays = count(privacyBoundary.telemetryRetentionDays);

  if (
    !generatedAt || !viewerRole || !userReference?.match(USER_REFERENCE) || !email ||
    !emailVisibility || maskedPhone === undefined || fullName === undefined || !provider ||
    !preferredCurrency?.match(CURRENCY_CODE) || !onboardingStatus || !createdAt ||
    emailConfirmedAt === undefined || phoneConfirmedAt === undefined ||
    lastSignInAt === undefined || bannedUntil === undefined || !accountStatus ||
    !planCode || !planName || !planKind || !billingStatus || !billingProvider ||
    trialEndsAt === undefined || currentPeriodStart === undefined || currentPeriodEnd === undefined ||
    typeof billing.cancelAtPeriodEnd !== "boolean" || !telemetryStatus ||
    lastSeenAt === undefined || sessions30d === null || events30d === null ||
    failedOperations30d === null || (lastRoute !== null && !lastRoute?.match(ROUTE)) ||
    !topRoutes || !recentSessions || !organizations || riskFailedOperations === null ||
    typeof riskSignals.emailUnconfirmed !== "boolean" ||
    typeof riskSignals.neverSignedIn !== "boolean" ||
    typeof riskSignals.inactive90d !== "boolean" ||
    typeof riskSignals.currentlyBanned !== "boolean" ||
    typeof riskSignals.telemetryUnavailable !== "boolean" ||
    privacyBoundary.rawIpReturned !== false ||
    privacyBoundary.exactGpsReturned !== false ||
    privacyBoundary.financeValuesReturned !== false ||
    privacyBoundary.freeTextReturned !== false ||
    privacyBoundary.sessionReplayReturned !== false ||
    privacyBoundary.locationIsApproximate !== true ||
    privacyBoundary.lookupAudited !== true || telemetryRetentionDays === null
  ) return null;

  return {
    generatedAt,
    viewerRole,
    identity: {
      userReference,
      email,
      emailVisibility,
      maskedPhone,
      fullName,
      provider,
      preferredCurrency,
      onboardingStatus,
      createdAt,
      emailConfirmedAt,
      phoneConfirmedAt,
      lastSignInAt,
      bannedUntil,
      accountStatus,
    },
    billing: {
      planCode,
      planName,
      planKind,
      status: billingStatus,
      provider: billingProvider,
      trialEndsAt,
      currentPeriodStart,
      currentPeriodEnd,
      cancelAtPeriodEnd: billing.cancelAtPeriodEnd,
    },
    activity: {
      telemetryStatus,
      lastSeenAt,
      sessions30d,
      events30d,
      failedOperations30d,
      lastRoute,
      topRoutes,
    },
    latestDevice: parsedLatestDevice,
    recentSessions,
    organizations,
    riskSignals: {
      emailUnconfirmed: riskSignals.emailUnconfirmed,
      neverSignedIn: riskSignals.neverSignedIn,
      inactive90d: riskSignals.inactive90d,
      currentlyBanned: riskSignals.currentlyBanned,
      failedOperations30d: riskFailedOperations,
      telemetryUnavailable: riskSignals.telemetryUnavailable,
    },
    privacyBoundary: {
      rawIpReturned: false,
      exactGpsReturned: false,
      financeValuesReturned: false,
      freeTextReturned: false,
      sessionReplayReturned: false,
      locationIsApproximate: true,
      lookupAudited: true,
      telemetryRetentionDays,
    },
  };
}
