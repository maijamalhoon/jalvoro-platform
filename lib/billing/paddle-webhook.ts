const PADDLE_ID_PATTERNS = {
  event: /^evt_[a-z0-9]{26}$/,
  customer: /^ctm_[a-z0-9]{26}$/,
  subscription: /^sub_[a-z0-9]{26}$/,
  transaction: /^txn_[a-z0-9]{26}$/,
  adjustment: /^adj_[a-z0-9]{26}$/,
  price: /^pri_[a-z0-9]{26}$/,
} as const;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SAFE_PROVIDER_ENUM_PATTERN = /^[a-z][a-z_]{1,39}$/;

export type NormalizedPaddleEvent = {
  eventId: string;
  eventType: string;
  occurredAt: string;
  accountId: string | null;
  providerCustomerId: string | null;
  providerSubscriptionId: string | null;
  providerTransactionId: string | null;
  providerAdjustmentId: string | null;
  providerPriceId: string | null;
  status: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  billingCountry: string | null;
  adjustmentAction: string | null;
  adjustmentStatus: string | null;
  adjustmentAmountMinor: number | null;
  adjustmentCurrency: string | null;
};

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validString(
  value: unknown,
  pattern?: RegExp,
): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  if (!normalized || (pattern && !pattern.test(normalized))) return null;
  return normalized;
}

function validDate(value: unknown): string | null {
  const normalized = validString(value);
  return normalized && !Number.isNaN(Date.parse(normalized)) ? normalized : null;
}

function validMinorAmount(value: unknown): number | null {
  const normalized = validString(value, /^\d{1,18}$/);
  if (!normalized) return null;
  const amount = Number(normalized);
  return Number.isSafeInteger(amount) && amount >= 0 ? amount : null;
}

function firstPriceId(items: unknown): string | null {
  if (!Array.isArray(items)) return null;

  for (const item of items) {
    if (!isRecord(item) || !isRecord(item.price)) continue;
    const id = validString(item.price.id, PADDLE_ID_PATTERNS.price);
    if (id) return id;
  }

  return null;
}

function countryFromData(data: UnknownRecord): string | null {
  const direct = validString(data.country_code)?.toUpperCase();
  if (direct && /^[A-Z]{2}$/.test(direct)) return direct;

  if (isRecord(data.address)) {
    const nested = validString(data.address.country_code)?.toUpperCase();
    if (nested && /^[A-Z]{2}$/.test(nested)) return nested;
  }

  return null;
}

function accountFromCustomData(data: UnknownRecord): string | null {
  if (!isRecord(data.custom_data)) return null;
  return validString(
    data.custom_data.jalvoro_billing_account_id,
    UUID_PATTERN,
  );
}

function subscriptionStatus(eventType: string, data: UnknownRecord): string | null {
  if (eventType === "transaction.past_due" || eventType === "transaction.payment_failed") {
    return "past_due";
  }
  if (!eventType.startsWith("subscription.")) return null;
  return validString(data.status);
}

function adjustmentAmount(data: UnknownRecord): number | null {
  return isRecord(data.totals) ? validMinorAmount(data.totals.total) : null;
}

function adjustmentCurrency(data: UnknownRecord): string | null {
  const currency = validString(data.currency_code)?.toUpperCase();
  return currency && /^[A-Z]{3}$/.test(currency) ? currency : null;
}

export function normalizePaddleEvent(payload: unknown): NormalizedPaddleEvent | null {
  if (!isRecord(payload) || !isRecord(payload.data)) return null;

  const eventId = validString(payload.event_id, PADDLE_ID_PATTERNS.event);
  const eventType = validString(payload.event_type);
  const occurredAt = validDate(payload.occurred_at);
  if (!eventId || !eventType || !occurredAt) return null;

  const data = payload.data;
  const subscriptionEvent = eventType.startsWith("subscription.");
  const transactionEvent = eventType.startsWith("transaction.");
  const adjustmentEvent = eventType.startsWith("adjustment.");
  const dataId = validString(data.id);

  const providerSubscriptionId = subscriptionEvent
    ? validString(dataId, PADDLE_ID_PATTERNS.subscription)
    : validString(data.subscription_id, PADDLE_ID_PATTERNS.subscription);
  const providerTransactionId = transactionEvent
    ? validString(dataId, PADDLE_ID_PATTERNS.transaction)
    : validString(data.transaction_id, PADDLE_ID_PATTERNS.transaction);
  const providerAdjustmentId = adjustmentEvent
    ? validString(dataId, PADDLE_ID_PATTERNS.adjustment)
    : validString(data.adjustment_id, PADDLE_ID_PATTERNS.adjustment);

  const period = isRecord(data.current_billing_period)
    ? data.current_billing_period
    : null;
  const scheduledChange = isRecord(data.scheduled_change)
    ? data.scheduled_change
    : null;

  return {
    eventId,
    eventType,
    occurredAt,
    accountId: accountFromCustomData(data),
    providerCustomerId: validString(
      data.customer_id,
      PADDLE_ID_PATTERNS.customer,
    ),
    providerSubscriptionId,
    providerTransactionId,
    providerAdjustmentId,
    providerPriceId: firstPriceId(data.items),
    status: subscriptionStatus(eventType, data),
    periodStart: period ? validDate(period.starts_at) : null,
    periodEnd: period ? validDate(period.ends_at) : null,
    cancelAtPeriodEnd:
      scheduledChange !== null && scheduledChange.action === "cancel",
    billingCountry: countryFromData(data),
    adjustmentAction: adjustmentEvent
      ? validString(data.action, SAFE_PROVIDER_ENUM_PATTERN)
      : null,
    adjustmentStatus: adjustmentEvent
      ? validString(data.status, SAFE_PROVIDER_ENUM_PATTERN)
      : null,
    adjustmentAmountMinor: adjustmentEvent ? adjustmentAmount(data) : null,
    adjustmentCurrency: adjustmentEvent ? adjustmentCurrency(data) : null,
  };
}

function parseSignatureHeader(value: string): {
  timestamp: number;
  signatures: string[];
} | null {
  const entries = value.split(";").map((entry) => entry.trim());
  let timestamp: number | null = null;
  const signatures: string[] = [];

  for (const entry of entries) {
    const separator = entry.indexOf("=");
    if (separator <= 0) continue;
    const key = entry.slice(0, separator);
    const itemValue = entry.slice(separator + 1);
    if (key === "ts" && /^\d+$/.test(itemValue)) {
      timestamp = Number(itemValue);
    } else if (key === "h1" && /^[a-f0-9]{64}$/i.test(itemValue)) {
      signatures.push(itemValue.toLowerCase());
    }
  }

  if (!timestamp || signatures.length === 0) return null;
  return { timestamp, signatures };
}

function toHex(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

function constantTimeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) {
    mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return mismatch === 0;
}

export async function verifyPaddleSignature({
  rawBody,
  signatureHeader,
  secret,
  nowSeconds = Math.floor(Date.now() / 1000),
  toleranceSeconds = 300,
}: {
  rawBody: string;
  signatureHeader: string;
  secret: string;
  nowSeconds?: number;
  toleranceSeconds?: number;
}): Promise<boolean> {
  if (!rawBody || !secret || toleranceSeconds < 0) return false;
  const parsed = parseSignatureHeader(signatureHeader);
  if (!parsed) return false;
  if (Math.abs(nowSeconds - parsed.timestamp) > toleranceSeconds) return false;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(`${parsed.timestamp}:${rawBody}`),
  );
  const expected = toHex(signature);

  return parsed.signatures.some((candidate) =>
    constantTimeEqual(candidate, expected),
  );
}

export async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return toHex(digest);
}
