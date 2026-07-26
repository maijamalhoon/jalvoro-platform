import type { MetadataRoute } from "next";

import { APP_URL } from "@/lib/brand";

const PRIVATE_ROUTES = [
  "/api/",
  "/admin",
  "/control",
  "/dashboard",
  "/accounts",
  "/transactions",
  "/goals",
  "/investments",
  "/liabilities",
  "/settings",
  "/business",
  "/onboarding",
  "/login",
  "/reset-password",
  "/auth",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: PRIVATE_ROUTES,
    },
    sitemap: `${APP_URL}/sitemap.xml`,
    host: APP_URL,
  };
}
