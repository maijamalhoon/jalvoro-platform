import { NextRequest, NextResponse } from "next/server";

import { BASE_CURRENCY, isSupportedCurrency } from "@/lib/currency";
import { formatDateKey, getAppMonthRange } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const TRUST_LIMITATIONS = [
  "recorded-data-only",
  "categorized-data-quality",
  "informational-not-advice",
] as const;

type CoverageConfidence = "high" | "medium" | "low" | "unknown";
type CoverageCount = number | null;

type CoverageCounts = {
  transactions: CoverageCount;
  goals: CoverageCount;
  investments: CoverageCount;
  payables: CoverageCount;
  activeAccounts: CoverageCount;
};

type CountResult = {
  count: number | null;
  error: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getSafeCount(label: string, result: CountResult): CoverageCount {
  if (result.error) {
    const error = isRecord(result.error) ? result.error : null;
    console.error(`AI insights trust ${label} count unavailable`, {
      code: typeof error?.code === "string" ? error.code : undefined,
    });
    return null;
  }

  return typeof result.count === "number" && result.count >= 0
    ? result.count
    : 0;
}

function getTrendStart(year: number, month: number) {
  const start = new Date(Date.UTC(year, month - 3, 1));
  return formatDateKey(start.getUTCFullYear(), start.getUTCMonth() + 1, 1);
}

function getCoverageConfidence(counts: CoverageCounts): CoverageConfidence {
  const availableCounts = Object.values(counts).filter(
    (count): count is number => typeof count === "number",
  );

  if (availableCounts.length !== Object.keys(counts).length) return "unknown";

  const sourceCount = availableCounts.filter((count) => count > 0).length;
  const transactions = counts.transactions ?? 0;

  if (transactions >= 30 && sourceCount >= 3) return "high";
  if (transactions >= 8 || sourceCount >= 2) return "medium";
  return "low";
}

function getLatestTransactionDate(value: unknown) {
  if (!isRecord(value)) return null;
  return typeof value.date === "string" && value.date.length > 0
    ? value.date
    : null;
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      {
        error: "authentication_required",
        message: "Please log in before using AI insights.",
      },
      {
        status: 401,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }

  const { year, month, firstDay, lastDay } = getAppMonthRange();
  const trendStart = getTrendStart(year, month);
  const currencyValue = request.nextUrl.searchParams.get("currency");
  const displayCurrency = isSupportedCurrency(currencyValue)
    ? currencyValue
    : BASE_CURRENCY;
  const rateLive = request.nextUrl.searchParams.get("rateLive") === "true";

  const [
    transactionCountResult,
    goalCountResult,
    investmentCountResult,
    payableCountResult,
    accountCountResult,
    latestTransactionResult,
  ] = await Promise.all([
    supabase
      .from("transactions")
      .select("*", { count: "exact", head: true })
      .gte("date", trendStart)
      .lte("date", lastDay),
    supabase.from("goals").select("*", { count: "exact", head: true }),
    supabase.from("investments").select("*", { count: "exact", head: true }),
    supabase.from("liabilities").select("*", { count: "exact", head: true }),
    supabase
      .from("accounts")
      .select("*", { count: "exact", head: true })
      .eq("status", "active"),
    supabase
      .from("transactions")
      .select("date")
      .order("date", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const coverage: CoverageCounts = {
    transactions: getSafeCount("transactions", transactionCountResult),
    goals: getSafeCount("goals", goalCountResult),
    investments: getSafeCount("investments", investmentCountResult),
    payables: getSafeCount("payables", payableCountResult),
    activeAccounts: getSafeCount("active accounts", accountCountResult),
  };
  const sourceCount = Object.values(coverage).filter(
    (count) => typeof count === "number" && count > 0,
  ).length;
  const coverageStatus = Object.values(coverage).some((count) => count === null)
    ? "partial"
    : "complete";
  const dataThrough = latestTransactionResult.error
    ? null
    : getLatestTransactionDate(latestTransactionResult.data);

  if (latestTransactionResult.error) {
    const error = isRecord(latestTransactionResult.error)
      ? latestTransactionResult.error
      : null;
    console.error("AI insights trust latest transaction unavailable", {
      code: typeof error?.code === "string" ? error.code : undefined,
    });
  }

  return NextResponse.json(
    {
      generatedAt: new Date().toISOString(),
      dataThrough,
      period: {
        currentMonthStart: firstDay,
        currentMonthEnd: lastDay,
        trendStart,
      },
      coverage,
      coverageStatus,
      sourceCount,
      coverageConfidence: getCoverageConfidence(coverage),
      analysis: {
        scope: "aggregated-finance-summary",
        readOnly: true,
        rawRowsSharedWithProvider: false,
        providerMode: process.env.GEMINI_API_KEY?.trim()
          ? "gemini"
          : "safe-local-fallback",
      },
      display: {
        currency: displayCurrency,
        exchangeRateLive: rateLive,
      },
      limitations: TRUST_LIMITATIONS,
    },
    {
      headers: {
        "Cache-Control": "private, no-store, max-age=0",
      },
    },
  );
}
