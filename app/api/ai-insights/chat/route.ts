import {
  callGeminiProvider,
  describeGeminiProviderError,
  GeminiProviderError,
} from "@/lib/ai-insights/gemini-provider";
import { APP_AI_NAME } from "@/lib/brand";
import {
  buildAIPreferenceInstruction,
  loadAIPreferences,
  type AIPreferences,
} from "@/lib/ai/ai-preferences";
import {
  BASE_CURRENCY,
  isSupportedCurrency,
  normalizeUsdToPkrRate,
  type SupportedCurrency,
} from "@/lib/currency";
import { getAppMonthRange } from "@/lib/dates";
import type { AppLanguage, AppLanguageOption } from "@/lib/i18n/config";
import {
  buildAIResponseLanguageInstruction,
  resolveRequestLanguage,
} from "@/lib/i18n/request-language";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const GEMINI_MODEL_FALLBACK = "gemini-2.5-flash";

interface RawCategory {
  name?: string | null;
}

interface RawTransaction {
  amount?: number | string | null;
  type?: string | null;
  categories?: RawCategory | RawCategory[] | null;
}

interface RawGoal {
  current_amount?: number | string | null;
  target_amount?: number | string | null;
  status?: string | null;
}

interface RawInvestment {
  quantity?: number | string | null;
  purchase_price?: number | string | null;
  current_price?: number | string | null;
}

interface RawPayable {
  remaining_amount?: number | string | null;
  status?: string | null;
}

interface RawAccount {
  balance?: number | string | null;
}

interface ChatSummary {
  period: string;
  currentMonth: {
    income: number;
    expenses: number;
    net: number;
    savingsRate: number;
  };
  netBalance: {
    cashBalance: number;
    investmentValue: number;
    payableRemaining: number;
    estimatedNetWorth: number;
  };
  categorySpendingTotals: { category: string; amount: number }[];
  goalsSummary: {
    count: number;
    completedCount: number;
    completionPct: number;
  };
  investmentSummary: {
    count: number;
    currentValue: number;
    totalPnL: number;
  };
  payablesSummary: {
    count: number;
    remaining: number;
    overdueCount: number;
  };
}

interface CurrencyContext {
  currency: SupportedCurrency;
  rate: number;
  live: boolean;
}

const COPY: Record<
  AppLanguage,
  {
    questionRequired: string;
    authRequired: string;
    unsafe: (name: string) => string;
    localFallback: (name: string, net: string, balance: string) => string;
    followUps: [string, string];
    routeFallback: (name: string) => string;
  }
> = {
  en: {
    questionRequired: "Ask a finance question before sending.",
    authRequired: "Please log in before using AI insights.",
    unsafe: (name) =>
      `${name}, that topic is outside the safe scope of ${APP_AI_NAME}. I can help with finance, accounts, savings, debt, goals, and investments.`,
    localFallback: (name, net, balance) =>
      `${name}, I can still use your verified records. Your current-month net is ${net} and your estimated net balance is ${balance}. Ask for one exact metric, category, asset, or date range for a precise calculation.`,
    followUps: [
      "How much did I spend this month?",
      "How much is currently payable?",
    ],
    routeFallback: (name) =>
      `${name}, I could not read the required finance records, so I did not estimate an answer. Please try again.`,
  },
  ur: {
    questionRequired: "بھیجنے سے پہلے مالی سوال لکھیں۔",
    authRequired: "AI Insights استعمال کرنے سے پہلے لاگ اِن کریں۔",
    unsafe: (name) =>
      `${name}، یہ موضوع ${APP_AI_NAME} کے محفوظ دائرۂ کار سے باہر ہے۔ میں مالیات، اکاؤنٹس، بچت، قرض، اہداف اور سرمایہ کاری میں مدد کر سکتا ہوں۔`,
    localFallback: (name, net, balance) =>
      `${name}، میں آپ کے تصدیق شدہ ریکارڈز کے ساتھ کام جاری رکھ سکتا ہوں۔ اس ماہ آپ کا خالص نتیجہ ${net} اور اندازاً خالص بیلنس ${balance} ہے۔ درست حساب کے لیے ایک مخصوص رقم، کیٹیگری، اثاثہ یا تاریخ پوچھیں۔`,
    followUps: [
      "میں نے اس ماہ کتنا خرچ کیا؟",
      "اس وقت کتنی رقم واجب الادا ہے؟",
    ],
    routeFallback: (name) =>
      `${name}، مطلوبہ مالی ریکارڈ نہیں پڑھ سکا، اس لیے میں نے اندازہ نہیں لگایا۔ دوبارہ کوشش کریں۔`,
  },
  ar: {
    questionRequired: "اكتب سؤالًا ماليًا قبل الإرسال.",
    authRequired: "يرجى تسجيل الدخول قبل استخدام الرؤى الذكية.",
    unsafe: (name) =>
      `${name}، هذا الموضوع خارج النطاق الآمن لـ ${APP_AI_NAME}. يمكنني المساعدة في المال والحسابات والادخار والديون والأهداف والاستثمارات.`,
    localFallback: (name, net, balance) =>
      `${name}، يمكنني الاستمرار باستخدام سجلاتك الموثقة. صافي هذا الشهر هو ${net} وصافي الرصيد التقديري هو ${balance}. اطلب مقياسًا أو فئة أو أصلًا أو فترة زمنية محددة للحصول على حساب دقيق.`,
    followUps: [
      "كم أنفقت هذا الشهر؟",
      "كم المبلغ المستحق حاليًا؟",
    ],
    routeFallback: (name) =>
      `${name}، تعذر قراءة السجلات المالية المطلوبة، لذلك لم أقدّم تقديرًا. حاول مرة أخرى.`,
  },
  hi: {
    questionRequired: "भेजने से पहले वित्त संबंधी प्रश्न लिखें।",
    authRequired: "AI Insights उपयोग करने से पहले लॉग इन करें।",
    unsafe: (name) =>
      `${name}, यह विषय ${APP_AI_NAME} के सुरक्षित दायरे से बाहर है। मैं वित्त, खाते, बचत, कर्ज, लक्ष्य और निवेश में सहायता कर सकता हूँ।`,
    localFallback: (name, net, balance) =>
      `${name}, मैं आपके सत्यापित रिकॉर्ड के साथ काम जारी रख सकता हूँ। इस महीने का शुद्ध परिणाम ${net} और अनुमानित शुद्ध बैलेंस ${balance} है। सटीक गणना के लिए कोई एक मेट्रिक, श्रेणी, संपत्ति या तारीख सीमा पूछें।`,
    followUps: [
      "मैंने इस महीने कितना खर्च किया?",
      "अभी कितनी राशि देय है?",
    ],
    routeFallback: (name) =>
      `${name}, आवश्यक वित्तीय रिकॉर्ड नहीं पढ़े जा सके, इसलिए मैंने अनुमान नहीं लगाया। फिर कोशिश करें।`,
  },
  es: {
    questionRequired: "Escribe una pregunta financiera antes de enviarla.",
    authRequired: "Inicia sesión antes de usar AI Insights.",
    unsafe: (name) =>
      `${name}, ese tema está fuera del alcance seguro de ${APP_AI_NAME}. Puedo ayudarte con finanzas, cuentas, ahorros, deudas, objetivos e inversiones.`,
    localFallback: (name, net, balance) =>
      `${name}, puedo seguir trabajando con tus registros verificados. Tu resultado neto del mes es ${net} y tu saldo neto estimado es ${balance}. Pide una métrica, categoría, activo o período concreto para obtener un cálculo preciso.`,
    followUps: [
      "¿Cuánto gasté este mes?",
      "¿Cuánto está pendiente actualmente?",
    ],
    routeFallback: (name) =>
      `${name}, no pude leer los registros financieros necesarios, así que no hice una estimación. Inténtalo de nuevo.`,
  },
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toNumber(value: number | string | null | undefined) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function round(value: number) {
  const rounded = Math.round(value);
  return Object.is(rounded, -0) ? 0 : rounded;
}

function roundPct(value: number) {
  return Number.isFinite(value) ? Number(value.toFixed(1)) : 0;
}

function getCategoryName(
  category: RawCategory | RawCategory[] | null | undefined,
) {
  const selected = Array.isArray(category) ? category[0] : category;
  return selected?.name?.trim() || "Other";
}

function getCurrencyContext(body: unknown): CurrencyContext {
  if (!isRecord(body)) {
    return {
      currency: BASE_CURRENCY,
      rate: normalizeUsdToPkrRate(undefined),
      live: false,
    };
  }

  return {
    currency:
      typeof body.currency === "string" && isSupportedCurrency(body.currency)
        ? body.currency
        : BASE_CURRENCY,
    rate: normalizeUsdToPkrRate(
      typeof body.rate === "number" || typeof body.rate === "string"
        ? Number(body.rate)
        : undefined,
    ),
    live: body.rateLive === true,
  };
}

function jsonResponse(payload: Record<string, unknown>, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function isUnsafeRequest(question: string) {
  return /\b(?:porn|pornography|nude|nudes|sex|sexual|xxx|escort)\b/i.test(
    question,
  );
}

function cleanName(value: unknown) {
  return typeof value === "string" && value.trim()
    ? value.replace(/\s+/g, " ").trim().slice(0, 80)
    : "Friend";
}

function ensureNamedAnswer(answer: string, displayName: string) {
  const clean = answer.replace(/\s+/g, " ").trim();
  const lowerAnswer = clean.toLocaleLowerCase();
  const lowerName = displayName.toLocaleLowerCase();
  return lowerAnswer.startsWith(lowerName) ? clean : `${displayName}, ${clean}`;
}

async function getChatSummary(
  supabase: Awaited<ReturnType<typeof createClient>>,
) {
  const { year, month, firstDay, lastDay } = getAppMonthRange();
  const [
    transactionsResult,
    goalsResult,
    investmentsResult,
    payablesResult,
    accountsResult,
  ] = await Promise.all([
    supabase
      .from("transactions")
      .select("amount, type, categories(name)")
      .gte("date", firstDay)
      .lte("date", lastDay)
      .is("deleted_at", null),
    supabase
      .from("goals")
      .select("current_amount, target_amount, status"),
    supabase
      .from("investments")
      .select("quantity, purchase_price, current_price"),
    supabase.from("liabilities").select("remaining_amount, status"),
    supabase.from("accounts").select("balance").eq("status", "active"),
  ]);

  if (
    transactionsResult.error ||
    goalsResult.error ||
    investmentsResult.error ||
    payablesResult.error ||
    accountsResult.error
  ) {
    throw new Error("finance_summary_query_failed");
  }

  const transactions = (transactionsResult.data ?? []) as RawTransaction[];
  const goals = (goalsResult.data ?? []) as RawGoal[];
  const investments = (investmentsResult.data ?? []) as RawInvestment[];
  const payables = (payablesResult.data ?? []) as RawPayable[];
  const accounts = (accountsResult.data ?? []) as RawAccount[];

  const income = transactions
    .filter((transaction) => transaction.type === "income")
    .reduce((sum, transaction) => sum + toNumber(transaction.amount), 0);
  const grossExpenses = transactions
    .filter((transaction) => transaction.type === "expense")
    .reduce((sum, transaction) => sum + toNumber(transaction.amount), 0);
  const refunds = transactions
    .filter((transaction) => transaction.type === "refund")
    .reduce((sum, transaction) => sum + toNumber(transaction.amount), 0);
  const expenses = grossExpenses - refunds;
  const net = income - expenses;
  const categoryMap = new Map<string, number>();

  transactions
    .filter(
      (transaction) =>
        transaction.type === "expense" || transaction.type === "refund",
    )
    .forEach((transaction) => {
      const category = getCategoryName(transaction.categories);
      const direction = transaction.type === "refund" ? -1 : 1;
      categoryMap.set(
        category,
        (categoryMap.get(category) ?? 0) +
          direction * toNumber(transaction.amount),
      );
    });

  const totalGoalTarget = goals.reduce(
    (sum, goal) => sum + toNumber(goal.target_amount),
    0,
  );
  const totalGoalSaved = goals.reduce(
    (sum, goal) => sum + toNumber(goal.current_amount),
    0,
  );
  const completedGoals = goals.filter(
    (goal) =>
      goal.status === "completed" ||
      (toNumber(goal.target_amount) > 0 &&
        toNumber(goal.current_amount) >= toNumber(goal.target_amount)),
  ).length;

  let totalInvested = 0;
  let investmentValue = 0;
  investments.forEach((investment) => {
    const quantity = toNumber(investment.quantity);
    totalInvested += quantity * toNumber(investment.purchase_price);
    investmentValue += quantity * toNumber(investment.current_price);
  });

  const payableRemaining = payables.reduce(
    (sum, payable) => sum + toNumber(payable.remaining_amount),
    0,
  );
  const cashBalance = accounts.reduce(
    (sum, account) => sum + toNumber(account.balance),
    0,
  );

  return {
    period: `${year}-${String(month).padStart(2, "0")}`,
    currentMonth: {
      income: round(income),
      expenses: round(expenses),
      net: round(net),
      savingsRate: income > 0 ? roundPct((net / income) * 100) : 0,
    },
    netBalance: {
      cashBalance: round(cashBalance),
      investmentValue: round(investmentValue),
      payableRemaining: round(payableRemaining),
      estimatedNetWorth: round(
        cashBalance + investmentValue - payableRemaining,
      ),
    },
    categorySpendingTotals: Array.from(categoryMap.entries())
      .filter(([, amount]) => amount > 0)
      .map(([category, amount]) => ({ category, amount: round(amount) }))
      .sort((left, right) => right.amount - left.amount)
      .slice(0, 8),
    goalsSummary: {
      count: goals.length,
      completedCount: completedGoals,
      completionPct:
        totalGoalTarget > 0
          ? roundPct((totalGoalSaved / totalGoalTarget) * 100)
          : 0,
    },
    investmentSummary: {
      count: investments.length,
      currentValue: round(investmentValue),
      totalPnL: round(investmentValue - totalInvested),
    },
    payablesSummary: {
      count: payables.length,
      remaining: round(payableRemaining),
      overdueCount: payables.filter((payable) => payable.status === "overdue")
        .length,
    },
  } satisfies ChatSummary;
}

function buildPrompt({
  summary,
  question,
  context,
  language,
  displayName,
  preferences,
}: {
  summary: ChatSummary;
  question: string;
  context: CurrencyContext;
  language: AppLanguageOption;
  displayName: string;
  preferences: AIPreferences;
}) {
  return `You are ${APP_AI_NAME}, a finance and accounts assistant attached to the authenticated user's financial profile.
${buildAIResponseLanguageInstruction(language)}
Address every answer to the user by this exact profile name: ${JSON.stringify(displayName)}.
Answer only finance, accounts, savings, debt, goals, investments, cash-flow, and financial-planning questions.
For an off-topic request, briefly explain that you are a finance and accounts assistant and redirect to a finance use case.
For inappropriate or adult content, give one brief warning and do not continue that topic.
Use only the verified summarized finance data below. Never invent records, names, dates, rates, or calculations.
Use ${context.currency} for every user-facing money value. Stored values are PKR and 1 USD = ${context.rate.toFixed(2)} PKR. ${context.live ? "The exchange rate is live." : "The exchange rate is approximate."}
If the requested answer cannot be calculated exactly from this summary, clearly identify the missing data instead of estimating it.
${buildAIPreferenceInstruction(preferences)}

Verified finance summary:
${JSON.stringify(summary, null, 2)}

User question:
${question}

Return only valid JSON in this exact shape:
{
  "answer": "personalized finance answer",
  "followUps": ["short finance follow-up", "short finance follow-up"]
}`;
}

function parseJsonObject(text: string) {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();

  try {
    return JSON.parse(cleaned) as unknown;
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start < 0 || end <= start) return null;

    try {
      return JSON.parse(cleaned.slice(start, end + 1)) as unknown;
    } catch {
      return null;
    }
  }
}

function answerLimit(preferences: AIPreferences) {
  return preferences.responseLength === "detailed"
    ? 2400
    : preferences.responseLength === "balanced"
      ? 1600
      : 1000;
}

function parseGeminiChat(
  text: string,
  displayName: string,
  preferences: AIPreferences,
) {
  const parsed = parseJsonObject(text);
  if (!isRecord(parsed) || typeof parsed.answer !== "string") return null;

  const answer = ensureNamedAnswer(
    parsed.answer.slice(0, answerLimit(preferences)),
    displayName,
  );
  if (!answer) return null;

  const followUps = Array.isArray(parsed.followUps)
    ? parsed.followUps
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.replace(/\s+/g, " ").trim().slice(0, 120))
        .filter(Boolean)
        .slice(0, 3)
    : [];

  return { answer, followUps };
}

function outputTokenLimit(preferences: AIPreferences) {
  return preferences.responseLength === "detailed"
    ? 1500
    : preferences.responseLength === "balanced"
      ? 1000
      : 650;
}

async function askGemini({
  summary,
  question,
  context,
  language,
  displayName,
  preferences,
}: {
  summary: ChatSummary;
  question: string;
  context: CurrencyContext;
  language: AppLanguageOption;
  displayName: string;
  preferences: AIPreferences;
}) {
  const model =
    process.env.GEMINI_MODEL?.trim().replace(/^models\//, "") ||
    GEMINI_MODEL_FALLBACK;
  const provider = await callGeminiProvider({
    apiKey: process.env.GEMINI_API_KEY,
    model,
    prompt: buildPrompt({
      summary,
      question,
      context,
      language,
      displayName,
      preferences,
    }),
    temperature: 0.15,
    maxOutputTokens: outputTokenLimit(preferences),
  });
  const generated = parseGeminiChat(provider.text, displayName, preferences);
  if (!generated) {
    throw new GeminiProviderError("invalid_ai_response", {
      httpStatus: 502,
      retryable: false,
      correlationId: provider.correlationId,
    });
  }
  return { generated, model, correlationId: provider.correlationId };
}

function providerFailureResponse(error: unknown) {
  const failure = describeGeminiProviderError(error);
  console.warn("AI chat provider request failed", {
    code: failure.code,
    providerStatus: failure.providerStatus,
    correlationId: failure.correlationId,
    retryable: failure.retryable,
  });
  return jsonResponse(
    {
      error: failure.code,
      message: "AI chat is temporarily unavailable. Try again later.",
      retryable: failure.retryable,
      correlationId: failure.correlationId,
    },
    failure.status,
  );
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as unknown;
  const language = resolveRequestLanguage(request, body);
  const copy = COPY[language.code];
  const question =
    isRecord(body) && typeof body.question === "string"
      ? body.question.replace(/\s+/g, " ").trim().slice(0, 500)
      : "";
  if (!question) {
    return jsonResponse(
      { error: "question_required", message: copy.questionRequired },
      400,
    );
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return jsonResponse(
        { error: "authentication_required", message: copy.authRequired },
        401,
      );
    }

    const metadataName = cleanName(user.user_metadata?.full_name);
    const profileResult =
      metadataName !== "Friend"
        ? null
        : await supabase
            .from("profiles")
            .select("full_name")
            .eq("id", user.id)
            .maybeSingle();
    const displayName =
      profileResult?.data?.full_name?.trim() || metadataName || "Friend";
    if (isUnsafeRequest(question)) {
      return jsonResponse({
        provider: "local-safety",
        model: "finance-safety-v1",
        aiAvailable: true,
        fallback: false,
        deterministic: true,
        answer: copy.unsafe(displayName),
        followUps: copy.followUps,
      });
    }

    const [summary, preferences, context] = await Promise.all([
      getChatSummary(supabase),
      loadAIPreferences(supabase, user.id),
      Promise.resolve(getCurrencyContext(body)),
    ]);
    const provider = await askGemini({
      summary,
      question,
      context,
      language,
      displayName,
      preferences,
    });

    return jsonResponse({
      provider: "gemini",
      model: provider.model,
      providerCorrelationId: provider.correlationId,
      aiAvailable: true,
      fallback: false,
      deterministic: false,
      language: language.code,
      preferenceMode: preferences.responseLength,
      ...provider.generated,
    });
  } catch (error) {
    if (error instanceof GeminiProviderError) {
      return providerFailureResponse(error);
    }
    console.error("AI chat route failed", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
    return jsonResponse(
      {
        error: "ai_chat_unavailable",
        message: "AI chat is temporarily unavailable. Try again later.",
        retryable: true,
        correlationId: null,
      },
      503,
    );
  }
}
