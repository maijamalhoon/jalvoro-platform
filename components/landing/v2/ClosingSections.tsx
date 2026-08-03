import Link from "next/link";
import {
  ArrowRight,
  Database,
  LockKeyhole,
  ShieldCheck,
  Users,
  type LucideIcon,
} from "lucide-react";

import { BrandMark } from "@/components/landing/v2/BrandMark";
import { Eyebrow } from "@/components/landing/v2/Eyebrow";
import {
  container,
  focus,
  sectionSpace,
} from "@/components/landing/v2/config";
import { APP_NAME, APP_TAGLINE } from "@/lib/brand";

export function SecuritySection() {
  const points = [
    [ShieldCheck, "Separated workspaces"],
    [Users, "Role-based access"],
    [Database, "Verified source data"],
  ] as const;

  return (
    <section id="security" className={`${container} ${sectionSpace}`}>
      <div className="grid items-center gap-7 rounded-[30px] border border-border bg-card p-[clamp(2rem,5vw,4.4rem)] text-text-primary shadow-premium xl:grid-cols-[auto_minmax(0,1fr)_minmax(250px,.45fr)] xl:gap-[clamp(2rem,4vw,4rem)]">
        <span className="grid size-20 place-items-center rounded-3xl bg-success-soft text-success">
          <LockKeyhole className="size-8" />
        </span>

        <div>
          <Eyebrow>Privacy by design</Eyebrow>
          <h2 className="mt-3 max-w-4xl text-balance text-[clamp(2.1rem,3vw,3.35rem)] font-[710] leading-[1.04] tracking-[-0.05em] text-text-primary">
            One ecosystem. Separate workspaces. Clear access.
          </h2>
          <p className="mt-5 max-w-3xl text-base leading-7 text-text-secondary">
            Personal and Business records stay in their own workspaces, with
            verified access, clear permissions, and honest data states.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
          {points.map(([Icon, label]) => {
            const SecurityIcon = Icon as LucideIcon;
            return (
              <span
                key={label}
                className="flex min-h-14 items-center gap-3 rounded-2xl border border-border/70 bg-surface-soft px-4 text-xs font-bold text-text-secondary"
              >
                <SecurityIcon className="size-[18px] text-success" />
                {label}
              </span>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function FinalCtaSection() {
  return (
    <section
      className={`${container} mb-[clamp(3.5rem,7vw,6.25rem)] grid items-center gap-10 overflow-hidden rounded-[32px] bg-[#12211b] p-[clamp(2.5rem,6vw,4.8rem)] text-white shadow-premium dark:border dark:border-border dark:bg-surface-secondary dark:text-text-primary xl:grid-cols-[minmax(0,1fr)_auto]`}
    >
      <div className="relative">
        <span
          className="pointer-events-none absolute -left-16 -top-24 size-56 rounded-full bg-emerald-300/10 blur-3xl dark:bg-success-soft/60"
          aria-hidden="true"
        />
        <p className="relative m-0 text-xs font-bold uppercase tracking-[0.1em] text-emerald-300 dark:text-success">
          {APP_TAGLINE}
        </p>
        <h2 className="relative mt-3 max-w-4xl text-balance text-[clamp(2.2rem,3.6vw,4rem)] font-[710] leading-[1.02] tracking-[-0.055em]">
          Bring scattered work into one connected system.
        </h2>
        <span className="relative mt-5 block max-w-3xl text-base leading-7 text-slate-300 dark:text-text-secondary">
          Start with the Jalvoro workspace that solves today&apos;s problem and
          keep room for tomorrow&apos;s growth.
        </span>
      </div>

      <Link
        href="/start"
        prefetch={false}
        className={`inline-flex min-h-14 items-center justify-center gap-2.5 rounded-2xl bg-white px-6 text-sm font-bold text-[#12211b] shadow-soft transition hover:-translate-y-0.5 hover:bg-emerald-50 dark:bg-success dark:text-[var(--status-foreground)] dark:hover:brightness-95 ${focus}`}
      >
        Choose your workspace
        <ArrowRight className="size-[18px]" />
      </Link>
    </section>
  );
}

export function LandingFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-surface-secondary">
      <div
        className={`${container} grid min-h-[180px] items-center gap-8 py-10 md:grid-cols-[1fr_auto] xl:grid-cols-[1fr_auto_auto] xl:gap-12`}
      >
        <div>
          <BrandMark />
          <p className="mt-2.5 text-xs text-text-muted">{APP_TAGLINE}</p>
        </div>

        <nav
          className="flex flex-wrap gap-4 text-xs font-medium text-text-muted sm:gap-6"
          aria-label="Footer navigation"
        >
          <Link
            href="/support"
            className={`inline-flex min-h-12 items-center transition hover:text-text-primary ${focus}`}
          >
            Support
          </Link>
          <Link
            href="/privacy"
            className={`inline-flex min-h-12 items-center transition hover:text-text-primary ${focus}`}
          >
            Privacy
          </Link>
          <Link
            href="/terms"
            className={`inline-flex min-h-12 items-center transition hover:text-text-primary ${focus}`}
          >
            Terms
          </Link>
        </nav>

        <small className="text-xs text-text-muted md:col-span-2 xl:col-span-1">
          © {year} {APP_NAME}. All rights reserved.
        </small>
      </div>
    </footer>
  );
}
