type UnknownRecord = Record<string, unknown>;

type FetchLike = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

export type GeminiProviderErrorCode =
  | "missing_ai_configuration"
  | "ai_provider_timeout"
  | "ai_provider_rate_limited"
  | "ai_provider_authentication_failed"
  | "ai_provider_temporarily_unavailable"
  | "invalid_ai_response"
  | "empty_ai_response"
  | "ai_provider_retry_exhausted";

export class GeminiProviderError extends Error {
  readonly code: GeminiProviderErrorCode;
  readonly httpStatus: 429 | 502 | 503 | 504;
  readonly retryable: boolean;
  readonly correlationId: string | null;
  readonly providerStatus: number | null;

  constructor(
    code: GeminiProviderErrorCode,
    options: {
      httpStatus: 429 | 502 | 503 | 504;
      retryable: boolean;
      correlationId?: string | null;
      providerStatus?: number | null;
    },
  ) {
    super(code);
    this.name = "GeminiProviderError";
    this.code = code;
    this.httpStatus = options.httpStatus;
    this.retryable = options.retryable;
    this.correlationId = options.correlationId ?? null;
    this.providerStatus = options.providerStatus ?? null;
  }
}

export type GeminiProviderResult = {
  text: string;
  correlationId: string | null;
  attempts: number;
};

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null;
}

function correlationId(response: Response) {
  return (
    response.headers.get("x-request-id") ??
    response.headers.get("x-goog-request-id") ??
    response.headers.get("request-id")
  );
}

function providerErrorForStatus(status: number, requestId: string | null) {
  if (status === 429) {
    return new GeminiProviderError("ai_provider_rate_limited", {
      httpStatus: 429,
      retryable: true,
      correlationId: requestId,
      providerStatus: status,
    });
  }
  if (status === 401 || status === 403) {
    return new GeminiProviderError("ai_provider_authentication_failed", {
      httpStatus: 503,
      retryable: false,
      correlationId: requestId,
      providerStatus: status,
    });
  }
  if (status >= 500) {
    return new GeminiProviderError("ai_provider_temporarily_unavailable", {
      httpStatus: 503,
      retryable: true,
      correlationId: requestId,
      providerStatus: status,
    });
  }
  return new GeminiProviderError("invalid_ai_response", {
    httpStatus: 502,
    retryable: false,
    correlationId: requestId,
    providerStatus: status,
  });
}

function responseText(value: unknown, requestId: string | null) {
  if (!isRecord(value)) {
    throw new GeminiProviderError("invalid_ai_response", {
      httpStatus: 502,
      retryable: false,
      correlationId: requestId,
    });
  }

  if (isRecord(value.error)) {
    const rawCode = Number(value.error.code);
    throw providerErrorForStatus(
      Number.isFinite(rawCode) ? rawCode : 502,
      requestId,
    );
  }

  if (!Array.isArray(value.candidates) || value.candidates.length === 0) {
    throw new GeminiProviderError("invalid_ai_response", {
      httpStatus: 502,
      retryable: false,
      correlationId: requestId,
    });
  }

  const candidate = value.candidates[0];
  if (!isRecord(candidate) || !isRecord(candidate.content)) {
    throw new GeminiProviderError("invalid_ai_response", {
      httpStatus: 502,
      retryable: false,
      correlationId: requestId,
    });
  }

  const parts = candidate.content.parts;
  if (!Array.isArray(parts) || parts.length === 0) {
    throw new GeminiProviderError("invalid_ai_response", {
      httpStatus: 502,
      retryable: false,
      correlationId: requestId,
    });
  }

  const texts: string[] = [];
  for (const part of parts) {
    if (!isRecord(part) || typeof part.text !== "string") {
      throw new GeminiProviderError("invalid_ai_response", {
        httpStatus: 502,
        retryable: false,
        correlationId: requestId,
      });
    }
    texts.push(part.text);
  }

  const text = texts.join("").trim();
  if (!text) {
    throw new GeminiProviderError("empty_ai_response", {
      httpStatus: 502,
      retryable: false,
      correlationId: requestId,
    });
  }
  return text;
}

function isTimeout(error: unknown) {
  return (
    error instanceof Error &&
    (error.name === "AbortError" || error.name === "TimeoutError")
  );
}

function safeError(error: unknown) {
  if (error instanceof GeminiProviderError) return error;
  if (isTimeout(error)) {
    return new GeminiProviderError("ai_provider_timeout", {
      httpStatus: 504,
      retryable: true,
    });
  }
  return new GeminiProviderError("ai_provider_temporarily_unavailable", {
    httpStatus: 503,
    retryable: true,
  });
}

export async function callGeminiProvider({
  apiKey,
  model,
  prompt,
  temperature = 0.35,
  maxOutputTokens = 1200,
  timeoutMs = 12_000,
  retries = 1,
  fetchImpl = fetch,
  wait = (milliseconds) =>
    new Promise<void>((resolve) => setTimeout(resolve, milliseconds)),
}: {
  apiKey?: string | null;
  model: string;
  prompt: string;
  temperature?: number;
  maxOutputTokens?: number;
  timeoutMs?: number;
  retries?: number;
  fetchImpl?: FetchLike;
  wait?: (milliseconds: number) => Promise<void>;
}): Promise<GeminiProviderResult> {
  if (!apiKey?.trim()) {
    throw new GeminiProviderError("missing_ai_configuration", {
      httpStatus: 503,
      retryable: false,
    });
  }

  const safeRetries = Math.max(0, Math.min(2, Math.trunc(retries)));
  let lastError: GeminiProviderError | null = null;

  for (let attempt = 1; attempt <= safeRetries + 1; attempt += 1) {
    try {
      const response = await fetchImpl(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: {
              temperature,
              maxOutputTokens,
              responseMimeType: "application/json",
            },
          }),
          cache: "no-store",
          signal: AbortSignal.timeout(timeoutMs),
        },
      );
      const requestId = correlationId(response);
      let body: unknown;
      try {
        body = await response.json();
      } catch {
        throw new GeminiProviderError("invalid_ai_response", {
          httpStatus: 502,
          retryable: false,
          correlationId: requestId,
          providerStatus: response.status,
        });
      }
      if (!response.ok) throw providerErrorForStatus(response.status, requestId);
      return { text: responseText(body, requestId), correlationId: requestId, attempts: attempt };
    } catch (error) {
      lastError = safeError(error);
      if (!lastError.retryable || attempt > safeRetries) break;
      await wait(200 * 2 ** (attempt - 1));
    }
  }

  if (lastError?.retryable && safeRetries > 0) {
    throw new GeminiProviderError("ai_provider_retry_exhausted", {
      httpStatus: lastError.httpStatus,
      retryable: true,
      correlationId: lastError.correlationId,
      providerStatus: lastError.providerStatus,
    });
  }
  throw lastError ??
    new GeminiProviderError("ai_provider_temporarily_unavailable", {
      httpStatus: 503,
      retryable: true,
    });
}

export function describeGeminiProviderError(error: unknown) {
  const safe = safeError(error);
  return {
    code: safe.code,
    status: safe.httpStatus,
    retryable: safe.retryable,
    correlationId: safe.correlationId,
    providerStatus: safe.providerStatus,
  };
}
