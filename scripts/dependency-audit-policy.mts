import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

// Keep the CI exception narrow, auditable, and self-expiring.
const TEMPORARY_ADVISORY_URL =
  "https://github.com/advisories/GHSA-mh99-v99m-4gvg";
const TEMPORARY_ADVISORY_SOURCE = 1124334;
const TEMPORARY_EXCEPTION_EXPIRES_AT = "2026-08-01T00:00:00.000Z";
const TRACKING_ISSUE =
  "https://github.com/maijamalhoon/jalvoro-platform/issues/141";

const ALLOWED_DEVELOPMENT_CHAIN = new Set([
  "@eslint/config-array",
  "@eslint/eslintrc",
  "brace-expansion",
  "eslint",
  "eslint-config-next",
  "eslint-plugin-import",
  "eslint-plugin-jsx-a11y",
  "eslint-plugin-react",
  "minimatch",
]);

type AuditViaAdvisory = {
  source?: number;
  url?: string;
};

type AuditVulnerability = {
  via?: Array<string | AuditViaAdvisory>;
};

export type AuditReport = {
  auditReportVersion?: number;
  vulnerabilities?: Record<string, AuditVulnerability>;
  metadata?: {
    vulnerabilities?: {
      total?: number;
      critical?: number;
    };
  };
};

export type AuditDecision =
  | { accepted: true; reason: "clean" | "temporary-development-exception" }
  | { accepted: false; reason: string };

function vulnerabilityNames(report: AuditReport): string[] {
  return Object.keys(report.vulnerabilities ?? {}).sort();
}

function vulnerabilityTotal(report: AuditReport): number {
  const metadataTotal = report.metadata?.vulnerabilities?.total;
  return typeof metadataTotal === "number"
    ? metadataTotal
    : vulnerabilityNames(report).length;
}

export function evaluateAuditReports(
  productionReport: AuditReport,
  fullReport: AuditReport,
  now = new Date(),
): AuditDecision {
  if (
    productionReport.auditReportVersion !== 2 ||
    fullReport.auditReportVersion !== 2
  ) {
    return { accepted: false, reason: "Unsupported npm audit report format." };
  }

  if (vulnerabilityTotal(productionReport) !== 0) {
    return {
      accepted: false,
      reason: "A production dependency vulnerability is present.",
    };
  }

  if (vulnerabilityTotal(fullReport) === 0) {
    return { accepted: true, reason: "clean" };
  }

  if (now.getTime() >= Date.parse(TEMPORARY_EXCEPTION_EXPIRES_AT)) {
    return {
      accepted: false,
      reason: "The temporary development advisory exception has expired.",
    };
  }

  if ((fullReport.metadata?.vulnerabilities?.critical ?? 0) > 0) {
    return {
      accepted: false,
      reason: "A critical development dependency vulnerability is present.",
    };
  }

  const names = vulnerabilityNames(fullReport);
  if (
    names.length === 0 ||
    names.some((name) => !ALLOWED_DEVELOPMENT_CHAIN.has(name))
  ) {
    return {
      accepted: false,
      reason: "The full audit contains an unapproved vulnerability chain.",
    };
  }

  const braceExpansion = fullReport.vulnerabilities?.["brace-expansion"];
  const advisory = braceExpansion?.via?.find(
    (entry): entry is AuditViaAdvisory =>
      typeof entry === "object" && entry !== null,
  );

  if (
    advisory?.source !== TEMPORARY_ADVISORY_SOURCE ||
    advisory.url !== TEMPORARY_ADVISORY_URL
  ) {
    return {
      accepted: false,
      reason: "The development advisory identity does not match the exception.",
    };
  }

  return { accepted: true, reason: "temporary-development-exception" };
}

function runNpmAudit(extraArguments: string[]): AuditReport {
  const npmCliPath = process.env.npm_execpath;
  const executable = npmCliPath ? process.execPath : "npm";
  const commandArguments = npmCliPath
    ? [npmCliPath, "audit", "--audit-level=low", "--json", ...extraArguments]
    : ["audit", "--audit-level=low", "--json", ...extraArguments];
  const result = spawnSync(
    executable,
    commandArguments,
    {
      encoding: "utf8",
      maxBuffer: 20 * 1024 * 1024,
    },
  );

  if (result.error) {
    throw new Error(`npm audit could not start: ${result.error.message}`);
  }

  try {
    return JSON.parse(result.stdout) as AuditReport;
  } catch {
    const diagnostic = result.stderr.trim() || result.stdout.trim();
    throw new Error(
      `npm audit did not return valid JSON${diagnostic ? `: ${diagnostic}` : "."}`,
    );
  }
}

function main(): void {
  try {
    const productionReport = runNpmAudit(["--omit=dev"]);
    const fullReport = runNpmAudit([]);
    const decision = evaluateAuditReports(productionReport, fullReport);

    if (!decision.accepted) {
      console.error(`Dependency audit rejected: ${decision.reason}`);
      process.exitCode = 1;
      return;
    }

    if (decision.reason === "clean") {
      console.log("Dependency audit passed with zero known vulnerabilities.");
      return;
    }

    console.warn(
      [
        "Dependency audit passed with one time-bounded development-only exception:",
        `- advisory: ${TEMPORARY_ADVISORY_URL}`,
        `- expires: ${TEMPORARY_EXCEPTION_EXPIRES_AT}`,
        `- tracking: ${TRACKING_ISSUE}`,
        "- production dependency vulnerabilities: 0",
      ].join("\n"),
    );
  } catch (error) {
    console.error(
      `Dependency audit failed: ${
        error instanceof Error ? error.message : "Unknown audit error."
      }`,
    );
    process.exitCode = 1;
  }
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : null;
if (invokedPath && fileURLToPath(import.meta.url) === invokedPath) {
  main();
}
