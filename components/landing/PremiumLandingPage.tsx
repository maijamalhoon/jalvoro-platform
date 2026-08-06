import Link from "next/link";
import { ArrowRight, Check, ChevronRight, Sparkles } from "lucide-react";

import { BrandMark } from "@/components/landing/v2/BrandMark";
import {
  CoverageSection,
  HowItWorksSection,
  TrustRail,
  WorkflowSection,
} from "@/components/landing/v2/CoreSections";
import {
  LandingFooter,
  SecuritySection,
} from "@/components/landing/v2/ClosingSections";
import { FinalCtaSection } from "@/components/landing/v2/FinalCtaSection";
import { HeroUseCaseCarousel } from "@/components/landing/v2/ProductPreview";
import { WorkspaceSection } from "@/components/landing/v2/WorkspaceSection";
import {
  container,
  focus,
  navigation,
} from "@/components/landing/v2/config";

function PrimaryLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      className={`inline-flex min-h-12 items-center justify-center gap-2.5 rounded-2xl bg-success px-5 text-sm font-bold text-[var(--status-foreground)] shadow-soft transition hover:-translate-y-0.5 hover:brightness-95 sm:min-h-14 sm:px-6 ${focus}`}
    >
      {children}
      <ArrowRight className="size-[18px]" aria-hidden="true" />
    </a>
  );
}

function LandingHeader() {
  return (
    <header className="jv-landing-header sticky top-0 z-50 py-3 sm:py-4">
      <div
        className={`${container} grid min-h-[64px] grid-cols-[1fr_auto] items-center gap-3 rounded-[20px] border border-border bg-surface-glass px-3 py-2 shadow-soft backdrop-blur-xl lg:min-h-[72px] lg:grid-cols-[auto_1fr_auto] lg:gap-8 lg:rounded-3xl lg:px-4`}
      >
        <BrandMark />

        <nav
          className="hidden items-center justify-center gap-[clamp(1.25rem,2.3vw,2.4rem)] lg:flex"
          aria-label="Landing page navigation"
        >
          {navigation.map(([label, href]) => (
            <a
              key={href}
              href={href}
              className={`inline-flex min-h-12 items-center text-sm font-semibold text-text-secondary transition hover:text-text-primary ${focus}`}
            >
              {label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-4">
          <Link
            href="/start?mode=login"
            prefetch={false}
            className={`inline-flex min-h-11 items-center px-1 text-xs font-semibold text-text-secondary transition hover:text-text-primary sm:min-h-12 sm:text-sm ${focus}`}
          >
            Sign in
          </Link>
          <a
            href="#workspaces"
            className={`inline-flex min-h-11 items-center gap-2 rounded-[14px] bg-text-primary px-3 text-xs font-bold text-text-inverse transition hover:-translate-y-0.5 hover:opacity-90 sm:min-h-12 sm:px-4 sm:text-sm ${focus}`}
          >
            <span className="sm:hidden">Choose</span>
            <span className="hidden sm:inline">Choose workspace</span>
            <ArrowRight className="hidden size-4 sm:block" aria-hidden="true" />
          </a>
        </div>
      </div>
    </header>
  );
}

function LandingHero() {
  const proofPoints = [
    "Personal and Business access stays separate",
    "Illustrative previews—never customer data",
    "Expand only when the work requires it",
  ];

  return (
    <section
      id="overview"
      tabIndex={-1}
      className={`${container} jv-hero-grid grid content-center items-center gap-8 py-10 sm:gap-10 sm:py-14 xl:grid-cols-[minmax(0,.8fr)_minmax(0,1.2fr)] xl:gap-[clamp(2.75rem,4vw,5rem)] xl:py-12`}
    >
      <div className="jv-enter mx-auto max-w-[720px] text-center xl:mx-0 xl:text-left">
        <p className="jv-hero-badge mx-auto inline-flex w-max max-w-full items-center gap-2 rounded-full border border-success/20 bg-success-soft px-3.5 py-2 text-[11px] font-bold text-success xl:mx-0">
          <Sparkles className="size-4" aria-hidden="true" />
          Personal · Retail POS · Business
        </p>

        <h1 className="jv-hero-title mt-5 text-balance text-[clamp(2.6rem,4.6vw,5.2rem)] font-[735] leading-[.98] tracking-[-0.055em] text-text-primary">
          One platform. Three focused ways to <span className="text-success">start.</span>
        </h1>

        <p className="jv-hero-copy mx-auto mt-5 max-w-[660px] text-[clamp(1rem,1.2vw,1.16rem)] leading-7 text-text-secondary xl:mx-0">
          Choose Personal, Retail POS, or Business. Each workspace stays focused
          on its job, while deeper workflows and controls remain available when
          you need them.
        </p>

        <div className="jv-hero-actions mt-6 grid gap-2.5 sm:flex sm:flex-wrap sm:justify-center sm:gap-3 xl:justify-start">
          <PrimaryLink href="#workspaces">Choose your workspace</PrimaryLink>
          <a
            href="#how-it-works"
            className={`inline-flex min-h-12 items-center justify-center gap-2.5 rounded-2xl border border-border bg-card/80 px-5 text-sm font-bold text-text-primary shadow-theme transition hover:-translate-y-0.5 hover:border-border-strong hover:bg-card sm:min-h-14 sm:px-6 ${focus}`}
          >
            See how it works
            <ChevronRight className="size-[18px]" aria-hidden="true" />
          </a>
        </div>

        <div className="jv-hero-proof mx-auto mt-5 flex max-w-[680px] flex-wrap justify-center gap-x-5 gap-y-2 text-left text-xs font-semibold text-text-secondary xl:mx-0 xl:justify-start">
          {proofPoints.map((item) => (
            <span key={item} className="inline-flex items-center gap-2">
              <Check
                className="size-4 shrink-0 rounded-full bg-success-soft p-[3px] text-success"
                aria-hidden="true"
              />
              {item}
            </span>
          ))}
        </div>
      </div>

      <div className="min-w-0 self-center">
        <HeroUseCaseCarousel />
      </div>
    </section>
  );
}

export default function PremiumLandingPage() {
  return (
    <main className="jv-atomic relative isolate min-h-screen overflow-x-clip bg-background font-sans text-text-primary">
      <a href="#overview" className="jv-skip-link">
        Skip to main content
      </a>
      <LandingHeader />

      <div className="jv-hero-viewport relative isolate overflow-hidden">
        <div
          className="pointer-events-none absolute -right-[12vw] -top-[18vw] -z-10 size-[min(60vw,760px)] rounded-full bg-success-soft/70 blur-3xl"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -left-[15vw] top-[22vh] -z-10 size-[min(42vw,520px)] rounded-full bg-surface-secondary/80 blur-3xl"
          aria-hidden="true"
        />
        <LandingHero />
      </div>

      <TrustRail />
      <WorkspaceSection />
      <WorkflowSection />
      <HowItWorksSection />
      <CoverageSection />
      <SecuritySection />
      <FinalCtaSection />
      <LandingFooter />
    </main>
  );
}
