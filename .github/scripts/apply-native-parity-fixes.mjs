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

const sourcePath = (name) => path.join(uiRoot, name);

const moneyPath = sourcePath("JalvoroWebsiteFinanceDashboard.kt");
const threeTabs = `    val tabs = listOf(
        WebsiteMoneyTab(WebsiteMoneySection.Accounts, "Accounts", JalvoroIcons.Accounts),
        WebsiteMoneyTab(WebsiteMoneySection.Transactions, "Transactions", JalvoroIcons.Transactions),
        WebsiteMoneyTab(WebsiteMoneySection.Profile, "Profile", JalvoroIcons.User),
    )`;
const twoTabs = `    val tabs = listOf(
        WebsiteMoneyTab(WebsiteMoneySection.Accounts, "Accounts", JalvoroIcons.Accounts),
        WebsiteMoneyTab(WebsiteMoneySection.Transactions, "Transactions", JalvoroIcons.Transactions),
    )`;

let moneySource = fs.readFileSync(moneyPath, "utf8");
if (moneySource.includes(threeTabs)) {
  moneySource = moneySource.replace(threeTabs, twoTabs);
  fs.writeFileSync(moneyPath, moneySource);
  console.log("Applied two primary Money tabs.");
} else if (moneySource.includes(twoTabs)) {
  console.log("Verified two primary Money tabs.");
} else {
  throw new Error("Money tab structure does not match the audited source contract.");
}

const contracts = [
  ["JamalsFinanceTheme.kt", ["fun JamalsFinanceTheme("]],
  ["JalvoroWebsiteWorkspaceShell.kt", ["top = 76.dp", ".widthIn(max = 154.dp)", "shadowElevation = 1.dp"]],
  ["JalvoroOverviewDashboard.kt", ["top = 76.dp", "Modifier.size(48.dp)", "modifier.height(128.dp)"]],
  ["JalvoroWebsiteFinanceDashboard.kt", [twoTabs, "style = MaterialTheme.typography.headlineSmall"]],
  ["JalvoroWebsiteModuleRoot.kt", ["horizontalArrangement = Arrangement.spacedBy(14.dp)", "maxLines = 2"]],
  ["JalvoroWebsiteUtilityShell.kt", ["fun JalvoroWebsiteUtilityShell("]],
];

for (const [name, requiredTokens] of contracts) {
  const filePath = sourcePath(name);
  if (!fs.existsSync(filePath)) throw new Error(`Required native UI source is missing: ${name}`);
  const source = fs.readFileSync(filePath, "utf8");
  for (const token of requiredTokens) {
    if (!source.includes(token)) {
      throw new Error(`Required native UI contract is missing from ${name}: ${token}`);
    }
  }
  console.log(`Verified committed native UI source: ${name}`);
}

console.log("Screenshot-driven native UI polish is committed directly.");
