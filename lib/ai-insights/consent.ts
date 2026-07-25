export const AI_CONSENT_VERSION = "jalvoro-ai-summary-v2-2026-07-25";
export const AI_CONSENT_STORAGE_KEY = "jalvoro-ai-summary-consent-v2";
export const LEGACY_AI_CONSENT_STORAGE_KEY =
  "jamals-finance-ai-summary-consent-v1";

export type AIConsentState = {
  accepted: boolean;
  version: string;
  acceptedAt: string | null;
  revokedAt: string | null;
};
