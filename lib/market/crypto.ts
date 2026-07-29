import { getUsdToPkrRate } from "@/lib/exchange-rate";

const COINGECKO_API_BASE = "https://api.coingecko.com/api/v3";
const MAX_SEARCH_RESULTS = 8;
const MAX_PRICE_IDS = 50;

export type CryptoSearchResult = {
  id: string;
  name: string;
  symbol: string;
  thumb: string | null;
  large: string | null;
  marketCapRank: number | null;
};

export type CryptoPrice = {
  usd: number | null;
  pkr: number | null;
  change24h: number | null;
  lastUpdatedAt: string | null;
  imageUrl: string | null;
};

export type CryptoPriceResponse = {
  prices: Record<string, CryptoPrice>;
  live: boolean;
};

type CoinGeckoSearchCoin = {
  id?: unknown;
  name?: unknown;
  symbol?: unknown;
  thumb?: unknown;
  large?: unknown;
  market_cap_rank?: unknown;
};

type CoinGeckoSearchResponse = {
  coins?: CoinGeckoSearchCoin[];
};

type CoinGeckoMarketRow = {
  id?: unknown;
  image?: unknown;
  current_price?: unknown;
  price_change_percentage_24h?: unknown;
  last_updated?: unknown;
};

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function toNumberOrNull(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function normalizeCoin(coin: CoinGeckoSearchCoin): CryptoSearchResult | null {
  if (
    !isNonEmptyString(coin.id) ||
    !isNonEmptyString(coin.name) ||
    !isNonEmptyString(coin.symbol)
  ) {
    return null;
  }

  return {
    id: coin.id,
    name: coin.name,
    symbol: coin.symbol.toUpperCase(),
    thumb: isNonEmptyString(coin.thumb) ? coin.thumb : null,
    large: isNonEmptyString(coin.large) ? coin.large : null,
    marketCapRank: toNumberOrNull(coin.market_cap_rank),
  };
}

export function normalizeCryptoIds(ids: string[]) {
  return Array.from(
    new Set(
      ids
        .map((id) => id.trim().toLowerCase())
        .filter(
          (id) =>
            /^[a-z0-9._-]+$/.test(id) &&
            !["__proto__", "constructor", "prototype"].includes(id),
        ),
    ),
  ).slice(0, MAX_PRICE_IDS);
}

export async function searchCryptoAssets(query: string) {
  const cleanQuery = query.trim();

  if (cleanQuery.length < 2) {
    return [];
  }

  const params = new URLSearchParams({ query: cleanQuery });
  const response = await fetch(`${COINGECKO_API_BASE}/search?${params}`, {
    headers: { accept: "application/json" },
    next: { revalidate: 300 },
  });

  if (!response.ok) {
    const error = new Error("CoinGecko search failed");
    error.name = response.status === 429 ? "RateLimitError" : "MarketApiError";
    throw error;
  }

  const data = (await response.json()) as CoinGeckoSearchResponse;

  return (data.coins ?? [])
    .map(normalizeCoin)
    .filter((coin): coin is CryptoSearchResult => Boolean(coin))
    .slice(0, MAX_SEARCH_RESULTS);
}

export async function getCryptoPrices(ids: string[]): Promise<CryptoPriceResponse> {
  const cryptoIds = normalizeCryptoIds(ids);

  if (cryptoIds.length === 0) {
    return { prices: {}, live: false };
  }

  const params = new URLSearchParams({
    ids: cryptoIds.join(","),
    vs_currency: "usd",
    price_change_percentage: "24h",
    precision: "full",
  });

  const [marketResponse, exchangeRate] = await Promise.all([
    fetch(`${COINGECKO_API_BASE}/coins/markets?${params}`, {
      headers: { accept: "application/json" },
      next: { revalidate: 60 },
    }),
    getUsdToPkrRate(),
  ]);

  if (!marketResponse.ok) {
    const error = new Error("CoinGecko market lookup failed");
    error.name = marketResponse.status === 429 ? "RateLimitError" : "MarketApiError";
    throw error;
  }

  const data = (await marketResponse.json()) as CoinGeckoMarketRow[];
  const marketRows = new Map(
    data
      .filter((row) => isNonEmptyString(row.id))
      .map((row) => [String(row.id).trim().toLowerCase(), row]),
  );

  const prices = Object.fromEntries(
    cryptoIds.map((id) => {
      const row = marketRows.get(id);
      const usd = toNumberOrNull(row?.current_price);

      return [
        id,
        {
          usd,
          pkr: usd === null ? null : usd * exchangeRate.rate,
          change24h: toNumberOrNull(row?.price_change_percentage_24h),
          lastUpdatedAt: isNonEmptyString(row?.last_updated)
            ? row.last_updated
            : null,
          imageUrl: isNonEmptyString(row?.image) ? row.image : null,
        },
      ];
    }),
  ) as Record<string, CryptoPrice>;

  return { prices, live: marketResponse.ok };
}
