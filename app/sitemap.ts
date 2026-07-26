import type { MetadataRoute } from "next";

import { APP_URL } from "@/lib/brand";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: APP_URL,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${APP_URL}/privacy`,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${APP_URL}/terms`,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${APP_URL}/disclosures`,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${APP_URL}/support`,
      changeFrequency: "monthly",
      priority: 0.5,
    },
  ];
}
