import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const maximumBufferBytes = 20 * 1024 * 1024;
const exceptionAdvisory = "https://github.com/advisories/GHSA-mh99-v99m-4gvg";
const exceptionSource = 1124334;
const exceptionExpiresAt = Date.parse("2026-08-08T23:59:59Z");
const allowedVulnerabilityNames = new Set([
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
const allowedDirectNames = new Set(["eslint", "eslint-config-next"]);

function fail(message) {
  console.error(`[dependency-audit] ${message}`);
  process.exit(1);
}

function runAudit(argumentsList) {
  const result = spawnSync(
    npmCommand,
    ["audit", ...argumentsList, "--json"],
    {
      encoding: "utf8",
      maxBuffer: maximumBufferBytes,
      env: {
        ...process.env,
        NPM_CONFIG_FUND: "false",
        NPM_CONFIG_AUDIT_LEVEL: "low",
      },
    },
  );

  if (result.error) {
    fail(`npm audit could not start: ${result.error.message}`);
  }

  if (result.status !== 0 && result.status !== 1) {
    fail(
      `npm audit failed operationally with exit code ${result.status ?? "unknown"}.`,
    );
  }

  try {
    return JSON.parse(result.stdout);
  } catch {
    fail("npm audit did not return valid JSON.");
  }
}

function vulnerabilityTotal(report) {
  const total = report?.metadata?.vulnerabilities?.total;
  return Number.isInteger(total) ? total : null;
}

function setsEqual(left, right) {
  return left.size === right.size && [...left].every((value) => right.has(value));
}

const packageJson = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8"),
);
const productionReport = runAudit(["--omit=dev", "--audit-level=low"]);
const productionTotal = vulnerabilityTotal(productionReport);
if (productionTotal !== 0) {
  fail(
    `production dependency audit reported ${productionTotal ?? "an unknown number of"} vulnerabilities.`,
  );
}

console.log(
  "[dependency-audit] production dependency audit passed with zero known vulnerabilities.",
);

const completeReport = runAudit(["--audit-level=low"]);
const completeTotal = vulnerabilityTotal(completeReport);
if (completeTotal === 0) {
  console.log(
    "[dependency-audit] complete dependency audit passed with zero known vulnerabilities.",
  );
  process.exit(0);
}

if (Date.now() > exceptionExpiresAt) {
  fail("the temporary ESLint-tooling advisory exception expired on August 8, 2026.");
}

const vulnerabilities = completeReport?.vulnerabilities;
if (
  !vulnerabilities ||
  typeof vulnerabilities !== "object" ||
  Array.isArray(vulnerabilities)
) {
  fail("complete npm audit output did not contain a vulnerability map.");
}

const actualNames = new Set(Object.keys(vulnerabilities));
if (!setsEqual(actualNames, allowedVulnerabilityNames)) {
  fail(
    `unexpected vulnerability set: ${[...actualNames].sort().join(", ") || "none"}.`,
  );
}

const metadata = completeReport?.metadata?.vulnerabilities;
if (
  completeTotal !== allowedVulnerabilityNames.size ||
  metadata?.critical !== 0 ||
  metadata?.high !== allowedVulnerabilityNames.size ||
  metadata?.moderate !== 0 ||
  metadata?.low !== 0
) {
  fail("the advisory count or severity distribution changed.");
}

for (const [name, vulnerability] of Object.entries(vulnerabilities)) {
  if (vulnerability?.severity !== "high") {
    fail(`${name} no longer has the expected high-severity classification.`);
  }

  const shouldBeDirect = allowedDirectNames.has(name);
  if (Boolean(vulnerability?.isDirect) !== shouldBeDirect) {
    fail(`${name} changed its direct/transitive dependency classification.`);
  }

  if (shouldBeDirect) {
    if (!packageJson.devDependencies?.[name] || packageJson.dependencies?.[name]) {
      fail(`${name} must remain a development-only direct dependency.`);
    }
  }
}

const braceExpansion = vulnerabilities["brace-expansion"];
const directAdvisories = Array.isArray(braceExpansion?.via)
  ? braceExpansion.via.filter(
      (entry) => typeof entry === "object" && entry !== null,
    )
  : [];
if (
  directAdvisories.length !== 1 ||
  directAdvisories[0].url !== exceptionAdvisory ||
  directAdvisories[0].source !== exceptionSource ||
  directAdvisories[0].severity !== "high" ||
  directAdvisories[0].range !== "<=5.0.7"
) {
  fail("the brace-expansion advisory identity or affected range changed.");
}

for (const [name, vulnerability] of Object.entries(vulnerabilities)) {
  if (name === "brace-expansion") {
    continue;
  }

  const via = Array.isArray(vulnerability?.via) ? vulnerability.via : [];
  if (
    via.length === 0 ||
    via.some(
      (entry) =>
        typeof entry !== "string" || !allowedVulnerabilityNames.has(entry),
    )
  ) {
    fail(
      `${name} is no longer exclusively linked to the approved ESLint advisory chain.`,
    );
  }
}

console.warn(
  "[dependency-audit] accepted the exact dev-only ESLint tooling chain for GHSA-mh99-v99m-4gvg until August 8, 2026; production dependencies remain clean.",
);
