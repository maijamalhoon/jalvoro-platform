import type { MetadataRoute } from "next";

import { APP_URL } from "@/lib/brand";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api",
        "/admin",
        "/business",
        "/control",
        "/dashboard",
        "/login",
        "/onboarding",
        "/reset-password",
      ],
    },
    sitemap: `${APP_URL}/sitemap.xml`,
    host: APP_URL,
  };
}
