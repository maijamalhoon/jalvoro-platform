import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Globe2, LockKeyhole, ShieldCheck } from "lucide-react";
import { headers } from "next/headers";

import PricingExperience from "@/components/pricing/PricingExperience";
import { APP_NAME } from "@/lib/brand";

export const metadata: Metadata = {
  title: `Plans and regional pricing | ${APP_NAME}`,
  description:
    "Compare Personal Finance and Business plans, regional prices, features, capacity, privacy boundaries, and free starting options.",
  alternates: { canonical: "/pricing" },
};

export default async function PricingPage() {
  const requestHeaders = await headers();
  const countryCode = requestHeaders.get("x-vercel-ip-country");

  return (
    <main className="min-h-screen bg-background px-[var(--space-page)] py-8 sm:py-12">
      <div className="mx-auto max-w-[96rem]">
        <header className="mb-10 flex flex-wrap items-center justify-between gap-4">
          <Link
            href="/"
            className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-text-secondary transition hover:bg-surface focus-visible:shadow-[var(--focus-ring)]"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back to home
          </Link>
          <div className="flex flex-wrap items-center justify-end gap-3 text-xs font-semibold text-text-muted">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-2">
              <Globe2 className="size-4" aria-hidden="true" />
              Regional pricing
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-2">
              <LockKeyhole className="size-4" aria-hidden="true" />
              Payment collection off
            </span>
          </div>
        </header>

        <section className="relative mx-auto mb-12 overflow-hidden rounded-[2rem] border border-border bg-surface px-6 py-10 text-center shadow-premium sm:px-10 sm:py-14">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-primary-soft to-transparent" />
          <div className="relative mx-auto max-w-5xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary-soft px-3 py-2 text-xs font-extrabold uppercase tracking-[0.14em] text-primary">
              <ShieldCheck className="size-4" aria-hidden="true" />
              One identity. Separate financial universes.
            </span>
            <h1 className="mt-5 text-balance text-4xl font-extrabold tracking-[-0.045em] text-text-primary sm:text-6xl lg:text-7xl">
              A clear plan for personal control and business growth.
            </h1>
            <p className="mx-auto mt-5 max-w-3xl text-pretty text-base leading-8 text-text-muted sm:text-lg">
              Compare regional Personal Finance and Business plans without mixing
              data, teams, permissions, AI access, or future invoices. Start free,
              save a paid plan choice, and connect payment only after the final
              provider launch is approved.
            </p>
            <div className="mx-auto mt-7 grid max-w-3xl gap-3 text-left sm:grid-cols-3">
              {[
                ["Free-first", "Personal Free and Business Free have no expiry."],
                ["Privacy-first", "Each workspace keeps its own data boundary."],
                ["Launch-safe", "No real card can be charged from these pages."],
              ].map(([title, copy]) => (
                <div key={title} className="rounded-2xl border border-border bg-background/70 p-4">
                  <strong className="text-sm text-text-primary">{title}</strong>
                  <p className="mt-1 text-xs leading-5 text-text-muted">{copy}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <PricingExperience initialCountryCode={countryCode} />
      </div>
    </main>
  );
}
