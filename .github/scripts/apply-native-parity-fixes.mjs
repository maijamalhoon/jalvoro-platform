import fs from "node:fs";
import path from "node:path";

const workspace = process.env.GITHUB_WORKSPACE;
if (!workspace) throw new Error("GITHUB_WORKSPACE is required.");

const uiRoot = path.join(
  workspace,
  "native",
  "androidApp",
  "src",
  "main",
  "kotlin",
  "com",
  "jamalsfinance",
  "nativeapp",
  "ui",
);

const requiredSources = [
  ["JamalsFinanceTheme.kt", "fun JamalsFinanceTheme("],
  ["JalvoroNativeDesign.kt", "fun JalvoroSurfaceCard("],
  ["JalvoroWebsiteWorkspaceShell.kt", "internal fun JalvoroWebsiteWorkspaceShell("],
  ["JalvoroOverviewDashboard.kt", "fun JalvoroOverviewDashboard("],
  ["JalvoroWebsiteUtilityShell.kt", "fun JalvoroWebsiteUtilityShell("],
];

for (const [name, requiredToken] of requiredSources) {
  const filePath = path.join(uiRoot, name);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Required native UI source is missing: ${name}`);
  }

  const source = fs.readFileSync(filePath, "utf8");
  if (!source.includes(requiredToken)) {
    throw new Error(`Required native UI contract is missing from ${name}: ${requiredToken}`);
  }

  console.log(`Verified committed native UI source: ${name}`);
}

console.log(
  "Native parity source is committed directly. CI source mutation is intentionally disabled.",
);
