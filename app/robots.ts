import type { MetadataRoute } from "next";

import { APP_URL } from "@/lib/brand";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/dashboard/",
        "/accounts/",
        "/transactions/",
        "/goals/",
        "/investments/",
        "/liabilities/",
        "/settings/",
      ],
    },
    sitemap: `${APP_URL}/sitemap.xml`,
    host: APP_URL,
  };
}
