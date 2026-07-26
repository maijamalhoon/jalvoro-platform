export const AI_SERVICE_UNAVAILABLE_MESSAGE =
  "AI insights are temporarily unavailable. Try again later.";

export type AiServiceFailure = {
  error: string;
  message: string;
  retryable: boolean;
  correlationId: string | null;
};

export function aiServiceFailure(
  error: string,
  message = AI_SERVICE_UNAVAILABLE_MESSAGE,
  options: {
    retryable?: boolean;
    correlationId?: string | null;
  } = {},
): AiServiceFailure {
  return {
    error,
    message,
    retryable: options.retryable ?? true,
    correlationId: options.correlationId ?? null,
  };
}
