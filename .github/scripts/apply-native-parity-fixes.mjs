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

function readSource(name) {
  const filePath = path.join(uiRoot, name);
  return {
    filePath,
    source: fs.readFileSync(filePath, "utf8").replace(/\r\n/g, "\n"),
  };
}

function replaceRequired(source, before, after, label) {
  if (source.includes(after)) return source;
  if (!source.includes(before)) {
    throw new Error(`Could not find expected source block: ${label}`);
  }
  return source.replace(before, after);
}

function writeSource(filePath, before, after) {
  if (before === after) {
    console.log(`No source changes required: ${path.basename(filePath)}`);
    return;
  }
  fs.writeFileSync(filePath, after, "utf8");
  console.log(`Updated: ${path.basename(filePath)}`);
}

{
  const { filePath, source } = readSource("JalvoroOverviewDashboard.kt");
  let next = replaceRequired(
    source,
    `        Canvas(modifier = Modifier.fillMaxSize().padding(12.dp)) {
            val stroke = 2.2.dp.toPx()
            drawLine(
                color = MaterialTheme.colorScheme.onSurface,
                start = Offset(0f, size.height * 0.34f),
                end = Offset(size.width, size.height * 0.34f),
                strokeWidth = stroke,
                cap = StrokeCap.Round,
            )
            drawLine(
                color = MaterialTheme.colorScheme.onSurface,
                start = Offset(0f, size.height * 0.68f),`,
    `        val lineColor = MaterialTheme.colorScheme.onSurface
        Canvas(modifier = Modifier.fillMaxSize().padding(12.dp)) {
            val stroke = 2.2.dp.toPx()
            drawLine(
                color = lineColor,
                start = Offset(0f, size.height * 0.34f),
                end = Offset(size.width, size.height * 0.34f),
                strokeWidth = stroke,
                cap = StrokeCap.Round,
            )
            drawLine(
                color = lineColor,
                start = Offset(0f, size.height * 0.68f),`,
    "overview floating-menu draw color",
  );
  writeSource(filePath, source, next);
}

{
  const { filePath, source } = readSource("JalvoroWebsiteWorkspaceShell.kt");
  let next = source;

  if (!next.includes("import androidx.compose.foundation.layout.heightIn\n")) {
    next = replaceRequired(
      next,
      "import androidx.compose.foundation.layout.fillMaxWidth\n",
      "import androidx.compose.foundation.layout.fillMaxWidth\nimport androidx.compose.foundation.layout.heightIn\n",
      "workspace heightIn import",
    );
  }

  next = replaceRequired(
    next,
    `            JalvoroWebsiteDrawer(
                email = email,
                selected = selected,
                onOverview = { select(onOverview) },`,
    `            JalvoroWebsiteDrawer(
                email = email,
                selected = selected,
                onClose = { scope.launch { drawerState.close() } },
                onOverview = { select(onOverview) },`,
    "drawer close callback",
  );

  next = replaceRequired(
    next,
    `private fun JalvoroWebsiteDrawer(
    email: String,
    selected: JalvoroWebsiteDestination,
    onOverview: () -> Unit,`,
    `private fun JalvoroWebsiteDrawer(
    email: String,
    selected: JalvoroWebsiteDestination,
    onClose: () -> Unit,
    onOverview: () -> Unit,`,
    "drawer close parameter",
  );

  next = replaceRequired(
    next,
    `            JalvoroWebsiteBrandLockup(
                modifier = Modifier
                    .fillMaxWidth()
                    .statusBarsPadding()
                    .padding(horizontal = 18.dp, vertical = 16.dp),
                compact = true,
            )`,
    `            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .statusBarsPadding()
                    .padding(horizontal = 16.dp, vertical = 14.dp),
                horizontalArrangement = Arrangement.spacedBy(10.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                JalvoroWebsiteBrandLockup(
                    modifier = Modifier.weight(1f),
                    compact = true,
                )
                Surface(
                    onClick = onClose,
                    modifier = Modifier.size(40.dp).semantics {
                        contentDescription = "Close navigation menu"
                    },
                    shape = RoundedCornerShape(13.dp),
                    color = Color.Transparent,
                    contentColor = MaterialTheme.colorScheme.onSurfaceVariant,
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Icon(
                            imageVector = JalvoroIcons.Close,
                            contentDescription = null,
                            modifier = Modifier.size(18.dp),
                        )
                    }
                }
            }`,
    "website drawer header",
  );

  next = replaceRequired(
    next,
    `                workspaceItems.forEach { item ->
                    item(key = item.destination.name) {
                        JalvoroWebsiteDrawerItem(
                            item = item,
                            selected = selected == item.destination,
                        )
                    }
                }`,
    `                workspaceItems.chunked(2).forEachIndexed { rowIndex, rowItems ->
                    item(key = "workspace-$rowIndex") {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                        ) {
                            rowItems.forEach { item ->
                                JalvoroWebsiteDrawerItem(
                                    item = item,
                                    selected = selected == item.destination,
                                    modifier = Modifier.weight(1f),
                                )
                            }
                            if (rowItems.size == 1) Spacer(Modifier.weight(1f))
                        }
                    }
                }`,
    "workspace navigation grid",
  );

  next = replaceRequired(
    next,
    `                accountItems.forEach { item ->
                    item(key = item.destination.name) {
                        JalvoroWebsiteDrawerItem(
                            item = item,
                            selected = selected == item.destination,
                        )
                    }
                }`,
    `                accountItems.chunked(2).forEachIndexed { rowIndex, rowItems ->
                    item(key = "account-$rowIndex") {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                        ) {
                            rowItems.forEach { item ->
                                JalvoroWebsiteDrawerItem(
                                    item = item,
                                    selected = selected == item.destination,
                                    modifier = Modifier.weight(1f),
                                )
                            }
                            if (rowItems.size == 1) Spacer(Modifier.weight(1f))
                        }
                    }
                }`,
    "account navigation grid",
  );

  next = replaceRequired(
    next,
    `private fun JalvoroWebsiteDrawerItem(
    item: JalvoroWebsiteNavigationItem,
    selected: Boolean,
) {
    NavigationDrawerItem(
        label = { Text(item.label, fontWeight = FontWeight.Bold) },`,
    `private fun JalvoroWebsiteDrawerItem(
    item: JalvoroWebsiteNavigationItem,
    selected: Boolean,
    modifier: Modifier = Modifier,
) {
    NavigationDrawerItem(
        label = {
            Text(
                text = item.label,
                style = MaterialTheme.typography.labelLarge,
                fontWeight = FontWeight.Bold,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
        },`,
    "drawer item label",
  );

  next = replaceRequired(
    next,
    "                color = if (selected) Color.White.copy(alpha = 0.14f) else MaterialTheme.colorScheme.surface,",
    "                color = if (selected) Color.White.copy(alpha = 0.14f) else MaterialTheme.colorScheme.surfaceContainer,",
    "inactive drawer icon surface",
  );

  next = replaceRequired(
    next,
    "        modifier = Modifier.fillMaxWidth(),\n        shape = RoundedCornerShape(14.dp),",
    "        modifier = modifier.fillMaxWidth().heightIn(min = 52.dp),\n        shape = RoundedCornerShape(14.dp),",
    "drawer item touch target",
  );

  next = replaceRequired(
    next,
    "            unselectedContainerColor = Color.Transparent,",
    "            unselectedContainerColor = MaterialTheme.colorScheme.surfaceContainerLow.copy(alpha = 0.78f),",
    "inactive drawer tile surface",
  );

  next = replaceRequired(
    next,
    `            Canvas(modifier = Modifier.fillMaxSize().padding(12.dp)) {
                val stroke = 2.2.dp.toPx()
                drawLine(
                    color = MaterialTheme.colorScheme.onSurface,
                    start = Offset(0f, size.height * 0.34f),
                    end = Offset(size.width, size.height * 0.34f),
                    strokeWidth = stroke,
                    cap = StrokeCap.Round,
                )
                drawLine(
                    color = MaterialTheme.colorScheme.onSurface,
                    start = Offset(0f, size.height * 0.68f),`,
    `            val lineColor = MaterialTheme.colorScheme.onSurface
            Canvas(modifier = Modifier.fillMaxSize().padding(12.dp)) {
                val stroke = 2.2.dp.toPx()
                drawLine(
                    color = lineColor,
                    start = Offset(0f, size.height * 0.34f),
                    end = Offset(size.width, size.height * 0.34f),
                    strokeWidth = stroke,
                    cap = StrokeCap.Round,
                )
                drawLine(
                    color = lineColor,
                    start = Offset(0f, size.height * 0.68f),`,
    "workspace floating-menu draw color",
  );

  writeSource(filePath, source, next);
}

{
  const { filePath, source } = readSource("JalvoroWebsiteUtilityShell.kt");
  const next = source.replace(
    "import androidx.compose.foundation.layout.weight\n",
    "",
  );
  writeSource(filePath, source, next);
}

console.log("Native Compose fixes and website drawer parity polish are applied.");
