"use client";

import Image from "next/image";
import { useEffect, useMemo } from "react";
import { BriefcaseBusiness, Layers3, Package } from "lucide-react";
import { Cell, Pie, PieChart, Tooltip } from "recharts";

import { useCurrency } from "@/components/currency/CurrencyProvider";
import DashboardCardViewLink from "@/components/dashboard/DashboardCardViewLink";
import { useLiveInvestmentRows } from "@/components/investments/useLiveInvestmentRows";
import CountedAmount from "@/components/motion/CountedAmount";
import { useDashboardAnimationReady } from "@/components/motion/useDashboardAnimationReady";
import ChartFrame from "@/components/ui/chart-frame";
import type { DashboardAvailability } from "@/lib/dashboard-financial-semantics";
import type { MoneyFormatOptions } from "@/lib/currency";
import {
  aggregateInvestmentHoldings,
  getAssetInitials,
  type AggregatedInvestment,
} from "@/lib/investments/aggregation";

interface Investment {
  id: string;
  name: string;
  type: string;
  quantity: number | string;
  purchase_price: number | string;
  current_price: number | string;
  purchased_at?: string | null;
  asset_id?: string | null;
  symbol?: string | null;
  image_url?: string | null;
  price_source?: string | null;
  current_price_original?: number | string | null;
  current_price_currency?: string | null;
  price_updated_at?: string | null;
  price_change_24h?: number | null;
  is_live_priced?: boolean | null;
}

type AllocationEntry = {
  id: string;
  name: string;
  symbol: string | null;
  imageUrl: string | null;
  value: number;
  color: string;
  holding: AggregatedInvestment;
};

const ASSET_ACCENTS: Record<string, string> = {
  bitcoin: "#f7931a",
  btc: "#f7931a",
  ethereum: "#627eea",
  eth: "#627eea",
  solana: "#7c3aed",
  sol: "#7c3aed",
  tether: "#26a17b",
  usdt: "#26a17b",
  binancecoin: "#f3ba2f",
  bnb: "#f3ba2f",
  ripple: "#23292f",
  xrp: "#23292f",
  cardano: "#3468d4",
  ada: "#3468d4",
  dogecoin: "#c2a633",
  doge: "#c2a633",
  litecoin: "#345d9d",
  ltc: "#345d9d",
  polkadot: "#e6007a",
  dot: "#e6007a",
  avalanche: "#e84142",
  avax: "#e84142",
  chainlink: "#2a5ada",
  link: "#2a5ada",
  polygon: "#8247e5",
  matic: "#8247e5",
};

const OTHER_ASSETS_COLOR = "#5b7187";
const LIVE_PORTFOLIO_EVENT = "jamals:live-portfolio-value";

function getAssetAccent(holding: AggregatedInvestment) {
  const symbol = holding.symbol?.trim().toLowerCase() ?? "";
  const assetId = holding.asset_id?.trim().toLowerCase() ?? "";

  return ASSET_ACCENTS[symbol] ?? ASSET_ACCENTS[assetId] ?? holding.color;
}

function buildAllocationData(investments: Investment[]): AllocationEntry[] {
  return aggregateInvestmentHoldings(investments)
    .map((holding) => ({
      id: holding.groupKey,
      name: holding.name,
      symbol: holding.symbol,
      imageUrl: holding.image_url,
      value: Number.isFinite(holding.currentValue) ? holding.currentValue : 0,
      color: getAssetAccent(holding),
      holding,
    }))
    .filter((holding) => holding.value > 0 && holding.holding.current_price > 0);
}

function formatAllocation(value: number) {
  return `${value.toFixed(1)}%`;
}

function isCoinGeckoImage(imageUrl: string) {
  try {
    return new URL(imageUrl).hostname === "coin-images.coingecko.com";
  } catch {
    return false;
  }
}

function AssetLogo({
  entry,
  size = 34,
}: {
  entry: AllocationEntry;
  size?: number;
}) {
  if (entry.imageUrl && isCoinGeckoImage(entry.imageUrl)) {
    return (
      <Image
        src={entry.imageUrl}
        alt={`${entry.name} logo`}
        width={size}
        height={size}
        sizes={`${size}px`}
        className="shrink-0 rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    );
  }

  if (entry.imageUrl) {
    return (
      // Asset providers can vary; keep unknown hosts outside the Next image allowlist.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={entry.imageUrl}
        alt={`${entry.name} logo`}
        width={size}
        height={size}
        loading="lazy"
        decoding="async"
        className="shrink-0 rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <span
      className="grid shrink-0 place-items-center rounded-full text-[10px] font-black text-white"
      style={{ width: size, height: size, backgroundColor: entry.color }}
      aria-label={`${entry.name} asset icon`}
    >
      {getAssetInitials(entry.name, entry.symbol)}
    </span>
  );
}

function AllocationBar({
  value,
  color,
  label,
  delayMs = 0,
}: {
  value: number;
  color: string;
  label: string;
  delayMs?: number;
}) {
  const clampedValue = Math.min(Math.max(value, 0), 100);

  return (
    <span
      className="flex h-5 w-full min-w-[72px] items-center"
      role="img"
      aria-label={`${label} allocation ${formatAllocation(value)}`}
    >
      <span className="relative h-1 w-full overflow-hidden rounded-full bg-surface-secondary/85">
        <span
          className="investment-allocation-bar absolute inset-y-0 left-0 rounded-full"
          style={{
            width: `${clampedValue}%`,
            backgroundColor: color,
            animationDelay: `${delayMs}ms`,
          }}
        />
      </span>
    </span>
  );
}

function HoldingRow({
  entry,
  allocation,
  delayMs,
  formatCurrency,
}: {
  entry: AllocationEntry;
  allocation: number;
  delayMs: number;
  formatCurrency: (amount: number, options?: MoneyFormatOptions) => string;
}) {
  return (
    <div
      title={`${entry.name}${entry.symbol ? ` (${entry.symbol.toUpperCase()})` : ""}`}
      className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 rounded-[18px] bg-surface-primary/35 px-3 py-3 transition-[background-color,transform] duration-200 hover:-translate-y-px hover:bg-surface-primary/55 md:grid-cols-[auto_minmax(86px,0.8fr)_minmax(84px,1fr)_auto] md:gap-x-4"
    >
      <AssetLogo entry={entry} />

      <div className="min-w-0">
        <p className="truncate text-xs font-bold text-text-primary lg:text-sm">
          {entry.name}
        </p>
        <p className="mt-0.5 truncate text-[9px] font-bold uppercase tracking-[0.13em] text-text-tertiary lg:text-[10px]">
          {entry.symbol || "Asset"}
        </p>
      </div>

      <div className="col-start-2 col-end-4 min-w-0 md:col-auto">
        <AllocationBar
          value={allocation}
          color={entry.color}
          label={entry.name}
          delayMs={delayMs}
        />
      </div>

      <div className="shrink-0 text-right">
        <p className="text-xs font-black tabular-nums text-text-primary lg:text-sm">
          {formatCurrency(entry.value, { compact: true })}
        </p>
        <p
          className="mt-0.5 text-[10px] font-black tabular-nums lg:text-xs"
          style={{ color: entry.color }}
        >
          {formatAllocation(allocation)}
        </p>
      </div>
    </div>
  );
}

function OtherAssetsRow({
  value,
  allocation,
  formatCurrency,
}: {
  value: number;
  allocation: number;
  formatCurrency: (amount: number, options?: MoneyFormatOptions) => string;
}) {
  return (
    <div
      title="Other assets"
      className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 rounded-[18px] bg-surface-primary/35 px-3 py-3 transition-[background-color,transform] duration-200 hover:-translate-y-px hover:bg-surface-primary/55 md:grid-cols-[auto_minmax(86px,0.8fr)_minmax(84px,1fr)_auto] md:gap-x-4"
    >
      <span
        className="grid size-[34px] shrink-0 place-items-center rounded-full"
        style={{
          color: OTHER_ASSETS_COLOR,
          backgroundColor: "rgba(91, 113, 135, 0.13)",
        }}
        aria-label="Other assets icon"
      >
        <Layers3 size={17} strokeWidth={2.1} />
      </span>

      <div className="min-w-0">
        <p className="truncate text-xs font-bold text-text-primary lg:text-sm">
          Other assets
        </p>
        <p className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.13em] text-text-tertiary lg:text-[10px]">
          Combined
        </p>
      </div>

      <div className="col-start-2 col-end-4 min-w-0 md:col-auto">
        <AllocationBar
          value={allocation}
          color={OTHER_ASSETS_COLOR}
          label="Other assets"
          delayMs={480}
        />
      </div>

      <div className="shrink-0 text-right">
        <p className="text-xs font-black tabular-nums text-text-primary lg:text-sm">
          {formatCurrency(value, { compact: true })}
        </p>
        <p
          className="mt-0.5 text-[10px] font-black tabular-nums lg:text-xs"
          style={{ color: OTHER_ASSETS_COLOR }}
        >
          {formatAllocation(allocation)}
        </p>
      </div>
    </div>
  );
}

export default function InvestmentOverviewWidget({
  investments,
  totalPnLPct,
  availability,
}: {
  investments: Investment[];
  totalPnLPct: number | null;
  availability: DashboardAvailability;
  unpricedCount: number;
}) {
  const { formatCurrency } = useCurrency();
  const { reduceMotion, durationScale } = useDashboardAnimationReady();
  const liveInvestments = useLiveInvestmentRows(investments);
  const initialAllocationData = useMemo(
    () => buildAllocationData(investments),
    [investments],
  );
  const allocationData = useMemo(
    () => buildAllocationData(liveInvestments),
    [liveInvestments],
  );
  const visibleInvestments = allocationData.slice(0, 3);
  const otherInvestments = allocationData.slice(3);
  const allocationTotalValue = allocationData.reduce(
    (sum, investment) => sum + investment.value,
    0,
  );
  const initialTotalValue = initialAllocationData.reduce(
    (sum, investment) => sum + investment.value,
    0,
  );
  const totalInvested = allocationData.reduce(
    (sum, investment) => sum + investment.holding.totalInvested,
    0,
  );
  const resolvedTotalPnLPct =
    totalInvested > 0
      ? ((allocationTotalValue - totalInvested) / totalInvested) * 100
      : totalPnLPct;
  const resolvedUnpricedCount = liveInvestments.filter((investment) => {
    const quantity = Number(investment.quantity);
    const currentPrice = Number(investment.current_price);

    return (
      Number.isFinite(quantity) &&
      quantity > 0 &&
      (!Number.isFinite(currentPrice) || currentPrice <= 0)
    );
  }).length;
  const otherAssetsValue = otherInvestments.reduce(
    (sum, investment) => sum + investment.value,
    0,
  );
  const otherAssetsAllocation =
    allocationTotalValue > 0
      ? (otherAssetsValue / allocationTotalValue) * 100
      : 0;
  const isProfit = resolvedTotalPnLPct !== null && resolvedTotalPnLPct > 0;
  const isLoss = resolvedTotalPnLPct !== null && resolvedTotalPnLPct < 0;
  const pnlColor = isProfit
    ? "var(--success)"
    : isLoss
      ? "var(--danger)"
      : "var(--text-secondary)";
  const pnlLabel =
    resolvedTotalPnLPct === null
      ? "P&L unavailable"
      : `${isProfit ? "+" : ""}${resolvedTotalPnLPct.toFixed(1)}%`;
  const holdingLabel = `${allocationData.length} ${
    allocationData.length === 1 ? "asset" : "assets"
  }`;
  const emptyTitle =
    availability === "unavailable"
      ? "Portfolio unavailable"
      : liveInvestments.length === 0
        ? "No holdings yet"
        : "Pricing unavailable";
  const emptyDescription =
    availability === "unavailable"
      ? "Refresh when your connection is stable."
      : liveInvestments.length === 0
        ? "Add investments to see allocation."
        : "Current prices are missing, so value and performance are not shown.";

  useEffect(() => {
    if (
      !Number.isFinite(allocationTotalValue) ||
      !Number.isFinite(initialTotalValue)
    ) {
      return;
    }

    const delta = allocationTotalValue - initialTotalValue;
    const target = window as Window & {
      __jamalsLivePortfolioDelta?: number;
    };
    target.__jamalsLivePortfolioDelta = delta;
    window.dispatchEvent(
      new CustomEvent(LIVE_PORTFOLIO_EVENT, { detail: { delta } }),
    );
  }, [allocationTotalValue, initialTotalValue]);

  return (
    <section
      className="finance-reference-card motion-card-entry flex h-full min-w-0 flex-col overflow-hidden p-4 sm:p-5 lg:p-6"
      style={{
        background:
          "radial-gradient(circle at 22% 42%, color-mix(in srgb, var(--accent, #7c3aed) 4%, transparent), transparent 34%), var(--card)",
      }}
    >
      <header className="flex min-w-0 items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="dashboard-list-card-kicker-icon !border-transparent !bg-transparent !text-text-secondary !shadow-none">
            <BriefcaseBusiness size={15} strokeWidth={2.3} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-[10px] font-bold uppercase tracking-[0.16em] text-text-secondary">
              Investments
            </p>
            {allocationData.length > 0 ? (
              <p className="mt-0.5 text-[10px] font-semibold text-text-tertiary">
                {holdingLabel}
              </p>
            ) : null}
          </div>
        </div>

        <DashboardCardViewLink
          href="/dashboard/investments"
          label="View all investments"
        />
      </header>

      {allocationData.length === 0 ? (
        <div className="dashboard-chart-empty mt-5 min-h-[260px] flex-1">
          <div>
            <span className="dashboard-chart-empty-icon">
              <Package size={16} />
            </span>
            <p className="text-xs font-semibold text-text-primary">
              {emptyTitle}
            </p>
            <p className="mt-1 text-[11px] text-text-secondary">
              {emptyDescription}
            </p>
          </div>
        </div>
      ) : (
        <div className="mt-4 grid min-h-0 flex-1 gap-5 md:grid-cols-[minmax(220px,0.86fr)_minmax(280px,1.14fr)] md:items-center">
          <div className="min-w-0">
            <p className="sr-only">
              Priced portfolio value {allocationTotalValue}. Performance is{" "}
              {pnlLabel}.
              {resolvedUnpricedCount > 0
                ? ` ${resolvedUnpricedCount} holdings are excluded because current pricing is unavailable.`
                : ""}
            </p>

            <div className="relative mx-auto aspect-square w-full max-w-[240px] [container-type:inline-size] min-[420px]:max-w-[248px] sm:max-w-[256px] md:max-w-[272px] lg:max-w-[288px] xl:max-w-[300px] 2xl:max-w-[260px]">
              <ChartFrame className="!overflow-visible [&>div]:!overflow-visible">
                {({ width, height }) => (
                  <PieChart width={width} height={height} accessibilityLayer>
                    <Pie
                      data={allocationData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius="52%"
                      outerRadius="78%"
                      paddingAngle={2}
                      cornerRadius={8}
                      isAnimationActive={!reduceMotion}
                      animationBegin={0}
                      animationDuration={Math.round(700 * durationScale)}
                      animationEasing="ease-out"
                      stroke="var(--card)"
                      strokeWidth={3}
                    >
                      {allocationData.map((entry) => (
                        <Cell key={entry.id} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      cursor={false}
                      offset={18}
                      allowEscapeViewBox={{ x: true, y: true }}
                      position={
                        width < 270
                          ? { x: Math.max(12, width / 2 - 78), y: -10 }
                          : { x: width - 18, y: Math.max(6, height * 0.18) }
                      }
                      wrapperStyle={{
                        zIndex: 20,
                        pointerEvents: "none",
                      }}
                      contentStyle={{
                        maxWidth: "min(72vw, 220px)",
                        border: "none",
                        borderRadius: 12,
                        background:
                          "color-mix(in srgb, var(--chart-tooltip) 94%, transparent)",
                        color: "var(--text-primary)",
                        boxShadow: "0 10px 30px rgba(0,0,0,0.18)",
                        padding: "8px 10px",
                      }}
                      itemStyle={{
                        color: "var(--text-primary)",
                        fontSize: 11,
                        fontWeight: 750,
                        padding: 0,
                      }}
                      labelStyle={{ display: "none" }}
                      formatter={(value, _name, item) => {
                        const entry = item.payload as
                          | AllocationEntry
                          | undefined;
                        const label =
                          entry?.symbol?.trim().toUpperCase() ||
                          entry?.name ||
                          "Investment";

                        return [formatCurrency(Number(value ?? 0)), label];
                      }}
                    />
                  </PieChart>
                )}
              </ChartFrame>

              <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
                <div className="w-[52%] min-w-0 px-1">
                  <p className="max-w-full overflow-hidden text-ellipsis whitespace-nowrap text-[clamp(0.76rem,6.1cqw,1.08rem)] font-black leading-none tracking-[-0.04em] text-text-primary tabular-nums">
                    <CountedAmount
                      amount={formatCurrency(allocationTotalValue, {
                        compact: true,
                        maximumFractionDigits: 1,
                      })}
                    />
                  </p>
                  <p
                    className="mt-1.5 max-w-full overflow-hidden text-ellipsis whitespace-nowrap text-[clamp(0.68rem,5.2cqw,0.9rem)] font-black leading-none tabular-nums"
                    style={{ color: pnlColor }}
                  >
                    {resolvedTotalPnLPct === null ? (
                      pnlLabel
                    ) : (
                      <CountedAmount amount={pnlLabel} />
                    )}
                  </p>
                  <p className="mt-1.5 whitespace-nowrap text-[8px] font-bold uppercase leading-none tracking-[0.11em] text-text-tertiary sm:text-[9px]">
                    Portfolio
                  </p>
                </div>
              </div>
            </div>

            <div className="mx-auto mt-1 flex max-w-[250px] items-center justify-center gap-4 text-center">
              <div className="min-w-0">
                <p className="text-[9px] font-bold uppercase tracking-[0.11em] text-text-tertiary">
                  Invested
                </p>
                <p className="mt-0.5 truncate text-[11px] font-bold tabular-nums text-text-secondary">
                  {formatCurrency(totalInvested, { compact: true })}
                </p>
              </div>
              <span aria-hidden="true" className="h-6 w-px bg-border/45" />
              <div className="min-w-0">
                <p className="text-[9px] font-bold uppercase tracking-[0.11em] text-text-tertiary">
                  Holdings
                </p>
                <p className="mt-0.5 text-[11px] font-bold tabular-nums text-text-secondary">
                  {allocationData.length}
                </p>
              </div>
            </div>
          </div>

          <div className="min-w-0 space-y-2">
            {visibleInvestments.map((investment, index) => {
              const allocation =
                allocationTotalValue > 0
                  ? (investment.value / allocationTotalValue) * 100
                  : 0;

              return (
                <HoldingRow
                  key={investment.id}
                  entry={investment}
                  allocation={allocation}
                  delayMs={120 + index * 120}
                  formatCurrency={formatCurrency}
                />
              );
            })}

            {otherInvestments.length > 0 ? (
              <OtherAssetsRow
                value={otherAssetsValue}
                allocation={otherAssetsAllocation}
                formatCurrency={formatCurrency}
              />
            ) : null}

            {resolvedUnpricedCount > 0 ? (
              <p className="px-2 pt-1 text-[10px] font-semibold leading-4 text-warning">
                {resolvedUnpricedCount} unpriced{" "}
                {resolvedUnpricedCount === 1 ? "holding" : "holdings"} excluded
              </p>
            ) : null}
          </div>
        </div>
      )}

      <style>{`
        .investment-allocation-bar {
          opacity: 0.35;
          transform: scaleX(0);
          transform-origin: left center;
          animation: investment-allocation-fill 900ms cubic-bezier(0.22, 1, 0.36, 1) both;
          will-change: transform, opacity;
        }

        @keyframes investment-allocation-fill {
          from {
            opacity: 0.35;
            transform: scaleX(0);
          }
          to {
            opacity: 1;
            transform: scaleX(1);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .investment-allocation-bar {
            opacity: 1;
            transform: scaleX(1);
            animation: none;
          }
        }
      `}</style>
    </section>
  );
}
