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

function replaceExactly(fileName, before, after, label) {
  const filePath = path.join(uiRoot, fileName);
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

replaceExactly(
  "JamalsFinanceTheme.kt",
`    MaterialTheme(
        colorScheme = colors,
        typography = JalvoroTypography,
        shapes = JalvoroShapes,
        content = content,
    )`,
`    MaterialTheme(
        colorScheme = colors,
        typography = JalvoroTypography,
        shapes = JalvoroShapes,
    ) {
        JalvoroDesignSystem(content = content)
    }`,
  "global design-system provider",
);

replaceExactly(
  "JalvoroNativeDesign.kt",
`import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Canvas`,
`import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border`,
  "global painter modifier imports",
);

replaceExactly(
  "JalvoroNativeDesign.kt",
`fun JalvoroSurfaceCard(
    modifier: Modifier = Modifier,
    content: @Composable () -> Unit,
) {
    Card(
        modifier = modifier.jalvoroAnimateContentSize(),
        shape = MaterialTheme.shapes.medium,
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceContainer,
        ),
        border = BorderStroke(
            width = 1.dp,
            color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.72f),
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
    ) {
        content()
    }
}`,
`fun JalvoroSurfaceCard(
    modifier: Modifier = Modifier,
    content: @Composable () -> Unit,
) {
    val painter = LocalJalvoroPainter.current
    Card(
        modifier = modifier.jalvoroAnimateContentSize(),
        shape = MaterialTheme.shapes.medium,
        colors = CardDefaults.cardColors(containerColor = painter.cardColor),
        border = BorderStroke(width = 1.dp, color = painter.borderColor),
        elevation = CardDefaults.cardElevation(defaultElevation = painter.cardElevation),
    ) {
        content()
    }
}`,
  "global card painter",
);

replaceExactly(
  "JalvoroNativeDesign.kt",
`fun JalvoroIconAction(
    icon: ImageVector,
    label: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
) {
    IconButton(
        onClick = onClick,
        modifier = modifier
            .sizeIn(minWidth = 48.dp, minHeight = 48.dp)
            .semantics { contentDescription = label },
        enabled = enabled,
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            modifier = Modifier.size(21.dp),
        )
    }
}`,
`fun JalvoroIconAction(
    icon: ImageVector,
    label: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
) {
    val layout = LocalJalvoroLayout.current
    val painter = LocalJalvoroPainter.current
    val shape = MaterialTheme.shapes.small
    IconButton(
        onClick = onClick,
        modifier = modifier
            .sizeIn(minWidth = layout.iconControlSize, minHeight = layout.iconControlSize)
            .background(painter.controlColor, shape)
            .border(BorderStroke(1.dp, painter.borderColor), shape)
            .semantics { contentDescription = label },
        enabled = enabled,
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            modifier = Modifier.size(21.dp),
        )
    }
}`,
  "global icon-action painter",
);

replaceExactly(
  "JalvoroNativeDesign.kt",
`    val dark = MaterialTheme.colorScheme.background.luminance() < 0.5f
    val container = when (tone) {
        JalvoroFeedbackTone.Info -> MaterialTheme.colorScheme.primaryContainer
        JalvoroFeedbackTone.Success -> MaterialTheme.colorScheme.tertiaryContainer
        JalvoroFeedbackTone.Warning -> if (dark) Color(0xFF3B2D13) else Color(0xFFFFF3D6)
        JalvoroFeedbackTone.Danger -> MaterialTheme.colorScheme.errorContainer
    }
    val contentColor = when (tone) {
        JalvoroFeedbackTone.Info -> MaterialTheme.colorScheme.onPrimaryContainer
        JalvoroFeedbackTone.Success -> MaterialTheme.colorScheme.onTertiaryContainer
        JalvoroFeedbackTone.Warning -> if (dark) Color(0xFFFFDEA1) else Color(0xFF6B4705)
        JalvoroFeedbackTone.Danger -> MaterialTheme.colorScheme.onErrorContainer
    }`,
`    val semantic = LocalJalvoroSemanticColors.current
    val container = when (tone) {
        JalvoroFeedbackTone.Info -> MaterialTheme.colorScheme.primaryContainer
        JalvoroFeedbackTone.Success -> MaterialTheme.colorScheme.tertiaryContainer
        JalvoroFeedbackTone.Warning -> semantic.warning.copy(alpha = 0.14f)
        JalvoroFeedbackTone.Danger -> MaterialTheme.colorScheme.errorContainer
    }
    val contentColor = when (tone) {
        JalvoroFeedbackTone.Info -> MaterialTheme.colorScheme.onPrimaryContainer
        JalvoroFeedbackTone.Success -> MaterialTheme.colorScheme.onTertiaryContainer
        JalvoroFeedbackTone.Warning -> semantic.warning
        JalvoroFeedbackTone.Danger -> MaterialTheme.colorScheme.onErrorContainer
    }`,
  "semantic feedback painter",
);

replaceExactly(
  "JalvoroNativeDesign.kt",
`    val motion = LocalJalvoroMotion.current
    NavigationBar(
        modifier = modifier,
        containerColor = MaterialTheme.colorScheme.surfaceContainer,
        tonalElevation = 3.dp,`,
`    val motion = LocalJalvoroMotion.current
    val painter = LocalJalvoroPainter.current
    NavigationBar(
        modifier = modifier,
        containerColor = painter.elevatedCardColor,
        tonalElevation = painter.floatingElevation,`,
  "global navigation painter",
);

replaceExactly(
  "JalvoroWebsiteWorkspaceShell.kt",
`    val drawerState = rememberDrawerState(initialValue = DrawerValue.Closed)
    val scope = rememberCoroutineScope()`,
`    val drawerState = rememberDrawerState(initialValue = DrawerValue.Closed)
    val scope = rememberCoroutineScope()
    val layout = LocalJalvoroLayout.current`,
  "workspace layout tokens",
);

replaceExactly(
  "JalvoroWebsiteWorkspaceShell.kt",
`                PaddingValues(
                    top = 76.dp,
                    bottom = 24.dp,
                ),`,
`                PaddingValues(
                    top = layout.workspaceHeaderOffset,
                    bottom = layout.bottomSafePadding,
                ),`,
  "workspace safe-area rhythm",
);

replaceExactly(
  "JalvoroWebsiteWorkspaceShell.kt",
`            .fillMaxWidth(0.9f)
            .widthIn(max = 360.dp)`,
`            .fillMaxWidth(0.9f)
            .widthIn(max = LocalJalvoroLayout.current.drawerMaxWidth)`,
  "global drawer width",
);

replaceExactly(
  "JalvoroWebsiteWorkspaceShell.kt",
`private fun JalvoroWebsiteFloatingHeader(
    onMenu: () -> Unit,
    onSettings: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Box(`,
`private fun JalvoroWebsiteFloatingHeader(
    onMenu: () -> Unit,
    onSettings: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val layout = LocalJalvoroLayout.current
    val painter = LocalJalvoroPainter.current
    Box(`,
  "floating-header painter tokens",
);

replaceExactly(
  "JalvoroWebsiteWorkspaceShell.kt",
`            modifier = Modifier
                .size(48.dp)
                .align(Alignment.CenterStart)`,
`            modifier = Modifier
                .size(layout.iconControlSize)
                .align(Alignment.CenterStart)`,
  "menu control sizing",
);

replaceExactly(
  "JalvoroWebsiteWorkspaceShell.kt",
`            color = MaterialTheme.colorScheme.surfaceContainer.copy(alpha = 0.98f),
            contentColor = MaterialTheme.colorScheme.onSurface,
            border = BorderStroke(
                1.dp,
                MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.82f),
            ),
            shadowElevation = 1.dp,`,
`            color = painter.elevatedCardColor.copy(alpha = 0.98f),
            contentColor = MaterialTheme.colorScheme.onSurface,
            border = BorderStroke(1.dp, painter.borderColor),
            shadowElevation = painter.floatingElevation,`,
  "menu control painter",
);

replaceExactly(
  "JalvoroWebsiteWorkspaceShell.kt",
`            modifier = Modifier
                .size(48.dp)
                .align(Alignment.CenterEnd)`,
`            modifier = Modifier
                .size(layout.iconControlSize)
                .align(Alignment.CenterEnd)`,
  "profile control sizing",
);

const shellPath = path.join(uiRoot, "JalvoroWebsiteWorkspaceShell.kt");
let shell = fs.readFileSync(shellPath, "utf8");
const oldProfilePaint = `            color = MaterialTheme.colorScheme.surfaceContainer.copy(alpha = 0.98f),
            contentColor = MaterialTheme.colorScheme.onSurface,
            border = BorderStroke(
                1.dp,
                MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.82f),
            ),
            shadowElevation = 1.dp,`;
const newProfilePaint = `            color = painter.elevatedCardColor.copy(alpha = 0.98f),
            contentColor = MaterialTheme.colorScheme.onSurface,
            border = BorderStroke(1.dp, painter.borderColor),
            shadowElevation = painter.floatingElevation,`;
if (shell.includes(oldProfilePaint)) {
  shell = shell.replace(oldProfilePaint, newProfilePaint);
  fs.writeFileSync(shellPath, shell);
  console.log("Applied profile control painter.");
} else if (shell.includes(newProfilePaint)) {
  console.log("Verified profile control painter.");
} else {
  throw new Error("Profile control painter block is missing.");
}

for (const [fileName, tokens] of [
  ["JamalsFinanceTheme.kt", ["JalvoroDesignSystem(content = content)"]],
  ["JalvoroNativeDesign.kt", ["LocalJalvoroPainter.current", "LocalJalvoroSemanticColors.current"]],
  ["JalvoroWebsiteWorkspaceShell.kt", ["layout.workspaceHeaderOffset", "painter.floatingElevation"]],
  ["JalvoroGlobalPainter.kt", ["JalvoroLayoutTokens", "JalvoroAdaptivePage", "JalvoroSemanticColors"]],
]) {
  const source = fs.readFileSync(path.join(uiRoot, fileName), "utf8");
  for (const token of tokens) {
    if (!source.includes(token)) throw new Error(`Missing global painter token in ${fileName}: ${token}`);
  }
}

console.log("Global native architecture and painter are enforced.");
