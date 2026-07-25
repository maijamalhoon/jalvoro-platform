import { NextResponse } from "next/server";

import { calculateDataQuality } from "@/lib/ai-insights/workspace";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type CountResult = {
  count: number | null;
  error: { code?: string; message?: string } | null;
};

type HistoryRpc = {
  monthCount?: unknown;
};

function json(payload: Record<string, unknown>, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function readCount(result: CountResult) {
  return typeof result.count === "number" && result.count >= 0
    ? result.count
    : null;
}

function getStartDate(days: number) {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

function latestDate(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const date = (value as { date?: unknown }).date;
  return typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date)
    ? date
    : null;
}

function monthCount(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const count = (value as HistoryRpc).monthCount;
  const parsed = typeof count === "number" ? count : Number(count);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed) : null;
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return json(
      {
        error: "authentication_required",
        message: "Please log in before reviewing AI data quality.",
      },
      401,
    );
  }

  const startDate = getStartDate(90);
  const [
    transactionResult,
    expenseResult,
    uncategorizedResult,
    incomeResult,
    activeAccountResult,
    latestTransactionResult,
    historyResult,
  ] = await Promise.all([
    supabase
      .from("transactions")
      .select("*", { count: "exact", head: true })
      .gte("date", startDate)
      .is("deleted_at", null),
    supabase
      .from("transactions")
      .select("*", { count: "exact", head: true })
      .gte("date", startDate)
      .in("type", ["expense", "refund"])
      .is("deleted_at", null),
    supabase
      .from("transactions")
      .select("*", { count: "exact", head: true })
      .gte("date", startDate)
      .in("type", ["expense", "refund"])
      .is("category_id", null)
      .is("deleted_at", null),
    supabase
      .from("transactions")
      .select("*", { count: "exact", head: true })
      .gte("date", startDate)
      .eq("type", "income")
      .is("deleted_at", null),
    supabase
      .from("accounts")
      .select("*", { count: "exact", head: true })
      .eq("status", "active"),
    supabase
      .from("transactions")
      .select("date")
      .is("deleted_at", null)
      .order("date", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.rpc("get_ai_finance_history_analysis"),
  ]);

  const sources = [
    ["transaction_count", transactionResult.error],
    ["expense_count", expenseResult.error],
    ["uncategorized_count", uncategorizedResult.error],
    ["income_count", incomeResult.error],
    ["active_account_count", activeAccountResult.error],
    ["latest_transaction", latestTransactionResult.error],
    ["history", historyResult.error],
  ] as const;
  const unavailableSources = sources
    .filter(([, error]) => Boolean(error))
    .map(([source, error]) => {
      console.error(`AI Insights quality ${source} unavailable`, {
        code:
          error && typeof error === "object" && "code" in error
            ? String(error.code)
            : undefined,
      });
      return source;
    });

  const counts = {
    transactionCount: readCount(transactionResult),
    expenseCount: readCount(expenseResult),
    uncategorizedExpenseCount: readCount(uncategorizedResult),
    incomeCount: readCount(incomeResult),
    activeAccountCount: readCount(activeAccountResult),
    monthCount: historyResult.error ? null : monthCount(historyResult.data),
  };
  const latest = latestTransactionResult.error
    ? null
    : latestDate(latestTransactionResult.data);

  if (
    unavailableSources.length ||
    Object.values(counts).some((value) => value === null)
  ) {
    return json(
      {
        available: false,
        error: "quality_sources_unavailable",
        message:
          "AI data quality could not be verified because one or more record sources are unavailable.",
        unavailableSources,
      },
      503,
    );
  }

  const quality = calculateDataQuality({
    transactionCount: counts.transactionCount!,
    expenseCount: counts.expenseCount!,
    uncategorizedExpenseCount: counts.uncategorizedExpenseCount!,
    incomeCount: counts.incomeCount!,
    activeAccountCount: counts.activeAccountCount!,
    monthCount: counts.monthCount!,
    latestTransactionDate: latest,
  });

  return json({
    available: true,
    generatedAt: new Date().toISOString(),
    windowDays: 90,
    quality,
    analysis: {
      readOnly: true,
      rawRowsSharedWithProvider: false,
      deterministic: true,
      syntheticZerosOnError: false,
    },
  });
}
