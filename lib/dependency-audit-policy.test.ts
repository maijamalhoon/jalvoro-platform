import { describe, expect, it } from "vitest";

import {
  evaluateAuditReports,
  parseNpmAuditProcessResult,
  type AuditReport,
  type NpmAuditProcessResult,
} from "../scripts/dependency-audit-policy.mjs";

const ZERO_COUNTERS = {
  info: 0,
  low: 0,
  moderate: 0,
  high: 0,
  critical: 0,
  total: 0,
};

const COUNTER_NAMES = [
  "info",
  "low",
  "moderate",
  "high",
  "critical",
  "total",
] as const;

function auditReport({
  counters = ZERO_COUNTERS,
  vulnerabilities = {},
}: {
  counters?: Record<string, unknown>;
  vulnerabilities?: unknown;
} = {}): AuditReport {
  return {
    auditReportVersion: 2,
    vulnerabilities,
    metadata: { vulnerabilities: { ...counters } },
  };
}

const cleanReport = auditReport();
const vulnerabilityReport = auditReport({
  counters: { ...ZERO_COUNTERS, high: 1, total: 1 },
  vulnerabilities: {
    "vulnerable-package": {
      via: [
        {
          source: 1234567,
          url: "https://github.com/advisories/GHSA-test-test-test",
        },
      ],
    },
  },
});

function processResult(
  overrides: Partial<NpmAuditProcessResult> = {},
): NpmAuditProcessResult {
  return {
    signal: null,
    status: 0,
    stdout: JSON.stringify(cleanReport),
    stderr: "",
    ...overrides,
  };
}

function expectMalformed(decision: ReturnType<typeof evaluateAuditReports>): void {
  expect(decision).toEqual({
    accepted: false,
    reason: expect.stringContaining("Malformed or inconsistent"),
  });
}

describe("dependency audit policy report validation", () => {
  it("accepts valid fully clean production and full reports", () => {
    expect(evaluateAuditReports(cleanReport, cleanReport)).toEqual({
      accepted: true,
      reason: "clean",
    });
  });

  it("rejects a production vulnerability", () => {
    expect(evaluateAuditReports(vulnerabilityReport, vulnerabilityReport)).toEqual(
      {
        accepted: false,
        reason: "A production dependency vulnerability is present.",
      },
    );
  });

  it("rejects a development-only vulnerability", () => {
    expect(evaluateAuditReports(cleanReport, vulnerabilityReport)).toEqual({
      accepted: false,
      reason: "A dependency vulnerability is present in the full audit.",
    });
  });

  it("rejects a missing vulnerabilities map", () => {
    const malformed = auditReport();
    delete malformed.vulnerabilities;

    expectMalformed(evaluateAuditReports(cleanReport, malformed));
  });

  it.each([null, []])(
    "rejects a non-plain vulnerabilities map: %j",
    (vulnerabilities) => {
      expectMalformed(
        evaluateAuditReports(cleanReport, auditReport({ vulnerabilities })),
      );
    },
  );

  it("rejects missing metadata", () => {
    const malformed = auditReport();
    delete malformed.metadata;

    expectMalformed(evaluateAuditReports(cleanReport, malformed));
  });

  it.each([null, []])("rejects malformed metadata: %j", (metadata) => {
    expectMalformed(
      evaluateAuditReports(cleanReport, {
        auditReportVersion: 2,
        vulnerabilities: {},
        metadata,
      }),
    );
  });

  it("rejects missing metadata vulnerability counters", () => {
    expectMalformed(
      evaluateAuditReports(cleanReport, {
        auditReportVersion: 2,
        vulnerabilities: {},
        metadata: {},
      }),
    );
  });

  it.each(COUNTER_NAMES)("rejects a missing %s counter", (name) => {
    const counters: Record<string, unknown> = { ...ZERO_COUNTERS };
    delete counters[name];

    expectMalformed(
      evaluateAuditReports(cleanReport, auditReport({ counters })),
    );
  });

  it("rejects a non-numeric counter", () => {
    expectMalformed(
      evaluateAuditReports(
        cleanReport,
        auditReport({ counters: { ...ZERO_COUNTERS, low: "0" } }),
      ),
    );
  });

  it("rejects a negative counter", () => {
    expectMalformed(
      evaluateAuditReports(
        cleanReport,
        auditReport({ counters: { ...ZERO_COUNTERS, low: -1 } }),
      ),
    );
  });

  it("rejects a fractional counter", () => {
    expectMalformed(
      evaluateAuditReports(
        cleanReport,
        auditReport({ counters: { ...ZERO_COUNTERS, moderate: 0.5 } }),
      ),
    );
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
    "rejects a non-finite counter: %s",
    (value) => {
      expectMalformed(
        evaluateAuditReports(
          cleanReport,
          auditReport({ counters: { ...ZERO_COUNTERS, high: value } }),
        ),
      );
    },
  );

  it("rejects a total that differs from the severity sum", () => {
    expectMalformed(
      evaluateAuditReports(
        cleanReport,
        auditReport({
          counters: { ...ZERO_COUNTERS, high: 1, total: 2 },
          vulnerabilities: { "vulnerable-package": {} },
        }),
      ),
    );
  });

  it("rejects total zero with critical one", () => {
    expectMalformed(
      evaluateAuditReports(
        cleanReport,
        auditReport({
          counters: { ...ZERO_COUNTERS, critical: 1 },
          vulnerabilities: { "critical-package": {} },
        }),
      ),
    );
  });

  it("rejects an empty vulnerability map with a nonzero total", () => {
    expectMalformed(
      evaluateAuditReports(
        cleanReport,
        auditReport({ counters: { ...ZERO_COUNTERS, high: 1, total: 1 } }),
      ),
    );
  });

  it("rejects a nonempty vulnerability map with a zero total", () => {
    expectMalformed(
      evaluateAuditReports(
        cleanReport,
        auditReport({ vulnerabilities: { "unexpected-package": {} } }),
      ),
    );
  });

  it("rejects an unsupported audit report version", () => {
    expect(
      evaluateAuditReports(cleanReport, {
        ...cleanReport,
        auditReportVersion: 3,
      }),
    ).toEqual({
      accepted: false,
      reason: "Unsupported npm audit report format.",
    });
  });
});

describe("dependency audit policy process validation", () => {
  it("parses a valid clean status-zero report", () => {
    expect(parseNpmAuditProcessResult(processResult())).toEqual(cleanReport);
  });

  it.each(["", "{"])("rejects malformed JSON: %j", (stdout) => {
    expect(() =>
      parseNpmAuditProcessResult(processResult({ stdout })),
    ).toThrow("npm audit did not return valid JSON.");
  });

  it("rejects a process-launch error", () => {
    expect(() =>
      parseNpmAuditProcessResult(
        processResult({ error: new Error("spawn failed"), status: null }),
      ),
    ).toThrow("npm audit could not start: spawn failed");
  });

  it("rejects signal termination", () => {
    expect(() =>
      parseNpmAuditProcessResult(
        processResult({ signal: "SIGTERM", status: null }),
      ),
    ).toThrow("npm audit was terminated by signal SIGTERM.");
  });

  it("rejects a null process exit status", () => {
    expect(() =>
      parseNpmAuditProcessResult(processResult({ status: null })),
    ).toThrow("npm audit exited with unexpected status null.");
  });

  it("rejects an unexpected process exit status", () => {
    expect(() =>
      parseNpmAuditProcessResult(processResult({ status: 2 })),
    ).toThrow("npm audit exited with unexpected status 2.");
  });

  it("rejects npm transport or configuration error JSON", () => {
    expect(() =>
      parseNpmAuditProcessResult(
        processResult({
          status: 1,
          stdout: JSON.stringify({
            error: { code: "ENOAUDIT", summary: "audit endpoint unavailable" },
          }),
        }),
      ),
    ).toThrow("npm audit returned a transport or configuration error.");
  });

  it("parses status one with a valid vulnerability report for policy rejection", () => {
    const parsed = parseNpmAuditProcessResult(
      processResult({
        status: 1,
        stdout: JSON.stringify(vulnerabilityReport),
      }),
    );

    expect(evaluateAuditReports(cleanReport, parsed)).toEqual({
      accepted: false,
      reason: "A dependency vulnerability is present in the full audit.",
    });
  });

  it("rejects status one paired with a clean report", () => {
    expect(() =>
      parseNpmAuditProcessResult(processResult({ status: 1 })),
    ).toThrow("npm audit exited with status 1 but reported zero vulnerabilities.");
  });
});
