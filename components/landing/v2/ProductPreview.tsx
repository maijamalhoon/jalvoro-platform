"use client";

import Link from "next/link";
import { useState, type KeyboardEvent } from "react";
import {
  ArrowRight,
  BarChart3,
  Building2,
  CheckCircle2,
  CircleDollarSign,
  PackageSearch,
  ShoppingCart,
  Users,
  WalletCards,
  type LucideIcon,
} from "lucide-react";

import { focus } from "@/components/landing/v2/config";

type ProductPreview = {
  id: "personal" | "pos" | "business";
  label: string;
  kicker: string;
  title: string;
  description: string;
  icon: LucideIcon;
  href: string;
  cta: string;
  headlineLabel: string;
  headlineValue: string;
  headlineDetail: string;
  metrics: readonly {
    label: string;
    value: string;
    detail: string;
  }[];
  rows: readonly {
    label: string;
    detail: string;
    value: string;
    icon: LucideIcon;
  }[];
};

const previews: readonly ProductPreview[] = [
  {
    id: "personal",
    label: "Personal",
    kicker: "Personal finance",
    title: "See your complete money picture",
    description:
      "Keep accounts, spending, goals, liabilities, and AI-assisted insights inside one private Individual workspace.",
    icon: WalletCards,
    href: "/individual/signup?source=landing-personal",
    cta: "Start with Personal",
    headlineLabel: "Illustrative net worth",
    headlineValue: "PKR 224,800",
    headlineDetail: "PKR 19,400 higher this month",
    metrics: [
      { label: "Income", value: "PKR 185,000", detail: "Salary + side income" },
      { label: "Spending", value: "PKR 112,600", detail: "61% of income" },
      { label: "Saved", value: "PKR 72,400", detail: "39% savings rate" },
    ],
    rows: [
      {
        label: "Primary bank",
        detail: "Available balance",
        value: "PKR 126,800",
        icon: CircleDollarSign,
      },
      {
        label: "Emergency fund",
        detail: "72% of target",
        value: "PKR 360,000",
        icon: CheckCircle2,
      },
      {
        label: "Spending insight",
        detail: "Below recent average",
        value: "−11%",
        icon: BarChart3,
      },
    ],
  },
  {
    id: "pos",
    label: "Retail POS",
    kicker: "Retail and counters",
    title: "Run every sale with less friction",
    description:
      "Connect checkout, returns, payments, daily cash, and stock movement without rebuilding the workflow later.",
    icon: ShoppingCart,
    href: "/business/register?product=retail_pos&source=landing-pos",
    cta: "Set up Retail POS",
    headlineLabel: "Illustrative sales today",
    headlineValue: "PKR 184,250",
    headlineDetail: "8.6% above today’s target",
    metrics: [
      { label: "Orders", value: "126", detail: "Average ticket PKR 1,462" },
      { label: "Card / wallet", value: "54%", detail: "PKR 99,495" },
      { label: "Cash", value: "46%", detail: "PKR 84,755" },
    ],
    rows: [
      {
        label: "Top selling line",
        detail: "24 units sold",
        value: "PKR 31,200",
        icon: ShoppingCart,
      },
      {
        label: "Stock attention",
        detail: "12 low-stock items",
        value: "Review",
        icon: PackageSearch,
      },
      {
        label: "Closing cash",
        detail: "Expected drawer amount",
        value: "PKR 84,755",
        icon: CheckCircle2,
      },
    ],
  },
  {
    id: "business",
    label: "Business",
    kicker: "Growing operations",
    title: "Keep money, customers, and teams aligned",
    description:
      "Bring accounting, CRM, inventory, payroll, branches, approvals, and reporting into one organization-controlled workspace.",
    icon: Building2,
    href: "/business/register?product=growing_business&source=landing-business",
    cta: "Explore Business",
    headlineLabel: "Illustrative operating profit",
    headlineValue: "PKR 680,000",
    headlineDetail: "12.3% operating margin",
    metrics: [
      { label: "Revenue", value: "PKR 5.52m", detail: "Current period" },
      { label: "Pipeline", value: "PKR 1.92m", detail: "18 opportunities" },
      { label: "Reconciled", value: "98%", detail: "148 of 151 entries" },
    ],
    rows: [
      {
        label: "Receivables",
        detail: "7 invoices outstanding",
        value: "PKR 462k",
        icon: CircleDollarSign,
      },
      {
        label: "Customer follow-ups",
        detail: "5 due today",
        value: "Open",
        icon: Users,
      },
      {
        label: "Pending approvals",
        detail: "2 require action today",
        value: "6 total",
        icon: CheckCircle2,
      },
    ],
  },
];

export function HeroUseCaseCarousel() {
  const [activeId, setActiveId] = useState<ProductPreview["id"]>("personal");
  const active = previews.find((preview) => preview.id === activeId) ?? previews[0];
  const ActiveIcon = active.icon;

  const focusTab = (id: ProductPreview["id"]) => {
    window.requestAnimationFrame(() => {
      document.getElementById(`product-tab-${id}`)?.focus();
    });
  };

  const handleTabKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    currentIndex: number,
  ) => {
    let nextIndex: number | null = null;

    if (event.key === "ArrowRight") {
      nextIndex = (currentIndex + 1) % previews.length;
    } else if (event.key === "ArrowLeft") {
      nextIndex = (currentIndex - 1 + previews.length) % previews.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = previews.length - 1;
    }

    if (nextIndex === null) return;

    event.preventDefault();
    const nextPreview = previews[nextIndex];
    setActiveId(nextPreview.id);
    focusTab(nextPreview.id);
  };

  return (
    <figure className="jv-enter-late m-0 min-w-0">
      <div className="mb-4 grid gap-4 px-1 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div>
          <p className="m-0 text-xs font-bold uppercase tracking-[0.12em] text-success">
            Three focused starting points
          </p>
          <strong className="mt-1 block text-base text-text-primary sm:text-lg">
            Preview the workspace that matches today’s job
          </strong>
        </div>

        <div
          className="grid grid-cols-3 gap-1 rounded-2xl border border-border bg-surface-soft p-1"
          role="tablist"
          aria-label="Jalvoro product previews"
          aria-orientation="horizontal"
        >
          {previews.map((preview, index) => (
            <button
              key={preview.id}
              id={`product-tab-${preview.id}`}
              type="button"
              role="tab"
              tabIndex={activeId === preview.id ? 0 : -1}
              aria-selected={activeId === preview.id}
              aria-controls={`product-panel-${preview.id}`}
              onClick={() => setActiveId(preview.id)}
              onKeyDown={(event) => handleTabKeyDown(event, index)}
              className={`min-h-11 rounded-xl px-3 text-xs font-bold transition sm:px-4 sm:text-sm ${focus} ${
                activeId === preview.id
                  ? "bg-card text-text-primary shadow-theme"
                  : "text-text-muted hover:text-text-primary"
              }`}
            >
              {preview.label}
            </button>
          ))}
        </div>
      </div>

      <section
        key={active.id}
        id={`product-panel-${active.id}`}
        role="tabpanel"
        tabIndex={0}
        aria-labelledby={`product-tab-${active.id}`}
        aria-describedby="product-preview-note"
        className="jv-product-preview jv-preview-enter relative overflow-hidden rounded-[30px] border border-border bg-card p-5 text-text-primary shadow-premium sm:p-6 lg:p-7"
      >
        <span
          className="pointer-events-none absolute -right-24 -top-24 size-64 rounded-full bg-success-soft/80 blur-3xl"
          aria-hidden="true"
        />

        <div className="relative flex items-start justify-between gap-4">
          <span className="grid size-12 shrink-0 place-items-center rounded-[15px] bg-success-soft text-success">
            <ActiveIcon className="size-[22px]" aria-hidden="true" />
          </span>
          <span className="rounded-full border border-border bg-surface-soft px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-text-muted">
            {active.kicker}
          </span>
        </div>

        <div className="relative mt-5 grid gap-5 xl:grid-cols-[minmax(0,.8fr)_minmax(0,1.2fr)] xl:items-start">
          <div>
            <h3 className="text-[clamp(1.45rem,2.2vw,2rem)] font-bold leading-[1.08] tracking-[-0.04em] text-text-primary">
              {active.title}
            </h3>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-text-secondary">
              {active.description}
            </p>

            <div className="mt-5 rounded-2xl border border-border bg-surface-soft p-5">
              <span className="text-xs font-semibold uppercase tracking-[0.08em] text-text-muted">
                {active.headlineLabel}
              </span>
              <strong className="mt-2 block text-[clamp(2rem,3vw,2.8rem)] tracking-[-0.045em] text-text-primary">
                {active.headlineValue}
              </strong>
              <span className="mt-2 flex items-center gap-2 text-sm font-semibold text-success">
                <BarChart3 className="size-4" aria-hidden="true" />
                {active.headlineDetail}
              </span>
            </div>
          </div>

          <div className="grid gap-3">
            <div className="grid gap-2 sm:grid-cols-3">
              {active.metrics.map((metric) => (
                <div
                  key={metric.label}
                  className="rounded-2xl border border-border/70 bg-surface-soft p-4"
                >
                  <span className="text-xs font-semibold uppercase tracking-[0.06em] text-text-muted">
                    {metric.label}
                  </span>
                  <strong className="mt-2 block text-base text-text-primary">
                    {metric.value}
                  </strong>
                  <small className="mt-1 block text-xs leading-5 text-text-muted">
                    {metric.detail}
                  </small>
                </div>
              ))}
            </div>

            <div className="grid gap-2">
              {active.rows.map((row) => {
                const RowIcon = row.icon;
                return (
                  <div
                    key={row.label}
                    className="grid grid-cols-[38px_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-border/70 bg-card p-3.5"
                  >
                    <span className="grid size-[38px] place-items-center rounded-xl bg-success-soft text-success">
                      <RowIcon className="size-[18px]" aria-hidden="true" />
                    </span>
                    <span className="min-w-0">
                      <b className="block truncate text-sm text-text-primary">
                        {row.label}
                      </b>
                      <small className="mt-0.5 block truncate text-xs text-text-muted">
                        {row.detail}
                      </small>
                    </span>
                    <strong className="text-right text-xs text-text-primary sm:text-sm">
                      {row.value}
                    </strong>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="relative mt-5 flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p id="product-preview-note" className="text-xs leading-5 text-text-muted">
            Realistic illustrative data only. No live customer information is shown.
          </p>
          <Link
            href={active.href}
            prefetch={false}
            className={`inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-text-primary px-4 text-sm font-bold text-text-inverse transition hover:-translate-y-0.5 hover:opacity-90 ${focus}`}
          >
            {active.cta}
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </section>
    </figure>
  );
}
