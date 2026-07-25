import { describe, expect, it } from "vitest";

import type { AppLanguage } from "@/lib/i18n/config";

import { getAIInsightsCopy } from "./copy";

const LANGUAGES: AppLanguage[] = ["en", "ur", "ar", "hi", "es"];

describe("AI Insights localized copy", () => {
  it("provides complete page, trust, explainability, and chat copy", () => {
    for (const language of LANGUAGES) {
      const copy = getAIInsightsCopy(language);
      expect(copy.toolbar.title).toBeTruthy();
      expect(copy.trust.title).toBeTruthy();
      expect(copy.panel.briefing).toBeTruthy();
      expect(copy.metadata.why).toBeTruthy();
      expect(copy.metadata.evidence).toBeTruthy();
      expect(copy.metadata.accuracyNotice).toBeTruthy();
      expect(copy.starterPrompts).toHaveLength(3);
      expect(copy.starterPrompts.every(Boolean)).toBe(true);
    }
  });

  it("keeps evidence confidence separate from accuracy guarantees", () => {
    for (const language of LANGUAGES) {
      const copy = getAIInsightsCopy(language);
      expect(copy.confidence.high).toBeTruthy();
      expect(copy.confidence.medium).toBeTruthy();
      expect(copy.confidence.low).toBeTruthy();
      expect(copy.metadata.accuracyNotice.length).toBeGreaterThan(20);
    }
  });

  it("localizes deterministic fallback content for every supported language", () => {
    for (const language of LANGUAGES) {
      const copy = getAIInsightsCopy(language);
      expect(copy.deterministic.monthlyPositiveMessage("USD 100")).toContain(
        "USD 100",
      );
      expect(copy.deterministic.categoryMessage("Food", "USD 50")).toContain(
        "USD 50",
      );
      expect(copy.deterministic.goalsMessage(50, 2)).toContain("50");
    }
  });
});
