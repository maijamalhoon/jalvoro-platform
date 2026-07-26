"use client";

import {
  ArrowDownRight,
  ArrowUpRight,
  Landmark,
  ReceiptText,
  TrendingUp,
  WalletCards,
} from "lucide-react";

import { SpendingDistributionChart } from "@/components/analytics/AnalyticsCharts";
import { useCurrency } from "@/components/currency/CurrencyProvider";
import { InlineNotice } from "@/components/ui/inline-notice";
import {
  formatRangeLabel,
  getChangeDirection,
  summarizeInvestmentPortfolio,
  type AccountBreakdownItem,
  type AnalyticsAccountStatus,
  type AnalyticsDataStatus,
  type AnalyticsInvestmentData,
  type AnalyticsKpis,
  type CategoryBreakdownItem,
  type ChangeResult,
  type IncomeSourceSummary,
  type LargestEntry,
  type PeriodFacts,
  type PeriodRanges,
} from "@/lib/analytics/calculations";

function ChangePill({ change }: { change: ChangeResult }) {
  const direction = getChangeDirection(change);
  const Icon =
    direction === "up" ? ArrowUpRight : direction === "down" ? ArrowDownRight : null;
  const className =
    change.sentiment === "positive"
      ? "bg-success/10 text-success"
      : change.sentiment === "negative"
        ? "bg-danger/10 text-danger"
        : change.sentiment === "warning"
          ? "bg-warning/10 text-warning"
          : "bg-surface-secondary text-text-secondary";

  return (
    <span
      className={`inline-flex min-h-7 shrink-0 items-center gap-1 rounded-full px-2.5 text-[10px] font-bold ${className}`}
    >
      {Icon ? <Icon aria-hidden="true" className="size-3.5" /> : null}
      {change.label}
    </span>
  );
}

function MetricBlock({
  label,
  value,
  change,
  tone,
}: {
  label: string;
  value: string;
  change: ChangeResult;
  tone: "income" | "expense" | "net" | "rate";
}) {
  const valueClass =
    tone === "income"
      ? "text-success"
      : tone === "expense"
        ? "text-danger"
        : tone === "rate"
          ? "text-warning"
          : "text-text-primary";

  return (
    <div className="min-w-0 px-1 py-2 sm:px-3">
      <div className="flex min-w-0 items-start justify-between gap-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-text-tertiary">
          {label}
        </p>
        <ChangePill change={change} />
      </div>
      <p
        className={`mt-3 min-w-0 break-words text-[clamp(1.35rem,4vw,2.15rem)] font-extrabold leading-none tabular-nums tracking-tight ${valueClass}`}
      >
        {value}
      </p>
    </div>
  );
}

export function KpiSummary({ kpis }: { kpis: AnalyticsKpis }) {
  const { formatCurrency } = useCurrency();

  return (
    <section
      className="finance-panel min-w-0 overflow-hidden p-4 sm:p-5"
      aria-labelledby="analytics-pulse-title"
    >
      <div className="flex min-w-0 items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-active">
            Overview
          </p>
          <h2 id="analytics-pulse-title" className="mt-1 text-base font-bold text-text-primary">
            Financial pulse
          </h2>
        </div>
        <span className="grid size-10 shrink-0 place-items-center rounded-[15px] bg-success/10 text-success">
          <TrendingUp aria-hidden="true" className="size-5" />
        </span>
      </div>

      <div className="mt-4 grid min-w-0 gap-y-3 sm:grid-cols-2 sm:divide-x sm:divide-border/55 xl:grid-cols-4">
        <MetricBlock
          label="Income"
          value={formatCurrency(kpis.totalIncome)}
          change={kpis.incomeChange}
          tone="income"
        />
        <MetricBlock
          label="Expenses"
          value={formatCurrency(kpis.totalExpenses)}
          change={kpis.expensesChange}
          tone="expense"
        />
        <MetricBlock
          label="Net savings"
          value={formatCurrency(kpis.netSavings)}
          change={kpis.netSavingsChange}
          tone="net"
        />
        <MetricBlock
          label="Savings rate"
          value={kpis.savingsRate === null ? "—" : `${kpis.savingsRate}%`}
          change={kpis.savingsRateChange}
          tone="rate"
        />
      </div>
    </section>
  );
}

export function PeriodContext({
  facts,
  ranges,
}: {
  facts: PeriodFacts;
  ranges: PeriodRanges;
}) {
  const { formatCurrency } = useCurrency();
  const items = [
    ["Days", String(facts.inclusiveDays)],
    ["Income entries", String(facts.incomeCount)],
    ["Expense entries", String(facts.expenseCount)],
    ["Daily income", formatCurrency(facts.averageDailyIncome)],
    ["Daily spending", formatCurrency(facts.averageDailySpending)],
  ];

  return (
    <section
      className="min-w-0 rounded-[20px] bg-surface-secondary/44 px-4 py-3.5 sm:px-5"
      aria-labelledby="analytics-context-title"
    >
      <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(13rem,0.8fr)_minmax(0,2.2fr)] xl:items-center">
        <div className="min-w-0">
          <h2 id="analytics-context-title" className="text-xs font-bold text-text-primary">
            Period context
          </h2>
          <p className="mt-1 truncate text-[11px] text-text-secondary">
            Compared with {formatRangeLabel(ranges.previous)}
          </p>
        </div>
        <dl className="grid min-w-0 grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-5">
          {items.map(([label, value]) => (
            <div key={label} className="min-w-0">
              <dt className="text-[10px] font-semibold text-text-tertiary">{label}</dt>
              <dd className="mt-1 min-w-0 break-words text-xs font-bold tabular-nums text-text-primary">
                {value}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

function SectionHeading({
  id,
  eyebrow,
  title,
  detail,
}: {
  id?: string;
  eyebrow: string;
  title: string;
  detail?: string;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-bold uppercase tracking-[0.13em] text-active">{eyebrow}</p>
      <h2 id={id} className="mt-1 text-base font-bold text-text-primary sm:text-lg">
        {title}
      </h2>
      {detail ? <p className="mt-1 text-xs text-text-secondary">{detail}</p> : null}
    </div>
  );
}

function RankedList({
  items,
  emptyMessage,
  limit = 6,
}: {
  items: Array<{
    id: string;
    name: string;
    amount: number;
    percentage: number;
    detail?: string | null;
  }>;
  emptyMessage: string;
  limit?: number;
}) {
  const { formatCurrency } = useCurrency();
  if (items.length === 0) {
    return <p className="py-8 text-center text-sm text-text-secondary">{emptyMessage}</p>;
  }

  const displayed = items.slice(0, limit);
  return (
    <div>
      <ol className="divide-y divide-border/45">
        {displayed.map((item, index) => (
          <li key={item.id} className="py-3 first:pt-0 last:pb-0">
            <div className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
              <span className="grid size-7 place-items-center rounded-full bg-surface-secondary text-[10px] font-bold text-text-secondary">
                {index + 1}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-text-primary" title={item.name}>
                  {item.name}
                </p>
                <p className="mt-0.5 truncate text-[10px] text-text-tertiary">
                  {item.detail || `${item.percentage}% of total`}
                </p>
              </div>
              <p className="max-w-[9rem] break-words text-right text-sm font-bold tabular-nums text-text-primary">
                {formatCurrency(item.amount)}
              </p>
            </div>
            <div className="ml-10 mt-2 h-1 overflow-hidden rounded-full bg-surface-secondary">
              <div
                className="h-full rounded-full bg-active/75"
                style={{ width: `${Math.max(2, Math.min(100, item.percentage))}%` }}
              />
            </div>
          </li>
        ))}
      </ol>
      {items.length > displayed.length ? (
        <p className="mt-3 text-[10px] text-text-tertiary">
          {items.length - displayed.length} more included in totals
        </p>
      ) : null}
    </div>
  );
}

export function IncomeSources({ summary }: { summary: IncomeSourceSummary }) {
  return (
    <section className="finance-panel min-w-0 p-4 sm:p-5" aria-labelledby="income-sources-title">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <SectionHeading
          id="income-sources-title"
          eyebrow="Income"
          title="Top sources"
          detail="Based on saved source names"
        />
        {summary.totalEntries > 0 ? (
          <span className="shrink-0 rounded-full bg-success/10 px-2.5 py-1 text-[10px] font-bold text-success">
            {summary.explicitEntries}/{summary.totalEntries} named
          </span>
        ) : null}
      </div>
      <div className="mt-5">
        <RankedList items={summary.items} emptyMessage="No income in this period." />
      </div>
    </section>
  );
}

export function SpendingAnalysis({
  categories,
  accounts,
  accountsStatus,
}: {
  categories: CategoryBreakdownItem[];
  accounts: AccountBreakdownItem[];
  accountsStatus: AnalyticsAccountStatus;
}) {
  return (
    <section className="finance-panel min-w-0 p-4 sm:p-5" aria-labelledby="spending-analysis-title">
      <SectionHeading
        id="spending-analysis-title"
        eyebrow="Spending"
        title="Where money went"
        detail="Category and account distribution"
      />
      {accountsStatus === "partial" ? (
        <InlineNotice tone="warning" className="mt-4">
          Some account names are unavailable; their amounts are still included.
        </InlineNotice>
      ) : null}
      <div className="mt-5 grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(17rem,0.8fr)] xl:items-start">
        <div className="min-w-0">
          <SpendingDistributionChart data={categories} />
        </div>
        <div className="min-w-0 xl:border-l xl:border-border/45 xl:pl-5">
          <p className="mb-3 text-xs font-bold text-text-primary">Accounts used</p>
          <RankedList
            items={accounts.map((item) => ({
              ...item,
              detail: item.type
                ? `${item.type} · ${item.percentage}%`
                : `${item.percentage}% of expenses`,
            }))}
            emptyMessage="No account spending in this period."
          />
        </div>
      </div>
    </section>
  );
}

function EntryList({
  entries,
  emptyMessage,
}: {
  entries: LargestEntry[];
  emptyMessage: string;
}) {
  const { formatCurrency } = useCurrency();
  if (entries.length === 0) {
    return <p className="py-6 text-center text-sm text-text-secondary">{emptyMessage}</p>;
  }

  return (
    <ol className="divide-y divide-border/45">
      {entries.map((entry) => (
        <li
          key={entry.id}
          className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-3 py-3 first:pt-0 last:pb-0"
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-text-primary" title={entry.title}>
              {entry.title}
            </p>
            <p className="mt-1 truncate text-[10px] text-text-tertiary">
              {entry.date} · {entry.categoryName}
              {entry.accountName ? ` · ${entry.accountName}` : ""}
            </p>
          </div>
          <p className="max-w-[9rem] break-words text-right text-sm font-bold tabular-nums text-text-primary">
            {formatCurrency(entry.amount)}
          </p>
        </li>
      ))}
    </ol>
  );
}

export function LargestEntries({
  expenses,
  income,
}: {
  expenses: LargestEntry[];
  income: LargestEntry[];
}) {
  return (
    <section className="finance-panel min-w-0 p-4 sm:p-5" aria-labelledby="largest-entries-title">
      <SectionHeading id="largest-entries-title" eyebrow="Activity" title="Largest entries" />
      <div className="mt-5 space-y-5">
        <div>
          <h3 className="mb-3 inline-flex items-center gap-2 text-xs font-bold text-text-primary">
            <ReceiptText aria-hidden="true" className="size-4 text-danger" />
            Expenses
          </h3>
          <EntryList entries={expenses} emptyMessage="No expenses in this period." />
        </div>
        <div className="border-t border-border/45 pt-5">
          <h3 className="mb-3 inline-flex items-center gap-2 text-xs font-bold text-text-primary">
            <WalletCards aria-hidden="true" className="size-4 text-success" />
            Income
          </h3>
          <EntryList entries={income} emptyMessage="No income in this period." />
        </div>
      </div>
    </section>
  );
}

export function InvestmentSnapshot({
  investments,
  status,
}: {
  investments: AnalyticsInvestmentData[];
  status: AnalyticsDataStatus;
}) {
  const { formatCurrency } = useCurrency();
  const portfolio = summarizeInvestmentPortfolio(investments, 5);
  const totalPnlPct =
    portfolio.totalInvested > 0
      ? (portfolio.totalPnl / portfolio.totalInvested) * 100
      : null;
  const pnlTone =
    portfolio.totalPnl > 0
      ? "text-success"
      : portfolio.totalPnl < 0
        ? "text-danger"
        : "text-text-secondary";

  return (
    <section className="finance-panel min-w-0 p-4 sm:p-5" aria-labelledby="portfolio-snapshot-title">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <SectionHeading
          id="portfolio-snapshot-title"
          eyebrow="Investments"
          title="Portfolio snapshot"
          detail="Current stored position values"
        />
        <span className="grid size-10 shrink-0 place-items-center rounded-[15px] bg-investment-soft text-active">
          <Landmark aria-hidden="true" className="size-5" />
        </span>
      </div>

      {status === "error" ? (
        <InlineNotice tone="danger" className="mt-5">
          Investment records could not be loaded.
        </InlineNotice>
      ) : investments.length === 0 ? (
        <p className="py-9 text-center text-sm text-text-secondary">No investments yet.</p>
      ) : (
        <div className="mt-5 grid min-w-0 gap-5 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
          <dl className="grid min-w-0 grid-cols-2 gap-x-4 gap-y-5 rounded-[18px] bg-surface-secondary/38 p-4">
            <div className="col-span-2">
              <dt className="text-[10px] font-bold uppercase tracking-[0.11em] text-text-tertiary">
                Current value
              </dt>
              <dd className="mt-2 break-words text-2xl font-extrabold tabular-nums tracking-tight text-text-primary">
                {formatCurrency(portfolio.totalValue)}
              </dd>
            </div>
            <div>
              <dt className="text-[10px] text-text-tertiary">Invested</dt>
              <dd className="mt-1 break-words text-sm font-bold tabular-nums text-text-primary">
                {formatCurrency(portfolio.totalInvested)}
              </dd>
            </div>
            <div>
              <dt className="text-[10px] text-text-tertiary">Unrealized P/L</dt>
              <dd className={`mt-1 break-words text-sm font-bold tabular-nums ${pnlTone}`}>
                {portfolio.totalPnl > 0 ? "+" : ""}
                {formatCurrency(portfolio.totalPnl)}
                {totalPnlPct === null
                  ? ""
                  : ` (${totalPnlPct > 0 ? "+" : ""}${totalPnlPct.toFixed(1)}%)`}
              </dd>
            </div>
          </dl>

          <div className="min-w-0">
            <p className="mb-3 text-xs font-bold text-text-primary">Top holdings</p>
            <ol className="divide-y divide-border/45">
              {portfolio.displayedHoldings.map((holding) => (
                <li
                  key={holding.id}
                  className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <span
                    aria-hidden="true"
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: holding.color }}
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-text-primary" title={holding.name}>
                      {holding.name}
                    </p>
                    <p className="mt-0.5 text-[10px] text-text-tertiary">
                      {holding.symbol || holding.type}
                    </p>
                  </div>
                  <p className="max-w-[9rem] break-words text-right text-sm font-bold tabular-nums text-text-primary">
                    {formatCurrency(holding.value)}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </section>
  );
}
