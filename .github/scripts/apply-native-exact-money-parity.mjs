import fs from "node:fs";
import path from "node:path";

const workspace = process.env.GITHUB_WORKSPACE;
if (!workspace) throw new Error("GITHUB_WORKSPACE is required.");

const moneyFormsPath = path.join(
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

function replaceExactly(before, after, label) {
  const source = fs.readFileSync(moneyFormsPath, "utf8");
  if (source.includes(after)) {
    console.log(`Verified ${label}.`);
    return;
  }
  const count = source.split(before).length - 1;
  if (count !== 1) throw new Error(`Expected one ${label} block, found ${count}.`);
  fs.writeFileSync(moneyFormsPath, source.replace(before, after));
  console.log(`Applied ${label}.`);
}

replaceExactly(
`    JalvoroWebsiteFormDialog(
        title = if (account == null) "Add account" else "Edit account",
        description = if (account == null) {
            "Create an owner-scoped account. Opening balance is converted to PKR once."
        } else {
            "Update account identity. Existing balance and ledger history remain unchanged."
        },
        busy = busy,
        error = error,
        submitLabel = if (account == null) "Add account" else "Save changes",`,
`    JalvoroWebsiteFormDialog(
        title = if (account == null) "Account" else "Edit Account",
        description = "",
        busy = busy,
        error = error,
        submitLabel = if (account == null) "Create Account" else "Update Account",`,
  "website Account modal title and primary action",
);

replaceExactly(
`        JalvoroWebsiteTextField(name, { name = it }, "Account name", !busy)
        JalvoroWebsiteTextField(accountNumber, { accountNumber = it }, "Account number (optional)", !busy)
        Text("Account type", style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.Bold)
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            listOf("savings" to "Savings", "current" to "Current").forEach { option ->
                FilterChip(
                    selected = accountKind == option.first,
                    onClick = { accountKind = option.first },
                    enabled = !busy,
                    label = { Text(option.second) },
                )
            }
        }
        if (account == null) {
            JalvoroWebsiteTextField(
                openingAmount,
                { openingAmount = it },
                "Opening amount",
                !busy,
                KeyboardType.Decimal,
            )
            JalvoroWebsiteChoiceField(
                label = "Currency",
                selectedKey = currency,
                options = SupportedFinanceCurrencies.map { it to it },
                enabled = !busy,
                onSelected = { currency = it },
            )
            if (currency != "PKR") {
                JalvoroWebsiteTextField(
                    exchangeRate,
                    { exchangeRate = it },
                    "Exchange rate to PKR",
                    !busy,
                    KeyboardType.Decimal,
                )
            }
        }`,
`        JalvoroWebsiteTextField(
            value = name,
            onValueChange = { name = it },
            label = "Account Name",
            enabled = !busy,
            placeholder = "e.g. UBL, Bank of America, JazzCash",
        )
        JalvoroWebsiteTextField(
            value = accountNumber,
            onValueChange = { accountNumber = it },
            label = "Account Number (Optional)",
            enabled = !busy,
            keyboardType = KeyboardType.Number,
            placeholder = "e.g. 0123456789",
        )
        JalvoroWebsiteChoiceField(
            label = "Account Type",
            selectedKey = accountKind,
            options = listOf("savings" to "Savings", "current" to "Current"),
            enabled = !busy,
            onSelected = { accountKind = it },
        )
        JalvoroWebsiteTextField(
            value = if (account == null) openingAmount else account.balance.moneyInput(),
            onValueChange = { if (account == null) openingAmount = it },
            label = if (account == null) "Opening Balance (${currency})" else "Current Balance (${account.openingCurrency})",
            enabled = account == null && !busy,
            keyboardType = KeyboardType.Decimal,
            placeholder = "0",
        )
        if (account == null) {
            JalvoroWebsiteChoiceField(
                label = "Currency",
                selectedKey = currency,
                options = SupportedFinanceCurrencies.map { it to it },
                enabled = !busy,
                onSelected = { currency = it },
            )
            if (currency != "PKR") {
                JalvoroWebsiteTextField(
                    value = exchangeRate,
                    onValueChange = { exchangeRate = it },
                    label = "Exchange rate to PKR",
                    enabled = !busy,
                    keyboardType = KeyboardType.Decimal,
                )
            }
        }`,
  "website Account modal field hierarchy",
);

replaceExactly(
`    var date by remember(editable?.id) { mutableStateOf(editable?.date ?: todayKey()) }`,
`    var date by remember(editable?.id) { mutableStateOf(editable?.date?.toDisplayDate() ?: todayDisplayDate()) }`,
  "website transaction display date state",
);

replaceExactly(
`        title = if (editable == null) "Add transaction" else "Edit transaction",
        description = "Record owner-scoped income or expense. PKR conversion and balance updates remain server-authoritative.",
        busy = busy,
        error = error,
        submitLabel = if (editable == null) "Save transaction" else "Save changes",`,
`        title = if (editable == null) {
            if (type == "income") "Income" else "Expense"
        } else {
            if (type == "income") "Edit Income" else "Edit Expense"
        },
        description = "",
        busy = busy,
        error = error,
        submitLabel = if (editable == null) {
            if (type == "income") "Add Income" else "Add Expense"
        } else {
            if (type == "income") "Update Income" else "Update Expense"
        },`,
  "website transaction modal title and primary action",
);

replaceExactly(
`                !isDateKey(date) -> "Use a valid YYYY-MM-DD date."`,
`                parseDisplayDate(date) == null -> "Enter a valid date as DD/MM/YYYY."`,
  "website transaction date validation message",
);

replaceExactly(
`                            date = date,`,
`                            date = parseDisplayDate(date) ?: todayKey(),`,
  "website transaction date normalization",
);

replaceExactly(
`        JalvoroWebsiteTextField(amount, { amount = it }, "Amount", !busy, KeyboardType.Decimal)`,
`        JalvoroWebsiteTextField(
            value = amount,
            onValueChange = { amount = it },
            label = "Amount (${currency})",
            enabled = !busy,
            keyboardType = KeyboardType.Decimal,
            placeholder = "0",
        )`,
  "website transaction amount field",
);

replaceExactly(
`        JalvoroWebsiteTextField(date, { date = it }, "Date (YYYY-MM-DD)", !busy)
        if (type == "income") {
            JalvoroWebsiteTextField(sourceName, { sourceName = it }, "Income source (optional)", !busy)
        } else {
            JalvoroWebsiteTextField(itemName, { itemName = it }, "Item (optional)", !busy)
            JalvoroWebsiteTextField(personName, { personName = it }, "Person or merchant (optional)", !busy)
        }
        JalvoroWebsiteTextField(note, { note = it }, "Note (optional)", !busy)
        JalvoroWebsiteTextField(reference, { reference = it }, "Reference (optional)", !busy)`,
`        JalvoroWebsiteTextField(
            value = date,
            onValueChange = { date = it },
            label = "Date",
            enabled = !busy,
            keyboardType = KeyboardType.Number,
            placeholder = "DD/MM/YYYY",
        )
        JalvoroWebsiteTextField(
            value = note,
            onValueChange = { note = it },
            label = "Note (Optional)",
            enabled = !busy,
            placeholder = "What was this for?",
            singleLine = false,
        )`,
  "website transaction visible field set",
);

replaceExactly(
`                Text(
                    description,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )`,
`                if (description.isNotBlank()) {
                    Text(
                        description,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }`,
  "optional website modal description",
);

replaceExactly(
`                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.End,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    TextButton(onClick = onDismiss, enabled = !busy) { Text("Cancel") }
                    Spacer(Modifier.size(8.dp))
                    Button(onClick = onSubmit, enabled = !busy) { Text(submitLabel) }
                }`,
`                Button(
                    onClick = onSubmit,
                    enabled = !busy,
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Text(submitLabel)
                }`,
  "website single-primary modal footer",
);

replaceExactly(
`private fun JalvoroWebsiteTextField(
    value: String,
    onValueChange: (String) -> Unit,
    label: String,
    enabled: Boolean,
    keyboardType: KeyboardType = KeyboardType.Text,
) {`,
`private fun JalvoroWebsiteTextField(
    value: String,
    onValueChange: (String) -> Unit,
    label: String,
    enabled: Boolean,
    keyboardType: KeyboardType = KeyboardType.Text,
    placeholder: String? = null,
    singleLine: Boolean = true,
) {`,
  "website text-field capabilities",
);

replaceExactly(
`        label = { Text(label) },
        singleLine = true,
        keyboardOptions = KeyboardOptions(keyboardType = keyboardType),`,
`        label = { Text(label) },
        placeholder = placeholder?.let { hint -> { Text(hint) } },
        singleLine = singleLine,
        minLines = if (singleLine) 1 else 2,
        maxLines = if (singleLine) 1 else 4,
        keyboardOptions = KeyboardOptions(keyboardType = keyboardType),`,
  "website text-field placeholder and note sizing",
);

replaceExactly(
`private fun todayKey(): String = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date())

private fun isDateKey(value: String): Boolean = runCatching {
    val formatter = SimpleDateFormat("yyyy-MM-dd", Locale.US).apply { isLenient = false }
    val parsed = formatter.parse(value) ?: return@runCatching false
    formatter.format(parsed) == value
}.getOrDefault(false)

private fun formatPkrCompact(value: Double): String = "PKR ${"%,.2f".format(Locale.US, value)}`,
`private fun todayKey(): String = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date())

private fun todayDisplayDate(): String = SimpleDateFormat("dd/MM/yyyy", Locale.US).format(Date())

private fun String.toDisplayDate(): String = runCatching {
    val source = SimpleDateFormat("yyyy-MM-dd", Locale.US).apply { isLenient = false }
    val parsed = source.parse(this) ?: return@runCatching this
    SimpleDateFormat("dd/MM/yyyy", Locale.US).format(parsed)
}.getOrDefault(this)

private fun parseDisplayDate(value: String): String? = runCatching {
    val display = SimpleDateFormat("dd/MM/yyyy", Locale.US).apply { isLenient = false }
    val parsed = display.parse(value) ?: return@runCatching null
    if (display.format(parsed) != value) return@runCatching null
    SimpleDateFormat("yyyy-MM-dd", Locale.US).format(parsed)
}.getOrNull()

private fun isDateKey(value: String): Boolean = runCatching {
    val formatter = SimpleDateFormat("yyyy-MM-dd", Locale.US).apply { isLenient = false }
    val parsed = formatter.parse(value) ?: return@runCatching false
    formatter.format(parsed) == value
}.getOrDefault(false)

private fun formatPkrCompact(value: Double): String = "Rs ${"%,.2f".format(Locale.US, value)}`,
  "website date and PKR display helpers",
);

const finalSource = fs.readFileSync(moneyFormsPath, "utf8");
for (const token of [
  'title = if (account == null) "Account" else "Edit Account"',
  '"Account Name"',
  '"Create Account"',
  '"Amount (${currency})"',
  '"DD/MM/YYYY"',
  '"What was this for?"',
  'modifier = Modifier.fillMaxWidth()',
]) {
  if (!finalSource.includes(token)) {
    throw new Error(`Required exact Money parity token is missing: ${token}`);
  }
}

console.log("Website Money forms and modal behavior are enforced for the native build.");
