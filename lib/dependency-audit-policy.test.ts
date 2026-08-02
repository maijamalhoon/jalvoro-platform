import { describe, expect, it } from "vitest";

import {
  evaluateAuditReports,
  type AuditReport,
} from "../scripts/dependency-audit-policy.mjs";

const cleanReport: AuditReport = {
  auditReportVersion: 2,
  vulnerabilities: {},
  metadata: { vulnerabilities: { total: 0, critical: 0 } },
};

const developmentVulnerabilityReport: AuditReport = {
  auditReportVersion: 2,
  vulnerabilities: {
    "@eslint/config-array": { via: ["minimatch"] },
    "@eslint/eslintrc": { via: ["minimatch"] },
    "brace-expansion": {
      via: [
        {
          source: 1124334,
          url: "https://github.com/advisories/GHSA-mh99-v99m-4gvg",
        },
      ],
    },
    eslint: { via: ["minimatch"] },
    "eslint-config-next": { via: ["eslint-plugin-import"] },
    "eslint-plugin-import": { via: ["minimatch"] },
    "eslint-plugin-jsx-a11y": { via: ["minimatch"] },
    "eslint-plugin-react": { via: ["minimatch"] },
    minimatch: { via: ["brace-expansion"] },
  },
  metadata: { vulnerabilities: { total: 9, critical: 0 } },
};

describe("dependency audit policy", () => {
  it("accepts a fully clean dependency tree", () => {
    expect(evaluateAuditReports(cleanReport, cleanReport)).toEqual({
      accepted: true,
      reason: "clean",
    });
  });

  it("rejects every production vulnerability", () => {
    expect(
      evaluateAuditReports(
        developmentVulnerabilityReport,
        developmentVulnerabilityReport,
      ),
    ).toEqual({
      accepted: false,
      reason: "A production dependency vulnerability is present.",
    });
  });

  it("rejects every development vulnerability without an exception", () => {
    expect(
      evaluateAuditReports(cleanReport, developmentVulnerabilityReport),
    ).toEqual({
      accepted: false,
      reason: "A dependency vulnerability is present in the full audit.",
    });
  });

  it("rejects a finding even if audit metadata incorrectly reports zero", () => {
    const inconsistentReport: AuditReport = {
      auditReportVersion: 2,
      vulnerabilities: { "future-advisory": { via: [] } },
      metadata: { vulnerabilities: { total: 0, critical: 0 } },
    };

    expect(
      evaluateAuditReports(cleanReport, inconsistentReport),
    ).toEqual({
      accepted: false,
      reason: "A dependency vulnerability is present in the full audit.",
    });
  });

  it("rejects an unsupported future audit report format", () => {
    expect(
      evaluateAuditReports(cleanReport, {
        auditReportVersion: 3,
        vulnerabilities: {},
        metadata: { vulnerabilities: { total: 0, critical: 0 } },
      }),
    ).toEqual({
      accepted: false,
      reason: "Unsupported npm audit report format.",
    });
  });
});
