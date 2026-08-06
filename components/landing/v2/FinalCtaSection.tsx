import { ArrowRight } from "lucide-react";

import { container, focus } from "@/components/landing/v2/config";
import { APP_TAGLINE } from "@/lib/brand";

export function FinalCtaSection() {
  return (
    <section
      className={`${container} jv-inverse-panel mb-[clamp(3.5rem,7vw,6.25rem)] grid items-center gap-10 overflow-hidden rounded-[32px] bg-[#12211b] p-[clamp(2.5rem,6vw,4.8rem)] shadow-premium dark:border dark:border-white/10 dark:bg-[#0b1320] xl:grid-cols-[minmax(0,1fr)_auto]`}
    >
      <div className="relative">
        <span
          className="pointer-events-none absolute -left-16 -top-24 size-56 rounded-full bg-emerald-300/10 blur-3xl"
          aria-hidden="true"
        />
        <p className="relative m-0 text-xs font-bold uppercase tracking-[0.1em] text-emerald-300">
          {APP_TAGLINE}
        </p>
        <h2 className="relative mt-3 max-w-4xl text-balance text-[clamp(2.2rem,3.6vw,4rem)] font-[710] leading-[1.02] tracking-[-0.055em]">
          Start with one focused workspace—not a complicated system.
        </h2>
        <span className="jv-inverse-muted relative mt-5 block max-w-3xl text-base leading-7">
          Choose Personal, Retail POS, or Business now. Add deeper tools only
          when the work actually requires them.
        </span>
      </div>

      <a
        href="#workspaces"
        className={`jv-inverse-action inline-flex min-h-14 w-full items-center justify-center gap-2.5 rounded-2xl px-6 text-sm font-bold shadow-soft transition hover:-translate-y-0.5 sm:w-max xl:min-w-[220px] ${focus}`}
      >
        Choose your workspace
        <ArrowRight className="size-[18px]" aria-hidden="true" />
      </a>
    </section>
  );
}
