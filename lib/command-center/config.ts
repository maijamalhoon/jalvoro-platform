export const COMMAND_CENTER_PROJECT_REF = "zzvpovvuybfihwgjrder";
export const COMMAND_CENTER_SUPABASE_URL =
  "https://zzvpovvuybfihwgjrder.supabase.co";

// Supabase publishable keys are safe for browser clients. Command Center access
// is still bounded by email/password authentication and the private operator
// registry exposed through get_my_command_center_access().
export const COMMAND_CENTER_SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_U-iYfkTi8yfRN4gKPdRDhQ_Rlnlxkql";

export const COMMAND_CENTER_PATH = "/commandcenter";

export type CommandCenterRole = "owner" | "admin" | "analyst" | "support";

export type CommandCenterAccess = {
  userReference: string;
  role: CommandCenterRole;
  isOwner: boolean;
  sessionAssurance: "password";
};

const USER_REFERENCE_PATTERN = /^CPU-[A-F0-9]{12}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isRole(value: unknown): value is CommandCenterRole {
  return (
    value === "owner" ||
    value === "admin" ||
    value === "analyst" ||
    value === "support"
  );
}

export function parseCommandCenterAccess(
  value: unknown,
): CommandCenterAccess | null {
  if (!isRecord(value)) return null;

  const userReference =
    typeof value.userReference === "string"
      ? value.userReference.trim().toUpperCase()
      : "";
  const role = value.role;
  const isOwner = value.isOwner === true;

  if (
    !USER_REFERENCE_PATTERN.test(userReference) ||
    !isRole(role) ||
    value.sessionAssurance !== "password" ||
    (role === "owner") !== isOwner
  ) {
    return null;
  }

  return {
    userReference,
    role,
    isOwner,
    sessionAssurance: "password",
  };
}
