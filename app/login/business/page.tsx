import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Globe2, ShieldCheck, Sparkles } from "lucide-react";

import BusinessDiscoveryWizard from "@/components/business/BusinessDiscoveryWizard";
import { APP_DESCRIPTION, APP_NAME, brand, pageTitle } from "@/lib/brand";

export const metadata: Metadata = {
  title: pageTitle("Business setup"),
  description:
    "Choose your business structure, industry, country, and required systems before creating a secure JALVORO business workspace.",
  robots: { index: false, follow: false },
  alternates: { canonical: "/login/business" },
};

export default function BusinessDiscoveryPage() {
  return (
    <main className="min-h-dvh bg-background px-4 py-5 text-foreground sm:px-6 sm:py-7 lg:px-8 lg:py-10">
      <div className="mx-auto w-full max-w-7xl">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <Link
            href="/"
            className="finance-focus inline-flex items-center gap-3 rounded-[var(--radius-button)] text-text-primary"
            aria-label={`${APP_NAME} home`}
          >
            <span className="grid size-10 place-items-center rounded-[var(--radius-button)] bg-primary-soft">
              <Image src={brand.assets.logoMark} alt="" width={30} height={30} priority />
            </span>
            <strong className="text-lg font-black tracking-tight">{APP_NAME}</strong>
          </Link>

          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="finance-focus inline-flex min-h-10 items-center gap-2 rounded-[var(--radius-button)] px-3 text-sm font-black text-text-secondary hover:bg-surface-secondary"
            >
              <ArrowLeft className="size-4" aria-hidden="true" /> Home
            </Link>
            <Link
              href="/login?intent=business&next=/business"
              className="finance-focus inline-flex min-h-10 items-center rounded-[var(--radius-button)] bg-surface px-4 text-sm font-black text-text-primary shadow-[var(--shadow-sm)]"
            >
              Sign in
            </Link>
          </div>
        </header>

        <section className="mx-auto max-w-4xl py-10 text-center sm:py-14 lg:py-16">
          <p className="inline-flex items-center gap-2 rounded-full bg-primary-soft px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-primary">
            <Sparkles className="size-4" aria-hidden="true" /> Business operating ecosystem
          </p>
          <h1 className="mt-5 text-4xl font-black tracking-[-0.04em] text-text-primary sm:text-5xl lg:text-6xl">
            Build the right JALVORO system for your business.
          </h1>
          <p className="mx-auto mt-5 max-w-3xl text-base leading-8 text-text-secondary sm:text-lg">
            {APP_DESCRIPTION} This guided discovery keeps one-person businesses completely separate from personal tracking and prepares a relevant business setup instead of a generic workspace.
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-xs font-bold text-text-secondary sm:text-sm">
            <span className="inline-flex items-center gap-2 rounded-full bg-surface px-3 py-2 shadow-[var(--shadow-xs)]">
              <ShieldCheck className="size-4 text-success" aria-hidden="true" /> Secure business identity
            </span>
            <span className="inline-flex items-center gap-2 rounded-full bg-surface px-3 py-2 shadow-[var(--shadow-xs)]">
              <Globe2 className="size-4 text-primary" aria-hidden="true" /> Pakistan-first, globally ready
            </span>
          </div>
        </section>

        <BusinessDiscoveryWizard />

        <section className="mx-auto grid max-w-5xl gap-4 py-10 sm:grid-cols-3 sm:py-14">
          {[
            ["No personal tracking", "This flow creates business intent only. Personal finance records and onboarding remain outside the active product journey."],
            ["No false activation", "Selections prepare setup context. Final access still depends on the available plan, verified role, permissions, and released modules."],
            ["No country lock-in", "Pakistan receives first-class support, while currencies, taxes, time zones, addresses, languages, and compliance remain configurable."],
          ].map(([title, copy]) => (
            <article key={title} className="rounded-[var(--radius-card)] bg-surface-secondary p-5">
              <h2 className="text-sm font-black text-text-primary">{title}</h2>
              <p className="mt-2 text-xs leading-6 text-text-secondary">{copy}</p>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
