"use client";

import { useEffect, useState } from "react";
import {
  BarChart3,
  BrainCircuit,
  Building2,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Goal,
  PackageSearch,
  ReceiptText,
  ShoppingCart,
  TrendingUp,
  Users,
  WalletCards,
  type LucideIcon,
} from "lucide-react";

type UseCaseId =
  | "overview"
  | "insights"
  | "goals"
  | "pos"
  | "inventory"
  | "crm"
  | "accounting"
  | "team";

type UseCase = {
  id: UseCaseId;
  kicker: string;
  title: string;
  description: string;
  icon: LucideIcon;
  warning?: boolean;
};

const useCases: readonly UseCase[] = [
  {
    id: "overview",
    kicker: "Personal overview",
    title: "See your complete money picture",
    description:
      "Accounts, income, spending, liabilities, and net worth in one private view.",
    icon: WalletCards,
  },
  {
    id: "insights",
    kicker: "Personal insights",
    title: "Understand what changed and why",
    description:
      "Turn verified personal activity into useful guidance without invented data.",
    icon: BrainCircuit,
  },
  {
    id: "goals",
    kicker: "Goals and wealth",
    title: "Track progress without spreadsheets",
    description:
      "Keep goals, investments, and liabilities connected to your real cash flow.",
    icon: Goal,
  },
  {
    id: "pos",
    kicker: "Retail POS",
    title: "Run every sale with less friction",
    description:
      "Connect checkout, returns, payments, daily cash, and stock movement.",
    icon: ShoppingCart,
  },
  {
    id: "inventory",
    kicker: "Inventory control",
    title: "Know what is available and what needs action",
    description:
      "Watch stock movement, low-stock items, and reorder attention in one place.",
    icon: PackageSearch,
    warning: true,
  },
  {
    id: "crm",
    kicker: "Customers and CRM",
    title: "Keep every opportunity moving",
    description:
      "Connect leads, customers, ownership, follow-ups, and pipeline progress.",
    icon: Users,
  },
  {
    id: "accounting",
    kicker: "Accounting and reports",
    title: "Read the numbers behind the work",
    description:
      "Bring revenue, expenses, profit, and reporting into a connected view.",
    icon: BarChart3,
  },
  {
    id: "team",
    kicker: "Teams and approvals",
    title: "Keep people and controls aligned",
    description:
      "Manage roles, payroll status, pending approvals, and operational ownership.",
    icon: Building2,
    warning: true,
  },
];

function CountUp({
  value,
  cycle,
  prefix = "",
  suffix = "",
  decimals = 0,
}: {
  value: number;
  cycle: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
}) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (reduceMotion) {
      setDisplay(value);
      return;
    }

    let frame = 0;
    const startedAt = performance.now();
    const duration = 1050;

    const animate = (time: number) => {
      const progress = Math.min((time - startedAt) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(value * eased);
      if (progress < 1) frame = requestAnimationFrame(animate);
    };

    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [cycle, value]);

  const formatted = new Intl.NumberFormat("en-PK", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(display);

  return (
    <>
      {prefix}
      {formatted}
      {suffix}
    </>
  );
}

function Sparkline() {
  return (
    <svg
      className="mt-3 h-11 w-full overflow-visible text-success"
      viewBox="0 0 220 50"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path
        d="M0 43 C25 39 35 28 55 31 C78 35 91 18 116 22 C139 26 153 8 177 14 C197 19 209 8 220 4"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="3"
        className="jv-spark-line"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

function MiniBars({ warning = false }: { warning?: boolean }) {
  const widths = ["86%", "64%", "42%"];
  return (
    <div className="mt-3 grid gap-2" aria-hidden="true">
      {widths.map((width, index) => (
        <span
          key={width}
          className="jv-mini-bar h-1.5 overflow-hidden rounded-full bg-surface-secondary"
        >
          <span
            className={warning ? "bg-warning" : "bg-success"}
            style={{ width }}
          />
        </span>
      ))}
    </div>
  );
}

function UseCaseData({ id, cycle }: { id: UseCaseId; cycle: number }) {
  switch (id) {
    case "overview":
      return (
        <div className="rounded-2xl border border-border bg-surface-soft p-3.5">
          <span className="text-[10px] font-semibold uppercase tracking-[0.11em] text-text-muted">
            Sample net worth
          </span>
          <strong className="mt-1 block text-[clamp(1.35rem,2vw,1.8rem)] tracking-[-0.045em]">
            <CountUp value={248500} cycle={cycle} prefix="PKR " />
          </strong>
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-success">
            <TrendingUp className="size-3.5" />
            8.4% this month
          </div>
          <Sparkline />
        </div>
      );

    case "insights":
      return (
        <div className="rounded-2xl border border-border bg-surface-soft p-3.5">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[10px] font-semibold uppercase tracking-[0.11em] text-text-muted">
              Verified insight
            </span>
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-success">
              <i className="jv-live-dot size-1.5 rounded-full bg-success" />
              Updated
            </span>
          </div>
          <p className="mt-3 text-sm font-semibold leading-5 text-text-primary">
            Spending is 11% lower than your recent monthly average.
          </p>
          <div className="mt-4 flex items-end justify-between gap-3">
            <span className="text-[11px] text-text-muted">Confidence</span>
            <strong className="text-lg">
              <CountUp value={92} cycle={cycle} suffix="%" />
            </strong>
          </div>
          <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-surface-secondary">
            <span className="block h-full w-[92%] rounded-full bg-success" />
          </span>
        </div>
      );

    case "goals":
      return (
        <div className="grid grid-cols-[88px_minmax(0,1fr)] items-center gap-4 rounded-2xl border border-border bg-surface-soft p-3.5">
          <span
            className="grid aspect-square place-items-center rounded-full p-2"
            style={{
              background:
                "conic-gradient(var(--success) 0 72%, var(--surface-secondary) 72% 100%)",
            }}
          >
            <span className="grid size-full place-items-center rounded-full bg-card text-center">
              <strong className="text-lg leading-none">
                <CountUp value={72} cycle={cycle} suffix="%" />
              </strong>
            </span>
          </span>
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-[0.11em] text-text-muted">
              Emergency fund
            </span>
            <strong className="mt-1 block text-base">
              <CountUp value={360000} cycle={cycle} prefix="PKR " />
            </strong>
            <small className="mt-1 block text-[11px] text-text-muted">
              PKR 500,000 target
            </small>
          </div>
        </div>
      );

    case "pos":
      return (
        <div className="rounded-2xl border border-border bg-surface-soft p-3.5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-[0.11em] text-text-muted">
                Sample sales today
              </span>
              <strong className="mt-1 block text-[clamp(1.35rem,2vw,1.8rem)] tracking-[-0.045em]">
                <CountUp value={18240} cycle={cycle} prefix="PKR " />
              </strong>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-success-soft px-2.5 py-1 text-[10px] font-bold text-success">
              <i className="jv-live-dot size-1.5 rounded-full bg-success" />
              Live
            </span>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <span className="rounded-xl bg-card p-2.5">
              <small className="block text-[10px] text-text-muted">Orders</small>
              <b className="mt-1 block text-sm">
                <CountUp value={126} cycle={cycle} />
              </b>
            </span>
            <span className="rounded-xl bg-card p-2.5">
              <small className="block text-[10px] text-text-muted">Returns</small>
              <b className="mt-1 block text-sm">
                <CountUp value={4} cycle={cycle} />
              </b>
            </span>
          </div>
        </div>
      );

    case "inventory":
      return (
        <div className="rounded-2xl border border-border bg-surface-soft p-3.5">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[10px] font-semibold uppercase tracking-[0.11em] text-text-muted">
              Stock attention
            </span>
            <span className="rounded-full bg-warning-soft px-2.5 py-1 text-[10px] font-bold text-warning">
              Review
            </span>
          </div>
          <strong className="mt-2 block text-[clamp(1.35rem,2vw,1.8rem)] tracking-[-0.045em]">
            <CountUp value={12} cycle={cycle} suffix=" items" />
          </strong>
          <small className="mt-1 block text-[11px] text-text-muted">
            Low stock or reorder threshold reached
          </small>
          <MiniBars warning />
        </div>
      );

    case "crm":
      return (
        <div className="rounded-2xl border border-border bg-surface-soft p-3.5">
          <div className="flex items-end justify-between gap-3">
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-[0.11em] text-text-muted">
                Active leads
              </span>
              <strong className="mt-1 block text-[clamp(1.35rem,2vw,1.8rem)] tracking-[-0.045em]">
                <CountUp value={18} cycle={cycle} />
              </strong>
            </div>
            <span className="text-[11px] font-semibold text-success">5 due today</span>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-1.5 text-center text-[10px] font-semibold">
            <span className="rounded-lg bg-card px-2 py-2 text-text-secondary">
              New 8
            </span>
            <span className="rounded-lg bg-success-soft px-2 py-2 text-success">
              Active 7
            </span>
            <span className="rounded-lg bg-card px-2 py-2 text-text-secondary">
              Won 3
            </span>
          </div>
          <MiniBars />
        </div>
      );

    case "accounting":
      return (
        <div className="rounded-2xl border border-border bg-surface-soft p-3.5">
          <span className="text-[10px] font-semibold uppercase tracking-[0.11em] text-text-muted">
            Sample operating profit
          </span>
          <strong className="mt-1 block text-[clamp(1.35rem,2vw,1.8rem)] tracking-[-0.045em]">
            <CountUp value={68420} cycle={cycle} prefix="PKR " />
          </strong>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <span className="rounded-xl bg-card p-2.5">
              <small className="block text-[10px] text-text-muted">Revenue</small>
              <b className="mt-1 block text-xs">PKR 184k</b>
            </span>
            <span className="rounded-xl bg-card p-2.5">
              <small className="block text-[10px] text-text-muted">Expenses</small>
              <b className="mt-1 block text-xs">PKR 116k</b>
            </span>
          </div>
          <MiniBars />
        </div>
      );

    case "team":
      return (
        <div className="rounded-2xl border border-border bg-surface-soft p-3.5">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[10px] font-semibold uppercase tracking-[0.11em] text-text-muted">
              Pending approvals
            </span>
            <Clock3 className="size-4 text-warning" />
          </div>
          <strong className="mt-2 block text-[clamp(1.35rem,2vw,1.8rem)] tracking-[-0.045em]">
            <CountUp value={6} cycle={cycle} />
          </strong>
          <div className="mt-3 flex -space-x-2" aria-hidden="true">
            {["JM", "SA", "AK", "HM"].map((initials) => (
              <span
                key={initials}
                className="grid size-8 place-items-center rounded-full border-2 border-card bg-success-soft text-[9px] font-bold text-success"
              >
                {initials}
              </span>
            ))}
          </div>
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-card px-3 py-2 text-[11px] font-semibold text-text-secondary">
            <CheckCircle2 className="size-4 text-success" />
            Payroll checks ready
          </div>
        </div>
      );
  }
}

function UseCaseCard({
  card,
  cycle,
}: {
  card: UseCase;
  cycle: number;
}) {
  const Icon = card.icon;

  return (
    <article className="jv-usecase-card relative flex h-[246px] w-[min(82vw,282px)] shrink-0 flex-col overflow-hidden rounded-[26px] border border-border bg-card p-5 text-text-primary sm:h-[280px] sm:w-[300px] xl:h-[310px] xl:w-[320px]">
      <span
        className={`absolute -right-14 -top-14 size-36 rounded-full blur-2xl ${
          card.warning ? "bg-warning-soft" : "bg-success-soft"
        }`}
        aria-hidden="true"
      />

      <div className="relative flex items-start justify-between gap-3">
        <span
          className={`grid size-11 place-items-center rounded-[14px] ${
            card.warning
              ? "bg-warning-soft text-warning"
              : "bg-success-soft text-success"
          }`}
        >
          <Icon className="size-5" />
        </span>
        <span className="rounded-full border border-border bg-surface-soft px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.1em] text-text-muted">
          {card.kicker}
        </span>
      </div>

      <h3 className="relative mt-4 text-[1.05rem] font-bold leading-[1.18] tracking-[-0.025em] sm:text-[1.15rem]">
        {card.title}
      </h3>
      <p className="jv-card-description relative mt-2 text-xs leading-5 text-text-secondary">
        {card.description}
      </p>

      <div className="relative mt-auto pt-4">
        <UseCaseData id={card.id} cycle={cycle} />
      </div>
    </article>
  );
}

export function HeroUseCaseCarousel() {
  const [cycle, setCycle] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const interval = window.setInterval(
      () => setCycle((current) => current + 1),
      12000,
    );
    return () => window.clearInterval(interval);
  }, []);

  return (
    <figure className="jv-enter-late m-0 min-w-0">
      <div className="mb-3 flex items-end justify-between gap-4 px-1 sm:mb-4">
        <div>
          <p className="m-0 text-[10px] font-bold uppercase tracking-[0.12em] text-success">
            Eight connected use cases
          </p>
          <strong className="mt-1 block text-sm text-text-primary sm:text-base">
            See where Jalvoro can fit into your day
          </strong>
        </div>
        <span className="hidden items-center gap-2 text-[10px] font-semibold text-text-muted sm:inline-flex">
          <i className="jv-live-dot size-1.5 rounded-full bg-success" />
          Auto preview
        </span>
      </div>

      <div
        className="jv-usecase-viewport rounded-[28px] py-1 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-focus-ring/25"
        tabIndex={0}
        role="region"
        aria-roledescription="carousel"
        aria-label="Eight animated Jalvoro use cases. Animation pauses while focused or hovered."
      >
        <div className="jv-usecase-track">
          <div className="flex gap-3 pr-3 sm:gap-4 sm:pr-4">
            {useCases.map((card) => (
              <UseCaseCard key={card.id} card={card} cycle={cycle} />
            ))}
          </div>
          <div
            className="jv-usecase-copy flex gap-3 pr-3 sm:gap-4 sm:pr-4"
            aria-hidden="true"
          >
            {useCases.map((card) => (
              <UseCaseCard
                key={`copy-${card.id}`}
                card={card}
                cycle={cycle}
              />
            ))}
          </div>
        </div>
      </div>

      <figcaption className="mt-2 px-1 text-[10px] leading-4 text-text-muted sm:text-[11px]">
        Illustrative interface and sample values only. No live customer data is
        shown.
      </figcaption>
    </figure>
  );
}
