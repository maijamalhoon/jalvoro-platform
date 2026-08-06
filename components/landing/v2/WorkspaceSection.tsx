import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";

import { Eyebrow } from "@/components/landing/v2/Eyebrow";
import {
  container,
  focus,
  sectionSpace,
  sectionTitle,
  workspaces,
} from "@/components/landing/v2/config";

export function WorkspaceSection() {
  return (
    <section id="workspaces" className={`${container} ${sectionSpace}`}>
      <div className="grid items-end gap-9 xl:grid-cols-[minmax(0,1.1fr)_minmax(330px,.65fr)] xl:gap-[clamp(3rem,6vw,6rem)]">
        <div>
          <Eyebrow>Three focused starting points</Eyebrow>
          <h2 className={sectionTitle}>
            Choose the workspace that solves today’s job.
          </h2>
        </div>
        <p className="m-0 max-w-3xl text-base leading-7 text-text-secondary">
          Personal, Retail POS, and Business each start with a clear purpose.
          Deeper workflows remain available when the need becomes real.
        </p>
      </div>

      <div className="mt-12 grid gap-4 lg:grid-cols-3">
        {workspaces.map((workspace, index) => {
          const Icon = workspace.icon;
          return (
            <article key={workspace.name} className="h-full">
              <Link
                href={workspace.href}
                prefetch={false}
                className={`group relative flex h-full min-h-[430px] flex-col overflow-hidden rounded-3xl border border-border bg-card p-7 text-text-primary shadow-theme transition duration-300 hover:-translate-y-1 hover:border-border-strong hover:shadow-premium ${focus}`}
                aria-label={`${workspace.cta}: ${workspace.description}`}
              >
                <span
                  className="pointer-events-none absolute -right-20 -top-20 size-52 rounded-full bg-success-soft/80 transition duration-500 group-hover:scale-105"
                  aria-hidden="true"
                />
                <span className="absolute right-6 top-6 z-10 text-xs font-bold text-text-muted/60">
                  0{index + 1}
                </span>
                <span className="relative z-10 grid size-12 place-items-center rounded-[14px] bg-success-soft text-success">
                  <Icon className="size-[22px]" aria-hidden="true" />
                </span>
                <p className="mt-12 text-xs font-semibold text-text-muted">
                  {workspace.label}
                </p>
                <h3 className="mt-2 text-[1.45rem] font-bold tracking-[-0.035em]">
                  {workspace.name}
                </h3>
                <p className="mt-4 text-sm leading-6 text-text-secondary">
                  {workspace.description}
                </p>
                <ul className="mt-7 grid list-none gap-3 border-t border-border pt-6 text-sm font-medium text-text-secondary">
                  {workspace.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2.5">
                      <Check className="size-4 shrink-0 text-success" aria-hidden="true" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <span className="mt-auto flex items-center justify-between gap-3 pt-8 text-sm font-bold text-text-primary">
                  {workspace.cta}
                  <ArrowRight
                    className="size-[18px] transition-transform group-hover:translate-x-1"
                    aria-hidden="true"
                  />
                </span>
              </Link>
            </article>
          );
        })}
      </div>
    </section>
  );
}
