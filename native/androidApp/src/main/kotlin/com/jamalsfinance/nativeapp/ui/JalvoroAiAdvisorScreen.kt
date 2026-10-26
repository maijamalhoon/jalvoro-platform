package com.jamalsfinance.nativeapp.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.jamalsfinance.shared.reports.AiChatResult
import com.jamalsfinance.shared.reports.ReportsInsightsRepository
import com.jamalsfinance.shared.reports.ReportsInsightsResult
import com.jamalsfinance.shared.reports.ReportsInsightsSnapshot
import com.jamalsfinance.shared.reports.formatReportMoney
import kotlinx.coroutines.launch

internal enum class JalvoroAdvisorRole { User, Assistant }

internal data class JalvoroAdvisorMessage(
    val role: JalvoroAdvisorRole,
    val content: String,
)

@Composable
internal fun JalvoroAiAdvisorScreen(
    snapshot: ReportsInsightsSnapshot,
    selectedCurrency: String,
    loading: Boolean,
    onCurrencyChange: (String) -> Unit,
    repository: ReportsInsightsRepository,
) {
    val scope = rememberCoroutineScope()
    val insights = snapshot.insights
    val messages = remember(snapshot.nowDate) { mutableStateListOf<JalvoroAdvisorMessage>() }
    val followUps = remember(snapshot.nowDate) { mutableStateListOf<String>() }
    var question by remember(snapshot.nowDate) { mutableStateOf("") }
    var chatLoading by remember { mutableStateOf(false) }
    var chatError by remember { mutableStateOf<String?>(null) }
    var refreshError by remember { mutableStateOf<String?>(null) }

    val money: (Double) -> String = { value ->
        formatReportMoney(value, selectedCurrency, snapshot.exchangeRates)
    }

    fun refreshAdvisor() {
        if (loading) return
        scope.launch {
            refreshError = null
            when (
                val result = repository.refresh(
                    nowDate = snapshot.nowDate,
                    selection = snapshot.report.selection,
                    currency = selectedCurrency,
                    force = true,
                )
            ) {
                ReportsInsightsResult.Success -> Unit
                is ReportsInsightsResult.Failure -> refreshError = result.message
            }
        }
    }

    fun sendQuestion(raw: String) {
        val clean = raw.replace(Regex("\\s+"), " ").trim().take(500)
        if (clean.isBlank() || chatLoading) return
        question = ""
        chatError = null
        followUps.clear()
        messages += JalvoroAdvisorMessage(JalvoroAdvisorRole.User, clean)
        scope.launch {
            chatLoading = true
            when (val result = repository.ask(clean, selectedCurrency)) {
                is AiChatResult.Success -> {
                    messages += JalvoroAdvisorMessage(
                        role = JalvoroAdvisorRole.Assistant,
                        content = result.payload.answer,
                    )
                    followUps += result.payload.followUps
                        .map { it.replace(Regex("\\s+"), " ").trim().take(180) }
                        .filter(String::isNotBlank)
                        .distinct()
                        .take(3)
                }
                is AiChatResult.Failure -> chatError = result.message
            }
            chatLoading = false
        }
    }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(start = 16.dp, top = 12.dp, end = 16.dp, bottom = 36.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        item {
            JalvoroAdvisorHeading(
                aiAvailable = insights.aiAvailable,
                loading = loading,
                onRefresh = ::refreshAdvisor,
            )
        }
        if (loading) {
            item {
                LinearProgressIndicator(
                    modifier = Modifier.fillMaxWidth(),
                    strokeCap = androidx.compose.ui.graphics.StrokeCap.Round,
                )
            }
        }
        refreshError?.let { message ->
            item { JalvoroFeedbackCard(message, JalvoroFeedbackTone.Danger) }
        }
        item {
            JalvoroAdvisorCurrencyCard(
                selectedCurrency = selectedCurrency,
                enabled = !loading && !chatLoading,
                onCurrencyChange = onCurrencyChange,
            )
        }
        item {
            JalvoroAdvisorOverview(
                insights = insights,
                loading = loading,
            )
        }
        insights.message?.takeIf(String::isNotBlank)?.let { message ->
            item {
                JalvoroFeedbackCard(
                    message = message,
                    tone = if (insights.aiAvailable) {
                        JalvoroFeedbackTone.Info
                    } else {
                        JalvoroFeedbackTone.Warning
                    },
                )
            }
        }
        item {
            JalvoroAdvisorBriefing(
                insights = insights,
                loading = loading,
                onRefresh = ::refreshAdvisor,
            )
        }
        item {
            JalvoroAdvisorContext(
                report = snapshot.report,
                money = money,
            )
        }
        item {
            JalvoroAdvisorConversation(
                messages = messages,
                followUps = followUps,
                question = question,
                loading = chatLoading,
                error = chatError,
                onQuestionChange = {
                    question = it.take(500)
                    chatError = null
                },
                onUsePrompt = {
                    question = it.take(500)
                    chatError = null
                },
                onSend = ::sendQuestion,
                onClear = {
                    messages.clear()
                    followUps.clear()
                    question = ""
                    chatError = null
                },
            )
        }
        item {
            JalvoroAdvisorSafetyBoundary(
                aiAvailable = insights.aiAvailable,
                provider = insights.provider,
                model = insights.model,
                generatedAt = insights.generatedAt,
            )
        }
    }
}

@Composable
private fun JalvoroAdvisorHeading(
    aiAvailable: Boolean,
    loading: Boolean,
    onRefresh: () -> Unit,
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.Top,
    ) {
        Column(
            modifier = Modifier.weight(1f),
            verticalArrangement = Arrangement.spacedBy(4.dp),
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                Text(
                    text = "AI Advisor",
                    style = MaterialTheme.typography.headlineSmall,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.semantics { heading() },
                )
                Surface(
                    shape = RoundedCornerShape(999.dp),
                    color = if (aiAvailable) {
                        androidx.compose.ui.graphics.Color(0x1817855F)
                    } else {
                        MaterialTheme.colorScheme.primaryContainer
                    },
                    contentColor = if (aiAvailable) {
                        androidx.compose.ui.graphics.Color(0xFF17815F)
                    } else {
                        MaterialTheme.colorScheme.onPrimaryContainer
                    },
                ) {
                    Text(
                        text = if (aiAvailable) "AI READY" else "SAFE FALLBACK",
                        modifier = Modifier.padding(horizontal = 9.dp, vertical = 5.dp),
                        style = MaterialTheme.typography.labelSmall,
                        fontWeight = FontWeight.Black,
                    )
                }
            }
            Text(
                text = "A grounded financial briefing, next actions and authenticated answers based on your verified JALVORO records.",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
        Spacer(Modifier.width(10.dp))
        OutlinedButton(
            onClick = onRefresh,
            enabled = !loading,
            shape = RoundedCornerShape(999.dp),
        ) {
            if (loading) {
                CircularProgressIndicator(Modifier.height(17.dp).width(17.dp), strokeWidth = 2.dp)
            } else {
                Icon(
                    imageVector = JalvoroIcons.Refresh,
                    contentDescription = null,
                    modifier = Modifier.height(17.dp).width(17.dp),
                )
                Spacer(Modifier.width(6.dp))
                Text("Refresh")
            }
        }
    }
}

@Composable
private fun JalvoroAdvisorCurrencyCard(
    selectedCurrency: String,
    enabled: Boolean,
    onCurrencyChange: (String) -> Unit,
) {
    JalvoroSurfaceCard {
        Row(
            modifier = Modifier.fillMaxWidth().padding(14.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Icon(
                imageVector = JalvoroIcons.Wallet,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.primary,
            )
            Column(Modifier.weight(1f)) {
                Text(
                    text = "Advisor currency",
                    style = MaterialTheme.typography.labelMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Text(selectedCurrency, fontWeight = FontWeight.Bold)
            }
            JalvoroCurrencyMenu(
                selected = selectedCurrency,
                enabled = enabled,
                onSelected = onCurrencyChange,
                modifier = Modifier.width(150.dp),
            )
        }
    }
}
