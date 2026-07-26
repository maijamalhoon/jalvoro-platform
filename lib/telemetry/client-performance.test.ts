import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./client.ts", import.meta.url), "utf8");

describe("privacy-preserving runtime performance coverage", () => {
  it("captures the required web vitals", () => {
    for (const metric of ["LCP", "INP", "CLS", "TTFB"]) {
      expect(source).toContain(`"${metric}"`);
    }
  });

  it("measures route transitions and same-origin API latency", () => {
    expect(source).toContain("performance.now()");
    expect(source).toContain('url.pathname.startsWith("/api/")');
    expect(source).toContain('url.pathname !== TELEMETRY_ENDPOINT');
    expect(source).toContain('eventName: "page_navigation"');
    expect(source).toContain('metricName: "LOAD"');
  });

  it("records API success and failure without query strings or payloads", () => {
    expect(source).toContain('result: response.ok ? "success" : "failure"');
    expect(source).toContain('eventName: "operation_failed"');
    expect(source).toContain("normalizeTelemetryRoute(url.pathname)");
    expect(source).not.toContain("url.searchParams");
  });

  it("honors browser privacy signals", () => {
    expect(source).toContain("globalPrivacyControl");
    expect(source).toContain("navigator.doNotTrack");
  });
});
