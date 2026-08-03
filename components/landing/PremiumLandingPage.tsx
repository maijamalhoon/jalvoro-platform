import Link from "next/link";
import {
  ArrowRight,
  Check,
  ChevronRight,
  Sparkles,
} from "lucide-react";

import { BrandMark } from "@/components/landing/v2/BrandMark";
import {
  CoverageSection,
  HowItWorksSection,
  TrustRail,
  WorkflowSection,
  WorkspaceSection,
} from "@/components/landing/v2/CoreSections";
import {
  FinalCtaSection,
  LandingFooter,
  SecuritySection,
} from "@/components/landing/v2/ClosingSections";
import { HeroUseCaseCarousel } from "@/components/landing/v2/ProductPreview";
import {
  container,
  focus,
  landingStyles,
  navigation,
} from "@/components/landing/v2/config";
import { APP_NAME } from "@/lib/brand";

function PrimaryLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      prefetch={false}
      className={`inline-flex min-h-12 items-center justify-center gap-2.5 rounded-2xl bg-success px-5 text-sm font-bold text-[var(--status-foreground)] shadow-soft transition hover:-translate-y-0.5 hover:brightness-95 sm:min-h-14 sm:px-6 ${focus}`}
    >
      {children}
      <ArrowRight className="size-[18px]" aria-hidden="true" />
    </Link>
  );
}

function LandingHeader() {
  return (
    <header className="jv-landing-header relative z-20 pt-3 sm:pt-5">
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

        <div className="flex items-center gap-2.5 sm:gap-4">
          <Link
            href="/start?mode=login"
            prefetch={false}
            className={`hidden min-h-12 items-center text-sm font-semibold text-text-secondary transition hover:text-text-primary sm:inline-flex ${focus}`}
          >
            Sign in
          </Link>
          <Link
            href="/start"
            prefetch={false}
            className={`inline-flex min-h-12 items-center gap-2 rounded-[14px] bg-text-primary px-4 text-xs font-bold text-text-inverse transition hover:-translate-y-0.5 hover:opacity-90 sm:text-sm ${focus}`}
          >
            Get started
            <ArrowRight className="hidden size-4 sm:block" />
          </Link>
        </div>
      </div>
    </header>
  );
}

function LandingHero() {
  const proofPoints = [
    "Personal and Business stay separate",
    "Verified records, not invented data",
    "Expand only when you need more",
  ];

  return (
    <section
      id="overview"
      className={`${container} jv-hero-grid grid h-full min-h-0 content-center items-center gap-4 py-4 sm:gap-6 sm:py-6 xl:grid-cols-[minmax(0,.78fr)_minmax(0,1.22fr)] xl:gap-[clamp(2.75rem,4vw,5rem)] xl:py-8`}
    >
      <div className="jv-enter mx-auto max-w-[720px] text-center xl:mx-0 xl:text-left">
        <p className="jv-hero-badge mx-auto inline-flex w-max max-w-full items-center gap-2 rounded-full border border-success/20 bg-success-soft px-3.5 py-2 text-[10px] font-bold text-success sm:text-[11px] xl:mx-0">
          <Sparkles className="size-4" />
          Personal finance to business operations
        </p>

        <h1 className="jv-hero-title mt-4 text-balance text-[clamp(2.15rem,4.2vw,5rem)] font-[735] leading-[.98] tracking-[-0.055em] text-text-primary sm:mt-5">
          Run money, sales, stock, customers, and teams in{" "}
          <span className="text-success">one place.</span>
        </h1>

        <p className="jv-hero-copy mx-auto mt-4 max-w-[650px] text-[clamp(.94rem,1.2vw,1.16rem)] leading-6 text-text-secondary sm:mt-5 sm:leading-7 xl:mx-0">
          Start with Personal, POS, or Business. Add inventory, CRM, ERP, and
          reporting when you need them—without rebuilding your system.
        </p>

        <div className="jv-hero-actions mt-5 grid gap-2.5 sm:flex sm:flex-wrap sm:justify-center sm:gap-3 xl:justify-start">
          <PrimaryLink href="/start">Start with {APP_NAME}</PrimaryLink>
          <Link
            href="#workspaces"
            className={`inline-flex min-h-12 items-center justify-center gap-2.5 rounded-2xl border border-border bg-card/80 px-5 text-sm font-bold text-text-primary shadow-theme transition hover:-translate-y-0.5 hover:border-border-strong hover:bg-card sm:min-h-14 sm:px-6 ${focus}`}
          >
            See what it covers
            <ChevronRight className="size-[18px]" />
          </Link>
        </div>

        <div className="jv-hero-proof mx-auto mt-5 hidden w-max max-w-full flex-wrap justify-center gap-x-5 gap-y-2 text-left text-[11px] font-semibold text-text-secondary sm:flex xl:mx-0 xl:justify-start">
          {proofPoints.map((item) => (
            <span key={item} className="inline-flex items-center gap-2">
              <Check className="size-4 rounded-full bg-success-soft p-[3px] text-success" />
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
    <>
      <style dangerouslySetInnerHTML={{ __html: landingStyles }} />
      <main className="jv-atomic relative isolate min-h-screen overflow-x-clip bg-background font-sans text-text-primary">
        <div className="jv-hero-viewport relative isolate overflow-hidden">
          <div
            className="pointer-events-none absolute -right-[12vw] -top-[18vw] -z-10 size-[min(60vw,760px)] rounded-full bg-success-soft/70 blur-3xl"
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute -left-[15vw] top-[22vh] -z-10 size-[min(42vw,520px)] rounded-full bg-surface-secondary/80 blur-3xl"
            aria-hidden="true"
          />

          <LandingHeader />
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
    </>
  );
}
