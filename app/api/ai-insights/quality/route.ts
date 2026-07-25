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

function safeCount(label: string, result: CountResult) {
  if (result.error) {
    console.error(`AI Insights quality ${label} unavailable`, {
      code: result.error.code,
    });
    return 0;
  }

  return typeof result.count === "number" && result.count >= 0
    ? result.count
    : 0;
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
  if (!value || typeof value !== "object") return 0;
  const count = (value as HistoryRpc).monthCount;
  const parsed = typeof count === "number" ? count : Number(count);
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : 0;
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

  if (latestTransactionResult.error) {
    console.error("AI Insights quality latest transaction unavailable", {
      code: latestTransactionResult.error.code,
    });
  }
  if (historyResult.error) {
    console.error("AI Insights quality history unavailable", {
      code: historyResult.error.code,
    });
  }

  const quality = calculateDataQuality({
    transactionCount: safeCount("transaction count", transactionResult),
    expenseCount: safeCount("expense count", expenseResult),
    uncategorizedExpenseCount: safeCount(
      "uncategorized expense count",
      uncategorizedResult,
    ),
    incomeCount: safeCount("income count", incomeResult),
    activeAccountCount: safeCount("active account count", activeAccountResult),
    monthCount: historyResult.error ? 0 : monthCount(historyResult.data),
    latestTransactionDate: latestTransactionResult.error
      ? null
      : latestDate(latestTransactionResult.data),
  });

  return json({
    generatedAt: new Date().toISOString(),
    windowDays: 90,
    quality,
    analysis: {
      readOnly: true,
      rawRowsSharedWithProvider: false,
      deterministic: true,
    },
  });
}
