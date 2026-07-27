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

function replaceBlock(filePath, before, after, label) {
  const source = fs.readFileSync(filePath, "utf8");
  if (source.includes(after)) {
    console.log(`Verified ${label}.`);
    return;
  }
  const count = source.split(before).length - 1;
  if (count !== 1) throw new Error(`Expected one ${label} block, found ${count}.`);
  fs.writeFileSync(filePath, source.replace(before, after));
  console.log(`Applied ${label}.`);
}

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
replaceBlock(moneyPath, threeTabs, twoTabs, "two primary Money tabs");

const advisorPath = sourcePath("JalvoroAdvisorOverview.kt");
const technicalBoundary = `    JalvoroSurfaceCard {
        Column(
            modifier = Modifier.fillMaxWidth().padding(18.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(9.dp),
            ) {
                Icon(
                    imageVector = JalvoroIcons.Privacy,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.primary,
                )
                Text(
                    text = "Advisor safety boundary",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                )
            }
            JalvoroAdvisorKeyValue("Authentication", "Supabase access token")
            JalvoroAdvisorKeyValue("Data isolation", "PostgreSQL Row Level Security")
            JalvoroAdvisorKeyValue("Provider mode", if (aiAvailable) "Server AI" else "Deterministic fallback")
            JalvoroAdvisorKeyValue("Provider", provider.ifBlank { "Unavailable" })
            JalvoroAdvisorKeyValue("Model", model.ifBlank { "Unavailable" })
            generatedAt?.takeIf(String::isNotBlank)?.let {
                JalvoroAdvisorKeyValue("Generated", it)
            }
            JalvoroAdvisorKeyValue("Mobile secrets", "No service-role or AI-provider key")
            Text(
                text = "Advisor responses are informational and should be verified before major financial, tax, legal or investment decisions.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }`;
const userBoundary = `    val providerReady = provider.isNotBlank() && model.isNotBlank()
    JalvoroSurfaceCard {
        Column(
            modifier = Modifier.fillMaxWidth().padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(9.dp),
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(9.dp),
            ) {
                Icon(
                    imageVector = JalvoroIcons.Privacy,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.primary,
                )
                Text(
                    text = "Privacy and guidance",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                )
            }
            JalvoroAdvisorKeyValue("Data used", "Your authenticated finance summary only")
            JalvoroAdvisorKeyValue(
                "Guidance mode",
                if (aiAvailable && providerReady) "Secure server guidance" else "Private deterministic fallback",
            )
            generatedAt?.takeIf(String::isNotBlank)?.let {
                JalvoroAdvisorKeyValue("Last updated", it)
            }
            Text(
                text = "Your saved records are not changed by the advisor. Verify guidance before major financial, tax, legal or investment decisions.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }`;
replaceBlock(advisorPath, technicalBoundary, userBoundary, "user-facing advisor privacy summary");

const contracts = [
  ["JamalsFinanceTheme.kt", ["fun JamalsFinanceTheme("]],
  ["JalvoroWebsiteWorkspaceShell.kt", ["top = 76.dp", ".widthIn(max = 154.dp)", "shadowElevation = 1.dp"]],
  ["JalvoroOverviewDashboard.kt", ["top = 76.dp", "Modifier.size(48.dp)", "modifier.height(128.dp)"]],
  ["JalvoroWebsiteFinanceDashboard.kt", [twoTabs, "style = MaterialTheme.typography.headlineSmall"]],
  ["JalvoroWebsiteModuleRoot.kt", ["horizontalArrangement = Arrangement.spacedBy(14.dp)", "maxLines = 2"]],
  ["JalvoroAdvisorOverview.kt", ["Privacy and guidance", "Your authenticated finance summary only"]],
  ["JalvoroPlanningComponents.kt", ["heightIn(max = 620.dp)", ".imePadding()", "return \"Rs $formatted\""]],
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
