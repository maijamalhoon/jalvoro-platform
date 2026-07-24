package com.jamalsfinance.nativeapp.ui

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.jamalsfinance.shared.finance.SupportedFinanceCurrencies

@Composable
internal fun PlanningMoneyFields(
    amount: String,
    onAmount: (String) -> Unit,
    currency: String,
    onCurrency: (String) -> Unit,
    rate: String,
    onRate: (String) -> Unit,
) {
    OutlinedTextField(
        value = amount,
        onValueChange = onAmount,
        modifier = Modifier.fillMaxWidth(),
        label = { Text("Amount ($currency)") },
        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
        singleLine = true,
        shape = RoundedCornerShape(14.dp),
    )
    PlanningSelectionField(
        label = "Currency",
        value = currency,
        options = SupportedFinanceCurrencies.map { it to it },
        placeholder = "Select currency",
        onSelect = onCurrency,
    )
    if (currency != "PKR") {
        OutlinedTextField(
            value = rate,
            onValueChange = onRate,
            modifier = Modifier.fillMaxWidth(),
            label = { Text("1 $currency in PKR") },
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
            singleLine = true,
            shape = RoundedCornerShape(14.dp),
        )
    }
}

@Composable
internal fun PlanningSelectionField(
    label: String,
    value: String,
    options: List<Pair<String, String>>,
    placeholder: String,
    allowEmpty: Boolean = false,
    onSelect: (String) -> Unit,
) {
    var expanded by remember { mutableStateOf(false) }
    val selected = options.firstOrNull { it.first == value }?.second
        ?: if (allowEmpty && value.isBlank()) placeholder else placeholder

    Box(Modifier.fillMaxWidth()) {
        OutlinedButton(
            onClick = { expanded = true },
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(14.dp),
        ) {
            Column(Modifier.fillMaxWidth()) {
                Text(label, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Text(selected, maxLines = 1, overflow = TextOverflow.Ellipsis)
            }
        }
        DropdownMenu(
            expanded = expanded,
            onDismissRequest = { expanded = false },
        ) {
            if (allowEmpty) {
                DropdownMenuItem(
                    text = { Text(placeholder) },
                    onClick = {
                        onSelect("")
                        expanded = false
                    },
                )
            }
            options.forEach { option ->
                DropdownMenuItem(
                    text = { Text(option.second) },
                    onClick = {
                        onSelect(option.first)
                        expanded = false
                    },
                )
            }
        }
    }
}
