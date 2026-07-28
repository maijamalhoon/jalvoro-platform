import { describe, expect, it } from "vitest";

import {
  evaluatePaddleLaunchReadiness,
  PADDLE_PRICE_ENVIRONMENTS,
} from "./launch-readiness";

function completeEnvironment() {
  const environment: Record<string, string> = {
    BILLING_CHECKOUT_ENABLED: "true",
    BILLING_TRIAL_ENABLED: "true",
    NEXT_PUBLIC_PADDLE_ENV: "sandbox",
    NEXT_PUBLIC_PADDLE_CLIENT_TOKEN: "test_client_token",
    PADDLE_API_KEY: "test_api_key",
    PADDLE_WEBHOOK_SECRET: "test_webhook_secret",
    PADDLE_WEBHOOK_TOLERANCE_SECONDS: "300",
  };

  PADDLE_PRICE_ENVIRONMENTS.forEach((name, index) => {
    environment[name] = `pri_${index.toString(36).padStart(26, "0")}`;
  });
  return environment;
}

describe("Paddle launch readiness", () => {
  it("keeps checkout disabled when credentials and price IDs are missing", () => {
    const readiness = evaluatePaddleLaunchReadiness({
      BILLING_CHECKOUT_ENABLED: "true",
      NEXT_PUBLIC_PADDLE_ENV: "sandbox",
    });

    expect(readiness.checkoutRequested).toBe(true);
    expect(readiness.checkoutReady).toBe(false);
    expect(readiness.missing).toContain("PADDLE_API_KEY");
    expect(readiness.missing).toContain("PADDLE_PRICE_PRO_ANNUAL");
  });

  it("rejects malformed and duplicate price IDs", () => {
    const environment = completeEnvironment();
    environment.PADDLE_PRICE_GO_MONTHLY = "invalid";
    environment.PADDLE_PRICE_PLUS_MONTHLY =
      environment.PADDLE_PRICE_STUDENT_MONTHLY;

    const readiness = evaluatePaddleLaunchReadiness(environment);

    expect(readiness.checkoutReady).toBe(false);
    expect(readiness.invalid).toContain("PADDLE_PRICE_GO_MONTHLY");
    expect(readiness.duplicatePriceEnvironmentGroups).toContainEqual([
      "PADDLE_PRICE_STUDENT_MONTHLY",
      "PADDLE_PRICE_PLUS_MONTHLY",
    ]);
  });

  it("accepts one complete, unique sandbox catalog", () => {
    const readiness = evaluatePaddleLaunchReadiness(completeEnvironment());

    expect(readiness).toMatchObject({
      checkoutRequested: true,
      checkoutReady: true,
      trialRequested: true,
      providerEnvironment: "sandbox",
      missing: [],
      invalid: [],
      duplicatePriceEnvironmentGroups: [],
    });
  });

  it("rejects unsafe webhook tolerance values", () => {
    const environment = completeEnvironment();
    environment.PADDLE_WEBHOOK_TOLERANCE_SECONDS = "3600";

    const readiness = evaluatePaddleLaunchReadiness(environment);
    expect(readiness.checkoutReady).toBe(false);
    expect(readiness.invalid).toContain("PADDLE_WEBHOOK_TOLERANCE_SECONDS");
  });
});
