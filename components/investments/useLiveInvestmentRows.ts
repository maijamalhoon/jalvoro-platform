"use client";

import { useEffect, useMemo, useState } from "react";

import { useCurrency } from "@/components/currency/CurrencyProvider";
import { useInvestmentMarketPrices } from "@/components/investments/useInvestmentMarketPrices";
import {
  BASE_CURRENCY,
  convertMoney,
  isSupportedCurrency,
  type SupportedCurrency,
} from "@/lib/currency";
import type { InvestmentLike } from "@/lib/investments/aggregation";
import { normalizeInvestmentMarketType } from "@/lib/investments/type-normalization";
import { loadRuntimeCryptoCatalog } from "@/lib/market/crypto-catalog-client";
import {
  getInvestmentAssetCatalog,
  type InvestmentMarketAsset,
} from "@/lib/market/investment-asset-catalog";

function normalize(value: string | null | undefined) {
  return (value ?? "").trim();
}

function fallbackBinancePair(symbol: string) {
  const normalized = symbol.trim().toUpperCase();
  if (!/^[A-Z0-9]{2,16}$/.test(normalized)) return null;
  if (normalized === "USDT") return null;
  if (normalized === "BTT") return "BTTCUSDT";
  return `${normalized}USDT`;
}

function getCurrentCurrency(
  investment: InvestmentLike,
  fallback: SupportedCurrency,
) {
  const raw = String(
    (investment as InvestmentLike & { current_price_currency?: unknown })
      .current_price_currency ?? "",
  )
    .trim()
    .toUpperCase();
  return isSupportedCurrency(raw) ? raw : fallback;
}

function createFallbackAsset(
  investment: InvestmentLike,
): InvestmentMarketAsset | null {
  const symbol = normalize(investment.symbol).toUpperCase();
  if (!symbol) return null;

  const source = normalize(investment.price_source).toLowerCase();
  const resolvedType =
    normalizeInvestmentMarketType(investment.type) ??
    (source.includes("binance") || source.includes("coingecko")
      ? "crypto"
      : null);
  if (!resolvedType) return null;

  const assetId = normalize(investment.asset_id).toLowerCase();
  const name = normalize(investment.name) || symbol;
  const imageUrl = normalize(investment.image_url);

  if (resolvedType === "crypto") {
    return {
      id: assetId || `crypto-symbol-${symbol.toLowerCase()}`,
      name,
      symbol,
      aliases: [],
      rank: 999_999,
      logoUrl: imageUrl,
      assetType: "crypto",
      quoteCurrency: "USD",
      priceMode: "realtime",
      providerSymbol: fallbackBinancePair(symbol),
      binanceSymbol: fallbackBinancePair(symbol),
    };
  }

  if (resolvedType === "stock") {
    const quoteCurrency = getCurrentCurrency(investment, "USD");
    return {
      id: assetId || `stock-symbol-${symbol.toLowerCase()}`,
      name,
      symbol,
      aliases: [],
      rank: 999_999,
      logoUrl: imageUrl,
      assetType: "stock",
      quoteCurrency,
      priceMode: "delayed",
      providerSymbol: symbol,
      binanceSymbol: null,
    };
  }

  const compactPair = symbol.replace(/[^A-Z]/g, "");
  if (compactPair.length !== 6) return null;
  const base = compactPair.slice(0, 3);
  const quote = compactPair.slice(3, 6);
  if (!isSupportedCurrency(base) || !isSupportedCurrency(quote)) return null;

  return {
    id: assetId || `forex-${base.toLowerCase()}-${quote.toLowerCase()}`,
    name,
    symbol: `${base}/${quote}`,
    aliases: [],
    rank: 999_999,
    logoUrl: imageUrl,
    assetType: "forex",
    quoteCurrency: quote,
    priceMode: "reference",
    providerSymbol: `${base}-${quote}`,
    binanceSymbol: null,
  };
}

export function useLiveInvestmentRows<T extends InvestmentLike>(investments: T[]) {
  const { rates } = useCurrency();
  const [catalog, setCatalog] = useState(() => getInvestmentAssetCatalog());

  useEffect(() => {
    let active = true;
    void loadRuntimeCryptoCatalog().then(() => {
      if (active) setCatalog(getInvestmentAssetCatalog());
    });
    return () => {
      active = false;
    };
  }, []);

  const catalogIndex = useMemo(() => {
    const byId = new Map<string, InvestmentMarketAsset>();
    const byTypeAndSymbol = new Map<string, InvestmentMarketAsset>();

    for (const asset of catalog) {
      byId.set(asset.id.toLowerCase(), asset);
      byTypeAndSymbol.set(
        `${asset.assetType}:${asset.symbol.toUpperCase()}`,
        asset,
      );
    }

    return { byId, byTypeAndSymbol };
  }, [catalog]);

  const resolved = useMemo(() => {
    const assetsByKey = new Map<string, InvestmentMarketAsset>();
    const investmentAssetKeys = new Map<string, string>();

    for (const investment of investments) {
      const assetId = normalize(investment.asset_id).toLowerCase();
      const symbol = normalize(investment.symbol).toUpperCase();
      const type = normalizeInvestmentMarketType(investment.type);
      const catalogAsset =
        (assetId ? catalogIndex.byId.get(assetId) : undefined) ??
        (assetId ? catalogIndex.byId.get(`crypto-${assetId}`) : undefined) ??
        (type && symbol
          ? catalogIndex.byTypeAndSymbol.get(`${type}:${symbol}`)
          : undefined);
      const asset = catalogAsset ?? createFallbackAsset(investment);
      if (!asset) continue;

      assetsByKey.set(asset.id, asset);
      investmentAssetKeys.set(investment.id, asset.id);
    }

    return {
      assets: Array.from(assetsByKey.values()),
      assetsByKey,
      investmentAssetKeys,
    };
  }, [catalogIndex, investments]);

  const prices = useInvestmentMarketPrices(
    resolved.assets,
    resolved.assets.length > 0,
  );

  return useMemo(() => {
    return investments.map((investment) => {
      const assetKey = resolved.investmentAssetKeys.get(investment.id);
      const asset = assetKey ? resolved.assetsByKey.get(assetKey) : undefined;
      const snapshot = assetKey ? prices[assetKey] : undefined;
      const investmentWithCanonicalLogo =
        asset?.logoUrl && asset.logoUrl !== normalize(investment.image_url)
          ? ({ ...investment, image_url: asset.logoUrl } as T)
          : investment;

      if (
        snapshot?.status !== "live" ||
        snapshot.price === null ||
        !snapshot.currency ||
        !Number.isFinite(snapshot.price) ||
        snapshot.price <= 0
      ) {
        return investmentWithCanonicalLogo;
      }

      const currentPricePkr = convertMoney(
        snapshot.price,
        snapshot.currency,
        BASE_CURRENCY,
        rates,
      );
      if (!Number.isFinite(currentPricePkr) || currentPricePkr <= 0) {
        return investmentWithCanonicalLogo;
      }

      return {
        ...investmentWithCanonicalLogo,
        current_price: currentPricePkr,
        current_price_original: snapshot.price,
        current_price_currency: snapshot.currency,
        price_source: snapshot.source,
        price_currency: BASE_CURRENCY,
        price_updated_at:
          snapshot.updatedAt ?? investment.price_updated_at ?? null,
        price_change_24h: snapshot.change24h,
        is_live_priced: true,
      } as T;
    });
  }, [
    investments,
    prices,
    rates,
    resolved.assetsByKey,
    resolved.investmentAssetKeys,
  ]);
}
