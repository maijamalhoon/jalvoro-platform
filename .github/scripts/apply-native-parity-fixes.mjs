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

const file = (name) => path.join(uiRoot, name);

function replaceOnce(filePath, before, after, label) {
  const source = fs.readFileSync(filePath, "utf8");
  if (source.includes(after)) {
    console.log(`Verified ${label}`);
    return false;
  }
  const first = source.indexOf(before);
  const last = source.lastIndexOf(before);
  if (first < 0) throw new Error(`Missing ${label} in ${filePath}`);
  if (first !== last) throw new Error(`Ambiguous ${label} in ${filePath}`);
  fs.writeFileSync(
    filePath,
    source.slice(0, first) + after + source.slice(first + before.length),
  );
  console.log(`Applied ${label}`);
  return true;
}

function replaceExpected(filePath, before, after, expected, label) {
  const source = fs.readFileSync(filePath, "utf8");
  const count = source.split(before).length - 1;
  if (count === 0) {
    console.log(`Verified ${label}`);
    return false;
  }
  if (count !== expected) {
    throw new Error(`Expected ${expected} ${label} replacements in ${filePath}, found ${count}`);
  }
  fs.writeFileSync(filePath, source.split(before).join(after));
  console.log(`Applied ${label}`);
  return true;
}

const shell = file("JalvoroWebsiteWorkspaceShell.kt");
replaceOnce(shell, "                    top = 88.dp,", "                    top = 76.dp,", "compact workspace top inset");
replaceOnce(
  shell,
  ".padding(horizontal = 16.dp, vertical = 10.dp)\n            .heightIn(min = 52.dp)",
  ".padding(horizontal = 14.dp, vertical = 6.dp)\n            .heightIn(min = 48.dp)",
  "compact floating header",
);
replaceOnce(shell, ".widthIn(max = 182.dp)", ".widthIn(max = 154.dp)", "compact header brand width");
replaceExpected(shell, "shadowElevation = 4.dp", "shadowElevation = 1.dp", 2, "restrained header elevation");
replaceOnce(
  shell,
  ".padding(horizontal = 16.dp, vertical = 14.dp),\n                horizontalArrangement = Arrangement.spacedBy(12.dp)",
  ".padding(horizontal = 16.dp, vertical = 10.dp),\n                horizontalArrangement = Arrangement.spacedBy(12.dp)",
  "compact drawer header",
);

const money = file("JalvoroWebsiteFinanceDashboard.kt");
replaceOnce(
  money,
  "        WebsiteMoneyTab(WebsiteMoneySection.Transactions, \"Transactions\", JalvoroIcons.Transactions),\n        WebsiteMoneyTab(WebsiteMoneySection.Profile, \"Profile\", JalvoroIcons.User),",
  "        WebsiteMoneyTab(WebsiteMoneySection.Transactions, \"Transactions\", JalvoroIcons.Transactions),",
  "two primary Money tabs",
);
replaceOnce(
  money,
  "modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp),\n        verticalArrangement = Arrangement.spacedBy(10.dp),",
  "modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 4.dp),\n        verticalArrangement = Arrangement.spacedBy(8.dp),",
  "compact Money header",
);
replaceOnce(
  money,
  "text = \"Money\",\n                    style = MaterialTheme.typography.headlineMedium,",
  "text = \"Money\",\n                    style = MaterialTheme.typography.headlineSmall,",
  "balanced Money title scale",
);

const overview = file("JalvoroOverviewDashboard.kt");
replaceOnce(overview, "                    top = 88.dp,", "                    top = 76.dp,", "compact Overview top inset");
replaceOnce(
  overview,
  "modifier = modifier.statusBarsPadding().padding(horizontal = 16.dp, vertical = 12.dp)",
  "modifier = modifier.statusBarsPadding().padding(horizontal = 14.dp, vertical = 6.dp)",
  "compact Overview controls",
);
replaceExpected(overview, "Modifier.size(44.dp)", "Modifier.size(48.dp)", 3, "48dp Overview touch targets");
replaceExpected(overview, "shadowElevation = 8.dp", "shadowElevation = 2.dp", 2, "restrained Overview control elevation");
replaceOnce(
  overview,
  "modifier = modifier.height(136.dp),\n        shape = RoundedCornerShape(18.dp),\n        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainer),\n        elevation = CardDefaults.cardElevation(defaultElevation = 4.dp),",
  "modifier = modifier.height(128.dp),\n        shape = RoundedCornerShape(16.dp),\n        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainer),\n        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),",
  "compact Overview metric cards",
);
replaceOnce(
  overview,
  "modifier = Modifier.fillMaxSize().padding(16.dp),\n            verticalArrangement = Arrangement.SpaceBetween,",
  "modifier = Modifier.fillMaxSize().padding(14.dp),\n            verticalArrangement = Arrangement.SpaceBetween,",
  "compact Overview metric padding",
);

const moduleRoot = file("JalvoroWebsiteModuleRoot.kt");
replaceOnce(
  moduleRoot,
  `    Card(\n        onClick = item.onClick,\n        modifier = modifier.semantics(mergeDescendants = true) {\n            contentDescription = "\${item.title}. \${item.description}"\n        },\n        shape = RoundedCornerShape(18.dp),\n        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainer),\n        elevation = CardDefaults.cardElevation(defaultElevation = 4.dp),\n        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.75f)),\n    ) {\n        Column(\n            modifier = Modifier.fillMaxWidth().padding(18.dp),\n            verticalArrangement = Arrangement.spacedBy(10.dp),\n        ) {\n            Surface(shape = CircleShape, color = item.tone, contentColor = Color.White) {\n                Icon(item.icon, contentDescription = null, modifier = Modifier.padding(10.dp).size(21.dp))\n            }\n            Text(\n                text = item.title,\n                style = MaterialTheme.typography.titleMedium,\n                fontWeight = FontWeight.Bold,\n                maxLines = 1,\n                overflow = TextOverflow.Ellipsis,\n            )\n            Text(\n                text = item.description,\n                style = MaterialTheme.typography.bodySmall,\n                color = MaterialTheme.colorScheme.onSurfaceVariant,\n            )\n            Row(verticalAlignment = Alignment.CenterVertically) {\n                Text(\n                    text = "Open",\n                    color = MaterialTheme.colorScheme.primary,\n                    style = MaterialTheme.typography.labelLarge,\n                    fontWeight = FontWeight.Bold,\n                )\n                Spacer(Modifier.size(6.dp))\n                Icon(\n                    imageVector = JalvoroIcons.ArrowRight,\n                    contentDescription = null,\n                    modifier = Modifier.size(16.dp),\n                    tint = MaterialTheme.colorScheme.primary,\n                )\n            }\n        }\n    }`,
  `    Card(\n        onClick = item.onClick,\n        modifier = modifier.semantics(mergeDescendants = true) {\n            contentDescription = "\${item.title}. \${item.description}"\n        },\n        shape = RoundedCornerShape(16.dp),\n        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainer),\n        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),\n        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.72f)),\n    ) {\n        Row(\n            modifier = Modifier.fillMaxWidth().padding(16.dp),\n            horizontalArrangement = Arrangement.spacedBy(14.dp),\n            verticalAlignment = Alignment.CenterVertically,\n        ) {\n            Surface(shape = CircleShape, color = item.tone, contentColor = Color.White) {\n                Icon(item.icon, contentDescription = null, modifier = Modifier.padding(9.dp).size(20.dp))\n            }\n            Column(\n                modifier = Modifier.weight(1f),\n                verticalArrangement = Arrangement.spacedBy(3.dp),\n            ) {\n                Text(\n                    text = item.title,\n                    style = MaterialTheme.typography.titleMedium,\n                    fontWeight = FontWeight.Bold,\n                    maxLines = 1,\n                    overflow = TextOverflow.Ellipsis,\n                )\n                Text(\n                    text = item.description,\n                    style = MaterialTheme.typography.bodySmall,\n                    color = MaterialTheme.colorScheme.onSurfaceVariant,\n                    maxLines = 2,\n                    overflow = TextOverflow.Ellipsis,\n                )\n            }\n            Icon(\n                imageVector = JalvoroIcons.ArrowRight,\n                contentDescription = null,\n                modifier = Modifier.size(18.dp),\n                tint = MaterialTheme.colorScheme.primary,\n            )\n        }\n    }`,
  "compact More module rows",
);

const requiredSources = [
  ["JamalsFinanceTheme.kt", "fun JamalsFinanceTheme("],
  ["JalvoroNativeDesign.kt", "fun JalvoroSurfaceCard("],
  ["JalvoroWebsiteWorkspaceShell.kt", "internal fun JalvoroWebsiteWorkspaceShell("],
  ["JalvoroOverviewDashboard.kt", "fun JalvoroOverviewDashboard("],
  ["JalvoroWebsiteFinanceDashboard.kt", "fun JalvoroWebsiteFinanceDashboard("],
  ["JalvoroWebsiteModuleRoot.kt", "fun JalvoroWebsiteModuleRootShell("],
  ["JalvoroWebsiteUtilityShell.kt", "fun JalvoroWebsiteUtilityShell("],
];

for (const [name, requiredToken] of requiredSources) {
  const filePath = file(name);
  if (!fs.existsSync(filePath)) throw new Error(`Required native UI source is missing: ${name}`);
  const source = fs.readFileSync(filePath, "utf8");
  if (!source.includes(requiredToken)) {
    throw new Error(`Required native UI contract is missing from ${name}: ${requiredToken}`);
  }
}

console.log("Screenshot-driven native UI polish is committed or ready to commit.");
