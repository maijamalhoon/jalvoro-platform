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

function updateFile(name, transform) {
  const filePath = sourcePath(name);
  const before = fs.readFileSync(filePath, "utf8");
  const after = transform(before);
  if (after === before) {
    console.log(`Verified screenshot acceptance fixes in ${name}.`);
    return;
  }
  fs.writeFileSync(filePath, after);
  console.log(`Applied screenshot acceptance fixes in ${name}.`);
}

function replaceRequired(source, before, after, label) {
  if (source.includes(after)) return source;
  const count = source.split(before).length - 1;
  if (count !== 1) throw new Error(`Expected one ${label} block, found ${count}.`);
  return source.replace(before, after);
}

updateFile("JalvoroOverviewRedesign.kt", (source) => {
  const before = `    Surface(
        modifier = modifier
            .statusBarsPadding()
            .padding(horizontal = 12.dp, vertical = 7.dp),
        shape = RoundedCornerShape(20.dp),
        color = MaterialTheme.colorScheme.surfaceContainer.copy(alpha = 0.98f),
        contentColor = MaterialTheme.colorScheme.onSurface,
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.82f)),
        shadowElevation = 2.dp,
    ) {`;
  const after = `    Surface(
        modifier = modifier.statusBarsPadding(),
        shape = RoundedCornerShape(bottomStart = 20.dp, bottomEnd = 20.dp),
        color = MaterialTheme.colorScheme.surfaceContainer,
        contentColor = MaterialTheme.colorScheme.onSurface,
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.82f)),
        shadowElevation = 1.dp,
    ) {`;
  return replaceRequired(source, before, after, "opaque Overview app bar");
});

updateFile("JalvoroAdvisorOverview.kt", (source) => {
  let next = source;
  if (!next.includes("import androidx.compose.foundation.layout.BoxWithConstraints")) {
    next = replaceRequired(
      next,
      "import androidx.compose.foundation.layout.Box\n",
      "import androidx.compose.foundation.layout.Box\nimport androidx.compose.foundation.layout.BoxWithConstraints\n",
      "advisor BoxWithConstraints import",
    );
  }

  const before = `            if (insights.summaryCards.isNotEmpty()) {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    insights.summaryCards.take(4).chunked(2).forEach { row ->
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(10.dp),
                        ) {
                            row.forEach { card ->
                                JalvoroAdvisorMetric(
                                    label = card.label,
                                    value = card.value,
                                    helper = card.caption,
                                    tone = jalvoroAdvisorTone(card.tone),
                                    modifier = Modifier.weight(1f),
                                )
                            }
                            if (row.size == 1) Spacer(Modifier.weight(1f))
                        }
                    }
                }
            } else {`;
  const after = `            if (insights.summaryCards.isNotEmpty()) {
                BoxWithConstraints(modifier = Modifier.fillMaxWidth()) {
                    if (maxWidth < 560.dp) {
                        Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                            insights.summaryCards.take(4).forEach { card ->
                                JalvoroAdvisorMetric(
                                    label = card.label,
                                    value = card.value,
                                    helper = card.caption,
                                    tone = jalvoroAdvisorTone(card.tone),
                                    modifier = Modifier.fillMaxWidth(),
                                )
                            }
                        }
                    } else {
                        Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                            insights.summaryCards.take(4).chunked(2).forEach { row ->
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                                ) {
                                    row.forEach { card ->
                                        JalvoroAdvisorMetric(
                                            label = card.label,
                                            value = card.value,
                                            helper = card.caption,
                                            tone = jalvoroAdvisorTone(card.tone),
                                            modifier = Modifier.weight(1f),
                                        )
                                    }
                                    if (row.size == 1) Spacer(Modifier.weight(1f))
                                }
                            }
                        }
                    }
                }
            } else {`;
  next = replaceRequired(next, before, after, "adaptive advisor metric layout");

  const valueBefore = `            Text(
                text = value,
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
            )`;
  const valueAfter = `            Text(
                text = value,
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                maxLines = 3,
            )`;
  return replaceRequired(next, valueBefore, valueAfter, "non-truncated advisor metric values");
});

updateFile("JalvoroWebsiteFinanceDashboard.kt", (source) => {
  const before = `private fun formatPkrWebsite(value: Double): String = runCatching {
    NumberFormat.getCurrencyInstance(Locale("en", "PK")).apply {
        currency = Currency.getInstance("PKR")
        maximumFractionDigits = if (value % 1.0 == 0.0) 0 else 2
    }.format(value)
}.getOrElse { "PKR \${formatNumberWebsite(value)}" }`;
  const after = `private fun formatPkrWebsite(value: Double): String {
    val fractionDigits = if (value % 1.0 == 0.0) 0 else 2
    val formatted = NumberFormat.getNumberInstance(Locale.US).apply {
        minimumFractionDigits = fractionDigits
        maximumFractionDigits = fractionDigits
        isGroupingUsed = true
    }.format(value)
    return "Rs $formatted"
}`;
  return replaceRequired(source, before, after, "consistent Money PKR formatting");
});

updateFile("JalvoroOverviewDashboard.kt", (source) => {
  const before = `private fun formatPkrOrUnavailable(value: Double?): String {
    if (value == null || !value.isFinite()) return "Unavailable"
    return runCatching {
        NumberFormat.getCurrencyInstance(Locale("en", "PK")).apply {
            currency = Currency.getInstance("PKR")
            maximumFractionDigits = if (value % 1.0 == 0.0) 0 else 2
        }.format(value)
    }.getOrElse { "PKR \${"%,.2f".format(Locale.US, value)}" }
}`;
  const after = `private fun formatPkrOrUnavailable(value: Double?): String {
    if (value == null || !value.isFinite()) return "Unavailable"
    val fractionDigits = if (value % 1.0 == 0.0) 0 else 2
    val formatted = NumberFormat.getNumberInstance(Locale.US).apply {
        minimumFractionDigits = fractionDigits
        maximumFractionDigits = fractionDigits
        isGroupingUsed = true
    }.format(value)
    return "Rs $formatted"
}`;
  return replaceRequired(source, before, after, "consistent Overview PKR formatting");
});

updateFile("JalvoroWebsiteWorkspaceShell.kt", (source) => {
  const before = `        JalvoroWebsiteBrandLockup(
            modifier = Modifier
                .align(Alignment.Center)
                .widthIn(max = 154.dp),
            compact = true,
        )`;
  const after = `        JalvoroWebsiteBrandLockup(
            modifier = Modifier
                .align(Alignment.Center)
                .widthIn(max = 154.dp),
            subtitle = "Personal",
            compact = true,
        )`;
  return replaceRequired(source, before, after, "non-truncated workspace brand subtitle");
});

console.log("Screenshot acceptance fixes are present.");
