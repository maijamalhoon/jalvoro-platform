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
      <div className="grid items-center gap-7 rounded-[30px] border border-[#12211b]/[0.07] bg-white p-[clamp(2rem,5vw,4.4rem)] shadow-[0_24px_70px_rgba(28,55,43,.07)] xl:grid-cols-[auto_minmax(0,1fr)_minmax(250px,.45fr)] xl:gap-[clamp(2rem,4vw,4rem)]">
        <span className="grid size-20 place-items-center rounded-3xl bg-emerald-50 text-emerald-700">
          <LockKeyhole className="size-8" />
        </span>

        <div>
          <Eyebrow>Privacy by design</Eyebrow>
          <h2 className="mt-3 max-w-4xl text-balance text-[clamp(2.1rem,3vw,3.35rem)] font-[710] leading-[1.04] tracking-[-0.05em]">
            One ecosystem. Separate workspaces. Clear access.
          </h2>
          <p className="mt-5 max-w-3xl text-base leading-7 text-slate-600">
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
                className="flex min-h-14 items-center gap-3 rounded-2xl bg-[#f7faf8] px-4 text-xs font-bold text-slate-600"
              >
                <SecurityIcon className="size-[18px] text-emerald-700" />
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
      className={`${container} mb-[clamp(3.5rem,7vw,6.25rem)] grid items-center gap-10 overflow-hidden rounded-[32px] bg-[radial-gradient(circle_at_82%_30%,rgba(110,231,183,.18),transparent_24%),#12211b] p-[clamp(2.5rem,6vw,4.8rem)] text-white xl:grid-cols-[minmax(0,1fr)_auto]`}
    >
      <div>
        <p className="m-0 text-xs font-bold uppercase tracking-[0.1em] text-emerald-300">
          {APP_TAGLINE}
        </p>
        <h2 className="mt-3 max-w-4xl text-balance text-[clamp(2.2rem,3.6vw,4rem)] font-[710] leading-[1.02] tracking-[-0.055em]">
          Bring scattered work into one connected system.
        </h2>
        <span className="mt-5 block max-w-3xl text-base leading-7 text-slate-300">
          Start with the Jalvoro workspace that solves today&apos;s problem and
          keep room for tomorrow&apos;s growth.
        </span>
      </div>

      <Link
        href="/start"
        prefetch={false}
        className={`inline-flex min-h-14 items-center justify-center gap-2.5 rounded-2xl bg-white px-6 text-sm font-bold text-[#12211b] transition hover:-translate-y-0.5 hover:bg-emerald-50 ${focus}`}
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
    <footer className="border-t border-[#12211b]/10 bg-[#f1f5f2]">
      <div className={`${container} grid min-h-[180px] items-center gap-8 py-10 md:grid-cols-[1fr_auto] xl:grid-cols-[1fr_auto_auto] xl:gap-12`}>
        <div>
          <BrandMark />
          <p className="mt-2.5 text-xs text-slate-500">{APP_TAGLINE}</p>
        </div>

        <nav
          className="flex flex-wrap gap-4 text-xs font-medium text-slate-500 sm:gap-6"
          aria-label="Footer navigation"
        >
          <Link
            href="/support"
            className={`inline-flex min-h-12 items-center ${focus}`}
          >
            Support
          </Link>
          <Link
            href="/privacy"
            className={`inline-flex min-h-12 items-center ${focus}`}
          >
            Privacy
          </Link>
          <Link
            href="/terms"
            className={`inline-flex min-h-12 items-center ${focus}`}
          >
            Terms
          </Link>
        </nav>

        <small className="text-xs text-slate-500 md:col-span-2 xl:col-span-1">
          © {year} {APP_NAME}. All rights reserved.
        </small>
      </div>
    </footer>
  );
}
