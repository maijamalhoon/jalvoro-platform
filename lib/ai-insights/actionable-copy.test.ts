import { describe, expect, it } from "vitest";

import { APP_LANGUAGE_OPTIONS } from "@/lib/i18n/config";
import { getAIInsightsActionableCopy } from "./actionable-copy";

const topics = [
  "cash-flow",
  "spending",
  "goals",
  "payables",
  "overview",
] as const;

const buckets = ["act-now", "watch-closely", "doing-well"] as const;

describe("AI Insights actionable copy", () => {
  it("provides complete decision copy for every supported language", () => {
    for (const language of APP_LANGUAGE_OPTIONS) {
      const copy = getAIInsightsActionableCopy(language.code);

      expect(copy.title.trim().length).toBeGreaterThan(0);
      expect(copy.description.trim().length).toBeGreaterThan(0);
      expect(copy.whyAmISeeingThis.trim().length).toBeGreaterThan(0);
      expect(copy.actionSafety.trim().length).toBeGreaterThan(0);
      expect(copy.count(2).trim().length).toBeGreaterThan(0);

      for (const bucket of buckets) {
        expect(copy.buckets[bucket].trim().length).toBeGreaterThan(0);
        expect(copy.bucketDescriptions[bucket].trim().length).toBeGreaterThan(0);
      }

      for (const topic of topics) {
        expect(copy.actionLabels[topic].trim().length).toBeGreaterThan(0);
      }
    }
  });
});
