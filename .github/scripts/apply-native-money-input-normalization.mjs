import fs from "node:fs";
import path from "node:path";

const workspace = process.env.GITHUB_WORKSPACE;
if (!workspace) throw new Error("GITHUB_WORKSPACE is required.");

const filePath = path.join(
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
  "JalvoroWebsiteMoneyForms.kt",
);

let source = fs.readFileSync(filePath, "utf8");

function replaceFirst(before, after, label) {
  if (source.includes(after)) {
    console.log(`Verified ${label}.`);
    return;
  }
  const index = source.indexOf(before);
  if (index < 0) throw new Error(`Missing ${label} source block.`);
  source = source.slice(0, index) + after + source.slice(index + before.length);
  console.log(`Applied ${label}.`);
}

replaceFirst(
  `                !isDateKey(date) -> "Use a valid YYYY-MM-DD date."`,
  `                !isDateKey(date.trim()) -> "Use a valid YYYY-MM-DD date."`,
  "trimmed transfer date validation",
);
replaceFirst(
  `                            date = date,`,
  `                            date = date.trim(),`,
  "trimmed transfer date submission",
);
replaceFirst(
  `        JalvoroWebsiteTextField(amount, { amount = it }, "Amount", !busy, KeyboardType.Decimal)`,
  `        JalvoroWebsiteTextField(
            value = amount,
            onValueChange = { amount = it },
            label = "Amount",
            enabled = !busy,
            keyboardType = KeyboardType.Decimal,
        )`,
  "unambiguous transfer amount field",
);

fs.writeFileSync(filePath, source);
