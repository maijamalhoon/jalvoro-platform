import { BRAND } from "@/brand/brand.config";

const LOCAL_SITE_URL = "http://localhost:3000";
const UNCONFIGURED_SUPPORT_EMAIL = "support@example.invalid";

function productionProjectUrl() {
  const hostname = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  return hostname ? `https://${hostname}` : undefined;
}

function normalizeOrigin(value: string | undefined) {
  const candidate = value?.trim();
  if (!candidate) return LOCAL_SITE_URL;

  try {
    return new URL(candidate).origin;
  } catch {
    return LOCAL_SITE_URL;
  }
}

export const brand = BRAND;
export const APP_NAME = BRAND.name;
export const APP_SHORT_NAME = BRAND.shortName;
export const APP_TAGLINE = BRAND.tagline;
export const APP_DESCRIPTION = BRAND.description;
export const APP_AI_NAME = `${APP_NAME} AI`;
export const APP_URL = normalizeOrigin(
  process.env.NEXT_PUBLIC_APP_URL ??
    process.env.APP_URL ??
    productionProjectUrl(),
);
export const SUPPORT_EMAIL =
  process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim() ||
  UNCONFIGURED_SUPPORT_EMAIL;

export function pageTitle(title?: string) {
  return title ? `${title} — ${APP_NAME}` : `${APP_NAME} — ${APP_TAGLINE}`;
}
