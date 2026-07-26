export const BUSINESS_INVITATION_TOKEN_PATTERN = /^[0-9a-f]{64}$/i;

export function normalizeBusinessInvitationToken(value: string | null | undefined) {
  const token = value?.trim() ?? "";
  return BUSINESS_INVITATION_TOKEN_PATTERN.test(token) ? token : null;
}

export function getBusinessInvitationAcceptancePath(token: string) {
  return `/business/invitations/accept?token=${encodeURIComponent(token)}`;
}

export function getBusinessInvitationTokenFromPath(value: string) {
  try {
    const parsed = new URL(value, "https://jalvoro.invalid");
    if (
      parsed.origin !== "https://jalvoro.invalid" ||
      parsed.pathname !== "/business/invitations/accept"
    ) {
      return null;
    }
    return normalizeBusinessInvitationToken(parsed.searchParams.get("token"));
  } catch {
    return null;
  }
}

export function isBusinessInvitationAcceptancePath(value: string) {
  return getBusinessInvitationTokenFromPath(value) !== null;
}
