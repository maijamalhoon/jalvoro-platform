const PRICE_ID_PATTERN = /^pri_[a-z0-9]{26}$/;

export const PADDLE_PRICE_ENVIRONMENTS = [
  "PADDLE_PRICE_GO_MONTHLY",
  "PADDLE_PRICE_GO_ANNUAL",
  "PADDLE_PRICE_STUDENT_MONTHLY",
  "PADDLE_PRICE_STUDENT_ANNUAL",
  "PADDLE_PRICE_PLUS_MONTHLY",
  "PADDLE_PRICE_PLUS_ANNUAL",
  "PADDLE_PRICE_PRO_MONTHLY",
  "PADDLE_PRICE_PRO_ANNUAL",
  "PADDLE_PRICE_SOLO_MONTHLY",
  "PADDLE_PRICE_SOLO_ANNUAL",
  "PADDLE_PRICE_STARTER_MONTHLY",
  "PADDLE_PRICE_STARTER_ANNUAL",
  "PADDLE_PRICE_GROWTH_MONTHLY",
  "PADDLE_PRICE_GROWTH_ANNUAL",
  "PADDLE_PRICE_SCALE_MONTHLY",
  "PADDLE_PRICE_SCALE_ANNUAL",
] as const;

const REQUIRED_PROVIDER_ENVIRONMENTS = [
  "NEXT_PUBLIC_PADDLE_CLIENT_TOKEN",
  "PADDLE_API_KEY",
  "PADDLE_WEBHOOK_SECRET",
] as const;

type Environment = Record<string, string | undefined>;

export type PaddleLaunchReadiness = {
  checkoutRequested: boolean;
  checkoutReady: boolean;
  trialRequested: boolean;
  providerEnvironment: "sandbox" | "production" | null;
  missing: string[];
  invalid: string[];
  duplicatePriceEnvironmentGroups: string[][];
};

function value(environment: Environment, name: string): string {
  return environment[name]?.trim() ?? "";
}

export function evaluatePaddleLaunchReadiness(
  environment: Environment,
): PaddleLaunchReadiness {
  const checkoutRequested = value(environment, "BILLING_CHECKOUT_ENABLED") === "true";
  const trialRequested = value(environment, "BILLING_TRIAL_ENABLED") === "true";
  const rawProviderEnvironment = value(environment, "NEXT_PUBLIC_PADDLE_ENV");
  const providerEnvironment =
    rawProviderEnvironment === "sandbox" || rawProviderEnvironment === "production"
      ? rawProviderEnvironment
      : null;
  const missing: string[] = [];
  const invalid: string[] = [];

  for (const name of REQUIRED_PROVIDER_ENVIRONMENTS) {
    if (!value(environment, name)) missing.push(name);
  }

  if (!providerEnvironment) invalid.push("NEXT_PUBLIC_PADDLE_ENV");

  const priceGroups = new Map<string, string[]>();
  for (const name of PADDLE_PRICE_ENVIRONMENTS) {
    const priceId = value(environment, name);
    if (!priceId) {
      missing.push(name);
      continue;
    }
    if (!PRICE_ID_PATTERN.test(priceId)) {
      invalid.push(name);
      continue;
    }
    const environments = priceGroups.get(priceId) ?? [];
    environments.push(name);
    priceGroups.set(priceId, environments);
  }

  const duplicatePriceEnvironmentGroups = [...priceGroups.values()].filter(
    (names) => names.length > 1,
  );

  const tolerance = value(environment, "PADDLE_WEBHOOK_TOLERANCE_SECONDS");
  if (tolerance) {
    const parsed = Number(tolerance);
    if (!Number.isInteger(parsed) || parsed < 0 || parsed > 900) {
      invalid.push("PADDLE_WEBHOOK_TOLERANCE_SECONDS");
    }
  }

  return {
    checkoutRequested,
    checkoutReady:
      checkoutRequested &&
      missing.length === 0 &&
      invalid.length === 0 &&
      duplicatePriceEnvironmentGroups.length === 0,
    trialRequested,
    providerEnvironment,
    missing,
    invalid,
    duplicatePriceEnvironmentGroups,
  };
}

export function isPaddleCheckoutConfigured(
  environment: Environment = process.env,
): boolean {
  return evaluatePaddleLaunchReadiness(environment).checkoutReady;
}
