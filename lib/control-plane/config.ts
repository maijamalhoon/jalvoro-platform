export const CONTROL_PLANE_PROJECT_REF = "zzvpovvuybfihwgjrder";
export const CONTROL_PLANE_SUPABASE_URL =
  "https://zzvpovvuybfihwgjrder.supabase.co";

// Supabase publishable keys are intentionally safe for browser clients. Access is
// enforced by Auth, AAL2 checks, private schemas, RLS, and bounded RPCs.
export const CONTROL_PLANE_SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_U-iYfkTi8yfRN4gKPdRDhQ_Rlnlxkql";

export const CONTROL_PLANE_LOGIN_PATH = "/control-login";
export const CONTROL_PLANE_HOME_PATH = "/control";

const ADMIN_DESTINATIONS = new Set([
  "/admin",
  "/admin/claim",
  "/admin/global-operations",
  "/admin/icon-system",
  "/admin/organizations",
]);

export type ControlPlaneRole = "owner" | "admin" | "analyst" | "support";

export type ControlPlaneGrant = {
  grantCode: string;
  permissionKey: string;
  productKey: string | null;
  moduleKey: string | null;
  environmentKey: string | null;
  regionKey: string | null;
  organizationId: string | null;
  dataClassification: string | null;
  expiresAt: string | null;
};

export type ControlPlaneAccess = {
  userReference: string;
  role: ControlPlaneRole;
  isRootOwner: boolean;
  sessionAssurance: "aal2";
  grants: ControlPlaneGrant[];
};

export type ControlPlaneOperator = {
  userReference: string;
  role: ControlPlaneRole;
  isRootOwner: boolean;
  status: "active" | "disabled";
  createdAt: string | null;
  disabledAt: string | null;
};

export type ControlPlaneInvitation = {
  invitationCode: string;
  maskedEmail: string;
  role: Exclude<ControlPlaneRole, "owner">;
  expiresAt: string | null;
};

export type ControlPlaneDirectory = {
  operators: ControlPlaneOperator[];
  pendingInvitations: ControlPlaneInvitation[];
  activeGrants: Array<ControlPlaneGrant & { userReference: string }>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function cleanText(value: unknown, maxLength = 180) {
  return typeof value === "string"
    ? value.replace(/\s+/g, " ").trim().slice(0, maxLength)
    : "";
}

function cleanNullableText(value: unknown, maxLength = 180) {
  const text = cleanText(value, maxLength);
  return text || null;
}

function cleanDateTime(value: unknown) {
  if (typeof value !== "string") return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null;
}

function isRole(value: unknown): value is ControlPlaneRole {
  return (
    value === "owner" ||
    value === "admin" ||
    value === "analyst" ||
    value === "support"
  );
}

function parseGrant(value: unknown): ControlPlaneGrant | null {
  if (!isRecord(value)) return null;

  const grantCode = cleanText(value.grantCode, 32);
  const permissionKey = cleanText(value.permissionKey, 160);
  if (!grantCode || !permissionKey) return null;

  return {
    grantCode,
    permissionKey,
    productKey: cleanNullableText(value.productKey, 100),
    moduleKey: cleanNullableText(value.moduleKey, 100),
    environmentKey: cleanNullableText(value.environmentKey, 40),
    regionKey: cleanNullableText(value.regionKey, 80),
    organizationId: cleanNullableText(value.organizationId, 80),
    dataClassification: cleanNullableText(value.dataClassification, 40),
    expiresAt: cleanDateTime(value.expiresAt),
  };
}

export function parseControlPlaneAccess(value: unknown): ControlPlaneAccess | null {
  if (!isRecord(value)) return null;

  const userReference = cleanText(value.userReference, 32);
  const role = value.role;
  if (
    !userReference ||
    !isRole(role) ||
    value.sessionAssurance !== "aal2" ||
    !Array.isArray(value.grants)
  ) {
    return null;
  }

  return {
    userReference,
    role,
    isRootOwner: value.isRootOwner === true,
    sessionAssurance: "aal2",
    grants: value.grants
      .map(parseGrant)
      .filter((grant): grant is ControlPlaneGrant => Boolean(grant)),
  };
}

export function parseControlPlaneDirectory(
  value: unknown,
): ControlPlaneDirectory | null {
  if (!isRecord(value)) return null;
  if (
    !Array.isArray(value.operators) ||
    !Array.isArray(value.pendingInvitations) ||
    !Array.isArray(value.activeGrants)
  ) {
    return null;
  }

  const operators = value.operators.flatMap((entry) => {
    if (!isRecord(entry) || !isRole(entry.role)) return [];
    const userReference = cleanText(entry.userReference, 32);
    if (!userReference) return [];
    return [
      {
        userReference,
        role: entry.role,
        isRootOwner: entry.isRootOwner === true,
        status: entry.status === "disabled" ? "disabled" : "active",
        createdAt: cleanDateTime(entry.createdAt),
        disabledAt: cleanDateTime(entry.disabledAt),
      } satisfies ControlPlaneOperator,
    ];
  });

  const pendingInvitations = value.pendingInvitations.flatMap((entry) => {
    if (!isRecord(entry) || !isRole(entry.role) || entry.role === "owner") {
      return [];
    }
    const invitationCode = cleanText(entry.invitationCode, 32);
    const maskedEmail = cleanText(entry.maskedEmail, 180);
    if (!invitationCode || !maskedEmail) return [];
    return [
      {
        invitationCode,
        maskedEmail,
        role: entry.role,
        expiresAt: cleanDateTime(entry.expiresAt),
      } satisfies ControlPlaneInvitation,
    ];
  });

  const activeGrants = value.activeGrants.flatMap((entry) => {
    if (!isRecord(entry)) return [];
    const grant = parseGrant(entry);
    const userReference = cleanText(entry.userReference, 32);
    return grant && userReference ? [{ ...grant, userReference }] : [];
  });

  return { operators, pendingInvitations, activeGrants };
}

export function sanitizeControlDestination(value: string | null | undefined) {
  if (!value || /[\\\u0000-\u001f\u007f]/.test(value)) {
    return CONTROL_PLANE_HOME_PATH;
  }

  try {
    const destination = new URL(value, "https://control.invalid");
    if (destination.origin !== "https://control.invalid") {
      return CONTROL_PLANE_HOME_PATH;
    }

    const pathname = destination.pathname;

    if (pathname === CONTROL_PLANE_HOME_PATH) {
      return `${CONTROL_PLANE_HOME_PATH}${destination.search}`;
    }

    if (ADMIN_DESTINATIONS.has(pathname)) {
      return `${pathname}${destination.search}`;
    }

    // Unknown or retired Command Center URLs must never strand an authenticated
    // operator on the application 404 page. Keep the security gate broad, but
    // normalize navigation to a route that is present in the production build.
    if (
      pathname.startsWith(`${CONTROL_PLANE_HOME_PATH}/`) ||
      pathname.startsWith("/admin/")
    ) {
      return pathname.startsWith("/admin/") ? "/admin" : CONTROL_PLANE_HOME_PATH;
    }

    return CONTROL_PLANE_HOME_PATH;
  } catch {
    return CONTROL_PLANE_HOME_PATH;
  }
}

export function isControlPlaneOnlyPath(pathname: string) {
  return (
    pathname === CONTROL_PLANE_LOGIN_PATH ||
    pathname === CONTROL_PLANE_HOME_PATH ||
    pathname.startsWith(`${CONTROL_PLANE_HOME_PATH}/`)
  );
}

export function isAdminControlPlanePath(pathname: string) {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}
