import { describe, expect, it } from "vitest";

import { APP_LANGUAGE_OPTIONS } from "@/lib/i18n/config";
import { getAIInsightsWorkspaceCopy } from "./workspace-copy";

const issues = [
  "no-records",
  "stale-records",
  "low-volume",
  "uncategorized",
  "no-income",
  "no-active-account",
  "short-history",
] as const;

const timelineEvents = [
  "baseline",
  "new",
  "improved",
  "worsened",
  "resolved",
  "changed",
  "quality-improved",
  "quality-declined",
  "stable",
] as const;

const topics = [
  "cash-flow",
  "spending",
  "goals",
  "payables",
  "overview",
  "quality",
] as const;

describe("AI Insights intelligence workspace copy", () => {
  it("provides complete paid-value copy for every supported language", () => {
    for (const language of APP_LANGUAGE_OPTIONS) {
      const copy = getAIInsightsWorkspaceCopy(language.code);

      expect(copy.eyebrow.trim().length).toBeGreaterThan(0);
      expect(copy.title.trim().length).toBeGreaterThan(0);
      expect(copy.description.trim().length).toBeGreaterThan(0);
      expect(copy.quality.title.trim().length).toBeGreaterThan(0);
      expect(copy.quality.categoryComplete(80).trim().length).toBeGreaterThan(0);
      expect(copy.timeline.previous("today").trim().length).toBeGreaterThan(0);
      expect(copy.saved.save.trim().length).toBeGreaterThan(0);
      expect(copy.saved.resolve.trim().length).toBeGreaterThan(0);
      expect(copy.scenarios.title.trim().length).toBeGreaterThan(0);
      expect(copy.scenarios.months(2).trim().length).toBeGreaterThan(0);

      for (const issue of issues) {
        expect(copy.quality.issues[issue].trim().length).toBeGreaterThan(0);
      }
      for (const event of timelineEvents) {
        expect(copy.timeline.events[event].trim().length).toBeGreaterThan(0);
      }
      for (const topic of topics) {
        expect(copy.timeline.topics[topic].trim().length).toBeGreaterThan(0);
      }
    }
  });
});
