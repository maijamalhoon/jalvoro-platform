package com.jamalsfinance.nativeapp.ui

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.jamalsfinance.shared.investments.InvestmentDraft
import com.jamalsfinance.shared.investments.InvestmentRow
import com.jamalsfinance.shared.investments.InvestmentWithdrawalDraft
import com.jamalsfinance.shared.investments.InvestmentsAnalyticsRepository
import com.jamalsfinance.shared.investments.InvestmentsAnalyticsResult
import com.jamalsfinance.shared.investments.InvestmentsAnalyticsSnapshot
import com.jamalsfinance.shared.investments.MarketAsset
import com.jamalsfinance.shared.investments.MarketQuote
import com.jamalsfinance.shared.investments.MarketQuoteResult
import com.jamalsfinance.shared.investments.MarketSearchResult
import com.jamalsfinance.shared.investments.SupportedInvestmentCurrencies
import com.jamalsfinance.shared.investments.normalizeInvestmentEditorType
import kotlinx.coroutines.launch

@Composable
internal fun JalvoroInvestmentEditorDialog(
    repository: InvestmentsAnalyticsRepository,
    snapshot: InvestmentsAnalyticsSnapshot,
    investment: InvestmentRow?,
    onDismiss: () -> Unit,
    onMessage: (String?) -> Unit,
) {
    val scope = rememberCoroutineScope()
    val editing = investment != null
    var searchQuery by remember(investment?.id) { mutableStateOf("") }
    var searchLoading by remember(investment?.id) { mutableStateOf(false) }
    var searchResults by remember(investment?.id) { mutableStateOf<List<MarketAsset>>(emptyList()) }
    var selectedAssetId by remember(investment?.id) { mutableStateOf<String?>(null) }
    var quote by remember(investment?.id) { mutableStateOf<MarketQuote?>(null) }
    var name by remember(investment?.id) { mutableStateOf(investment?.name.orEmpty()) }
    var type by remember(investment?.id) {
        mutableStateOf(investment?.let { normalizeInvestmentEditorType(it.type) } ?: "crypto")
    }
    var symbol by remember(investment?.id) { mutableStateOf(investment?.symbol.orEmpty()) }
    var quantity by remember(investment?.id) {
        mutableStateOf(investment?.quantity?.let(::growthEditableDecimal).orEmpty())
    }
    var purchaseCurrency by remember(investment?.id) {
        mutableStateOf(investment?.purchaseCurrency ?: "PKR")
    }
    var purchasePrice by remember(investment?.id) {
        mutableStateOf(
            (investment?.purchasePriceOriginal ?: investment?.purchasePrice)
                ?.let(::growthEditableDecimal)
                .orEmpty(),
        )
    }
    var purchaseRate by remember(investment?.id) {
        mutableStateOf(
            growthEditableDecimal(
                investment?.purchaseExchangeRate
                    ?: snapshot.rateToPkr(investment?.purchaseCurrency ?: "PKR")
                    ?: 1.0,
            ),
        )
    }
    var currentCurrency by remember(investment?.id) {
        mutableStateOf(investment?.currentPriceCurrency ?: "PKR")
    }
    var currentPrice by remember(investment?.id) {
        mutableStateOf(
            (investment?.currentPriceOriginal ?: investment?.currentPrice)
                ?.let(::growthEditableDecimal)
                .orEmpty(),
        )
    }
    var currentRate by remember(investment?.id) {
        mutableStateOf(
            growthEditableDecimal(snapshot.rateToPkr(investment?.currentPriceCurrency ?: "PKR") ?: 1.0),
        )
    }
    var date by remember(investment?.id) { mutableStateOf(investment?.purchasedAt ?: snapshot.nowDate) }
    var accountId by remember(investment?.id) {
        mutableStateOf(investment?.linkedAccountId ?: snapshot.accounts.firstOrNull()?.id.orEmpty())
    }
    var assetId by remember(investment?.id) { mutableStateOf(investment?.assetId) }
    var imageUrl by remember(investment?.id) { mutableStateOf(investment?.imageUrl) }
    var priceSource by remember(investment?.id) { mutableStateOf(investment?.priceSource ?: "manual") }
    var saving by remember(investment?.id) { mutableStateOf(false) }
    var error by remember(investment?.id) { mutableStateOf<String?>(null) }

    GrowthFormDialog(
        title = if (editing) "Edit investment" else "Add investment",
        icon = JalvoroIcons.Investments,
        onDismiss = onDismiss,
        dismissEnabled = !saving,
    ) {
        Text(
            text = if (editing) {
                "Update this purchase lot. Secure repository calculations and linked ledger history remain authoritative."
            } else {
                "Search the market catalog for a live asset, or enter a manual investment when live pricing is unavailable."
            },
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )

        if (snapshot.accounts.isEmpty()) {
            JalvoroFeedbackCard(
                message = "Create an active account before recording an investment purchase.",
                tone = JalvoroFeedbackTone.Warning,
            )
        }

        if (!editing) {
            OutlinedTextField(
                value = searchQuery,
                onValueChange = {
                    searchQuery = it
                    error = null
                },
                modifier = Modifier.fillMaxWidth(),
                label = { Text("Search crypto, stock or forex") },
                singleLine = true,
                shape = RoundedCornerShape(14.dp),
                trailingIcon = {
                    JalvoroIconAction(
                        icon = JalvoroIcons.Search,
                        label = "Search market assets",
                        enabled = !searchLoading,
                        onClick = {
                            scope.launch {
                                searchLoading = true
                                when (val result = repository.searchAssets(searchQuery)) {
                                    is MarketSearchResult.Success -> {
                                        searchResults = result.assets
                                        error = if (result.assets.isEmpty()) {
                                            "No assets found. Manual entry remains available."
                                        } else {
                                            null
                                        }
                                    }
                                    is MarketSearchResult.Failure -> error = result.message
                                }
                                searchLoading = false
                            }
                        },
                    )
                },
            )
            if (searchLoading) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    CircularProgressIndicator(Modifier.size(18.dp), strokeWidth = 2.dp)
                    Text(
                        text = "Searching market catalog…",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
            searchResults.take(8).forEach { asset ->
                Surface(
                    modifier = Modifier.fillMaxWidth().clickable(enabled = !saving) {
                        selectedAssetId = asset.id
                        name = asset.name
                        type = asset.assetType
                        symbol = asset.symbol
                        assetId = asset.id
                        imageUrl = asset.logoUrl.ifBlank { null }
                        currentCurrency = asset.quoteCurrency
                        currentRate = growthEditableDecimal(snapshot.rateToPkr(asset.quoteCurrency) ?: 1.0)
                        priceSource = "catalog"
                        quote = null
                        error = null
                        scope.launch {
                            when (val result = repository.loadQuote(asset)) {
                                is MarketQuoteResult.Success -> {
                                    quote = result.quote
                                    currentPrice = growthEditableDecimal(result.quote.price)
                                    currentCurrency = result.quote.currency
                                    currentRate = growthEditableDecimal(snapshot.rateToPkr(result.quote.currency) ?: 1.0)
                                    priceSource = result.quote.source
                                }
                                is MarketQuoteResult.Failure -> error = result.message
                            }
                        }
                    },
                    shape = RoundedCornerShape(16.dp),
                    color = if (selectedAssetId == asset.id) {
                        MaterialTheme.colorScheme.primaryContainer
                    } else {
                        MaterialTheme.colorScheme.surfaceContainerLow
                    },
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth().padding(12.dp),
                        horizontalArrangement = Arrangement.spacedBy(10.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Surface(
                            shape = RoundedCornerShape(14.dp),
                            color = MaterialTheme.colorScheme.surfaceContainer,
                            contentColor = MaterialTheme.colorScheme.primary,
                        ) {
                            Icon(JalvoroIcons.Investments, null, Modifier.padding(10.dp).size(20.dp))
                        }
                        Column(Modifier.weight(1f)) {
                            Text(asset.name, fontWeight = FontWeight.SemiBold, maxLines = 1, overflow = TextOverflow.Ellipsis)
                            Text(
                                text = "${asset.symbol} · ${asset.assetType} · ${asset.quoteCurrency}",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                        if (selectedAssetId == asset.id) {
                            Icon(JalvoroIcons.Check, "Selected asset", Modifier.size(19.dp))
                        }
                    }
                }
            }
        }

        OutlinedTextField(
            value = name,
            onValueChange = { name = it; error = null },
            modifier = Modifier.fillMaxWidth(),
            label = { Text("Asset name") },
            singleLine = true,
            shape = RoundedCornerShape(14.dp),
        )
        GrowthSelectionField(
            label = "Asset type",
            options = listOf("crypto", "stock", "forex", "other"),
            selected = type,
            onSelect = { type = it; error = null },
        )
        OutlinedTextField(
            value = symbol,
            onValueChange = { symbol = it.uppercase(); error = null },
            modifier = Modifier.fillMaxWidth(),
            label = { Text("Symbol (optional)") },
            singleLine = true,
            shape = RoundedCornerShape(14.dp),
        )
        OutlinedTextField(
            value = quantity,
            onValueChange = { quantity = it; error = null },
            modifier = Modifier.fillMaxWidth(),
            label = { Text("Quantity") },
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
            singleLine = true,
            shape = RoundedCornerShape(14.dp),
        )

        InvestmentCurrencyPriceFields(
            title = "Purchase price",
            price = purchasePrice,
            onPriceChange = { purchasePrice = it; error = null },
            currency = purchaseCurrency,
            onCurrencyChange = {
                purchaseCurrency = it
                purchaseRate = growthEditableDecimal(snapshot.rateToPkr(it) ?: 1.0)
                error = null
            },
            rate = purchaseRate,
            onRateChange = { purchaseRate = it; error = null },
        )
        InvestmentCurrencyPriceFields(
            title = "Current price",
            price = currentPrice,
            onPriceChange = {
                currentPrice = it
                quote = null
                priceSource = "manual"
                error = null
            },
            currency = currentCurrency,
            onCurrencyChange = {
                currentCurrency = it
                currentRate = growthEditableDecimal(snapshot.rateToPkr(it) ?: 1.0)
                quote = null
                priceSource = "manual"
                error = null
            },
            rate = currentRate,
            onRateChange = {
                currentRate = it
                quote = null
                priceSource = "manual"
                error = null
            },
        )

        OutlinedTextField(
            value = date,
            onValueChange = { date = it; error = null },
            modifier = Modifier.fillMaxWidth(),
            label = { Text("Purchase date YYYY-MM-DD") },
            singleLine = true,
            shape = RoundedCornerShape(14.dp),
        )
        GrowthSelectionField(
            label = "Account used",
            options = snapshot.accounts.map { it.id },
            selected = accountId,
            placeholder = "Select account",
            optionLabel = { id ->
                snapshot.accounts.firstOrNull { it.id == id }
                    ?.let { "${it.name} · ${growthFormatPkr(it.balance)}" }
                    ?: id
            },
            onSelect = { accountId = it; error = null },
        )

        quote?.let { liveQuote ->
            JalvoroFeedbackCard(
                message = "Live quote: ${growthEditableDecimal(liveQuote.price)} ${liveQuote.currency} · ${liveQuote.source}" +
                    (liveQuote.change24h?.let { change ->
                        " · ${if (change >= 0) "+" else ""}${growthFormatPercent(change)} over 24h"
                    } ?: ""),
                tone = JalvoroFeedbackTone.Success,
            )
        }
        error?.let { JalvoroFeedbackCard(it, JalvoroFeedbackTone.Danger) }

        Button(
            enabled = !saving && snapshot.accounts.isNotEmpty(),
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(14.dp),
            onClick = {
                val quantityValue = quantity.toDoubleOrNull()
                val purchaseValue = purchasePrice.toDoubleOrNull()
                val purchaseRateValue = if (purchaseCurrency == "PKR") 1.0 else purchaseRate.toDoubleOrNull()
                val currentValue = currentPrice.toDoubleOrNull()
                val currentRateValue = if (currentCurrency == "PKR") 1.0 else currentRate.toDoubleOrNull()
                when {
                    name.isBlank() -> error = "Enter an asset name."
                    quantityValue == null || quantityValue <= 0 -> error = "Enter a quantity greater than zero."
                    purchaseValue == null || purchaseValue < 0 -> error = "Enter a valid purchase price."
                    currentValue == null || currentValue < 0 -> error = "Enter a valid current price."
                    purchaseRateValue == null || purchaseRateValue <= 0 -> error = "Enter a valid purchase exchange rate."
                    currentRateValue == null || currentRateValue <= 0 -> error = "Enter a valid current exchange rate."
                    date.isBlank() -> error = "Enter a purchase date."
                    accountId.isBlank() -> error = "Select the account used for this purchase."
                    else -> {
                        scope.launch {
                            saving = true
                            when (
                                val result = repository.saveInvestment(
                                    InvestmentDraft(
                                        investmentId = investment?.id,
                                        name = name,
                                        type = type,
                                        quantity = quantityValue,
                                        purchasePriceOriginal = purchaseValue,
                                        purchaseCurrency = purchaseCurrency,
                                        purchaseExchangeRateToPkr = purchaseRateValue,
                                        currentPriceOriginal = currentValue,
                                        currentPriceCurrency = currentCurrency,
                                        currentExchangeRateToPkr = currentRateValue,
                                        purchasedAt = date,
                                        assetId = assetId,
                                        symbol = symbol,
                                        imageUrl = imageUrl,
                                        priceSource = priceSource,
                                        priceUpdatedAt = quote?.updatedAtEpochMs?.let(::growthFormatUtcTimestamp),
                                        priceChange24h = quote?.change24h ?: investment?.priceChange24h,
                                        isLivePriced = quote != null || investment?.isLivePriced == true,
                                        accountId = accountId,
                                    ),
                                )
                            ) {
                                InvestmentsAnalyticsResult.Success -> {
                                    saving = false
                                    onMessage(null)
                                    onDismiss()
                                }
                                is InvestmentsAnalyticsResult.Failure -> {
                                    saving = false
                                    error = result.message
                                }
                            }
                        }
                    }
                }
            },
        ) {
            if (saving) {
                CircularProgressIndicator(Modifier.size(19.dp), strokeWidth = 2.dp)
            } else {
                Text(if (editing) "Update investment" else "Save investment")
            }
        }
    }
}

@Composable
private fun InvestmentCurrencyPriceFields(
    title: String,
    price: String,
    onPriceChange: (String) -> Unit,
    currency: String,
    onCurrencyChange: (String) -> Unit,
    rate: String,
    onRateChange: (String) -> Unit,
) {
    Column(verticalArrangement = Arrangement.spacedBy(9.dp)) {
        Text(title, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(9.dp),
        ) {
            OutlinedTextField(
                value = price,
                onValueChange = onPriceChange,
                modifier = Modifier.weight(1f),
                label = { Text("Price per unit") },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                singleLine = true,
                shape = RoundedCornerShape(14.dp),
            )
            Box(Modifier.width(118.dp)) {
                GrowthSelectionField(
                    label = "Currency",
                    options = SupportedInvestmentCurrencies,
                    selected = currency,
                    onSelect = onCurrencyChange,
                )
            }
        }
        OutlinedTextField(
            value = rate,
            onValueChange = onRateChange,
            modifier = Modifier.fillMaxWidth(),
            label = { Text("$currency to PKR rate") },
            enabled = currency != "PKR",
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
            singleLine = true,
            shape = RoundedCornerShape(14.dp),
        )
    }
}

@Composable
internal fun JalvoroInvestmentCashOutDialog(
    investment: InvestmentRow,
    snapshot: InvestmentsAnalyticsSnapshot,
    repository: InvestmentsAnalyticsRepository,
    onDismiss: () -> Unit,
    onMessage: (String?) -> Unit,
) {
    val scope = rememberCoroutineScope()
    var quantity by remember(investment.id) { mutableStateOf(growthEditableDecimal(investment.quantity)) }
    var currency by remember(investment.id) { mutableStateOf(investment.currentPriceCurrency ?: "PKR") }
    var unitPrice by remember(investment.id) {
        mutableStateOf(growthEditableDecimal(investment.currentPriceOriginal ?: investment.currentPrice))
    }
    var rate by remember(investment.id) {
        mutableStateOf(growthEditableDecimal(snapshot.rateToPkr(currency) ?: 1.0))
    }
    var accountId by remember(investment.id) { mutableStateOf(snapshot.accounts.firstOrNull()?.id.orEmpty()) }
    var date by remember(investment.id) { mutableStateOf(snapshot.nowDate) }
    var saving by remember(investment.id) { mutableStateOf(false) }
    var error by remember(investment.id) { mutableStateOf<String?>(null) }

    GrowthFormDialog(
        title = "Cash out ${investment.name}",
        icon = JalvoroIcons.Transfer,
        onDismiss = onDismiss,
        dismissEnabled = !saving,
    ) {
        JalvoroFeedbackCard(
            message = "Available quantity ${growthFormatQuantity(investment.quantity)} · current unit ${growthFormatPkr(investment.currentPrice)}. Proceeds are deposited through the secure withdrawal workflow.",
            tone = JalvoroFeedbackTone.Info,
        )
        if (snapshot.accounts.isEmpty()) {
            JalvoroFeedbackCard(
                message = "Create an active account before cashing out an investment.",
                tone = JalvoroFeedbackTone.Warning,
            )
        }
        OutlinedTextField(
            value = quantity,
            onValueChange = { quantity = it; error = null },
            modifier = Modifier.fillMaxWidth(),
            label = { Text("Quantity to withdraw") },
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
            singleLine = true,
            shape = RoundedCornerShape(14.dp),
        )
        InvestmentCurrencyPriceFields(
            title = "Withdrawal price",
            price = unitPrice,
            onPriceChange = { unitPrice = it; error = null },
            currency = currency,
            onCurrencyChange = {
                currency = it
                rate = growthEditableDecimal(snapshot.rateToPkr(it) ?: 1.0)
                error = null
            },
            rate = rate,
            onRateChange = { rate = it; error = null },
        )
        GrowthSelectionField(
            label = "Destination account",
            options = snapshot.accounts.map { it.id },
            selected = accountId,
            placeholder = "Select account",
            optionLabel = { id ->
                snapshot.accounts.firstOrNull { it.id == id }
                    ?.let { "${it.name} · ${growthFormatPkr(it.balance)}" }
                    ?: id
            },
            onSelect = { accountId = it; error = null },
        )
        OutlinedTextField(
            value = date,
            onValueChange = { date = it; error = null },
            modifier = Modifier.fillMaxWidth(),
            label = { Text("Withdrawal date YYYY-MM-DD") },
            singleLine = true,
            shape = RoundedCornerShape(14.dp),
        )

        val previewQuantity = quantity.toDoubleOrNull()
        val previewPrice = unitPrice.toDoubleOrNull()
        if (previewQuantity != null && previewPrice != null && previewQuantity > 0 && previewPrice >= 0) {
            GrowthMetricTile(
                label = "Expected proceeds",
                value = "${growthEditableDecimal(previewQuantity * previewPrice)} $currency",
                helper = "Before conversion to the destination account ledger",
                modifier = Modifier.fillMaxWidth(),
            )
        }
        error?.let { JalvoroFeedbackCard(it, JalvoroFeedbackTone.Danger) }
        Button(
            enabled = !saving && snapshot.accounts.isNotEmpty(),
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(14.dp),
            onClick = {
                val quantityValue = quantity.toDoubleOrNull()
                val priceValue = unitPrice.toDoubleOrNull()
                val exchangeValue = if (currency == "PKR") 1.0 else rate.toDoubleOrNull()
                when {
                    quantityValue == null || quantityValue <= 0 -> error = "Enter a quantity greater than zero."
                    quantityValue > investment.quantity -> error = "Withdrawal quantity exceeds the available holding."
                    priceValue == null || priceValue < 0 -> error = "Enter a valid withdrawal price."
                    exchangeValue == null || exchangeValue <= 0 -> error = "Enter a valid exchange rate."
                    accountId.isBlank() -> error = "Select a destination account."
                    date.isBlank() -> error = "Enter a withdrawal date."
                    else -> {
                        scope.launch {
                            saving = true
                            when (
                                val result = repository.withdrawInvestment(
                                    InvestmentWithdrawalDraft(
                                        investmentId = investment.id,
                                        quantity = quantityValue,
                                        withdrawalPriceOriginal = priceValue,
                                        withdrawalCurrency = currency,
                                        withdrawalExchangeRateToPkr = exchangeValue,
                                        destinationAccountId = accountId,
                                        withdrawnAt = date,
                                    ),
                                )
                            ) {
                                InvestmentsAnalyticsResult.Success -> {
                                    saving = false
                                    onMessage(null)
                                    onDismiss()
                                }
                                is InvestmentsAnalyticsResult.Failure -> {
                                    saving = false
                                    error = result.message
                                }
                            }
                        }
                    }
                }
            },
        ) {
            if (saving) {
                CircularProgressIndicator(Modifier.size(19.dp), strokeWidth = 2.dp)
            } else {
                Text("Cash out")
            }
        }
    }
}
