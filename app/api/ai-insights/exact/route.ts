import {
  buildAssetBreakdownAnswer,
  isAssetBreakdownRequest,
} from "@/lib/ai/asset-breakdown";
import {
  buildDeterministicFinanceAnswer,
  parseDeterministicFinanceQuestion,
  parseFinanceDateRange,
  type DeterministicFinanceData,
  type DeterministicFinanceIntent,
  type FinancePayableRecord,
} from "@/lib/ai/deterministic-finance-chat";
import { localizeVerifiedFinanceAnswer } from "@/lib/ai/localized-finance-answer";
import { normalizeMultilingualFinanceQuestion } from "@/lib/ai/multilingual-finance-normalizer";
import {
  BASE_CURRENCY,
  formatMoney,
  isSupportedCurrency,
  normalizeUsdToPkrRate,
  type SupportedCurrency,
} from "@/lib/currency";
import { getAppDateParts } from "@/lib/dates";
import { getPayableStatus } from "@/lib/finance-options";
import type { AppLanguage } from "@/lib/i18n/config";
import { resolveRequestLanguage } from "@/lib/i18n/request-language";
import { aiServiceFailure } from "@/lib/ai-insights/failure";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { POST as postFallbackChat } from "../chat/route";

export const dynamic = "force-dynamic";

const CHAT_CONTEXT_COOKIE = "jamals_finance_chat_context";
const CHAT_CONTEXT_MAX_AGE = 60 * 30;
const ASSET_CONTEXT_QUESTION =
  "How many assets do I have and what are their names and values?";

type CurrencyContext = {
  currency: SupportedCurrency;
  rate: number;
};

type RawPayable = {
  remaining_amount?: number | string | null;
  due_date?: string | null;
  status?: string | null;
};

type DirectChatAnswer = {
  answer: string;
  followUps: string[];
};

const COPY: Record<
  AppLanguage,
  {
    questionRequired: string;
    authRequired: string;
    addIncome: (name: string) => string;
    greeting: (name: string) => string;
    correction: (name: string) => string;
    dataUnavailable: (name: string) => string;
    addIncomeFollowUps: [string, string];
    greetingFollowUps: [string, string];
    correctionFollowUps: [string, string];
  }
> = {
  en: {
    questionRequired: "Ask a finance question before sending.",
    authRequired: "Please log in before using AI insights.",
    addIncome: (name) =>
      `${name}, open the Income page from the dashboard navigation, select Add Income, enter the amount, source, account, and date, then save it. The entry will appear in Income and Transactions.`,
    greeting: (name) =>
      `${name}, ask me for an exact spending, income, account, payable, or investment calculation. You can include a date, week, month, year, category, or asset name.`,
    correction: (name) =>
      `${name}, sorry that answer did not follow your question correctly. Ask the full finance question again, or give only the missing date or category and I will apply it to your previous finance question.`,
    dataUnavailable: (name) =>
      `${name}, I could not read the required finance records, so I did not estimate an answer. Please try again.`,
    addIncomeFollowUps: [
      "How much did I earn this month?",
      "How many income entries do I have?",
    ],
    greetingFollowUps: [
      "How much did I spend this month?",
      "How many assets do I have and what are their names?",
    ],
    correctionFollowUps: [
      "How much did I spend on July 16, 2026?",
      "How many assets do I have and what are their names?",
    ],
  },
  ur: {
    questionRequired: "بھیجنے سے پہلے مالی سوال لکھیں۔",
    authRequired: "AI Insights استعمال کرنے سے پہلے لاگ اِن کریں۔",
    addIncome: (name) =>
      `${name}، ڈیش بورڈ نیویگیشن سے Income صفحہ کھولیں، Add Income منتخب کریں، رقم، ذریعہ، اکاؤنٹ اور تاریخ درج کرکے محفوظ کریں۔ نئی انٹری Income اور Transactions میں نظر آئے گی۔`,
    greeting: (name) =>
      `${name}، خرچ، آمدنی، اکاؤنٹس، واجب الادا رقم یا سرمایہ کاری کا درست حساب پوچھیں۔ آپ تاریخ، ہفتہ، مہینہ، سال، کیٹیگری یا اثاثے کا نام بھی دے سکتے ہیں۔`,
    correction: (name) =>
      `${name}، معذرت، پچھلا جواب آپ کے سوال کے مطابق نہیں تھا۔ مکمل مالی سوال دوبارہ لکھیں، یا صرف رہ جانے والی تاریخ یا کیٹیگری دیں؛ میں اسے پچھلے سوال پر لاگو کر دوں گا۔`,
    dataUnavailable: (name) =>
      `${name}، مطلوبہ مالی ریکارڈ نہیں پڑھ سکا، اس لیے میں نے اندازہ نہیں لگایا۔ دوبارہ کوشش کریں۔`,
    addIncomeFollowUps: [
      "میں نے اس ماہ کتنی آمدنی حاصل کی؟",
      "میری کتنی آمدنی انٹریز ہیں؟",
    ],
    greetingFollowUps: [
      "میں نے اس ماہ کتنا خرچ کیا؟",
      "میرے کتنے اثاثے ہیں اور ان کے نام کیا ہیں؟",
    ],
    correctionFollowUps: [
      "میں نے 16 جولائی 2026 کو کتنا خرچ کیا؟",
      "میرے کتنے اثاثے ہیں اور ان کے نام کیا ہیں؟",
    ],
  },
  ar: {
    questionRequired: "اكتب سؤالًا ماليًا قبل الإرسال.",
    authRequired: "يرجى تسجيل الدخول قبل استخدام AI Insights.",
    addIncome: (name) =>
      `${name}، افتح صفحة الدخل من لوحة التحكم، واختر إضافة دخل، ثم أدخل المبلغ والمصدر والحساب والتاريخ واحفظه. سيظهر السجل في الدخل والمعاملات.`,
    greeting: (name) =>
      `${name}، اسألني عن حساب دقيق للإنفاق أو الدخل أو الحسابات أو المستحقات أو الاستثمارات. يمكنك تحديد تاريخ أو أسبوع أو شهر أو سنة أو فئة أو اسم أصل.`,
    correction: (name) =>
      `${name}، عذرًا، لم يتبع الرد السابق سؤالك بشكل صحيح. اكتب السؤال المالي كاملًا مرة أخرى، أو أرسل التاريخ أو الفئة الناقصة فقط وسأطبقها على سؤالك السابق.`,
    dataUnavailable: (name) =>
      `${name}، تعذر قراءة السجلات المالية المطلوبة، لذلك لم أقدّم تقديرًا. حاول مرة أخرى.`,
    addIncomeFollowUps: [
      "كم كسبت هذا الشهر؟",
      "كم عدد سجلات الدخل لدي؟",
    ],
    greetingFollowUps: [
      "كم أنفقت هذا الشهر؟",
      "كم عدد أصولي وما أسماؤها؟",
    ],
    correctionFollowUps: [
      "كم أنفقت في 16 يوليو 2026؟",
      "كم عدد أصولي وما أسماؤها؟",
    ],
  },
  hi: {
    questionRequired: "भेजने से पहले वित्त संबंधी प्रश्न लिखें।",
    authRequired: "AI Insights उपयोग करने से पहले लॉग इन करें।",
    addIncome: (name) =>
      `${name}, डैशबोर्ड नेविगेशन से Income पेज खोलें, Add Income चुनें, राशि, स्रोत, खाता और तारीख दर्ज करके सेव करें। नई एंट्री Income और Transactions में दिखाई देगी।`,
    greeting: (name) =>
      `${name}, खर्च, आय, खाते, देय राशि या निवेश की सटीक गणना पूछें। आप तारीख, सप्ताह, महीना, वर्ष, श्रेणी या संपत्ति का नाम भी दे सकते हैं।`,
    correction: (name) =>
      `${name}, क्षमा करें, पिछला उत्तर आपके प्रश्न के अनुसार नहीं था। पूरा वित्तीय प्रश्न फिर से लिखें, या केवल छूटी हुई तारीख या श्रेणी दें; मैं उसे पिछले प्रश्न पर लागू कर दूँगा।`,
    dataUnavailable: (name) =>
      `${name}, आवश्यक वित्तीय रिकॉर्ड नहीं पढ़े जा सके, इसलिए मैंने अनुमान नहीं लगाया। फिर कोशिश करें।`,
    addIncomeFollowUps: [
      "मैंने इस महीने कितनी आय कमाई?",
      "मेरी कितनी आय एंट्रियाँ हैं?",
    ],
    greetingFollowUps: [
      "मैंने इस महीने कितना खर्च किया?",
      "मेरे पास कितनी संपत्तियाँ हैं और उनके नाम क्या हैं?",
    ],
    correctionFollowUps: [
      "मैंने 16 जुलाई 2026 को कितना खर्च किया?",
      "मेरे पास कितनी संपत्तियाँ हैं और उनके नाम क्या हैं?",
    ],
  },
  es: {
    questionRequired: "Escribe una pregunta financiera antes de enviarla.",
    authRequired: "Inicia sesión antes de usar AI Insights.",
    addIncome: (name) =>
      `${name}, abre la página Income desde la navegación, selecciona Add Income, introduce el importe, la fuente, la cuenta y la fecha, y guarda. La entrada aparecerá en Income y Transactions.`,
    greeting: (name) =>
      `${name}, pregúntame por un cálculo exacto de gastos, ingresos, cuentas, importes pendientes o inversiones. Puedes indicar una fecha, semana, mes, año, categoría o activo.`,
    correction: (name) =>
      `${name}, lo siento, la respuesta anterior no siguió correctamente tu pregunta. Escribe de nuevo la pregunta financiera completa o proporciona solo la fecha o categoría que falta.`,
    dataUnavailable: (name) =>
      `${name}, no pude leer los registros financieros necesarios, así que no hice una estimación. Inténtalo de nuevo.`,
    addIncomeFollowUps: [
      "¿Cuánto gané este mes?",
      "¿Cuántas entradas de ingresos tengo?",
    ],
    greetingFollowUps: [
      "¿Cuánto gasté este mes?",
      "¿Cuántos activos tengo y cuáles son sus nombres?",
    ],
    correctionFollowUps: [
      "¿Cuánto gasté el 16 de julio de 2026?",
      "¿Cuántos activos tengo y cuáles son sus nombres?",
    ],
  },
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toNumber(value: number | string | null | undefined) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeQuestion(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanName(value: unknown) {
  return typeof value === "string" && value.trim()
    ? value.replace(/\s+/g, " ").trim().slice(0, 80)
    : "Friend";
}

function getCurrencyContext(body: unknown): CurrencyContext {
  if (!isRecord(body)) {
    return {
      currency: BASE_CURRENCY,
      rate: normalizeUsdToPkrRate(undefined),
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

function getStoredFinanceQuestion(request: NextRequest) {
  const encoded = request.cookies.get(CHAT_CONTEXT_COOKIE)?.value;
  if (!encoded) return "";

  try {
    return decodeURIComponent(encoded).replace(/\s+/g, " ").trim().slice(0, 500);
  } catch {
    return "";
  }
}

function rememberFinanceQuestion(
  response: NextResponse,
  resolvedQuestion: string,
) {
  response.cookies.set({
    name: CHAT_CONTEXT_COOKIE,
    value: encodeURIComponent(resolvedQuestion.slice(0, 500)),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: CHAT_CONTEXT_MAX_AGE,
  });

  return response;
}

function getDirectChatAnswer({
  question,
  language,
  displayName,
}: {
  question: string;
  language: AppLanguage;
  displayName: string;
}): DirectChatAnswer | null {
  const normalized = normalizeQuestion(question);
  const copy = COPY[language];
  const asksHowToAddIncome =
    /\b(how|where|steps?|way|can i)\b.*\b(add|record|create|enter)\b.*\b(income|earning|earnings)\b/.test(
      normalized,
    ) ||
    /\b(add|record|create|enter)\b.*\b(income|earning|earnings)\b.*\b(how|where)\b/.test(
      normalized,
    );

  if (asksHowToAddIncome) {
    return {
      answer: copy.addIncome(displayName),
      followUps: copy.addIncomeFollowUps,
    };
  }

  if (/^(hi|hey|hello|salam|assalam o alaikum|assalamualaikum)$/.test(normalized)) {
    return {
      answer: copy.greeting(displayName),
      followUps: copy.greetingFollowUps,
    };
  }

  if (/^(uff+|ugh+|hmm+|oh no|not correct|wrong)$/.test(normalized)) {
    return {
      answer: copy.correction(displayName),
      followUps: copy.correctionFollowUps,
    };
  }

  return null;
}

function resolveFinanceQuestion(
  question: string,
  previousQuestion: string,
  now: ReturnType<typeof getAppDateParts>,
) {
  const directIntent = parseDeterministicFinanceQuestion(question, now);
  if (directIntent) {
    return { resolvedQuestion: question, intent: directIntent };
  }

  if (!previousQuestion) {
    return { resolvedQuestion: question, intent: null };
  }

  const normalized = normalizeQuestion(question);
  const hasStandaloneRange = Boolean(parseFinanceDateRange(question, now));
  const looksLikeFollowUp =
    hasStandaloneRange ||
    /^(i am asking|im asking|i mean|for|on|in|about|same|the same|that|this|what about)\b/.test(
      normalized,
    ) ||
    /\b(all time|same date|same day|same week|same month|same year|that date|that day|that period)\b/.test(
      normalized,
    );

  if (!looksLikeFollowUp) {
    return { resolvedQuestion: question, intent: null };
  }

  const resolvedQuestion = `${previousQuestion} ${question}`
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 500);
  const resolvedIntent = parseDeterministicFinanceQuestion(resolvedQuestion, now);

  return {
    resolvedQuestion: resolvedIntent ? resolvedQuestion : question,
    intent: resolvedIntent,
  };
}

function createFallbackRequest(
  request: NextRequest,
  body: unknown,
  language: AppLanguage,
) {
  const headers = new Headers(request.headers);
  headers.set("Content-Type", "application/json");
  headers.set("x-jf-language", language);

  return new NextRequest(new URL("/api/ai-insights/chat", request.url), {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

async function getExactFinanceData(
  supabase: Awaited<ReturnType<typeof createClient>>,
  intent: DeterministicFinanceIntent,
): Promise<DeterministicFinanceData> {
  if (intent.kind === "spending" || intent.kind === "income") {
    let query = supabase
      .from("transactions")
      .select("amount, date, type, categories(name)")
      .is("deleted_at", null);

    if (!intent.range.allTime) {
      query = query
        .gte("date", intent.range.start)
        .lte("date", intent.range.end);
    }

    const { data, error } = await query;
    if (error) throw new Error("transactions_query_failed");

    let categoryNames: string[] = [];
    if (intent.kind === "spending") {
      const categoriesResult = await supabase.from("categories").select("name");

      if (categoriesResult.error && intent.categoryRequested) {
        throw new Error("categories_query_failed");
      }

      categoryNames = (categoriesResult.data ?? [])
        .map((category) =>
          typeof category.name === "string" ? category.name.trim() : "",
        )
        .filter(Boolean);
    }

    return {
      transactions: data ?? [],
      categoryNames,
    };
  }

  if (intent.kind === "accounts") {
    const { data, error } = await supabase.from("accounts").select("status");
    if (error) throw new Error("accounts_query_failed");
    return { accounts: data ?? [] };
  }

  if (intent.kind === "payables") {
    const { data, error } = await supabase
      .from("liabilities")
      .select("remaining_amount, due_date, status");
    if (error) throw new Error("payables_query_failed");

    const payables = ((data ?? []) as RawPayable[]).map(
      (payable): FinancePayableRecord => ({
        remaining_amount: payable.remaining_amount,
        status: getPayableStatus({
          status: payable.status ?? "pending",
          remaining_amount: toNumber(payable.remaining_amount),
          due_date: payable.due_date ?? null,
        }),
      }),
    );

    return { payables };
  }

  const { data, error } = await supabase
    .from("investments")
    .select(
      "id, name, symbol, asset_id, quantity, purchase_price, current_price, purchased_at",
    );
  if (error) throw new Error("investments_query_failed");
  return { investments: data ?? [] };
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as unknown;
  const language = resolveRequestLanguage(request, body);
  const copy = COPY[language.code];
  const originalQuestion =
    isRecord(body) && typeof body.question === "string"
      ? body.question.replace(/\s+/g, " ").trim().slice(0, 500)
      : "";

  if (!originalQuestion) {
    return jsonResponse(
      { error: "question_required", message: copy.questionRequired },
      400,
    );
  }

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
  const normalizedQuestion = normalizeMultilingualFinanceQuestion(
    originalQuestion,
  );
  const directAnswer = getDirectChatAnswer({
    question: normalizedQuestion,
    language: language.code,
    displayName,
  });

  if (directAnswer) {
    return jsonResponse({
      provider: "local-conversation",
      model: "finance-chat-conversation-v2",
      aiAvailable: true,
      fallback: false,
      deterministic: true,
      language: language.code,
      ...directAnswer,
    });
  }

  const now = getAppDateParts();
  const previousQuestion = getStoredFinanceQuestion(request);
  const assetBreakdownRequested = isAssetBreakdownRequest(
    normalizedQuestion,
    previousQuestion,
  );
  const { resolvedQuestion, intent } = resolveFinanceQuestion(
    normalizedQuestion,
    previousQuestion,
    now,
  );

  if (!intent && !assetBreakdownRequested) {
    const forwardedBody = isRecord(body)
      ? {
          ...body,
          question: originalQuestion,
          language: language.code,
        }
      : { question: originalQuestion, language: language.code };
    return postFallbackChat(
      createFallbackRequest(request, forwardedBody, language.code),
    );
  }

  try {
    const context = getCurrencyContext(body);
    const money = (value: number) =>
      formatMoney(value, {
        currency: context.currency,
        usdToPkrRate: context.rate,
      });

    if (assetBreakdownRequested) {
      const data = await getExactFinanceData(supabase, { kind: "assets" });
      const calculated = localizeVerifiedFinanceAnswer({
        result: buildAssetBreakdownAnswer(data.investments ?? [], money),
        language: language.code,
        displayName,
      });

      return rememberFinanceQuestion(
        jsonResponse({
          provider: "local-calculator",
          model: "exact-finance-ledger-v5",
          aiAvailable: true,
          fallback: false,
          deterministic: true,
          contextual: Boolean(previousQuestion),
          language: language.code,
          ...calculated,
        }),
        ASSET_CONTEXT_QUESTION,
      );
    }

    const data = await getExactFinanceData(supabase, intent!);
    const calculated = localizeVerifiedFinanceAnswer({
      result: buildDeterministicFinanceAnswer({
        intent: intent!,
        question: resolvedQuestion,
        data,
        money,
      }),
      language: language.code,
      displayName,
    });

    return rememberFinanceQuestion(
      jsonResponse({
        provider: "local-calculator",
        model: "exact-finance-ledger-v5",
        aiAvailable: true,
        fallback: false,
        deterministic: true,
        contextual: resolvedQuestion !== normalizedQuestion,
        language: language.code,
        ...calculated,
      }),
      resolvedQuestion,
    );
  } catch (error) {
    console.error("Exact finance chat calculation failed", {
      name: error instanceof Error ? error.name : "UnknownError",
      message: error instanceof Error ? error.message : undefined,
    });

    return jsonResponse(
      aiServiceFailure(
        "exact_finance_unavailable",
        copy.dataUnavailable(displayName),
      ),
      503,
    );
  }
}
