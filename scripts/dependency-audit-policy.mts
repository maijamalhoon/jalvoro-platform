import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

type AuditVulnerability = {
  [key: string]: unknown;
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
  | { accepted: true; reason: "clean" }
  | { accepted: false; reason: string };

function vulnerabilityNames(report: AuditReport): string[] {
  return Object.keys(report.vulnerabilities ?? {}).sort();
}

function vulnerabilityTotal(report: AuditReport): number {
  const metadataTotal = report.metadata?.vulnerabilities?.total;
  const reportedTotal =
    typeof metadataTotal === "number" &&
    Number.isFinite(metadataTotal) &&
    metadataTotal >= 0
      ? metadataTotal
      : 0;

  return Math.max(reportedTotal, vulnerabilityNames(report).length);
}

export function evaluateAuditReports(
  productionReport: AuditReport,
  fullReport: AuditReport,
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

  if (vulnerabilityTotal(fullReport) !== 0) {
    return {
      accepted: false,
      reason: "A dependency vulnerability is present in the full audit.",
    };
  }

  return { accepted: true, reason: "clean" };
}

function reportVulnerabilities(label: string, report: AuditReport): void {
  if (vulnerabilityTotal(report) === 0) {
    return;
  }

  console.error(
    `${label} audit vulnerabilities:\n${JSON.stringify(
      report.vulnerabilities ?? {},
      null,
      2,
    )}`,
  );
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
      reportVulnerabilities("Production", productionReport);
      reportVulnerabilities("Full", fullReport);
      console.error(`Dependency audit rejected: ${decision.reason}`);
      process.exitCode = 1;
      return;
    }

    console.log("Dependency audit passed with zero known vulnerabilities.");
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
