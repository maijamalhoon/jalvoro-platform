import "server-only";

import type {
  BillingCycle,
  PaidPlanKey,
  PricedBusinessPlanKey,
} from "./types";

const PADDLE_ID_PATTERNS = {
  customer: /^ctm_[a-z0-9]{26}$/,
  subscription: /^sub_[a-z0-9]{26}$/,
  transaction: /^txn_[a-z0-9]{26}$/,
  price: /^pri_[a-z0-9]{26}$/,
} as const;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const PERSONAL_PRICE_ENV_NAMES: Record<
  PaidPlanKey,
  Record<BillingCycle, string>
> = {
  go: {
    monthly: "PADDLE_PRICE_GO_MONTHLY",
    annual: "PADDLE_PRICE_GO_ANNUAL",
  },
  student: {
    monthly: "PADDLE_PRICE_STUDENT_MONTHLY",
    annual: "PADDLE_PRICE_STUDENT_ANNUAL",
  },
  plus: {
    monthly: "PADDLE_PRICE_PLUS_MONTHLY",
    annual: "PADDLE_PRICE_PLUS_ANNUAL",
  },
  pro: {
    monthly: "PADDLE_PRICE_PRO_MONTHLY",
    annual: "PADDLE_PRICE_PRO_ANNUAL",
  },
};

const BUSINESS_PRICE_ENV_NAMES: Record<
  PricedBusinessPlanKey,
  Record<BillingCycle, string>
> = {
  solo: {
    monthly: "PADDLE_PRICE_SOLO_MONTHLY",
    annual: "PADDLE_PRICE_SOLO_ANNUAL",
  },
  starter: {
    monthly: "PADDLE_PRICE_STARTER_MONTHLY",
    annual: "PADDLE_PRICE_STARTER_ANNUAL",
  },
  growth: {
    monthly: "PADDLE_PRICE_GROWTH_MONTHLY",
    annual: "PADDLE_PRICE_GROWTH_ANNUAL",
  },
  scale: {
    monthly: "PADDLE_PRICE_SCALE_MONTHLY",
    annual: "PADDLE_PRICE_SCALE_ANNUAL",
  },
};

type PaddleTransactionResponse = {
  data?: {
    id?: unknown;
    checkout?: { url?: unknown } | null;
  };
};

type PaddlePortalResponse = {
  data?: {
    urls?: {
      general?: { overview?: unknown };
    };
  };
};

function requiredEnvironment(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`missing_${name.toLowerCase()}`);
  return value;
}

function paddleBaseUrl(): string {
  return process.env.NEXT_PUBLIC_PADDLE_ENV === "production"
    ? "https://api.paddle.com"
    : "https://sandbox-api.paddle.com";
}

async function paddleRequest<T>(
  path: string,
  init: RequestInit,
): Promise<T> {
  const apiKey = requiredEnvironment("PADDLE_API_KEY");
  const response = await fetch(`${paddleBaseUrl()}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Paddle-Version": "1",
      ...(init.headers ?? {}),
    },
    cache: "no-store",
    signal: AbortSignal.timeout(8_000),
  });

  if (!response.ok) {
    throw new Error(`paddle_api_${response.status}`);
  }

  return (await response.json()) as T;
}

function getPaddlePriceId(environmentName: string): string {
  const priceId = requiredEnvironment(environmentName);
  if (!PADDLE_ID_PATTERNS.price.test(priceId)) {
    throw new Error("invalid_paddle_price_id");
  }
  return priceId;
}

export function getPersonalPaddlePriceId(
  plan: PaidPlanKey,
  cycle: BillingCycle,
): string {
  return getPaddlePriceId(PERSONAL_PRICE_ENV_NAMES[plan][cycle]);
}

export function getBusinessPaddlePriceId(
  plan: PricedBusinessPlanKey,
  cycle: BillingCycle,
): string {
  return getPaddlePriceId(BUSINESS_PRICE_ENV_NAMES[plan][cycle]);
}

async function createCheckoutTransaction({
  priceId,
  customData,
}: {
  priceId: string;
  customData: Record<string, string>;
}): Promise<{ transactionId: string; checkoutUrl: string }> {
  if (!PADDLE_ID_PATTERNS.price.test(priceId)) {
    throw new Error("invalid_paddle_price_id");
  }

  const response = await paddleRequest<PaddleTransactionResponse>(
    "/transactions",
    {
      method: "POST",
      body: JSON.stringify({
        collection_mode: "automatic",
        items: [{ price_id: priceId, quantity: 1 }],
        custom_data: customData,
      }),
    },
  );

  const transactionId = response.data?.id;
  const checkoutUrl = response.data?.checkout?.url;
  if (
    typeof transactionId !== "string" ||
    !PADDLE_ID_PATTERNS.transaction.test(transactionId) ||
    typeof checkoutUrl !== "string" ||
    !checkoutUrl.startsWith("https://")
  ) {
    throw new Error("invalid_paddle_checkout_response");
  }

  return { transactionId, checkoutUrl };
}

export async function createPersonalCheckoutTransaction({
  accountId,
  userId,
  planCode,
  priceId,
}: {
  accountId: string;
  userId: string;
  planCode: string;
  priceId: string;
}): Promise<{ transactionId: string; checkoutUrl: string }> {
  if (!UUID_PATTERN.test(accountId) || !UUID_PATTERN.test(userId)) {
    throw new Error("invalid_personal_checkout_scope");
  }

  return createCheckoutTransaction({
    priceId,
    customData: {
      jalvoro_billing_account_id: accountId,
      jalvoro_user_id: userId,
      jalvoro_plan_code: planCode,
      jalvoro_universe: "personal",
    },
  });
}

export async function createBusinessCheckoutTransaction({
  accountId,
  businessId,
  planCode,
  priceId,
}: {
  accountId: string;
  businessId: string;
  planCode: string;
  priceId: string;
}): Promise<{ transactionId: string; checkoutUrl: string }> {
  if (!UUID_PATTERN.test(accountId) || !UUID_PATTERN.test(businessId)) {
    throw new Error("invalid_business_checkout_scope");
  }

  return createCheckoutTransaction({
    priceId,
    customData: {
      jalvoro_billing_account_id: accountId,
      jalvoro_business_id: businessId,
      jalvoro_plan_code: planCode,
      jalvoro_universe: "business",
    },
  });
}

export async function createPaddlePortalSession({
  customerId,
  subscriptionId,
}: {
  customerId: string;
  subscriptionId?: string | null;
}): Promise<string> {
  if (!PADDLE_ID_PATTERNS.customer.test(customerId)) {
    throw new Error("invalid_paddle_customer_id");
  }
  if (
    subscriptionId &&
    !PADDLE_ID_PATTERNS.subscription.test(subscriptionId)
  ) {
    throw new Error("invalid_paddle_subscription_id");
  }

  const response = await paddleRequest<PaddlePortalResponse>(
    `/customers/${customerId}/portal-sessions`,
    {
      method: "POST",
      body: JSON.stringify(
        subscriptionId ? { subscription_ids: [subscriptionId] } : {},
      ),
    },
  );
  const portalUrl = response.data?.urls?.general?.overview;
  if (typeof portalUrl !== "string" || !portalUrl.startsWith("https://")) {
    throw new Error("invalid_paddle_portal_response");
  }

  return portalUrl;
}
