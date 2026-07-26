import { describe, expect, it } from "vitest";

import {
  evaluateAuditReports,
  type AuditReport,
} from "../scripts/dependency-audit-policy";

const cleanReport: AuditReport = {
  auditReportVersion: 2,
  vulnerabilities: {},
  metadata: { vulnerabilities: { total: 0, critical: 0 } },
};

const allowedDevelopmentReport: AuditReport = {
  auditReportVersion: 2,
  vulnerabilities: {
    "@eslint-community/eslint-utils": { via: ["eslint"] },
    "@eslint/config-array": { via: ["minimatch"] },
    "@eslint/eslintrc": { via: ["minimatch"] },
    "@typescript-eslint/eslint-plugin": {
      via: [
        "@typescript-eslint/parser",
        "@typescript-eslint/type-utils",
        "@typescript-eslint/utils",
        "eslint",
      ],
    },
    "@typescript-eslint/parser": { via: ["eslint"] },
    "@typescript-eslint/type-utils": {
      via: ["@typescript-eslint/utils", "eslint"],
    },
    "@typescript-eslint/utils": {
      via: ["@eslint-community/eslint-utils", "eslint"],
    },
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
    "eslint-import-resolver-typescript": {
      via: ["eslint", "eslint-plugin-import"],
    },
    "eslint-plugin-import": { via: ["minimatch"] },
    "eslint-plugin-jsx-a11y": { via: ["minimatch"] },
    "eslint-plugin-react": { via: ["minimatch"] },
    "eslint-plugin-react-hooks": { via: ["eslint"] },
    minimatch: { via: ["brace-expansion"] },
    "typescript-eslint": {
      via: [
        "@typescript-eslint/eslint-plugin",
        "@typescript-eslint/parser",
        "@typescript-eslint/utils",
        "eslint",
      ],
    },
  },
  metadata: { vulnerabilities: { total: 17, critical: 0 } },
};

describe("dependency audit policy", () => {
  it("accepts a fully clean dependency tree", () => {
    expect(
      evaluateAuditReports(cleanReport, cleanReport, new Date("2026-07-25")),
    ).toEqual({ accepted: true, reason: "clean" });
  });

  it("accepts only the exact time-bounded development advisory chain", () => {
    expect(
      evaluateAuditReports(
        cleanReport,
        allowedDevelopmentReport,
        new Date("2026-07-25"),
      ),
    ).toEqual({
      accepted: true,
      reason: "temporary-development-exception",
    });
  });

  it("rejects every production vulnerability", () => {
    expect(
      evaluateAuditReports(
        allowedDevelopmentReport,
        allowedDevelopmentReport,
        new Date("2026-07-25"),
      ),
    ).toMatchObject({ accepted: false });
  });

  it("rejects an unrelated development advisory", () => {
    const unexpected: AuditReport = structuredClone(allowedDevelopmentReport);
    unexpected.vulnerabilities = {
      ...unexpected.vulnerabilities,
      "unexpected-package": { via: [] },
    };
    unexpected.metadata = { vulnerabilities: { total: 18, critical: 0 } };

    expect(
      evaluateAuditReports(cleanReport, unexpected, new Date("2026-07-25")),
    ).toMatchObject({
      accepted: false,
      reason: "The full audit contains an unapproved vulnerability chain.",
    });
  });

  it("rejects the exception after its deadline", () => {
    expect(
      evaluateAuditReports(
        cleanReport,
        allowedDevelopmentReport,
        new Date("2026-08-01T00:00:00.000Z"),
      ),
    ).toMatchObject({
      accepted: false,
      reason: "The temporary development advisory exception has expired.",
    });
  });
});
