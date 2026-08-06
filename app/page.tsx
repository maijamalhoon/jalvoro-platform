import type { Metadata } from "next";

import PremiumLandingPage from "@/components/landing/PremiumLandingPage";
import { APP_DESCRIPTION, APP_NAME, APP_TAGLINE } from "@/lib/brand";

const title = `${APP_NAME} — ${APP_TAGLINE}`;

export const metadata: Metadata = {
  title,
  description: APP_DESCRIPTION,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title,
    description: APP_DESCRIPTION,
    url: "/",
    siteName: APP_NAME,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description: APP_DESCRIPTION,
  },
};

export default function HomePage() {
  return <PremiumLandingPage />;
}
