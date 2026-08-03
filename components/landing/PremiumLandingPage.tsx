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
import { ProductPreview } from "@/components/landing/v2/ProductPreview";
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
      className={`inline-flex min-h-14 items-center justify-center gap-2.5 rounded-2xl bg-emerald-600 px-6 text-sm font-bold text-white shadow-[0_14px_30px_rgba(5,150,105,.22)] transition hover:-translate-y-0.5 hover:bg-emerald-700 hover:shadow-[0_18px_36px_rgba(5,150,105,.28)] ${focus}`}
    >
      {children}
      <ArrowRight className="size-[18px]" aria-hidden="true" />
    </Link>
  );
}

function LandingHeader() {
  return (
    <header className="relative z-20 pt-3 sm:pt-5">
      <div className={`${container} grid min-h-[64px] grid-cols-[1fr_auto] items-center gap-3 rounded-[20px] border border-[#12211b]/[0.08] bg-white/85 px-3 py-2 shadow-[0_12px_42px_rgba(24,52,40,.06)] backdrop-blur-xl lg:min-h-[72px] lg:grid-cols-[auto_1fr_auto] lg:gap-8 lg:rounded-3xl lg:px-4`}>
        <BrandMark />

        <nav
          className="hidden items-center justify-center gap-[clamp(1.25rem,2.3vw,2.4rem)] lg:flex"
          aria-label="Landing page navigation"
        >
          {navigation.map(([label, href]) => (
            <a
              key={href}
              href={href}
              className={`inline-flex min-h-12 items-center text-sm font-semibold text-slate-600 transition hover:text-[#12211b] ${focus}`}
            >
              {label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3 sm:gap-4">
          <Link
            href="/start?mode=login"
            prefetch={false}
            className={`hidden min-h-12 items-center text-sm font-semibold text-slate-600 transition hover:text-[#12211b] sm:inline-flex ${focus}`}
          >
            Sign in
          </Link>
          <Link
            href="/start"
            prefetch={false}
            className={`inline-flex min-h-12 items-center gap-2 rounded-[14px] bg-[#12211b] px-4 text-xs font-bold text-white transition hover:-translate-y-0.5 hover:bg-[#1a3328] sm:text-sm ${focus}`}
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
    "POS, inventory, CRM, and ERP when needed",
    "Built around verified records",
  ];

  return (
    <section
      id="overview"
      className={`${container} grid min-h-[720px] items-center gap-14 py-14 xl:grid-cols-[minmax(0,.86fr)_minmax(560px,1.14fr)] xl:gap-[clamp(3.5rem,5vw,5.5rem)] xl:py-[clamp(4.5rem,6vw,6.5rem)]`}
    >
      <div className="jv-enter mx-auto max-w-[760px] text-center xl:mx-0 xl:text-left">
        <p className="mx-auto inline-flex w-max max-w-full items-center gap-2 rounded-full border border-emerald-600/15 bg-emerald-50/80 px-3.5 py-2 text-[11px] font-bold text-emerald-700 xl:mx-0">
          <Sparkles className="size-4" />
          One connected finance and operations ecosystem
        </p>

        <h1 className="mt-6 text-balance text-[clamp(2.65rem,4.45vw,5.35rem)] font-[735] leading-[.98] tracking-[-0.055em]">
          Personal money, shop operations, and growing teams—
          <span className="text-emerald-600">one connected ecosystem.</span>
        </h1>

        <p className="mx-auto mt-6 max-w-[690px] text-[clamp(1rem,1.35vw,1.24rem)] leading-7 text-slate-600 xl:mx-0 xl:leading-8">
          {APP_NAME} lets you start with Personal, POS, or Business and expand
          into inventory, CRM, ERP, and reporting without rebuilding your
          system.
        </p>

        <div className="mt-8 grid gap-3 sm:flex sm:flex-wrap sm:justify-center xl:justify-start">
          <PrimaryLink href="/start">Start with {APP_NAME}</PrimaryLink>
          <Link
            href="#workspaces"
            className={`inline-flex min-h-14 items-center justify-center gap-2.5 rounded-2xl border border-[#12211b]/10 bg-white/75 px-6 text-sm font-bold transition hover:-translate-y-0.5 hover:border-[#12211b]/20 hover:bg-white ${focus}`}
          >
            See what it covers
            <ChevronRight className="size-[18px]" />
          </Link>
        </div>

        <div className="mx-auto mt-7 grid w-max max-w-full justify-start gap-3 text-left text-xs font-semibold text-slate-600 sm:flex sm:flex-wrap sm:justify-center sm:gap-x-5 xl:mx-0 xl:justify-start">
          {proofPoints.map((item) => (
            <span key={item} className="inline-flex items-center gap-2">
              <Check className="size-4 rounded-full bg-emerald-50 p-[3px] text-emerald-700" />
              {item}
            </span>
          ))}
        </div>
      </div>

      <div className="mx-auto w-full max-w-[840px]">
        <ProductPreview />
      </div>
    </section>
  );
}

export default function PremiumLandingPage() {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: landingStyles }} />
      <main className="jv-atomic relative isolate min-h-screen overflow-x-clip bg-[#f7faf8] font-sans text-[#12211b]">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[900px] bg-[radial-gradient(circle_at_79%_13%,rgba(85,196,155,.18),transparent_30%),radial-gradient(circle_at_11%_22%,rgba(18,33,27,.045),transparent_26%),linear-gradient(180deg,#fbfdfc_0%,rgba(247,250,248,0)_100%)]"
          aria-hidden="true"
        />

        <LandingHeader />
        <LandingHero />
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
