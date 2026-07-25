import { BRAND } from "@/brand/brand.config";

const FALLBACK_SITE_URL = "https://jalvoro-app.vercel.app";

function normalizeOrigin(value: string | undefined) {
  const candidate = value?.trim();
  if (!candidate) return FALLBACK_SITE_URL;

  try {
    return new URL(candidate).origin;
  } catch {
    return FALLBACK_SITE_URL;
  }
}

export const brand = BRAND;
export const APP_NAME = BRAND.name;
export const APP_SHORT_NAME = BRAND.shortName;
export const APP_TAGLINE = BRAND.tagline;
export const APP_DESCRIPTION = BRAND.description;
export const APP_AI_NAME = `${APP_NAME} AI`;
export const APP_URL = normalizeOrigin(process.env.NEXT_PUBLIC_APP_URL);
export const SUPPORT_EMAIL =
  process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim() || "support@jalvoro.com";

export function pageTitle(title?: string) {
  return title ? `${title} — ${APP_NAME}` : `${APP_NAME} — ${APP_TAGLINE}`;
}
