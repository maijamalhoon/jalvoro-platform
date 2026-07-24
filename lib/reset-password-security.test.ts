import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const resetPasswordSource = readFileSync(
  new URL("../app/reset-password/page.tsx", import.meta.url),
  "utf8",
);

function getGuardSource() {
  const start = resetPasswordSource.indexOf("async function guardResetRoute()");
  const end = resetPasswordSource.indexOf("void guardResetRoute();", start);

  if (start === -1 || end === -1) {
    throw new Error("Password recovery guard source is unavailable.");
  }

  return resetPasswordSource.slice(start, end);
}

describe("password recovery fail-closed state machine", () => {
  it("rejects sensitive hash data before any recovery code exchange", () => {
    const guardSource = getGuardSource();

    expect(guardSource.indexOf("if (hasSensitiveHash)")).toBeLessThan(
      guardSource.indexOf("if (code)"),
    );
  });

  it("verifies an existing session-bound marker before a URL code is considered", () => {
    const guardSource = getGuardSource();

    expect(guardSource.indexOf("readRecoveryMarker()"))
      .toBeLessThan(guardSource.indexOf("if (code)"));
    expect(guardSource.indexOf("verifyBoundRecoveryMarker("))
      .toBeLessThan(guardSource.indexOf("if (code)"));
    expect(guardSource).toContain('if (markerOutcome !== "invalid" || !code)');
  });

  it("keeps marker verification retries distinct from marker binding retries", () => {
    expect(resetPasswordSource).toContain(
      'type MarkerRetryKind = "binding" | "verification";',
    );
    expect(resetPasswordSource).toContain("retryMarkerOperationRef");
    expect(resetPasswordSource).toContain("retryMarkerKindRef");
    expect(resetPasswordSource).toContain(
      'applyMarkerOutcome(markerOutcome, "verification", verifyOperation)',
    );
    expect(resetPasswordSource).toContain(
      'applyMarkerOutcome(markerOutcome, "binding", bindOperation)',
    );
    expect(resetPasswordSource).not.toContain("retryMarkerBindingRef");
  });

  it("does not allow client state alone to unlock a password update", () => {
    expect(resetPasswordSource).toContain(
      'if (recoveryState !== "ready") return;',
    );
    expect(resetPasswordSource).toContain(
      "await supabase.auth.exchangeCodeForSession(recoveryCode)",
    );
    expect(resetPasswordSource).toContain(
      "parseValidRecoveryMarker(rawMarker, sessionHash)",
    );
  });
});
