"use client";

import { useEffect, useState, type CSSProperties } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  BrainCircuit,
  Building2,
  CheckCircle2,
  Clock3,
  Goal,
  PackageSearch,
  ShoppingCart,
  TrendingDown,
  TrendingUp,
  Users,
  WalletCards,
  type LucideIcon,
} from "lucide-react";

type Tone = "success" | "warning";
type TrendDirection = "up" | "down";

type UseCase = {
  id: string;
  kicker: string;
  title: string;
  description: string;
  icon: LucideIcon;
  tone?: Tone;
  headlineLabel: string;
  headlineValue: number;
  headlinePrefix?: string;
  headlineSuffix?: string;
  headlineDecimals?: number;
  trend: string;
  trendDirection?: TrendDirection;
  progress?: number;
  metrics: readonly [string, string, string?][];
  rows: readonly [string, string, string, Tone?][];
};

const useCases: readonly UseCase[] = [
  {
    id: "overview",
    kicker: "Personal overview",
    title: "See your complete money picture",
    description:
      "Accounts, spending, liabilities, savings, and net worth in one private view.",
    icon: WalletCards,
    headlineLabel: "Illustrative net worth",
    headlineValue: 248500,
    headlinePrefix: "PKR ",
    trend: "PKR 19,400 higher this month",
    metrics: [
      ["Income", "PKR 185,000", "Salary + side income"],
      ["Spending", "PKR 112,600", "61% of income"],
      ["Saved", "PKR 72,400", "39% savings rate"],
    ],
    rows: [
      ["Primary bank", "Available balance", "PKR 126,800"],
      ["Savings account", "Emergency reserve", "PKR 152,000"],
      ["Credit card", "Payment due in 8 days", "PKR 54,000", "warning"],
    ],
  },
  {
    id: "insights",
    kicker: "Personal insights",
    title: "Understand what changed and why",
    description:
      "Turn verified personal activity into useful guidance without invented data.",
    icon: BrainCircuit,
    headlineLabel: "Spending below recent average",
    headlineValue: 11,
    headlineSuffix: "%",
    trend: "92% confidence from verified records",
    trendDirection: "down",
    progress: 92,
    metrics: [
      ["Dining", "−PKR 6,240", "Largest reduction"],
      ["Transport", "−PKR 3,180", "Fuel + rides"],
      ["Categorized", "96%", "Transactions covered"],
    ],
    rows: [
      ["Essential bills", "Within normal range", "On track"],
      ["Subscriptions", "One possible duplicate", "Review", "warning"],
      ["Unverified records", "Need confirmation", "2", "warning"],
    ],
  },
  {
    id: "goals",
    kicker: "Goals and wealth",
    title: "Track progress without spreadsheets",
    description:
      "Keep goals, investments, and liabilities connected to real cash flow.",
    icon: Goal,
    headlineLabel: "Emergency fund complete",
    headlineValue: 72,
    headlineSuffix: "%",
    trend: "PKR 360,000 of PKR 500,000",
    progress: 72,
    metrics: [
      ["Home deposit", "38%", "PKR 760,000 saved"],
      ["Debt cleared", "61%", "PKR 94,000 remains"],
      ["Coverage", "4.8 mo", "Essential expenses"],
    ],
    rows: [
      ["Next contribution", "Emergency fund · 5 Sep", "PKR 25,000"],
      ["Investment plan", "Monthly contribution", "PKR 18,000"],
      ["Debt payment", "Scheduled · 12 Sep", "PKR 16,500"],
    ],
  },
  {
    id: "pos",
    kicker: "Retail POS",
    title: "Run every sale with less friction",
    description:
      "Connect checkout, returns, payments, daily cash, and stock movement.",
    icon: ShoppingCart,
    headlineLabel: "Illustrative sales today",
    headlineValue: 184250,
    headlinePrefix: "PKR ",
    trend: "8.6% above today’s target",
    metrics: [
      ["Orders", "126", "Average ticket PKR 1,462"],
      ["Card/wallet", "54%", "PKR 99,495"],
      ["Cash", "46%", "PKR 84,755"],
    ],
    rows: [
      ["Top selling line", "24 units sold", "PKR 31,200"],
      ["Returns", "4 completed today", "PKR 5,840", "warning"],
      ["Closing cash", "Expected drawer amount", "PKR 84,755"],
    ],
  },
  {
    id: "inventory",
    kicker: "Inventory control",
    title: "Know what is available and what needs action",
    description:
      "Watch stock movement, low-stock items, and reorder attention in one place.",
    icon: PackageSearch,
    tone: "warning",
    headlineLabel: "Items needing attention",
    headlineValue: 15,
    headlineSuffix: " items",
    trend: "12 low stock · 3 out of stock",
    trendDirection: "down",
    progress: 94.7,
    metrics: [
      ["Active SKUs", "1,248", "Across all locations"],
      ["Stock value", "PKR 2.84m", "Illustrative estimate"],
      ["Stock health", "94.7%", "Within threshold"],
    ],
    rows: [
      ["Oil filter — standard", "Reorder point: 18", "9 left", "warning"],
      ["Brake pad set", "Reorder point: 10", "4 left", "warning"],
      ["Coolant 1 litre", "Delivery expected Friday", "0 left", "warning"],
    ],
  },
  {
    id: "crm",
    kicker: "Customers and CRM",
    title: "Keep every opportunity moving",
    description:
      "Connect leads, customers, ownership, follow-ups, and pipeline progress.",
    icon: Users,
    headlineLabel: "Illustrative active pipeline",
    headlineValue: 1920000,
    headlinePrefix: "PKR ",
    trend: "18 opportunities · 5 due today",
    progress: 68,
    metrics: [
      ["New", "8", "Recently added"],
      ["Qualified", "7", "Active evaluation"],
      ["Won", "3", "24.6% conversion"],
    ],
    rows: [
      ["North branch setup", "Proposal review · due today", "PKR 420k"],
      ["Retail expansion", "Follow-up · 2:30 PM", "PKR 285k", "warning"],
      ["Annual service plan", "Contract approved", "PKR 180k"],
    ],
  },
  {
    id: "accounting",
    kicker: "Accounting and reports",
    title: "Read the numbers behind the work",
    description:
      "Bring revenue, expenses, profit, reconciliation, and reporting together.",
    icon: BarChart3,
    headlineLabel: "Illustrative operating profit",
    headlineValue: 684200,
    headlinePrefix: "PKR ",
    trend: "12.4% operating margin",
    metrics: [
      ["Revenue", "PKR 5.52m", "Current period"],
      ["Expenses", "PKR 4.84m", "Current period"],
      ["Reconciled", "98%", "148 of 151 entries"],
    ],
    rows: [
      ["Receivables", "7 invoices outstanding", "PKR 462k", "warning"],
      ["Payables", "4 bills due this week", "PKR 278k", "warning"],
      ["Bank reconciliation", "3 entries to review", "98%"],
    ],
  },
  {
    id: "team",
    kicker: "Teams and approvals",
    title: "Keep people and controls aligned",
    description:
      "Manage roles, payroll status, pending approvals, and operational ownership.",
    icon: Building2,
    tone: "warning",
    headlineLabel: "Pending approvals",
    headlineValue: 6,
    trend: "2 require action today",
    trendDirection: "down",
    progress: 91,
    metrics: [
      ["Team", "24", "Active members"],
      ["Present", "22", "Today’s attendance"],
      ["Payroll", "Ready", "24 records checked"],
    ],
    rows: [
      ["Supplier payment", "Finance approval required", "PKR 148k", "warning"],
      ["Role change", "Inventory supervisor", "Review", "warning"],
      ["Payroll checks", "All records validated", "Ready"],
    ],
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
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDisplay(value);
      return;
    }

    let frame = 0;
    const startedAt = performance.now();
    const animate = (time: number) => {
      const progress = Math.min((time - startedAt) / 920, 1);
      setDisplay(value * (1 - Math.pow(1 - progress, 3)));
      if (progress < 1) frame = requestAnimationFrame(animate);
    };

    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [cycle, value]);

  return (
    <>
      {prefix}
      {new Intl.NumberFormat("en-PK", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }).format(display)}
      {suffix}
    </>
  );
}

function Sparkline({ direction = "up" }: { direction?: TrendDirection }) {
  return (
    <svg
      className={`mt-3 h-14 w-full overflow-visible ${
        direction === "down" ? "text-warning" : "text-success"
      }`}
      viewBox="0 0 320 64"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path
        d={
          direction === "down"
            ? "M0 12 C34 17 44 30 78 27 C112 24 127 45 161 41 C199 37 218 53 252 49 C283 45 300 55 320 58"
            : "M0 55 C31 51 48 38 76 41 C109 45 126 26 160 30 C194 34 213 12 248 18 C282 24 299 9 320 5"
        }
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

function ProgressBar({ value, tone = "success" }: { value: number; tone?: Tone }) {
  return (
    <span className="mt-3 block h-1.5 overflow-hidden rounded-full bg-surface-secondary">
      <span
        className={`jv-progress-fill block h-full rounded-full ${
          tone === "warning" ? "bg-warning" : "bg-success"
        }`}
        style={{ "--jv-progress": `${value}%` } as CSSProperties}
      />
    </span>
  );
}

function UseCaseCard({ card, cycle, preview = false }: { card: UseCase; cycle: number; preview?: boolean }) {
  const Icon = card.icon;
  const TrendIcon = card.trendDirection === "down" ? TrendingDown : TrendingUp;
  const tone = card.tone ?? "success";

  return (
    <article
      className={`jv-usecase-card relative flex h-[clamp(330px,50svh,470px)] w-full min-w-0 flex-col overflow-hidden rounded-[28px] border border-border bg-card p-5 text-text-primary sm:p-6 ${
        preview ? "jv-usecase-card-preview" : ""
      }`}
    >
      <span
        className={`absolute -right-16 -top-16 size-44 rounded-full blur-3xl ${
          tone === "warning" ? "bg-warning-soft" : "bg-success-soft"
        }`}
        aria-hidden="true"
      />

      <div className="relative flex items-start justify-between gap-3">
        <span
          className={`grid size-12 shrink-0 place-items-center rounded-[15px] ${
            tone === "warning"
              ? "bg-warning-soft text-warning"
              : "bg-success-soft text-success"
          }`}
        >
          <Icon className="size-[22px]" />
        </span>
        <span className="rounded-full border border-border bg-surface-soft px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.1em] text-text-muted">
          {card.kicker}
        </span>
      </div>

      <h3 className="relative mt-5 text-[clamp(1.2rem,2vw,1.55rem)] font-bold leading-[1.14] tracking-[-0.035em] text-text-primary">
        {card.title}
      </h3>
      <p className="jv-card-description relative mt-2 text-xs leading-5 text-text-secondary sm:text-[13px]">
        {card.description}
      </p>

      <div className="jv-card-scroll relative mt-5 min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
        <div className="grid gap-3 pb-1">
          <section className="rounded-2xl border border-border bg-surface-soft p-4">
            <span className="text-[10px] font-semibold uppercase tracking-[0.11em] text-text-muted">
              {card.headlineLabel}
            </span>
            <strong className="mt-1 block text-[clamp(1.65rem,2.5vw,2.25rem)] tracking-[-0.045em] text-text-primary">
              <CountUp
                value={card.headlineValue}
                cycle={cycle}
                prefix={card.headlinePrefix}
                suffix={card.headlineSuffix}
                decimals={card.headlineDecimals}
              />
            </strong>
            <div
              className={`mt-1 flex items-center gap-1.5 text-[11px] font-semibold ${
                card.trendDirection === "down" ? "text-warning" : "text-success"
              }`}
            >
              <TrendIcon className="size-3.5" />
              {card.trend}
            </div>
            {card.progress === undefined ? (
              <Sparkline direction={card.trendDirection} />
            ) : (
              <ProgressBar value={card.progress} tone={tone} />
            )}
          </section>

          <div className="grid grid-cols-3 gap-2">
            {card.metrics.map(([label, value, detail]) => (
              <span key={label} className="rounded-xl border border-border/70 bg-card p-3">
                <small className="block text-[9px] font-semibold uppercase tracking-[0.07em] text-text-muted">
                  {label}
                </small>
                <b className="mt-1.5 block text-xs text-text-primary sm:text-sm">{value}</b>
                {detail ? (
                  <small className="mt-1 block text-[9px] leading-4 text-text-muted">{detail}</small>
                ) : null}
              </span>
            ))}
          </div>

          <div className="grid gap-2">
            {card.rows.map(([label, detail, value, rowTone = "success"]) => (
              <span
                key={label}
                className="grid grid-cols-[34px_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-border/70 bg-card p-3"
              >
                <i
                  className={`grid size-[34px] place-items-center rounded-[10px] ${
                    rowTone === "warning"
                      ? "bg-warning-soft text-warning"
                      : "bg-success-soft text-success"
                  }`}
                >
                  {rowTone === "warning" ? (
                    <Clock3 className="size-4" />
                  ) : (
                    <CheckCircle2 className="size-4" />
                  )}
                </i>
                <span className="min-w-0">
                  <b className="block truncate text-[11px] text-text-primary">{label}</b>
                  <small className="mt-0.5 block truncate text-[10px] text-text-muted">{detail}</small>
                </span>
                <strong className="text-[11px] text-text-primary">{value}</strong>
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="relative mt-3 flex items-center justify-between border-t border-border pt-3 text-[9px] font-semibold text-text-muted">
        <span>Illustrative sample</span>
        <span>Scroll inside card</span>
      </div>
    </article>
  );
}

export function HeroUseCaseCarousel() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [cycle, setCycle] = useState(0);
  const [paused, setPaused] = useState(false);
  const activeCard = useCases[activeIndex];
  const nextCard = useCases[(activeIndex + 1) % useCases.length];

  useEffect(() => {
    if (paused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const timeout = window.setTimeout(() => {
      setActiveIndex((current) => (current + 1) % useCases.length);
      setCycle((current) => current + 1);
    }, 5000);

    return () => window.clearTimeout(timeout);
  }, [activeIndex, paused]);

  const move = (direction: -1 | 1) => {
    setActiveIndex(
      (current) => (current + direction + useCases.length) % useCases.length,
    );
    setCycle((current) => current + 1);
  };

  return (
    <figure className="jv-enter-late m-0 min-w-0">
      <div className="mb-3 flex items-end justify-between gap-4 px-1 sm:mb-4">
        <div>
          <p className="m-0 text-[10px] font-bold uppercase tracking-[0.12em] text-success">
            Eight connected use cases
          </p>
          <strong className="mt-1 block text-sm text-text-primary sm:text-base">
            One focused view at a time
          </strong>
        </div>
        <div className="flex items-center gap-2">
          <span className="mr-1 hidden items-center gap-2 text-[10px] font-semibold text-text-muted sm:inline-flex">
            <i className="jv-live-dot size-1.5 rounded-full bg-success" />
            Changes every 5 seconds
          </span>
          <button
            type="button"
            onClick={() => move(-1)}
            className="grid size-10 place-items-center rounded-xl border border-border bg-card text-text-primary shadow-theme transition hover:-translate-y-0.5 hover:border-border-strong"
            aria-label="Show previous Jalvoro use case"
          >
            <ArrowLeft className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => move(1)}
            className="grid size-10 place-items-center rounded-xl border border-border bg-card text-text-primary shadow-theme transition hover:-translate-y-0.5 hover:border-border-strong"
            aria-label="Show next Jalvoro use case"
          >
            <ArrowRight className="size-4" />
          </button>
        </div>
      </div>

      <div
        className="jv-usecase-viewport relative max-w-[780px] overflow-hidden rounded-[30px] p-1 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-focus-ring/25"
        tabIndex={0}
        role="region"
        aria-roledescription="carousel"
        aria-label={`Jalvoro use case ${activeIndex + 1} of ${useCases.length}: ${activeCard.title}`}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocusCapture={() => setPaused(true)}
        onBlurCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false);
        }}
      >
        <div className="jv-single-card-stage flex items-stretch gap-4">
          <div className="jv-active-card-wrap w-[calc(100%-3.25rem)] shrink-0 sm:w-[min(76%,560px)]">
            <UseCaseCard key={`${activeCard.id}-${cycle}`} card={activeCard} cycle={cycle} />
          </div>
          <div
            className="jv-next-card-wrap w-[calc(100%-3.25rem)] shrink-0 sm:w-[min(76%,560px)]"
            aria-hidden="true"
          >
            <UseCaseCard key={`next-${nextCard.id}`} card={nextCard} cycle={cycle} preview />
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-4 px-1">
        <figcaption className="text-[10px] leading-4 text-text-muted sm:text-[11px]">
          Realistic illustrative data only. No live customer information is shown.
        </figcaption>
        <span className="shrink-0 text-[10px] font-bold tabular-nums text-text-muted">
          {String(activeIndex + 1).padStart(2, "0")} / {String(useCases.length).padStart(2, "0")}
        </span>
      </div>
    </figure>
  );
}
