import {
  ArrowRight,
  BarChart3,
  Boxes,
  Check,
  CircleDollarSign,
  Database,
  FileBarChart,
  LayoutDashboard,
  ReceiptText,
  ShieldCheck,
  ShoppingCart,
  TrendingUp,
  Users,
  type LucideIcon,
} from "lucide-react";

import { Eyebrow } from "@/components/landing/v2/Eyebrow";
import {
  capabilityGroups,
  container,
  sectionSpace,
  sectionTitle,
  workspaces,
} from "@/components/landing/v2/config";

export function TrustRail() {
  const items = [
    [
      Database,
      "Record once",
      "Keep each verified activity connected to the records that depend on it.",
    ],
    [
      LayoutDashboard,
      "See clearly",
      "Understand money and operations without noisy dashboards.",
    ],
    [
      TrendingUp,
      "Scale naturally",
      "Add workflows and controls only when you need them.",
    ],
  ] as const;

  return (
    <section className="border-y border-border bg-surface-glass">
      <div className={`${container} grid lg:grid-cols-3`}>
        {items.map(([Icon, title, copy], index) => {
          const RailIcon = Icon as LucideIcon;
          return (
            <article
              key={title}
              className={`flex items-center gap-4 border-b border-border py-5 lg:min-h-32 lg:border-b-0 lg:px-10 ${
                index < 2 ? "lg:border-r" : ""
              } ${index === 0 ? "lg:pl-0" : ""}`}
            >
              <RailIcon className="size-6 shrink-0 text-success" />
              <span className="grid gap-1">
                <strong className="text-sm text-text-primary">{title}</strong>
                <small className="text-xs leading-5 text-text-muted">
                  {copy}
                </small>
              </span>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export function WorkspaceSection() {
  return (
    <section id="workspaces" className={`${container} ${sectionSpace}`}>
      <div className="grid items-end gap-9 xl:grid-cols-[minmax(0,1.1fr)_minmax(330px,.65fr)] xl:gap-[clamp(3rem,6vw,6rem)]">
        <div>
          <Eyebrow>One ecosystem, focused layers</Eyebrow>
          <h2 className={sectionTitle}>
            Start with the part of Jalvoro you need today.
          </h2>
        </div>
        <p className="m-0 max-w-3xl text-base leading-7 text-text-secondary">
          Choose a focused workspace now, then add deeper workflows and
          controls only when your needs grow.
        </p>
      </div>

      <div className="mt-12 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {workspaces.map((workspace, index) => {
          const Icon = workspace.icon;
          return (
            <article
              key={workspace.name}
              className="group relative flex min-h-[420px] flex-col overflow-hidden rounded-3xl border border-border bg-card p-7 text-text-primary shadow-theme transition duration-300 hover:-translate-y-1 hover:border-border-strong hover:shadow-premium"
            >
              <span className="absolute -right-20 -top-20 size-52 rounded-full bg-success-soft/80 transition duration-500 group-hover:scale-105" />
              <span className="absolute right-6 top-6 z-10 text-[11px] font-bold text-text-muted/55">
                0{index + 1}
              </span>
              <span className="relative z-10 grid size-12 place-items-center rounded-[14px] bg-success-soft text-success">
                <Icon className="size-[22px]" />
              </span>
              <p className="mt-12 text-xs font-semibold text-text-muted">
                {workspace.label}
              </p>
              <h3 className="mt-2 text-[1.4rem] font-bold tracking-[-0.035em]">
                {workspace.name}
              </h3>
              <p className="mt-4 text-sm leading-6 text-text-secondary">
                {workspace.description}
              </p>
              <ul className="mt-auto grid list-none gap-3 border-t border-border pt-6 text-xs font-medium text-text-secondary">
                {workspace.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2.5">
                    <Check className="size-3.5 shrink-0 text-success" />
                    {feature}
                  </li>
                ))}
              </ul>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export function WorkflowSection() {
  const points = [
    [
      ReceiptText,
      "Fewer duplicate entries",
      "Connected records reduce repeated manual work.",
    ],
    [
      FileBarChart,
      "Reports with context",
      "Every summary stays tied to the activity behind it.",
    ],
    [
      ShieldCheck,
      "Honest system states",
      "Unavailable or partial data is labelled instead of fabricated.",
    ],
  ] as const;

  const outcomes = [
    [CircleDollarSign, "Cash reflected"],
    [Users, "Customer history"],
    [BarChart3, "Report refreshed"],
  ] as const;

  return (
    <section className={`border-y border-border bg-surface-primary ${sectionSpace}`}>
      <div className={`${container} grid items-center gap-14 xl:grid-cols-[minmax(0,.82fr)_minmax(500px,1.18fr)] xl:gap-[clamp(4rem,7vw,7rem)]`}>
        <div>
          <Eyebrow>Built around the work</Eyebrow>
          <h2 className={sectionTitle}>
            Designed around what you actually need to do.
          </h2>
          <p className="mt-6 max-w-2xl text-base leading-7 text-text-secondary">
            Jalvoro connects the actions behind the numbers: record money,
            sell products, move stock, follow customers, approve work, and
            understand results.
          </p>
          <div className="mt-8 grid gap-5">
            {points.map(([Icon, title, copy]) => {
              const PointIcon = Icon as LucideIcon;
              return (
                <span
                  key={title}
                  className="grid grid-cols-[42px_minmax(0,1fr)] items-center gap-x-3.5"
                >
                  <PointIcon className="row-span-2 size-[42px] rounded-xl bg-success-soft p-3 text-success" />
                  <b className="text-sm text-text-primary">{title}</b>
                  <small className="mt-0.5 text-xs leading-5 text-text-muted">
                    {copy}
                  </small>
                </span>
              );
            })}
          </div>
        </div>

        <div className="relative overflow-hidden rounded-[30px] border border-border bg-surface-soft p-[clamp(1.5rem,4vw,3.4rem)] shadow-theme">
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,color-mix(in_srgb,var(--success),transparent_90%),transparent_38%)]"
            aria-hidden="true"
          />
          <div className="relative grid items-center gap-4 md:grid-cols-[1fr_auto_1fr]">
            <span className="flex min-h-[72px] items-center justify-center gap-2.5 rounded-2xl border border-border bg-card p-4 text-center text-xs font-bold text-text-primary shadow-theme">
              <ShoppingCart className="size-5 text-success" />
              Sale recorded
            </span>
            <ArrowRight className="mx-auto size-5 rotate-90 text-success md:rotate-0" />
            <span className="flex min-h-[72px] items-center justify-center gap-2.5 rounded-2xl border border-border bg-card p-4 text-center text-xs font-bold text-text-primary shadow-theme">
              <Boxes className="size-5 text-success" />
              Stock updated
            </span>
          </div>

          <div className="relative my-5 grid gap-2.5 md:grid-cols-3">
            {outcomes.map(([Icon, label]) => {
              const FlowIcon = Icon as LucideIcon;
              return (
                <span
                  key={label}
                  className="flex min-h-20 items-center justify-center gap-2 rounded-2xl border border-border bg-card p-3 text-center text-xs font-bold text-text-primary"
                >
                  <FlowIcon className="size-5 text-success" />
                  {label}
                </span>
              );
            })}
          </div>

          <div className="jv-inverse-panel relative mx-auto flex max-w-xl items-center gap-3 rounded-2xl bg-[#12211b] p-4 shadow-premium dark:bg-[#0b1320]">
            <FileBarChart className="size-7 shrink-0 text-emerald-300" />
            <div className="grid gap-1">
              <small className="jv-inverse-muted text-[10px]">
                Connected reporting
              </small>
              <strong className="text-xs leading-5">
                One action. Every relevant record stays connected.
              </strong>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function HowItWorksSection() {
  const steps = [
    [
      "01",
      "Choose a workspace",
      "Begin with Personal, POS, or Business based on the job you need to solve first.",
    ],
    [
      "02",
      "Bring the essentials",
      "Add the accounts, products, customers, or operational records that matter now.",
    ],
    [
      "03",
      "Run daily work",
      "Use focused workflows instead of jumping between disconnected tools and spreadsheets.",
    ],
    [
      "04",
      "Add the next layer",
      "Expand into inventory, CRM, ERP, reporting, and controls when the need becomes real.",
    ],
  ] as const;

  return (
    <section id="how-it-works" className={`${container} ${sectionSpace}`}>
      <div className="mx-auto max-w-4xl text-center">
        <Eyebrow>How it works</Eyebrow>
        <h2 className={sectionTitle}>
          From scattered tools to one clear operating system.
        </h2>
        <p className="mx-auto mt-6 max-w-3xl text-base leading-7 text-text-secondary">
          Jalvoro grows in layers, so setup stays understandable and the
          product never becomes heavier than the work requires.
        </p>
      </div>

      <div className="mt-14 grid gap-3 md:grid-cols-2 xl:grid-cols-4 xl:gap-0 xl:border-y xl:border-border">
        {steps.map(([number, title, copy], index) => (
          <article
            key={number}
            className={`min-h-[240px] rounded-2xl border border-border bg-card/40 p-7 xl:min-h-[280px] xl:rounded-none xl:border-y-0 xl:border-l-0 xl:bg-transparent xl:p-8 ${
              index < 3 ? "xl:border-r" : "xl:border-r-0"
            }`}
          >
            <span className="text-xs font-bold text-success">{number}</span>
            <h3 className="mt-12 text-lg font-bold tracking-tight text-text-primary xl:mt-16">
              {title}
            </h3>
            <p className="mt-3 text-sm leading-6 text-text-secondary">{copy}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export function CoverageSection() {
  return (
    <section
      className={`jv-inverse-panel bg-[#12211b] dark:bg-[#0b1320] ${sectionSpace}`}
    >
      <div className={container}>
        <div className="grid items-end gap-9 xl:grid-cols-[minmax(0,1.1fr)_minmax(330px,.65fr)] xl:gap-[clamp(3rem,6vw,6rem)]">
          <div>
            <p className="m-0 text-xs font-bold uppercase tracking-[0.12em] text-emerald-300">
              Platform coverage
            </p>
            <h2 className="mt-3 text-balance text-[clamp(2.35rem,4vw,4.5rem)] font-[710] leading-[1.02] tracking-[-0.055em]">
              Personal finance and business operations—designed as one
              ecosystem.
            </h2>
          </div>
          <p className="jv-inverse-muted m-0 text-base leading-7">
            Choose one starting point while Personal and Business data,
            permissions, and workflows remain clearly separated.
          </p>
        </div>

        <div className="mt-12 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {capabilityGroups.map(([Icon, title, items]) => {
            const GroupIcon = Icon as LucideIcon;
            return (
              <article
                key={title}
                className="min-h-[320px] rounded-3xl border border-white/10 bg-white/[0.045] p-7 dark:bg-white/[0.035]"
              >
                <span className="grid size-11 place-items-center rounded-[13px] bg-emerald-300/10 text-emerald-300">
                  <GroupIcon className="size-5" />
                </span>
                <h3 className="mt-12 text-xl font-bold">{title}</h3>
                <ul className="jv-inverse-muted mt-5 grid list-none gap-3 text-sm">
                  {items.map((item) => (
                    <li
                      key={item}
                      className="before:mr-2.5 before:text-emerald-300 before:content-['•']"
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
