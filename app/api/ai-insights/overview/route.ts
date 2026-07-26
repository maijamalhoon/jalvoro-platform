import { aiServiceFailure } from "@/lib/ai-insights/failure";
import type { AppLanguage } from "@/lib/i18n/config";
import { resolveRequestLanguage } from "@/lib/i18n/request-language";
import { NextRequest, NextResponse } from "next/server";

import { GET as getLegacyInsights } from "../route";

export const dynamic = "force-dynamic";

type UnknownRecord = Record<string, unknown>;

const COPY: Record<
  AppLanguage,
  { authRequired: string; emptyMessage: string }
> = {
  en: {
    authRequired: "Please log in before using AI insights.",
    emptyMessage:
      "Add or refresh finance records to build your personalized briefing.",
  },
  ur: {
    authRequired: "AI Insights استعمال کرنے سے پہلے لاگ اِن کریں۔",
    emptyMessage:
      "اپنی ذاتی مالی بریفنگ بنانے کے لیے مالی ریکارڈ شامل یا تازہ کریں۔",
  },
  ar: {
    authRequired: "يرجى تسجيل الدخول قبل استخدام AI Insights.",
    emptyMessage:
      "أضف السجلات المالية أو حدّثها لإنشاء موجزك المالي المخصص.",
  },
  hi: {
    authRequired: "AI Insights उपयोग करने से पहले लॉग इन करें।",
    emptyMessage:
      "अपनी व्यक्तिगत वित्तीय ब्रीफिंग बनाने के लिए वित्त रिकॉर्ड जोड़ें या रीफ्रेश करें।",
  },
  es: {
    authRequired: "Inicia sesión antes de usar AI Insights.",
    emptyMessage:
      "Añade o actualiza registros financieros para crear tu informe personalizado.",
  },
};

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null;
}

function safeJson(payload: UnknownRecord, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: {
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function failureStatus(status: number) {
  return status === 429 || status === 502 || status === 503 || status === 504
    ? status
    : 503;
}

export async function GET(request: NextRequest) {
  const language = resolveRequestLanguage(request);
  const copy = COPY[language.code];

  try {
    const legacyResponse = await getLegacyInsights(request);
    const payload = (await legacyResponse.json().catch(() => null)) as unknown;

    if (legacyResponse.status === 401) {
      return safeJson(
        {
          error: "authentication_required",
          message: copy.authRequired,
        },
        401,
      );
    }

    if (!legacyResponse.ok) {
      const failure = isRecord(payload) ? payload : {};
      return safeJson(
        aiServiceFailure(
          typeof failure.error === "string"
            ? failure.error
            : "ai_service_unavailable",
          typeof failure.message === "string"
            ? failure.message
            : undefined,
          {
            retryable: failure.retryable === true,
            correlationId:
              typeof failure.correlationId === "string"
                ? failure.correlationId
                : null,
          },
        ),
        failureStatus(legacyResponse.status),
      );
    }

    if (!isRecord(payload)) {
      return safeJson(
        aiServiceFailure("invalid_ai_response", undefined, {
          retryable: false,
        }),
        502,
      );
    }

    const providerAvailable = payload.aiAvailable === true;
    const sanitized: UnknownRecord = {
      ...payload,
      aiAvailable: providerAvailable,
      intelligenceMode: providerAvailable
        ? "ai-assisted"
        : "provider-unavailable",
    };

    if (payload.empty === true) {
      sanitized.message = copy.emptyMessage;
    } else {
      delete sanitized.message;
    }

    return safeJson(sanitized);
  } catch (error) {
    console.error("AI briefing wrapper failed", {
      name: error instanceof Error ? error.name : "UnknownError",
      message: error instanceof Error ? error.message : undefined,
    });

    return safeJson(aiServiceFailure("ai_service_unavailable"), 503);
  }
}
