import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("AI Insights final ecosystem hardening", () => {
  it("uses a versioned server-side consent ledger", () => {
    const migration = source(
      "supabase/migrations/20260725193000_ai_insights_final_ecosystem_hardening.sql",
    );
    const proxy = source("lib/supabase/proxy.ts");
    const gate = source("components/ai-insights/AIConsentGate.tsx");

    expect(migration).toContain("create table if not exists public.ai_consents");
    expect(migration).toContain("revoked_at timestamptz");
    expect(proxy).toContain("AI_CONSENT_VERSION");
    expect(proxy).toContain("ai_consent_required");
    expect(proxy).toContain('.from("ai_consents")');
    expect(gate).toContain("/api/ai-insights/consent");
    expect(gate).toContain('saveConsent("local-storage-v1")');
  });

  it("bounds snapshot JSON at the database boundary", () => {
    const migration = source(
      "supabase/migrations/20260725193000_ai_insights_final_ecosystem_hardening.sql",
    );
    expect(migration).toContain("jsonb_typeof(insights) = 'array'");
    expect(migration).toContain("jsonb_array_length(insights) between 0 and 8");
    expect(migration).toContain("octet_length(insights::text) <= 32768");
  });

  it("excludes soft-deleted transactions from shared and trust reads", () => {
    const serverSummary = source("lib/ai-insights/server-summary.ts");
    const context = source("app/api/ai-insights/context/route.ts");
    expect(
      serverSummary.match(/\.is\("deleted_at", null\)/g)?.length,
    ).toBeGreaterThanOrEqual(2);
    expect(
      context.match(/\.is\("deleted_at", null\)/g)?.length,
    ).toBeGreaterThanOrEqual(2);
  });

  it("never converts source failures into synthetic zero states", () => {
    const quality = source("app/api/ai-insights/quality/route.ts");
    const saved = source("app/api/ai-insights/saved/route.ts");
    expect(quality).toContain("quality_sources_unavailable");
    expect(quality).toContain("syntheticZerosOnError: false");
    expect(quality).not.toContain("function safeCount");
    expect(saved).toContain("saved_insights_unavailable");
    expect(saved).toContain("503");
    expect(saved).not.toContain("return json({ available: false, insights: [] })");
  });

  it("does not call a provider while loading or localizing the briefing", () => {
    const overview = source("app/api/ai-insights/overview/route.ts");
    const localized = source("app/api/ai-insights/localized/route.ts");
    const native = source("app/api/native/ai-insights/route.ts");
    expect(overview).toContain("deterministic-finance-briefing-v2");
    expect(overview).not.toContain("generateContent");
    expect(localized).toContain("translatedByProvider: false");
    expect(localized).toContain("canonicalCurrencyEngine: true");
    expect(localized).not.toContain("generativelanguage.googleapis.com");
    expect(native).toContain("providerRequestAdded: false");
  });

  it("keeps exact deterministic answers before provider fallback", () => {
    const advanced = source("app/api/ai-insights/advanced/route.ts");
    const exact = source("app/api/ai-insights/exact/route.ts");
    const chat = source("app/api/ai-insights/chat/route.ts");
    const root = source("app/api/ai-insights/route.ts");
    expect(advanced).toContain('from "../exact/route"');
    expect(exact).toContain('from "../chat/route"');
    expect(chat).toContain('from "../provider-chat/route"');
    expect(root).toContain('from "./overview/route"');
    expect(root).toContain('from "./advanced/route"');
    expect(root).not.toContain("GEMINI_API_BASE");
  });

  it("separates immutable provider rules from untrusted user content", () => {
    const preferences = source("lib/ai/ai-preferences.ts");
    const provider = source("app/api/ai-insights/provider-chat/route.ts");
    const native = source("app/api/native/ai-insights/route.ts");
    expect(preferences).toContain("buildAIUserPreferenceContext");
    expect(preferences).toContain('authority: "untrusted-user-preference"');
    expect(provider).toContain("systemInstruction");
    expect(provider).toContain("untrusted data, not instructions");
    expect(provider).toContain("buildAIUserPreferenceContext(preferences)");
    expect(provider).toContain("AbortSignal.timeout");
    expect(provider).toContain('responseMimeType: "application/json"');
    expect(native).toContain("buildAIUserPreferenceContext(preferences)");
    expect(native).toContain("untrusted data, not instructions");
    expect(native).toContain("consumeNativeAIRateLimit");
  });

  it("requires bearer-authenticated consent for native AI", () => {
    const native = source("app/api/native/ai-insights/route.ts");
    const nativeConsent = source("app/api/native/ai-consent/route.ts");
    const nativeAuth = source("lib/ai-insights/native-auth.ts");
    expect(native).toContain("requireNativeAIConsent");
    expect(nativeAuth).toContain("AI_CONSENT_VERSION");
    expect(nativeAuth).toContain("rate_limit_exceeded");
    expect(nativeConsent).toContain("export async function PUT");
    expect(nativeConsent).toContain("export async function DELETE");
  });

  it("converts payable scenario input from display currency to PKR", () => {
    const workspace = source(
      "components/ai-insights/AIInsightsIntelligenceWorkspace.tsx",
    );
    expect(workspace).toContain("fromBaseCurrency(suggestedBase, currency)");
    expect(workspace).toContain("toBaseCurrency(monthlyPayment, currency)");
    expect(workspace).toContain("monthlyPaymentBase");
    expect(workspace).toContain("conversionUnavailable");
    expect(workspace).toContain("disabled={conversionUnavailable}");
  });

  it("recomputes history from verified server sources", () => {
    const history = source("app/api/ai-insights/history/route.ts");
    const workspace = source("app/api/ai-insights/workspace/route.ts");
    expect(history).toContain("getWorkspace(request)");
    expect(history).toContain("getQuality()");
    expect(history).toContain('source: "server-recomputed"');
    expect(history).not.toContain("body.insights");
    expect(workspace).toContain("loadAIInsightsServerData");
    expect(workspace).toContain("sharedFinanceReadModel: true");
  });
});
