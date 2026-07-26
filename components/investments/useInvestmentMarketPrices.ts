"use client";

import { useEffect, useMemo, useState } from "react";

import {
  useBinanceSearchPrices,
  type BinancePriceStatus,
} from "@/components/investments/useBinanceLivePrices";
import { isSupportedCurrency, type SupportedCurrency } from "@/lib/currency";
import type { CryptoCatalogAsset } from "@/lib/market/crypto-catalog";
import {
  INVESTMENT_ASSET_UPDATE_EVENT,
  type InvestmentMarketAsset,
  type InvestmentPriceMode,
} from "@/lib/market/investment-asset-catalog";

export type MarketStatus = "open" | "closed" | "reference" | "unknown";

export type MarketPriceSnapshot = {
  price: number | null;
  currency: SupportedCurrency | null;
  change24h: number | null;
  updatedAt: number | null;
  status: BinancePriceStatus;
  source: string;
  priceMode: InvestmentPriceMode;
  marketStatus: MarketStatus;
  stale: boolean;
};

type RemotePriceRow = {
  price?: unknown;
  currency?: unknown;
  change24h?: unknown;
  updatedAt?: unknown;
  source?: unknown;
  priceMode?: unknown;
  marketStatus?: unknown;
  stale?: unknown;
};

type RemotePriceResponse = {
  prices?: Record<string, RemotePriceRow>;
};

const EMPTY_SNAPSHOT: MarketPriceSnapshot = {
  price: null,
  currency: null,
  change24h: null,
  updatedAt: null,
  status: "idle",
  source: "manual",
  priceMode: "delayed",
  marketStatus: "unknown",
  stale: false,
};

function toFiniteNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toPositiveNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function normalizeProviderSymbol(value: string | null | undefined) {
  return (value ?? "").trim().toUpperCase();
}

function normalizePriceMode(
  value: unknown,
  fallback: InvestmentPriceMode,
): InvestmentPriceMode {
  return value === "realtime" || value === "delayed" || value === "reference"
    ? value
    : fallback;
}

function normalizeMarketStatus(value: unknown): MarketStatus {
  return value === "open" ||
    value === "closed" ||
    value === "reference" ||
    value === "unknown"
    ? value
    : "unknown";
}

function chunkSymbols(symbols: readonly string[], size: number) {
  const chunks: string[][] = [];
  for (let index = 0; index < symbols.length; index += size) {
    chunks.push(symbols.slice(index, index + size));
  }
  return chunks;
}

function useRemotePriceStore({
  symbols,
  enabled,
  endpoint,
  priceMode,
  pollIntervalMs,
  batchSize,
}: {
  symbols: readonly string[];
  enabled: boolean;
  endpoint: string;
  priceMode: InvestmentPriceMode;
  pollIntervalMs: number;
  batchSize: number;
}) {
  const symbolKey = useMemo(
    () =>
      Array.from(new Set(symbols.map(normalizeProviderSymbol).filter(Boolean)))
        .sort()
        .join(","),
    [symbols],
  );
  const normalizedSymbols = useMemo(
    () => (symbolKey ? symbolKey.split(",") : []),
    [symbolKey],
  );
  const [prices, setPrices] = useState<Record<string, MarketPriceSnapshot>>({});

  useEffect(() => {
    if (!enabled || normalizedSymbols.length === 0) {
      setPrices({});
      return;
    }

    let stopped = false;
    let controller: AbortController | null = null;
    let timer: number | null = null;

    function scheduleNext() {
      if (stopped) return;
      if (timer !== null) window.clearTimeout(timer);
      const delay =
        document.visibilityState === "hidden"
          ? Math.max(pollIntervalMs * 4, 5 * 60_000)
          : pollIntervalMs;
      timer = window.setTimeout(load, delay);
    }

    async function load() {
      if (stopped) return;
      controller?.abort();
      controller = new AbortController();

      setPrices((current) => {
        const next = { ...current };
        for (const symbol of normalizedSymbols) {
          next[symbol] = {
            ...(next[symbol] ?? EMPTY_SNAPSHOT),
            status: "connecting",
            priceMode,
          };
        }
        return next;
      });

      try {
        const parameter = endpoint.includes("forex") ? "pairs" : "symbols";
        const batches = chunkSymbols(normalizedSymbols, batchSize);
        const payloads = await Promise.all(
          batches.map(async (batch) => {
            const response = await fetch(
              `${endpoint}?${parameter}=${encodeURIComponent(batch.join(","))}`,
              {
                cache: "no-store",
                headers: { Accept: "application/json" },
                signal: controller?.signal,
              },
            );
            const payload = (await response.json()) as RemotePriceResponse;
            if (!response.ok) throw new Error("Market quote request failed.");
            return payload;
          }),
        );
        const remoteRows = Object.assign(
          {},
          ...payloads.map((payload) => payload.prices ?? {}),
        ) as Record<string, RemotePriceRow>;

        const next: Record<string, MarketPriceSnapshot> = {};
        for (const symbol of normalizedSymbols) {
          const row = remoteRows[symbol];
          const price = toPositiveNumber(row?.price);
          const rawCurrency = String(row?.currency ?? "").trim().toUpperCase();
          const currency = isSupportedCurrency(rawCurrency) ? rawCurrency : null;
          const resolvedMode = normalizePriceMode(row?.priceMode, priceMode);

          next[symbol] =
            price !== null && currency
              ? {
                  price,
                  currency,
                  change24h: toFiniteNumber(row?.change24h),
                  updatedAt: toPositiveNumber(row?.updatedAt) ?? Date.now(),
                  status: "live",
                  source: String(row?.source ?? "public-market-data"),
                  priceMode: resolvedMode,
                  marketStatus: normalizeMarketStatus(row?.marketStatus),
                  stale: row?.stale === true,
                }
              : {
                  ...EMPTY_SNAPSHOT,
                  status: "unavailable",
                  source: "manual",
                  priceMode: resolvedMode,
                };
        }

        if (!stopped) setPrices(next);
      } catch (error) {
        if (
          !stopped &&
          !(error instanceof DOMException && error.name === "AbortError")
        ) {
          setPrices((current) => {
            const next = { ...current };
            for (const symbol of normalizedSymbols) {
              next[symbol] = {
                ...(next[symbol] ?? EMPTY_SNAPSHOT),
                status: next[symbol]?.price != null ? "connecting" : "unavailable",
                priceMode,
              };
            }
            return next;
          });
        }
      } finally {
        if (!stopped) scheduleNext();
      }
    }

    function handleVisibilityChange() {
      if (document.visibilityState !== "visible") return;
      if (timer !== null) window.clearTimeout(timer);
      timer = window.setTimeout(load, 0);
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    timer = window.setTimeout(load, 180);

    return () => {
      stopped = true;
      controller?.abort();
      if (timer !== null) window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [
    batchSize,
    enabled,
    endpoint,
    normalizedSymbols,
    pollIntervalMs,
    priceMode,
  ]);

  return prices;
}

function toCryptoAsset(asset: InvestmentMarketAsset): CryptoCatalogAsset {
  return {
    id: asset.id,
    name: asset.name,
    symbol: asset.symbol,
    aliases: asset.aliases,
    rank: asset.rank,
    logoUrl: asset.logoUrl,
    binanceSymbol: asset.binanceSymbol,
  };
}

export function useInvestmentMarketPrices(
  assets: readonly InvestmentMarketAsset[],
  enabled: boolean,
) {
  const [assetRevision, setAssetRevision] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    const handleAssetsUpdated = () => setAssetRevision((current) => current + 1);
    window.addEventListener(INVESTMENT_ASSET_UPDATE_EVENT, handleAssetsUpdated);
    return () =>
      window.removeEventListener(INVESTMENT_ASSET_UPDATE_EVENT, handleAssetsUpdated);
  }, [enabled]);

  const binanceCryptoAssets = useMemo(() => {
    void assetRevision;
    return assets
      .filter((asset) => asset.assetType === "crypto" && asset.binanceSymbol)
      .map(toCryptoAsset);
  }, [assetRevision, assets]);
  const stockSymbols = useMemo(() => {
    void assetRevision;
    return assets
      .filter((asset) => asset.assetType === "stock")
      .map((asset) => normalizeProviderSymbol(asset.providerSymbol))
      .filter(Boolean);
  }, [assetRevision, assets]);
  const forexSymbols = useMemo(() => {
    void assetRevision;
    return assets
      .filter((asset) => asset.assetType === "forex")
      .map((asset) => normalizeProviderSymbol(asset.providerSymbol))
      .filter(Boolean);
  }, [assetRevision, assets]);

  const cryptoPrices = useBinanceSearchPrices(
    binanceCryptoAssets,
    enabled && binanceCryptoAssets.length > 0,
  );
  const stockPrices = useRemotePriceStore({
    symbols: stockSymbols,
    enabled: enabled && stockSymbols.length > 0,
    endpoint: "/api/market/stock-prices",
    priceMode: "delayed",
    pollIntervalMs: 60_000,
    batchSize: 12,
  });
  const forexPrices = useRemotePriceStore({
    symbols: forexSymbols,
    enabled: enabled && forexSymbols.length > 0,
    endpoint: "/api/market/forex-prices",
    priceMode: "reference",
    pollIntervalMs: 60_000,
    batchSize: 24,
  });

  return useMemo(() => {
    void assetRevision;
    const result: Record<string, MarketPriceSnapshot> = {};

    for (const asset of assets) {
      if (asset.assetType === "crypto") {
        const snapshot = cryptoPrices[asset.id];
        result[asset.id] = snapshot
          ? {
              price: snapshot.priceUsd,
              currency: "USD",
              change24h: snapshot.change24h,
              updatedAt: snapshot.updatedAt,
              status: snapshot.status,
              source: "binance-realtime",
              priceMode: "realtime",
              marketStatus: "open",
              stale: false,
            }
          : {
              ...EMPTY_SNAPSHOT,
              status: asset.binanceSymbol ? "connecting" : "unavailable",
              priceMode: "realtime",
            };
        continue;
      }

      const providerSymbol = normalizeProviderSymbol(asset.providerSymbol);
      const remote =
        asset.assetType === "stock"
          ? stockPrices[providerSymbol]
          : forexPrices[providerSymbol];
      result[asset.id] =
        remote ?? {
          ...EMPTY_SNAPSHOT,
          status: providerSymbol ? "connecting" : "unavailable",
          priceMode: asset.priceMode,
        };
    }

    return result;
  }, [assetRevision, assets, cryptoPrices, forexPrices, stockPrices]);
}

export function useSelectedInvestmentMarketPrice(
  asset: InvestmentMarketAsset | null,
  enabled: boolean,
) {
  const prices = useInvestmentMarketPrices(asset ? [asset] : [], enabled);
  return asset ? (prices[asset.id] ?? EMPTY_SNAPSHOT) : EMPTY_SNAPSHOT;
}
