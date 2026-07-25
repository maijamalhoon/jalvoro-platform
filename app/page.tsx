import type { Metadata } from "next";
import BusinessEcosystemLandingPage from "@/components/landing/BusinessEcosystemLandingPage";
import LandingChartMotion from "@/components/landing/LandingChartMotion";
import LandingScrollReveal from "@/components/landing/LandingScrollReveal";
import MathSymbolField from "@/components/landing/MathSymbolField";
import { APP_DESCRIPTION, APP_NAME, APP_TAGLINE } from "@/lib/brand";

import "./landing-polish.css";
import "./landing-preview.css";
import "./landing-sections.css";
import "./landing-responsive.css";
import "./landing-icon-typography.css";
import "./landing-header-rounded.css";
import "./landing-hero-motion.css";
import "./landing-donut-polish.css";
import "./landing-chart-travel.css";
import "./landing-static-card-hover.css";
import "./landing-borderless.css";
import "./landing-footer-ui.css";
import "./landing-scroll-motion.css";
import "./landing-feature-cards.css";
import "./landing-container-alignment.css";
import "./landing-hero-responsive-fix.css";
import "./landing-surface-unify.css";

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
  return (
    <>
      <LandingScrollReveal />
      <BusinessEcosystemLandingPage />
      <LandingChartMotion />
      <MathSymbolField />
    </>
  );
}
