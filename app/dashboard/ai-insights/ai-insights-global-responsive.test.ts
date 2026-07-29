import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const root = process.cwd();
const page = readFileSync(
  resolve(root, "app/dashboard/ai-insights/page.tsx"),
  "utf8",
);
const experience = readFileSync(
  resolve(root, "components/ai-insights/AIInsightsGlobalExperience.tsx"),
  "utf8",
);
const responsiveCss = readFileSync(
  resolve(
    root,
    "app/dashboard/ai-insights/ai-insights-global-responsive.css",
  ),
  "utf8",
);

describe("AI Insights global responsive reset", () => {
  it("loads the responsive reset after all earlier presentation layers", () => {
    const experienceIndex = page.indexOf("ai-insights-experience.css");
    const premiumIndex = page.indexOf("ai-insights-premium-polish.css");
    const workspaceIndex = page.indexOf("ai-insights-intelligence-workspace.css");
    const resetIndex = page.indexOf("ai-insights-global-responsive.css");

    expect(experienceIndex).toBeGreaterThan(-1);
    expect(premiumIndex).toBeGreaterThan(experienceIndex);
    expect(workspaceIndex).toBeGreaterThan(premiumIndex);
    expect(resetIndex).toBeGreaterThan(workspaceIndex);
  });

  it("keeps the product-first global structure concise", () => {
    expect(experience).not.toContain("data-ai-command-orbit");
    expect(experience).not.toContain("data-ai-premium-capability-rail");

    const intelligenceIndex = experience.indexOf('id="ai-insights-intelligence"');
    const trustIndex = experience.indexOf('id="ai-insights-trust"');

    expect(intelligenceIndex).toBeGreaterThan(-1);
    expect(trustIndex).toBeGreaterThan(intelligenceIndex);
    expect(experience).toContain("AIInsightsIntelligenceWorkspace");
    expect(experience).toContain("AIInsightsExplainablePanel");
    expect(experience).toContain("AIInsightsGlobalTrustCenter");
  });

  it("covers mobile, wide desktop, dark mode, RTL, and reduced motion", () => {
    expect(responsiveCss).toContain("@media (max-width: 47.999rem)");
    expect(responsiveCss).toContain("@media (min-width: 80rem)");
    expect(responsiveCss).toContain('.dark [data-ai-insights-page]');
    expect(responsiveCss).toContain('[dir="rtl"]');
    expect(responsiveCss).toContain("@media (prefers-reduced-motion: reduce)");
    expect(responsiveCss).toContain('html[data-animation-mode="none"]');
  });

  it("uses touch-friendly controls and horizontal mobile workspaces", () => {
    expect(responsiveCss).toContain("min-height: 2.75rem");
    expect(responsiveCss).toContain("scroll-snap-type: inline mandatory");
    expect(responsiveCss).toContain("env(safe-area-inset-bottom)");
    expect(responsiveCss).toContain("overscroll-behavior-inline: contain");
  });

  it("does not introduce decorative infinite animation", () => {
    expect(responsiveCss).not.toMatch(/animation\s*:\s*[^;]*infinite/i);
    expect(responsiveCss).not.toContain("@keyframes");
  });
});
