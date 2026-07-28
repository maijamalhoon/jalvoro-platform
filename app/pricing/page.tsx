import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  Globe2,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { headers } from "next/headers";

import RegionalPricing from "@/components/billing/RegionalPricing";

export const metadata: Metadata = {
  title: "Plans and regional pricing",
  description:
    "Explore JALVORO Personal Finance and Business plans with regional pricing, clear feature comparison, permanent Free options, and privacy-first billing separation.",
  alternates: { canonical: "/pricing" },
  openGraph: {
    title: "JALVORO plans and regional pricing",
    description:
      "Choose a Personal Finance or Business plan without mixing data, users, permissions, subscriptions, or invoices.",
    type: "website",
  },
};

export default async function PricingPage() {
  const requestHeaders = await headers();
  const countryCode = requestHeaders.get("x-vercel-ip-country");

  return (
    <main className="min-h-screen overflow-hidden bg-background text-text-primary">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-0 h-[48rem] bg-[radial-gradient(circle_at_15%_10%,var(--primary-soft),transparent_34%),radial-gradient(circle_at_85%_5%,var(--surface-inset),transparent_30%)]" />

      <div className="relative z-10 mx-auto max-w-[96rem] px-[var(--space-page)] py-6 sm:py-10">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <Link
            href="/"
            className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-text-secondary transition hover:bg-surface focus-visible:shadow-[var(--focus-ring)]"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back to home
          </Link>
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-text-muted">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface/85 px-3 py-2 shadow-soft">
              <Globe2 className="size-4" aria-hidden="true" />
              Regional plans
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface/85 px-3 py-2 shadow-soft">
              <LockKeyhole className="size-4" aria-hidden="true" />
              Provider connection comes last
            </span>
          </div>
        </header>

        <section className="grid gap-10 py-14 sm:py-20 lg:grid-cols-[minmax(0,1fr)_28rem] lg:items-center lg:py-24">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full bg-primary-soft px-3 py-1.5 text-xs font-extrabold text-primary">
                <Sparkles className="size-4" aria-hidden="true" />
                Personal clarity
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-surface-inset px-3 py-1.5 text-xs font-extrabold text-text-secondary">
                <Building2 className="size-4" aria-hidden="true" />
                Business scale
              </span>
            </div>

            <p className="mt-8 text-sm font-bold uppercase tracking-[0.2em] text-primary">
              One identity. Separate financial universes.
            </p>
            <h1 className="mt-4 max-w-5xl text-balance text-4xl font-extrabold tracking-[-0.05em] text-text-primary sm:text-6xl lg:text-7xl">
              Choose the plan that fits today—without trapping tomorrow.
            </h1>
            <p className="mt-6 max-w-3xl text-pretty text-base leading-8 text-text-muted sm:text-xl">
              Start Free, compare every feature, explore dedicated plan pages, and
              upgrade only when the value is clear. Personal Finance, each
              company, and Enterprise groups keep separate data, users,
              permissions, subscriptions, and invoices.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <a
                href="#plans"
                className="inline-flex min-h-12 items-center justify-center rounded-xl bg-primary px-6 text-sm font-extrabold text-primary-foreground shadow-theme transition hover:bg-primary-hover focus-visible:shadow-[var(--focus-ring)]"
              >
                Explore all plans
              </a>
              <Link
                href="/login?mode=signup"
                className="inline-flex min-h-12 items-center justify-center rounded-xl border border-border bg-surface px-6 text-sm font-extrabold text-text-primary shadow-soft transition hover:border-border-strong hover:bg-surface-inset focus-visible:shadow-[var(--focus-ring)]"
              >
                Continue Free
              </Link>
            </div>
          </div>

          <aside className="rounded-[2rem] border border-border bg-surface/90 p-5 shadow-premium backdrop-blur sm:p-7">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">
              Pricing promise
            </p>
            <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-text-primary">
              Built to reduce uncertainty before checkout.
            </h2>
            <div className="mt-6 space-y-4">
              {[
                {
                  icon: CheckCircle2,
                  title: "Permanent Free options",
                  body: "Personal Free and Business Free remain visible throughout the journey.",
                },
                {
                  icon: ShieldCheck,
                  title: "Privacy-first separation",
                  body: "Personal and Business subscriptions never collapse into one data scope.",
                },
                {
                  icon: LockKeyhole,
                  title: "No payment data stored",
                  body: "JALVORO will use provider-hosted checkout and will not store card numbers or CVV values.",
                },
                {
                  icon: Globe2,
                  title: "Regional presentation",
                  body: "Country tiers make the commercial model accessible while final tax stays provider-confirmed.",
                },
              ].map(({ icon: Icon, title, body }) => (
                <div key={title} className="flex gap-3">
                  <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary-soft">
                    <Icon className="size-5 text-primary" aria-hidden="true" />
                  </span>
                  <div>
                    <h3 className="text-sm font-extrabold text-text-primary">
                      {title}
                    </h3>
                    <p className="mt-1 text-xs leading-5 text-text-muted">{body}</p>
                  </div>
                </div>
              ))}
            </div>
          </aside>
        </section>

        <div id="plans" className="scroll-mt-6">
          <RegionalPricing initialCountryCode={countryCode} />
        </div>

        <footer className="mt-16 flex flex-col gap-4 border-t border-border py-8 text-sm text-text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>
            Payment collection is intentionally disabled until the final Paddle
            connection and sandbox verification phase.
          </p>
          <div className="flex flex-wrap gap-4 font-semibold">
            <Link href="/privacy" className="hover:text-text-primary">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-text-primary">
              Terms
            </Link>
            <Link href="/" className="hover:text-text-primary">
              JALVORO home
            </Link>
          </div>
        </footer>
      </div>
    </main>
  );
}
