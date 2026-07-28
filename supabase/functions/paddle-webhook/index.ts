import {
  normalizePaddleEvent,
  sha256Hex,
  verifyPaddleSignature,
} from "../../../lib/billing/paddle-webhook.ts";

declare const Deno: {
  env: { get(name: string): string | undefined };
  serve(handler: (request: Request) => Response | Promise<Response>): void;
};

const MAX_BODY_BYTES = 256 * 1024;

function json(body: object, status = 200): Response {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

function getSecretKey(): string | null {
  const keySet = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (keySet) {
    try {
      const parsed = JSON.parse(keySet) as Record<string, unknown>;
      const preferred = parsed.default;
      if (typeof preferred === "string" && preferred) return preferred;
      const first = Object.values(parsed).find(
        (value): value is string => typeof value === "string" && Boolean(value),
      );
      if (first) return first;
    } catch {
      return null;
    }
  }

  return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? null;
}

function numericEnv(name: string, fallback: number): number {
  const raw = Deno.env.get(name);
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

async function callBillingRpc(
  rpcName: string,
  body: Record<string, unknown>,
): Promise<{ result?: string; reason?: string }> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const secretKey = getSecretKey();
  if (!supabaseUrl || !secretKey) {
    throw new Error("supabase_webhook_configuration_missing");
  }

  const headers: Record<string, string> = {
    apikey: secretKey,
    "Content-Type": "application/json",
  };
  // Legacy service-role keys are JWTs and require the Authorization header.
  // New sb_secret keys authenticate through the apikey header only.
  if (secretKey.startsWith("eyJ")) {
    headers.Authorization = `Bearer ${secretKey}`;
  }

  const response = await fetch(
    `${supabaseUrl.replace(/\/$/, "")}/rest/v1/rpc/${rpcName}`,
    {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    },
  );

  if (!response.ok) {
    throw new Error(`billing_rpc_failed_${response.status}`);
  }

  const result = (await response.json()) as unknown;
  if (typeof result !== "object" || result === null || Array.isArray(result)) {
    throw new Error("billing_rpc_invalid_response");
  }

  return result as { result?: string; reason?: string };
}

async function applyNormalizedEvent(
  normalized: NonNullable<ReturnType<typeof normalizePaddleEvent>>,
  payloadHash: string,
): Promise<{ result?: string; reason?: string }> {
  if (normalized.eventType.startsWith("adjustment.")) {
    if (
      !normalized.providerAdjustmentId ||
      !normalized.providerTransactionId ||
      !normalized.adjustmentAction ||
      !normalized.adjustmentStatus ||
      normalized.adjustmentAmountMinor === null ||
      !normalized.adjustmentCurrency
    ) {
      throw new Error("invalid_adjustment_shape");
    }

    return callBillingRpc("apply_paddle_adjustment_event", {
      p_event_id: normalized.eventId,
      p_event_type: normalized.eventType,
      p_occurred_at: normalized.occurredAt,
      p_payload_sha256: payloadHash,
      p_provider_adjustment_id: normalized.providerAdjustmentId,
      p_provider_transaction_id: normalized.providerTransactionId,
      p_action: normalized.adjustmentAction,
      p_status: normalized.adjustmentStatus,
      p_amount_minor: normalized.adjustmentAmountMinor,
      p_currency: normalized.adjustmentCurrency,
      p_account_id: normalized.accountId,
      p_provider_customer_id: normalized.providerCustomerId,
      p_provider_subscription_id: normalized.providerSubscriptionId,
    });
  }

  return callBillingRpc("apply_paddle_webhook_event", {
    p_event_id: normalized.eventId,
    p_event_type: normalized.eventType,
    p_occurred_at: normalized.occurredAt,
    p_payload_sha256: payloadHash,
    p_account_id: normalized.accountId,
    p_provider_customer_id: normalized.providerCustomerId,
    p_provider_subscription_id: normalized.providerSubscriptionId,
    p_provider_transaction_id: normalized.providerTransactionId,
    p_provider_price_id: normalized.providerPriceId,
    p_status: normalized.status,
    p_period_start: normalized.periodStart,
    p_period_end: normalized.periodEnd,
    p_cancel_at_period_end: normalized.cancelAtPeriodEnd,
    p_billing_country: normalized.billingCountry,
  });
}

Deno.serve(async (request: Request) => {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed." }, 405);
  }

  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.startsWith("application/json")) {
    return json({ error: "Expected an application/json webhook." }, 415);
  }

  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return json({ error: "Webhook payload too large." }, 413);
  }

  const webhookSecret = Deno.env.get("PADDLE_WEBHOOK_SECRET");
  const signatureHeader = request.headers.get("paddle-signature");
  if (!webhookSecret || !signatureHeader) {
    return json({ error: "Webhook authentication unavailable." }, 401);
  }

  const rawBody = await request.text();
  if (!rawBody || new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES) {
    return json({ error: "Invalid webhook payload size." }, 413);
  }

  const verified = await verifyPaddleSignature({
    rawBody,
    signatureHeader,
    secret: webhookSecret,
    toleranceSeconds: numericEnv(
      "PADDLE_WEBHOOK_TOLERANCE_SECONDS",
      300,
    ),
  });
  if (!verified) {
    return json({ error: "Invalid webhook signature." }, 401);
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return json({ error: "Malformed webhook JSON." }, 400);
  }

  const normalized = normalizePaddleEvent(payload);
  if (!normalized) {
    return json({ error: "Unsupported webhook payload shape." }, 400);
  }

  try {
    const result = await applyNormalizedEvent(
      normalized,
      await sha256Hex(rawBody),
    );

    if (result.result === "failed") {
      // A non-2xx response asks Paddle to retry. The database audit row remains
      // available so a later delivery can safely reprocess the same event ID.
      return json({ error: "Webhook processing failed." }, 500);
    }

    return json({ received: true, result: result.result ?? "processed" });
  } catch {
    // Never log or echo the raw payload because it may contain billing PII.
    return json({ error: "Webhook processing unavailable." }, 500);
  }
});
