import { NextRequest, NextResponse } from "next/server";

import {
  BASE_CURRENCY,
  formatMoney,
  isSupportedCurrency,
  normalizeUsdToPkrRate,
} from "@/lib/currency";
import {
  buildDeterministicActions,
  buildDeterministicInsights,
  buildDeterministicSummaryCards,
  calculateFinanceHealthScore,
} from "@/lib/ai-insights/deterministic-briefing";
import { getAIInsightsCopy } from "@/lib/ai-insights/copy";
import {
  AIInsightsSourceError,
  loadAIInsightsServerData,
} from "@/lib/ai-insights/server-summary";
import { resolveRequestLanguage } from "@/lib/i18n/request-language";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function json(payload: Record<string, unknown>, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function healthLabel(score: number, copy: ReturnType<typeof getAIInsightsCopy>) {
  if (score >= 80) return copy.health.excellent;
  if (score >= 65) return copy.health.good;
  if (score >= 45) return copy.health.fair;
  return copy.health.attention;
}

export async function GET(request: NextRequest) {
  const language = resolveRequestLanguage(request);
  const copy = getAIInsightsCopy(language.code);
  const currencyValue = request.nextUrl.searchParams.get("currency");
  const currency = isSupportedCurrency(currencyValue)
    ? currencyValue
    : BASE_CURRENCY;
  const rate = normalizeUsdToPkrRate(
    Number(request.nextUrl.searchParams.get("rate")),
  );
  const rateLive = request.nextUrl.searchParams.get("rateLive") === "true";
  const money = (value: number) =>
    formatMoney(value, { currency, usdToPkrRate: rate });

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return json(
      {
        error: "authentication_required",
        message: copy.server.authRequired,
      },
      401,
    );
  }

  try {
    const data = await loadAIInsightsServerData(supabase);
    const generatedAt = new Date().toISOString();
    const score = calculateFinanceHealthScore(data.summary);
    const providerAvailable = Boolean(process.env.GEMINI_API_KEY?.trim());
    const displaySummary = {
      ...data.summary,
      displayCurrency: currency,
      exchangeRate: {
        usdToPkr: rate,
        live: rateLive,
      },
    };

    if (!data.hasFinanceData) {
      return json({
        empty: true,
        message: copy.server.emptyMessage,
        provider: "local-calculator",
        model: "deterministic-finance-briefing-v2",
        providerAvailable,
        aiAvailable: providerAvailable,
        responseAvailable: true,
        intelligenceMode: "local-calculation",
        generatedAt,
        dataThrough: data.dataThrough,
        language: language.code,
        locale: language.locale,
        healthScore: score,
        healthLabel: healthLabel(score, copy),
        summaryCards: buildDeterministicSummaryCards(
          data.summary,
          copy,
          money,
        ),
        financeSummary: displaySummary,
        coverage: data.coverage,
        insights: [],
        suggestedActions: [],
      });
    }

    return json({
      provider: "local-calculator",
      model: "deterministic-finance-briefing-v2",
      providerAvailable,
      aiAvailable: providerAvailable,
      responseAvailable: true,
      intelligenceMode: "local-calculation",
      generatedAt,
      dataThrough: data.dataThrough,
      language: language.code,
      locale: language.locale,
      healthScore: score,
      healthLabel: healthLabel(score, copy),
      summaryCards: buildDeterministicSummaryCards(data.summary, copy, money),
      financeSummary: displaySummary,
      coverage: data.coverage,
      insights: buildDeterministicInsights(data.summary, copy, money),
      suggestedActions: buildDeterministicActions(data.summary, copy),
      analysis: {
        deterministic: true,
        readOnly: true,
        providerRequestAdded: false,
        rawRowsSharedWithProvider: false,
        sourceFailuresBecomeZero: false,
      },
    });
  } catch (error) {
    console.error("AI Insights overview unavailable", {
      name: error instanceof Error ? error.name : "UnknownError",
      source: error instanceof AIInsightsSourceError ? error.source : undefined,
      code: error instanceof AIInsightsSourceError ? error.code : undefined,
    });
    return json(
      {
        error: "finance_sources_unavailable",
        message: copy.server.unavailable,
      },
      503,
    );
  }
}
