import { describe, expect, it, vi } from "vitest";

import {
  callGeminiProvider,
  GeminiProviderError,
} from "./gemini-provider";

const response = (body: unknown, status = 200, requestId = "provider-request-1") =>
  new Response(typeof body === "string" ? body : JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "x-goog-request-id": requestId,
    },
  });

const validBody = {
  candidates: [{ content: { parts: [{ text: '{"answer":"ok"}' }] } }],
};

async function expectProviderError(
  promise: Promise<unknown>,
  code: GeminiProviderError["code"],
) {
  await expect(promise).rejects.toMatchObject({ name: "GeminiProviderError", code });
}

describe("Gemini provider contract", () => {
  it("accepts a valid response and exposes its correlation ID", async () => {
    const result = await callGeminiProvider({
      apiKey: "test-key",
      model: "test-model",
      prompt: "test",
      retries: 0,
      fetchImpl: vi.fn().mockResolvedValue(response(validBody)),
    });
    expect(result).toMatchObject({
      text: '{"answer":"ok"}',
      correlationId: "provider-request-1",
      attempts: 1,
    });
  });

  it("rejects empty responses", async () => {
    await expectProviderError(
      callGeminiProvider({
        apiKey: "test-key",
        model: "test-model",
        prompt: "test",
        retries: 0,
        fetchImpl: vi.fn().mockResolvedValue(
          response({ candidates: [{ content: { parts: [{ text: " " }] } }] }),
        ),
      }),
      "empty_ai_response",
    );
  });

  it("rejects malformed response JSON", async () => {
    await expectProviderError(
      callGeminiProvider({
        apiKey: "test-key",
        model: "test-model",
        prompt: "test",
        retries: 0,
        fetchImpl: vi.fn().mockResolvedValue(response("{not-json")),
      }),
      "invalid_ai_response",
    );
  });

  it("maps timeouts without exposing provider content", async () => {
    const timeout = Object.assign(new Error("secret provider text"), {
      name: "TimeoutError",
    });
    await expectProviderError(
      callGeminiProvider({
        apiKey: "test-key",
        model: "test-model",
        prompt: "test",
        retries: 0,
        fetchImpl: vi.fn().mockRejectedValue(timeout),
      }),
      "ai_provider_timeout",
    );
  });

  it("maps rate limits", async () => {
    await expectProviderError(
      callGeminiProvider({
        apiKey: "test-key",
        model: "test-model",
        prompt: "test",
        retries: 0,
        fetchImpl: vi.fn().mockResolvedValue(response({}, 429)),
      }),
      "ai_provider_rate_limited",
    );
  });

  it("maps provider authentication failures", async () => {
    await expectProviderError(
      callGeminiProvider({
        apiKey: "test-key",
        model: "test-model",
        prompt: "test",
        retries: 0,
        fetchImpl: vi.fn().mockResolvedValue(response({}, 401)),
      }),
      "ai_provider_authentication_failed",
    );
  });

  it("retries a temporary outage once and succeeds", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(response({}, 503, "first"))
      .mockResolvedValueOnce(response(validBody, 200, "second"));
    const result = await callGeminiProvider({
      apiKey: "test-key",
      model: "test-model",
      prompt: "test",
      retries: 1,
      fetchImpl,
      wait: vi.fn().mockResolvedValue(undefined),
    });
    expect(result.attempts).toBe(2);
    expect(result.correlationId).toBe("second");
  });

  it("rejects a partial response shape", async () => {
    await expectProviderError(
      callGeminiProvider({
        apiKey: "test-key",
        model: "test-model",
        prompt: "test",
        retries: 0,
        fetchImpl: vi.fn().mockResolvedValue(
          response({ candidates: [{ content: { parts: [{ text: "partial" }, {}] } }] }),
        ),
      }),
      "invalid_ai_response",
    );
  });

  it("reports retry exhaustion after a temporary outage", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(response({}, 503));
    await expectProviderError(
      callGeminiProvider({
        apiKey: "test-key",
        model: "test-model",
        prompt: "test",
        retries: 1,
        fetchImpl,
        wait: vi.fn().mockResolvedValue(undefined),
      }),
      "ai_provider_retry_exhausted",
    );
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("does not call the provider without configuration", async () => {
    const fetchImpl = vi.fn();
    await expectProviderError(
      callGeminiProvider({
        apiKey: "",
        model: "test-model",
        prompt: "test",
        fetchImpl,
      }),
      "missing_ai_configuration",
    );
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
