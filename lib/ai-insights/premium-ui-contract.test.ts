import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const pageSource = readFileSync(
  new URL("../../app/dashboard/ai-insights/page.tsx", import.meta.url),
  "utf8",
);
const experienceSource = readFileSync(
  new URL(
    "../../components/ai-insights/AIInsightsGlobalExperience.tsx",
    import.meta.url,
  ),
  "utf8",
);
const polishCssSource = readFileSync(
  new URL(
    "../../app/dashboard/ai-insights/ai-insights-premium-polish.css",
    import.meta.url,
  ),
  "utf8",
);

describe("AI Insights paid-grade global UI contracts", () => {
  it("loads the premium layer after the stable experience stylesheet", () => {
    const stableImport = pageSource.indexOf('import "./ai-insights-experience.css"');
    const premiumImport = pageSource.indexOf(
      'import "./ai-insights-premium-polish.css"',
    );

    expect(stableImport).toBeGreaterThan(-1);
    expect(premiumImport).toBeGreaterThan(stableImport);
  });

  it("presents the four existing localized paid-product capabilities", () => {
    expect(experienceSource).toContain("data-ai-premium-capability-rail");
    expect(experienceSource.match(/data-ai-premium-capability=/g) ?? []).toHaveLength(
      1,
    );

    for (const capability of ["briefing", "actions", "chat", "trust"]) {
      expect(experienceSource).toContain(`key: "${capability}"`);
    }

    expect(experienceSource).toContain("copy.panel.briefing");
    expect(experienceSource).toContain("copy.panel.nextMoves");
    expect(experienceSource).toContain("copy.panel.askFinances");
    expect(experienceSource).toContain("copy.trust.title");
  });

  it("keeps visible capability text localized instead of adding English-only sales copy", () => {
    expect(experienceSource).not.toMatch(/Premium plan|Upgrade now|Subscribe|Pro plan/);
    expect(experienceSource).toContain("getAIInsightsActionableCopy(language)");
    expect(experienceSource).toContain("getAIInsightsCopy(language)");
  });

  it("covers premium hierarchy, analytics, priorities, trust, and chat", () => {
    for (const selector of [
      "[data-ai-insights-command-hero]",
      "[data-ai-premium-capability-rail]",
      "[data-ai-insights-trust-center]",
      "[data-mobile-summary-grid]",
      "[data-ai-priority-queue]",
      "[data-ai-priority-bucket=\"act-now\"]",
      "[data-ai-priority-bucket=\"watch-closely\"]",
      "[data-ai-priority-bucket=\"doing-well\"]",
      "> section.grid",
      "> section:last-child",
    ]) {
      expect(polishCssSource, selector).toContain(selector);
    }
  });

  it("retains global accessibility and responsive behavior", () => {
    expect(polishCssSource).toContain('[dir="rtl"]');
    expect(polishCssSource).toContain(':is(.dark, [data-theme="dark"])');
    expect(polishCssSource).toContain("@media (prefers-reduced-motion: reduce)");
    expect(polishCssSource).toContain(":focus-visible");
    expect(polishCssSource).toContain("scroll-snap-type: x mandatory");
    expect(polishCssSource).toContain("@media (max-width: 390px)");
  });

  it("does not introduce billing behavior or a blocking overlay", () => {
    const combined = `${experienceSource}\n${polishCssSource}`;
    expect(combined).not.toMatch(/checkout|stripe|subscription|payment_required/i);
    expect(polishCssSource).not.toContain("position: fixed");
  });
});
