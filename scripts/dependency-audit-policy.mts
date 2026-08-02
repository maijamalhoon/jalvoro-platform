import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

export type AuditReport = {
  auditReportVersion?: unknown;
  vulnerabilities?: unknown;
  metadata?: unknown;
  [key: string]: unknown;
};

export type NpmAuditProcessResult = {
  error?: Error;
  signal: NodeJS.Signals | null;
  status: number | null;
  stdout: string;
  stderr: string;
};

export type AuditDecision =
  | { accepted: true; reason: "clean" }
  | { accepted: false; reason: string };

const VULNERABILITY_COUNTER_NAMES = [
  "info",
  "low",
  "moderate",
  "high",
  "critical",
  "total",
] as const;

type VulnerabilityCounterName = (typeof VULNERABILITY_COUNTER_NAMES)[number];
type VulnerabilityCounters = Record<VulnerabilityCounterName, number>;
type PlainObject = Record<string, unknown>;

type AuditReportValidation =
  | {
      valid: true;
      counters: VulnerabilityCounters;
      vulnerabilities: PlainObject;
    }
  | { valid: false; reason: string };

function isPlainObject(value: unknown): value is PlainObject {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function validateAuditReport(report: AuditReport): AuditReportValidation {
  if (report.auditReportVersion !== 2) {
    return { valid: false, reason: "Unsupported npm audit report format." };
  }

  if (!isPlainObject(report.vulnerabilities)) {
    return {
      valid: false,
      reason: "The vulnerabilities map must be a non-null plain object.",
    };
  }

  if (!isPlainObject(report.metadata)) {
    return {
      valid: false,
      reason: "The metadata object is missing or malformed.",
    };
  }

  const vulnerabilityMetadata = report.metadata.vulnerabilities;
  if (!isPlainObject(vulnerabilityMetadata)) {
    return {
      valid: false,
      reason: "The metadata vulnerability counters are missing or malformed.",
    };
  }

  const counters = {} as VulnerabilityCounters;
  for (const name of VULNERABILITY_COUNTER_NAMES) {
    const value = vulnerabilityMetadata[name];
    if (
      !Object.hasOwn(vulnerabilityMetadata, name) ||
      typeof value !== "number" ||
      !Number.isFinite(value) ||
      !Number.isInteger(value) ||
      value < 0
    ) {
      return {
        valid: false,
        reason: `The ${name} vulnerability counter must be a finite non-negative integer.`,
      };
    }

    counters[name] = value;
  }

  const severityTotal =
    counters.info +
    counters.low +
    counters.moderate +
    counters.high +
    counters.critical;

  if (counters.total === 0 && severityTotal !== 0) {
    return {
      valid: false,
      reason: "The total is zero while a severity counter is nonzero.",
    };
  }

  if (counters.total !== severityTotal) {
    return {
      valid: false,
      reason: "The total does not equal the sum of the severity counters.",
    };
  }

  const vulnerabilityCount = Object.keys(report.vulnerabilities).length;
  if (counters.total === 0 && vulnerabilityCount !== 0) {
    return {
      valid: false,
      reason: "The vulnerability map is nonempty while the total is zero.",
    };
  }

  if (counters.total > 0 && vulnerabilityCount === 0) {
    return {
      valid: false,
      reason: "The vulnerability map is empty while the total is nonzero.",
    };
  }

  return {
    valid: true,
    counters,
    vulnerabilities: report.vulnerabilities,
  };
}

function malformedAuditDecision(
  label: "production" | "full",
  reason: string,
): AuditDecision {
  if (reason === "Unsupported npm audit report format.") {
    return { accepted: false, reason };
  }

  return {
    accepted: false,
    reason: `Malformed or inconsistent ${label} npm audit report: ${reason}`,
  };
}

export function evaluateAuditReports(
  productionReport: AuditReport,
  fullReport: AuditReport,
): AuditDecision {
  const productionValidation = validateAuditReport(productionReport);
  if (!productionValidation.valid) {
    return malformedAuditDecision("production", productionValidation.reason);
  }

  const fullValidation = validateAuditReport(fullReport);
  if (!fullValidation.valid) {
    return malformedAuditDecision("full", fullValidation.reason);
  }

  if (productionValidation.counters.total !== 0) {
    return {
      accepted: false,
      reason: "A production dependency vulnerability is present.",
    };
  }

  if (fullValidation.counters.total !== 0) {
    return {
      accepted: false,
      reason: "A dependency vulnerability is present in the full audit.",
    };
  }

  return { accepted: true, reason: "clean" };
}

function reportVulnerabilities(label: string, report: AuditReport): void {
  if (
    !isPlainObject(report.vulnerabilities) ||
    Object.keys(report.vulnerabilities).length === 0
  ) {
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

export function parseNpmAuditProcessResult(
  result: NpmAuditProcessResult,
): AuditReport {
  if (result.error) {
    throw new Error(`npm audit could not start: ${result.error.message}`);
  }

  if (result.signal !== null) {
    throw new Error(`npm audit was terminated by signal ${result.signal}.`);
  }

  if (result.status !== 0 && result.status !== 1) {
    throw new Error(
      `npm audit exited with unexpected status ${String(result.status)}.`,
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(result.stdout) as unknown;
  } catch {
    throw new Error("npm audit did not return valid JSON.");
  }

  if (!isPlainObject(parsed)) {
    throw new Error("npm audit did not return a JSON report object.");
  }

  if (Object.hasOwn(parsed, "error")) {
    throw new Error("npm audit returned a transport or configuration error.");
  }

  const report = parsed as AuditReport;
  const validation = validateAuditReport(report);
  if (
    result.status === 1 &&
    validation.valid &&
    validation.counters.total === 0
  ) {
    throw new Error(
      "npm audit exited with status 1 but reported zero vulnerabilities.",
    );
  }

  return report;
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

  return parseNpmAuditProcessResult(result);
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
