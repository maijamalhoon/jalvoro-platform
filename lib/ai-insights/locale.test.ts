import { describe, expect, it } from "vitest";

import {
  formatAIInsightsDateTime,
  getAIInsightsLocaleLabel,
  getWeekStartLabel,
  resolveAIInsightsLocale,
} from "./locale";

describe("AI Insights locale engine", () => {
  it("canonicalizes locale and timezone inputs", () => {
    const context = resolveAIInsightsLocale({
      locales: ["en-us"],
      timeZone: "America/New_York",
    });

    expect(context.locale).toBe("en-US");
    expect(context.language).toBe("en");
    expect(context.region).toBe("US");
    expect(context.timeZone).toBe("America/New_York");
    expect(context.direction).toBe("ltr");
    expect(context.weekStartsOn).toBeGreaterThanOrEqual(1);
    expect(context.weekStartsOn).toBeLessThanOrEqual(7);
  });

  it("marks Urdu and Arabic contexts as right-to-left", () => {
    const urdu = resolveAIInsightsLocale({
      locales: ["ur-PK"],
      timeZone: "Asia/Karachi",
    });
    const arabic = resolveAIInsightsLocale({
      locales: ["ar-AE"],
      timeZone: "Asia/Dubai",
    });

    expect(urdu.direction).toBe("rtl");
    expect(arabic.direction).toBe("rtl");
  });

  it("falls back safely for invalid locale and timezone values", () => {
    const context = resolveAIInsightsLocale({
      locales: ["invalid-locale-value"],
      timeZone: "Invalid/Timezone",
    });

    expect(context.locale).toBe("en-US");
    expect(context.timeZone).toBe("UTC");
    expect(context.direction).toBe("ltr");
  });

  it("formats timestamps in the resolved timezone", () => {
    const context = resolveAIInsightsLocale({
      locales: ["en-US"],
      timeZone: "UTC",
    });
    const formatted = formatAIInsightsDateTime(
      "2026-01-02T03:04:00.000Z",
      context,
    );

    expect(formatted).toContain("2026");
    expect(formatted).toMatch(/3:04|03:04/);
  });

  it("provides readable locale and week-start labels", () => {
    const context = resolveAIInsightsLocale({
      locales: ["en-US"],
      timeZone: "UTC",
    });

    expect(getAIInsightsLocaleLabel(context).length).toBeGreaterThan(0);
    expect(
      getWeekStartLabel(context.weekStartsOn, context.locale).length,
    ).toBeGreaterThan(0);
  });
});
