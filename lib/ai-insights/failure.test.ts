import { describe, expect, it } from "vitest";

import {
  AI_SERVICE_UNAVAILABLE_MESSAGE,
  aiServiceFailure,
} from "./failure";

describe("AI service failure contract", () => {
  it("uses a structured retryable service failure by default", () => {
    expect(aiServiceFailure("ai_history_unavailable")).toEqual({
      error: "ai_history_unavailable",
      message: AI_SERVICE_UNAVAILABLE_MESSAGE,
      retryable: true,
      correlationId: null,
    });
  });

  it("preserves an explicitly non-retryable provider failure and correlation ID", () => {
    expect(
      aiServiceFailure(
        "ai_provider_authentication_failed",
        "AI insights are temporarily unavailable.",
        { retryable: false, correlationId: "provider-request-1" },
      ),
    ).toEqual({
      error: "ai_provider_authentication_failed",
      message: "AI insights are temporarily unavailable.",
      retryable: false,
      correlationId: "provider-request-1",
    });
  });
});
