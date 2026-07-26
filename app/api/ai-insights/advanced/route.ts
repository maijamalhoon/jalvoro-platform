import {
  analyzeFinanceHistory,
  inflationAdjustedValue,
  parseAdvancedFinanceIntent,
  projectSavings,
  type AdvancedFinanceIntent,
  type AdvancedFinanceTransaction,
  type FinanceHistoryAnalysis,
  type RankedAmount,
} from "@/lib/ai/advanced-finance-analysis";
import { normalizeMultilingualFinanceQuestion } from "@/lib/ai/multilingual-finance-normalizer";
import {
  BASE_CURRENCY,
  formatMoney,
  isSupportedCurrency,
  normalizeUsdToPkrRate,
  type SupportedCurrency,
} from "@/lib/currency";
import type { AppLanguage, AppLanguageOption } from "@/lib/i18n/config";
import { resolveRequestLanguage } from "@/lib/i18n/request-language";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

import { POST as postExactFinanceChat } from "../exact/route";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 1000;

type UnknownRecord = Record<string, unknown>;

type CurrencyContext = {
  currency: SupportedCurrency;
  rate: number;
};

type RawRelation = { name?: string | null } | { name?: string | null }[] | null;

type RawTransaction = {
  amount?: number | string | null;
  date?: string | null;
  type?: string | null;
  source_name?: string | null;
  person_name?: string | null;
  item_name?: string | null;
  note?: string | null;
  categories?: RawRelation;
  accounts?: RawRelation;
};

type RawAccount = {
  balance?: number | string | null;
};

type RpcHistory = {
  firstDate?: unknown;
  lastDate?: unknown;
  monthCount?: unknown;
  totals?: unknown;
  monthlyAverage?: unknown;
  peakSpending?: unknown;
  incomeSources?: unknown;
  expenseDestinations?: unknown;
  cashBalance?: unknown;
};

const COPY: Record<
  AppLanguage,
  {
    authRequired: string;
    dataUnavailable: (name: string) => string;
    noHistory: (name: string) => string;
    average: (
      name: string,
      months: number,
      income: string,
      expenses: string,
      savings: string,
      period: string,
    ) => string;
    peak: (
      name: string,
      dimension: "date" | "month" | "category",
      label: string,
      amount: string,
    ) => string;
    noPeak: (name: string) => string;
    sources: (name: string, values: string) => string;
    destinations: (name: string, values: string) => string;
    bothFlows: (name: string, sources: string, destinations: string) => string;
    noSources: string;
    noDestinations: string;
    projectionMissingYears: (name: string) => string;
    projection: (
      name: string,
      years: number,
      nominal: string,
      starting: string,
      monthly: string,
      returnPct: number,
      real: string | null,
      inflationPct: number | null,
      months: number,
    ) => string;
    inflationMissing: (name: string, missing: string) => string;
    inflation: (
      name: string,
      amount: string,
      real: string,
      years: number,
      rate: number,
    ) => string;
    nextAverage: [string, string];
    nextPeak: [string, string];
    nextProjection: [string, string];
    nextInflation: [string, string];
  }
> = {
  en: {
    authRequired: "Please log in before using AI Insights.",
    dataUnavailable: (name) =>
      `${name}, I could not read the required finance records, so I did not estimate an answer. Please try again.`,
    noHistory: (name) =>
      `${name}, there is not enough transaction history yet for this calculation. Add income and expense records first.`,
    average: (name, months, income, expenses, savings, period) =>
      `${name}, across ${months} recorded calendar month${months === 1 ? "" : "s"} (${period}), your monthly averages are: income ${income}, expenses ${expenses}, and savings ${savings}.`,
    peak: (name, dimension, label, amount) =>
      `${name}, your highest net spending ${dimension} is ${label}, with ${amount} after refunds.`,
    noPeak: (name) =>
      `${name}, no positive net expense was found in your recorded history.`,
    sources: (name, values) =>
      `${name}, your main recorded income sources are ${values}.`,
    destinations: (name, values) =>
      `${name}, your main recorded spending destinations are ${values}.`,
    bothFlows: (name, sources, destinations) =>
      `${name}, money mainly came from ${sources}. It mainly went to ${destinations}.`,
    noSources: "no named income sources",
    noDestinations: "no named spending destinations",
    projectionMissingYears: (name) =>
      `${name}, tell me the number of years for the savings projection, for example “20 years”.`,
    projection: (
      name,
      years,
      nominal,
      starting,
      monthly,
      returnPct,
      real,
      inflationPct,
      months,
    ) =>
      `${name}, after ${years} years (${months} months), your projected savings are ${nominal}, starting from ${starting} and continuing your recorded average monthly savings of ${monthly}. This uses ${returnPct}% annual return${real && inflationPct !== null ? `; after ${inflationPct}% inflation, the estimated real value is ${real}` : ""}.`,
    inflationMissing: (name, missing) =>
      `${name}, I need ${missing} to calculate inflation-adjusted value accurately.`,
    inflation: (name, amount, real, years, rate) =>
      `${name}, ${amount} would have an estimated real value of ${real} after ${years} years at ${rate}% annual inflation.`,
    nextAverage: [
      "Which month had my highest spending?",
      "Project my savings after 20 years.",
    ],
    nextPeak: [
      "What are my monthly averages?",
      "Where did my money go?",
    ],
    nextProjection: [
      "Show the result after 5% inflation.",
      "What are my monthly averages?",
    ],
    nextInflation: [
      "Project my savings after 20 years.",
      "What is my average monthly savings?",
    ],
  },
  ur: {
    authRequired: "AI Insights استعمال کرنے سے پہلے لاگ اِن کریں۔",
    dataUnavailable: (name) =>
      `${name}، مطلوبہ مالی ریکارڈ نہیں پڑھ سکا، اس لیے میں نے اندازہ نہیں لگایا۔ دوبارہ کوشش کریں۔`,
    noHistory: (name) =>
      `${name}، اس حساب کے لیے ابھی کافی ٹرانزیکشن ہسٹری موجود نہیں۔ پہلے آمدنی اور خرچ کے ریکارڈ شامل کریں۔`,
    average: (name, months, income, expenses, savings, period) =>
      `${name}، ${months} ریکارڈ شدہ کیلنڈر مہینوں (${period}) میں آپ کی ماہانہ اوسط آمدنی ${income}، خرچ ${expenses} اور بچت ${savings} ہے۔`,
    peak: (name, dimension, label, amount) =>
      `${name}، ریفنڈز کے بعد سب سے زیادہ خالص خرچ والا ${dimension === "date" ? "دن" : dimension === "month" ? "مہینہ" : "زمرہ"} ${label} ہے، رقم ${amount}۔`,
    noPeak: (name) =>
      `${name}، آپ کی ریکارڈ شدہ ہسٹری میں کوئی مثبت خالص خرچ نہیں ملا۔`,
    sources: (name, values) =>
      `${name}، آپ کی بڑی ریکارڈ شدہ آمدنی کے ذرائع ${values} ہیں۔`,
    destinations: (name, values) =>
      `${name}، آپ کا زیادہ تر ریکارڈ شدہ خرچ ${values} پر ہوا۔`,
    bothFlows: (name, sources, destinations) =>
      `${name}، رقم زیادہ تر ${sources} سے آئی اور زیادہ تر ${destinations} پر خرچ ہوئی۔`,
    noSources: "کوئی نام زد آمدنی کا ذریعہ نہیں",
    noDestinations: "کوئی نام زد خرچ کی جگہ نہیں",
    projectionMissingYears: (name) =>
      `${name}، بچت کی پیش گوئی کے لیے سالوں کی تعداد بتائیں، مثلاً “20 سال”۔`,
    projection: (
      name,
      years,
      nominal,
      starting,
      monthly,
      returnPct,
      real,
      inflationPct,
      months,
    ) =>
      `${name}، ${years} سال (${months} ماہ) بعد اندازاً بچت ${nominal} ہوگی، موجودہ ${starting} سے شروع کرکے اور ریکارڈ شدہ اوسط ماہانہ بچت ${monthly} جاری رکھتے ہوئے۔ حساب میں سالانہ منافع ${returnPct}% ہے${real && inflationPct !== null ? `؛ ${inflationPct}% مہنگائی کے بعد حقیقی قدر تقریباً ${real} ہوگی` : ""}۔`,
    inflationMissing: (name, missing) =>
      `${name}، مہنگائی کے بعد درست حقیقی قدر کے لیے ${missing} درکار ہے۔`,
    inflation: (name, amount, real, years, rate) =>
      `${name}، ${rate}% سالانہ مہنگائی پر ${amount} کی ${years} سال بعد اندازاً حقیقی قدر ${real} ہوگی۔`,
    nextAverage: [
      "کس مہینے سب سے زیادہ خرچ ہوا؟",
      "20 سال بعد میری بچت کتنی ہوگی؟",
    ],
    nextPeak: [
      "میری ماہانہ اوسط کیا ہے؟",
      "میرا پیسہ کہاں خرچ ہوا؟",
    ],
    nextProjection: [
      "5% مہنگائی کے بعد حقیقی قدر دکھائیں۔",
      "میری ماہانہ اوسط کیا ہے؟",
    ],
    nextInflation: [
      "20 سال بعد میری بچت کتنی ہوگی؟",
      "میری اوسط ماہانہ بچت کیا ہے؟",
    ],
  },
  ar: {
    authRequired: "يرجى تسجيل الدخول قبل استخدام AI Insights.",
    dataUnavailable: (name) =>
      `${name}، تعذر قراءة السجلات المالية المطلوبة، لذلك لم أقدّم تقديرًا. حاول مرة أخرى.`,
    noHistory: (name) =>
      `${name}، لا يوجد سجل معاملات كافٍ لهذا الحساب حتى الآن. أضف سجلات الدخل والمصروفات أولًا.`,
    average: (name, months, income, expenses, savings, period) =>
      `${name}، خلال ${months} شهر تقويمي مسجل (${period})، متوسط الدخل الشهري ${income} والمصروفات ${expenses} والادخار ${savings}.`,
    peak: (name, dimension, label, amount) =>
      `${name}، أعلى إنفاق صافٍ حسب ${dimension === "date" ? "التاريخ" : dimension === "month" ? "الشهر" : "الفئة"} هو ${label} بمبلغ ${amount} بعد المبالغ المستردة.`,
    noPeak: (name) =>
      `${name}، لم أجد مصروفًا صافيًا موجبًا في سجلك.`,
    sources: (name, values) =>
      `${name}، أهم مصادر الدخل المسجلة هي ${values}.`,
    destinations: (name, values) =>
      `${name}، أهم وجهات الإنفاق المسجلة هي ${values}.`,
    bothFlows: (name, sources, destinations) =>
      `${name}، جاء المال أساسًا من ${sources} وذهب أساسًا إلى ${destinations}.`,
    noSources: "لا توجد مصادر دخل مسماة",
    noDestinations: "لا توجد وجهات إنفاق مسماة",
    projectionMissingYears: (name) =>
      `${name}، اذكر عدد سنوات التوقع، مثل “20 سنة”.`,
    projection: (
      name,
      years,
      nominal,
      starting,
      monthly,
      returnPct,
      real,
      inflationPct,
      months,
    ) =>
      `${name}، بعد ${years} سنة (${months} شهرًا)، يُقدّر الادخار بـ ${nominal}، بدءًا من ${starting} مع استمرار متوسط الادخار الشهري المسجل ${monthly}. يفترض الحساب عائدًا سنويًا ${returnPct}%${real && inflationPct !== null ? `؛ وبعد تضخم ${inflationPct}% تصبح القيمة الحقيقية المقدرة ${real}` : ""}.`,
    inflationMissing: (name, missing) =>
      `${name}، أحتاج إلى ${missing} لحساب القيمة المعدلة بالتضخم بدقة.`,
    inflation: (name, amount, real, years, rate) =>
      `${name}، القيمة الحقيقية المقدرة لـ ${amount} بعد ${years} سنة عند تضخم سنوي ${rate}% هي ${real}.`,
    nextAverage: [
      "أي شهر كان الأعلى إنفاقًا؟",
      "توقع مدخراتي بعد 20 سنة.",
    ],
    nextPeak: [
      "ما متوسطاتي الشهرية؟",
      "أين ذهب مالي؟",
    ],
    nextProjection: [
      "اعرض القيمة بعد تضخم 5%.",
      "ما متوسطاتي الشهرية؟",
    ],
    nextInflation: [
      "توقع مدخراتي بعد 20 سنة.",
      "ما متوسط ادخاري الشهري؟",
    ],
  },
  hi: {
    authRequired: "AI Insights उपयोग करने से पहले लॉग इन करें।",
    dataUnavailable: (name) =>
      `${name}, आवश्यक वित्तीय रिकॉर्ड नहीं पढ़े जा सके, इसलिए मैंने अनुमान नहीं लगाया। फिर कोशिश करें।`,
    noHistory: (name) =>
      `${name}, इस गणना के लिए अभी पर्याप्त लेन-देन इतिहास नहीं है। पहले आय और खर्च रिकॉर्ड जोड़ें।`,
    average: (name, months, income, expenses, savings, period) =>
      `${name}, ${months} दर्ज कैलेंडर महीनों (${period}) में आपकी मासिक औसत आय ${income}, खर्च ${expenses} और बचत ${savings} है।`,
    peak: (name, dimension, label, amount) =>
      `${name}, रिफंड के बाद सबसे अधिक शुद्ध खर्च वाला ${dimension === "date" ? "दिन" : dimension === "month" ? "महीना" : "श्रेणी"} ${label} है, राशि ${amount}।`,
    noPeak: (name) =>
      `${name}, आपके दर्ज इतिहास में कोई सकारात्मक शुद्ध खर्च नहीं मिला।`,
    sources: (name, values) =>
      `${name}, आपकी मुख्य दर्ज आय के स्रोत ${values} हैं।`,
    destinations: (name, values) =>
      `${name}, आपके मुख्य दर्ज खर्च के गंतव्य ${values} हैं।`,
    bothFlows: (name, sources, destinations) =>
      `${name}, पैसा मुख्यतः ${sources} से आया और मुख्यतः ${destinations} पर गया।`,
    noSources: "कोई नामित आय स्रोत नहीं",
    noDestinations: "कोई नामित खर्च गंतव्य नहीं",
    projectionMissingYears: (name) =>
      `${name}, बचत अनुमान के लिए वर्षों की संख्या बताएँ, जैसे “20 वर्ष”।`,
    projection: (
      name,
      years,
      nominal,
      starting,
      monthly,
      returnPct,
      real,
      inflationPct,
      months,
    ) =>
      `${name}, ${years} वर्ष (${months} महीने) बाद अनुमानित बचत ${nominal} है, वर्तमान ${starting} से शुरू करके और दर्ज औसत मासिक बचत ${monthly} जारी रखते हुए। गणना में ${returnPct}% वार्षिक रिटर्न है${real && inflationPct !== null ? `; ${inflationPct}% महंगाई के बाद अनुमानित वास्तविक मूल्य ${real} है` : ""}।`,
    inflationMissing: (name, missing) =>
      `${name}, महंगाई-समायोजित मूल्य की सटीक गणना के लिए ${missing} चाहिए।`,
    inflation: (name, amount, real, years, rate) =>
      `${name}, ${rate}% वार्षिक महंगाई पर ${amount} का ${years} वर्ष बाद अनुमानित वास्तविक मूल्य ${real} होगा।`,
    nextAverage: [
      "किस महीने सबसे अधिक खर्च हुआ?",
      "20 वर्ष बाद मेरी बचत कितनी होगी?",
    ],
    nextPeak: [
      "मेरी मासिक औसत क्या है?",
      "मेरा पैसा कहाँ गया?",
    ],
    nextProjection: [
      "5% महंगाई के बाद वास्तविक मूल्य दिखाएँ।",
      "मेरी मासिक औसत क्या है?",
    ],
    nextInflation: [
      "20 वर्ष बाद मेरी बचत कितनी होगी?",
      "मेरी औसत मासिक बचत क्या है?",
    ],
  },
  es: {
    authRequired: "Inicia sesión antes de usar AI Insights.",
    dataUnavailable: (name) =>
      `${name}, no pude leer los registros financieros necesarios, así que no hice una estimación. Inténtalo de nuevo.`,
    noHistory: (name) =>
      `${name}, todavía no hay suficiente historial de transacciones para este cálculo. Añade ingresos y gastos primero.`,
    average: (name, months, income, expenses, savings, period) =>
      `${name}, en ${months} mes${months === 1 ? "" : "es"} calendario registrado${months === 1 ? "" : "s"} (${period}), tus promedios mensuales son: ingresos ${income}, gastos ${expenses} y ahorro ${savings}.`,
    peak: (name, dimension, label, amount) =>
      `${name}, tu mayor gasto neto por ${dimension === "date" ? "fecha" : dimension === "month" ? "mes" : "categoría"} es ${label}, con ${amount} después de reembolsos.`,
    noPeak: (name) =>
      `${name}, no encontré ningún gasto neto positivo en tu historial.`,
    sources: (name, values) =>
      `${name}, tus principales fuentes de ingresos registradas son ${values}.`,
    destinations: (name, values) =>
      `${name}, tus principales destinos de gasto registrados son ${values}.`,
    bothFlows: (name, sources, destinations) =>
      `${name}, el dinero vino principalmente de ${sources} y fue principalmente a ${destinations}.`,
    noSources: "ninguna fuente de ingresos nombrada",
    noDestinations: "ningún destino de gasto nombrado",
    projectionMissingYears: (name) =>
      `${name}, indica el número de años de la proyección, por ejemplo “20 años”.`,
    projection: (
      name,
      years,
      nominal,
      starting,
      monthly,
      returnPct,
      real,
      inflationPct,
      months,
    ) =>
      `${name}, después de ${years} años (${months} meses), el ahorro proyectado es ${nominal}, partiendo de ${starting} y manteniendo tu ahorro mensual medio registrado de ${monthly}. El cálculo usa un rendimiento anual del ${returnPct}%${real && inflationPct !== null ? `; después de una inflación del ${inflationPct}%, el valor real estimado es ${real}` : ""}.`,
    inflationMissing: (name, missing) =>
      `${name}, necesito ${missing} para calcular con precisión el valor ajustado por inflación.`,
    inflation: (name, amount, real, years, rate) =>
      `${name}, ${amount} tendría un valor real estimado de ${real} después de ${years} años con una inflación anual del ${rate}%.`,
    nextAverage: [
      "¿Qué mes tuvo el gasto más alto?",
      "Proyecta mis ahorros después de 20 años.",
    ],
    nextPeak: [
      "¿Cuáles son mis promedios mensuales?",
      "¿Adónde fue mi dinero?",
    ],
    nextProjection: [
      "Muestra el resultado después de una inflación del 5%.",
      "¿Cuáles son mis promedios mensuales?",
    ],
    nextInflation: [
      "Proyecta mis ahorros después de 20 años.",
      "¿Cuál es mi ahorro mensual medio?",
    ],
  },
};

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null;
}

function toNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function relationName(value: RawRelation | undefined) {
  const selected = Array.isArray(value) ? value[0] : value;
  return selected?.name?.trim() || null;
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

function jsonResponse(payload: UnknownRecord, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: {
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function createExactRequest(
  request: NextRequest,
  body: unknown,
  language: AppLanguage,
) {
  const headers = new Headers(request.headers);
  headers.set("Content-Type", "application/json");
  headers.set("x-jf-language", language);

  return new NextRequest(new URL("/api/ai-insights/exact", request.url), {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

function normalizeFutureWording(question: string) {
  return normalizeMultilingualFinanceQuestion(question)
    .replace(/\b(?:baad|bad)\b/giu, "after")
    .replace(/(?:بعد|बाद)/gu, " after ")
    .replace(/\bdentro\s+de\b/giu, "after")
    .replace(/\s+/g, " ")
    .trim();
}

function monthOrDateLabel(
  value: string,
  dimension: "date" | "month" | "category",
  language: AppLanguageOption,
) {
  if (dimension === "category") return value;
  const date = new Date(`${dimension === "month" ? `${value}-01` : value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(language.locale, {
    year: "numeric",
    month: dimension === "month" ? "long" : "short",
    day: dimension === "date" ? "numeric" : undefined,
    timeZone: "UTC",
  }).format(date);
}

function periodLabel(history: FinanceHistoryAnalysis, language: AppLanguageOption) {
  if (!history.firstDate || !history.lastDate) return "—";
  const format = (value: string) =>
    new Intl.DateTimeFormat(language.locale, {
      year: "numeric",
      month: "short",
      timeZone: "UTC",
    }).format(new Date(`${value}T00:00:00Z`));
  return `${format(history.firstDate)} – ${format(history.lastDate)}`;
}

function formatRanking(
  values: RankedAmount[],
  money: (value: number) => string,
  fallback: string,
) {
  if (!values.length) return fallback;
  return values
    .slice(0, 3)
    .map((value) => `${value.label} (${money(value.amount)})`)
    .join(", ");
}

function parseRanked(value: unknown): RankedAmount[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item): RankedAmount | null => {
      if (!isRecord(item) || typeof item.label !== "string") return null;
      const amount = toNumber(item.amount);
      return item.label.trim() && amount > 0
        ? { label: item.label.trim(), amount }
        : null;
    })
    .filter((item): item is RankedAmount => item !== null)
    .slice(0, 5);
}

function parsePeak(value: unknown) {
  if (!isRecord(value)) {
    return { date: null, month: null, category: null };
  }
  const read = (item: unknown): RankedAmount | null => {
    if (!isRecord(item) || typeof item.label !== "string") return null;
    const amount = toNumber(item.amount);
    return item.label.trim() && amount > 0
      ? { label: item.label.trim(), amount }
      : null;
  };
  return {
    date: read(value.date),
    month: read(value.month),
    category: read(value.category),
  };
}

function parseRpcHistory(value: unknown): {
  history: FinanceHistoryAnalysis;
  cashBalance: number;
} | null {
  const source = Array.isArray(value) ? value[0] : value;
  if (!isRecord(source)) return null;
  const totals = isRecord(source.totals) ? source.totals : {};
  const averages = isRecord(source.monthlyAverage)
    ? source.monthlyAverage
    : {};
  const monthCount = Math.max(0, Math.round(toNumber(source.monthCount)));

  return {
    cashBalance: toNumber(source.cashBalance),
    history: {
      firstDate:
        typeof source.firstDate === "string" ? source.firstDate : null,
      lastDate: typeof source.lastDate === "string" ? source.lastDate : null,
      monthCount,
      totals: {
        income: toNumber(totals.income),
        expenses: toNumber(totals.expenses),
        savings: toNumber(totals.savings),
      },
      monthlyAverage: {
        income: toNumber(averages.income),
        expenses: toNumber(averages.expenses),
        savings: toNumber(averages.savings),
      },
      peakSpending: parsePeak(source.peakSpending),
      incomeSources: parseRanked(source.incomeSources),
      expenseDestinations: parseRanked(source.expenseDestinations),
    },
  };
}

async function readTransactionPage(
  supabase: Awaited<ReturnType<typeof createClient>>,
  start: number,
) {
  const joined = await supabase
    .from("transactions")
    .select(
      "amount, date, type, source_name, person_name, item_name, note, categories(name), accounts(name)",
    )
    .is("deleted_at", null)
    .order("date", { ascending: true })
    .range(start, start + PAGE_SIZE - 1);

  if (!joined.error) return (joined.data ?? []) as RawTransaction[];

  const fallback = await supabase
    .from("transactions")
    .select(
      "amount, date, type, source_name, person_name, item_name, note, categories(name)",
    )
    .is("deleted_at", null)
    .order("date", { ascending: true })
    .range(start, start + PAGE_SIZE - 1);
  if (fallback.error) throw new Error("advanced_transactions_query_failed");
  return (fallback.data ?? []) as RawTransaction[];
}

async function readHistoryFallback(
  supabase: Awaited<ReturnType<typeof createClient>>,
) {
  const transactions: RawTransaction[] = [];
  let start = 0;

  while (true) {
    const page = await readTransactionPage(supabase, start);
    transactions.push(...page);
    if (page.length < PAGE_SIZE) break;
    start += PAGE_SIZE;
  }

  const accountsResult = await supabase
    .from("accounts")
    .select("balance")
    .eq("status", "active");
  if (accountsResult.error) throw new Error("advanced_accounts_query_failed");

  const normalized: AdvancedFinanceTransaction[] = transactions
    .filter(
      (row) =>
        typeof row.date === "string" &&
        typeof row.type === "string" &&
        Number.isFinite(Number(row.amount)),
    )
    .map((row) => ({
      amount: toNumber(row.amount),
      date: row.date!,
      type: row.type!,
      category: relationName(row.categories),
      account: relationName(row.accounts),
      sourceName: row.source_name,
      personName: row.person_name,
      itemName: row.item_name,
      note: row.note,
    }));

  return {
    history: analyzeFinanceHistory(normalized),
    cashBalance: ((accountsResult.data ?? []) as RawAccount[]).reduce(
      (sum, account) => sum + toNumber(account.balance),
      0,
    ),
  };
}

async function readHistory(
  supabase: Awaited<ReturnType<typeof createClient>>,
) {
  const rpcResult = await supabase.rpc("get_ai_finance_history_analysis");
  if (!rpcResult.error) {
    const parsed = parseRpcHistory(rpcResult.data as RpcHistory | RpcHistory[]);
    if (parsed) return parsed;
  }

  return readHistoryFallback(supabase);
}

function missingInflationInputs(
  language: AppLanguage,
  intent: Extract<AdvancedFinanceIntent, { kind: "inflation" }>,
) {
  const missing: string[] = [];
  if (intent.years === null) {
    missing.push(
      language === "ur"
        ? "سالوں کی تعداد"
        : language === "ar"
          ? "عدد السنوات"
          : language === "hi"
            ? "वर्षों की संख्या"
            : language === "es"
              ? "el número de años"
              : "the number of years",
    );
  }
  if (intent.inflationPct === null) {
    missing.push(
      language === "ur"
        ? "سالانہ مہنگائی کی شرح"
        : language === "ar"
          ? "معدل التضخم السنوي"
          : language === "hi"
            ? "वार्षिक महंगाई दर"
            : language === "es"
              ? "la tasa anual de inflación"
              : "the annual inflation rate",
    );
  }
  return missing.join(
    language === "ur" || language === "ar" ? " اور " : language === "hi" ? " और " : language === "es" ? " y " : " and ",
  );
}

function buildAnswer({
  intent,
  history,
  cashBalance,
  context,
  language,
  displayName,
}: {
  intent: AdvancedFinanceIntent;
  history: FinanceHistoryAnalysis;
  cashBalance: number;
  context: CurrencyContext;
  language: AppLanguageOption;
  displayName: string;
}) {
  const copy = COPY[language.code];
  const money = (value: number) =>
    formatMoney(value, {
      currency: context.currency,
      usdToPkrRate: context.rate,
    });
  const directMoney = (value: number) =>
    formatMoney(value, {
      currency: context.currency,
      fromCurrency: context.currency,
      usdToPkrRate: context.rate,
    });

  if (intent.kind === "monthly_average") {
    if (!history.monthCount) {
      return { answer: copy.noHistory(displayName), followUps: copy.nextAverage };
    }
    return {
      answer: copy.average(
        displayName,
        history.monthCount,
        money(history.monthlyAverage.income),
        money(history.monthlyAverage.expenses),
        money(history.monthlyAverage.savings),
        periodLabel(history, language),
      ),
      followUps: copy.nextAverage,
    };
  }

  if (intent.kind === "peak_spending") {
    const peak = history.peakSpending[intent.dimension];
    if (!peak) {
      return { answer: copy.noPeak(displayName), followUps: copy.nextPeak };
    }
    return {
      answer: copy.peak(
        displayName,
        intent.dimension,
        monthOrDateLabel(peak.label, intent.dimension, language),
        money(peak.amount),
      ),
      followUps: copy.nextPeak,
    };
  }

  if (intent.kind === "flow_map") {
    const sources = formatRanking(
      history.incomeSources,
      money,
      copy.noSources,
    );
    const destinations = formatRanking(
      history.expenseDestinations,
      money,
      copy.noDestinations,
    );
    return {
      answer:
        intent.direction === "income"
          ? copy.sources(displayName, sources)
          : intent.direction === "expense"
            ? copy.destinations(displayName, destinations)
            : copy.bothFlows(displayName, sources, destinations),
      followUps: copy.nextPeak,
    };
  }

  if (intent.kind === "projection") {
    if (intent.years === null) {
      return {
        answer: copy.projectionMissingYears(displayName),
        followUps: copy.nextProjection,
      };
    }
    if (!history.monthCount && cashBalance === 0) {
      return { answer: copy.noHistory(displayName), followUps: copy.nextProjection };
    }
    const annualReturnPct = intent.annualReturnPct ?? 0;
    const projected = projectSavings({
      startingBalance: cashBalance,
      monthlyContribution: history.monthlyAverage.savings,
      years: intent.years,
      annualReturnPct,
      inflationPct: intent.inflationPct,
    });
    return {
      answer: copy.projection(
        displayName,
        intent.years,
        money(projected.nominal),
        money(cashBalance),
        money(history.monthlyAverage.savings),
        annualReturnPct,
        projected.real === null ? null : money(projected.real),
        intent.inflationPct,
        projected.months,
      ),
      followUps: copy.nextProjection,
    };
  }

  const missing = missingInflationInputs(language.code, intent);
  if (missing) {
    return {
      answer: copy.inflationMissing(displayName, missing),
      followUps: copy.nextInflation,
    };
  }

  const amount = intent.amount ?? cashBalance;
  if (amount === 0) {
    return { answer: copy.noHistory(displayName), followUps: copy.nextInflation };
  }
  const explicit = intent.amount !== null;
  const adjusted = inflationAdjustedValue({
    amount,
    years: intent.years!,
    inflationPct: intent.inflationPct!,
  });
  return {
    answer: copy.inflation(
      displayName,
      explicit ? directMoney(amount) : money(amount),
      explicit ? directMoney(adjusted) : money(adjusted),
      intent.years!,
      intent.inflationPct!,
    ),
    followUps: copy.nextInflation,
  };
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as unknown;
  const language = resolveRequestLanguage(request, body);
  const originalQuestion =
    isRecord(body) && typeof body.question === "string"
      ? body.question.replace(/\s+/g, " ").trim().slice(0, 500)
      : "";
  const normalizedQuestion = normalizeFutureWording(originalQuestion);
  const intent = originalQuestion
    ? parseAdvancedFinanceIntent(normalizedQuestion)
    : null;

  if (!intent) {
    return postExactFinanceChat(
      createExactRequest(
        request,
        isRecord(body)
          ? { ...body, language: language.code }
          : { question: originalQuestion, language: language.code },
        language.code,
      ),
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
        {
          error: "authentication_required",
          message: COPY[language.code].authRequired,
        },
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
    const [{ history, cashBalance }, context] = await Promise.all([
      readHistory(supabase),
      Promise.resolve(getCurrencyContext(body)),
    ]);
    const response = buildAnswer({
      intent,
      history,
      cashBalance,
      context,
      language,
      displayName,
    });

    return jsonResponse({
      provider: "local-calculator",
      model: "advanced-finance-analysis-v1",
      aiAvailable: true,
      fallback: false,
      deterministic: true,
      language: language.code,
      calculationPeriod: {
        firstDate: history.firstDate,
        lastDate: history.lastDate,
        monthCount: history.monthCount,
      },
      ...response,
    });
  } catch (error) {
    console.error("Advanced finance analysis failed", {
      name: error instanceof Error ? error.name : "UnknownError",
      message: error instanceof Error ? error.message : undefined,
    });

    return jsonResponse({
      provider: "local-fallback",
      model: "advanced-finance-safety-v1",
      aiAvailable: true,
      fallback: true,
      deterministic: true,
      language: language.code,
      answer: COPY[language.code].dataUnavailable("Friend"),
      followUps: COPY[language.code].nextAverage,
    });
  }
}
