import { describe, expect, it } from "vitest";

import type { AppLanguage } from "@/lib/i18n/config";

import { getAIInsightsConsentCopy } from "./consent-copy";

const LANGUAGES: AppLanguage[] = ["en", "ur", "ar", "hi", "es"];

describe("AI Insights consent localization", () => {
  it("provides complete privacy choice copy for every supported language", () => {
    for (const language of LANGUAGES) {
      const copy = getAIInsightsConsentCopy(language);

      expect(copy.loading).toBeTruthy();
      expect(copy.title).toBeTruthy();
      expect(copy.description("JALVORO")).toContain("JALVORO");
      expect(copy.summaryItems).toHaveLength(4);
      expect(copy.summaryItems.every(Boolean)).toBe(true);
      expect(copy.excluded).toBeTruthy();
      expect(copy.warning).toBeTruthy();
      expect(copy.enable).toBeTruthy();
      expect(copy.disable).toBeTruthy();
      expect(copy.privacyNotice).toBeTruthy();
      expect(copy.disclosures).toBeTruthy();
    }
  });
});
