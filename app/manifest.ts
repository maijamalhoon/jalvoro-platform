import type { MetadataRoute } from "next";

import {
  APP_DESCRIPTION,
  APP_NAME,
  APP_SHORT_NAME,
} from "@/lib/brand";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: APP_NAME,
    short_name: APP_SHORT_NAME,
    description: APP_DESCRIPTION,
    id: "/",
    start_url: "/?source=pwa",
    scope: "/",
    display: "standalone",
    background_color: "#F3F6FA",
    theme_color: "#07365F",
    orientation: "portrait-primary",
    categories: ["business", "finance", "productivity", "utilities"],
    lang: "en",
    icons: [
      {
        src: "/api/app-icon/192?v=3",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/api/app-icon/512?v=3",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/api/app-icon/192?maskable=1&v=3",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/api/app-icon/512?maskable=1&v=3",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
