package com.jamalsfinance.nativeapp.ui

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.jamalsfinance.shared.reports.AiChatResult
import com.jamalsfinance.shared.reports.AiInsight
import com.jamalsfinance.shared.reports.AiInsightsPayload
import com.jamalsfinance.shared.reports.AiSuggestedAction
import com.jamalsfinance.shared.reports.ReportsInsightsRepository
import com.jamalsfinance.shared.reports.ReportsInsightsSnapshot
import kotlinx.coroutines.launch

private data class JalvoroAdvisorMessage(
    val role: String,
    val content: String,
)

@Composable
internal fun JalvoroInsightsScreen(
    snapshot: ReportsInsightsSnapshot,
    selectedCurrency: String,
    loading: Boolean,
    onCurrencyChange: (String) -> Unit,
    repository: ReportsInsightsRepository,
) {
    val scope = rememberCoroutineScope()
    val insights = snapshot.insights
    val messages = remember(snapshot.nowDate) { mutableStateListOf<JalvoroAdvisorMessage>() }
    var question by remember(snapshot.nowDate) { mutableStateOf("") }
    var chatLoading by remember { mutableStateOf(false) }
    var chatError by remember { mutableStateOf<String?>(null) }

    fun sendQuestion(raw: String) {
        val clean = raw.replace(Regex("\\s+"), " ").trim().take(500)
        if (clean.isBlank() || chatLoading) return
        question = ""
        chatError = null
        messages += JalvoroAdvisorMessage("user", clean)
        scope.launch {
            chatLoading = true
            when (val result = repository.ask(clean, selectedCurrency)) {
                is AiChatResult.Success -> {
                    messages += JalvoroAdvisorMessage("assistant", result.payload.answer)
                    result.payload.followUps.take(2).forEach { followUp ->
                        if (followUp.isNotBlank()) {
                            messages += JalvoroAdvisorMessage("follow-up", followUp)
                        }
                    }
                }
                is AiChatResult.Failure -> chatError = result.message
            }
            chatLoading = false
        }
    }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(start = 16.dp, top = 12.dp, end = 16.dp, bottom = 34.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        item {
            Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text(
                    text = "Financial insights",
                    style = MaterialTheme.typography.headlineSmall,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.semantics { heading() },
                )
                Text(
                    text = "Grounded guidance from authenticated finance summaries with a deterministic fallback.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
        item {
            JalvoroSurfaceCard {
                Row(
                    modifier = Modifier.fillMaxWidth().padding(14.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    Icon(
                        JalvoroIcons.Wallet,
                        contentDescription = null,
                        modifier = Modifier.size(20.dp),
                        tint = MaterialTheme.colorScheme.primary,
                    )
                    Column(Modifier.weight(1f)) {
                        Text(
                            "Display currency",
                            style = MaterialTheme.typography.labelMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                        Text(selectedCurrency, fontWeight = FontWeight.Bold)
                    }
                    JalvoroCurrencyMenu(
                        selected = selectedCurrency,
                        enabled = !loading && !chatLoading,
                        onSelected = onCurrencyChange,
                        modifier = Modifier.width(150.dp),
                    )
                }
            }
        }
        item { JalvoroHealthOverview(insights) }
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
        if (insights.summaryCards.isNotEmpty()) {
            item { JalvoroInsightSummaryGrid(insights) }
        }
        item {
            JalvoroInsightsSection(
                icon = JalvoroIcons.Investments,
                title = "Personalized insights",
                subtitle = if (insights.aiAvailable) {
                    "Generated securely through the server-side AI provider."
                } else {
                    "Generated from deterministic finance rules without privileged secrets."
                },
            ) {
                if (insights.insights.isEmpty()) {
                    JalvoroInsightsEmpty("Add finance records to receive personalized insights.")
                } else {
                    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        insights.insights.forEach { JalvoroInsightCard(it) }
                    }
                }
            }
        }
        item {
            JalvoroInsightsSection(
                icon = JalvoroIcons.Target,
                title = "Suggested actions",
                subtitle = "Actions are based only on summarized finance data.",
            ) {
                if (insights.suggestedActions.isEmpty()) {
                    JalvoroInsightsEmpty("No suggested actions are available yet.")
                } else {
                    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        insights.suggestedActions.forEach { JalvoroActionCard(it) }
                    }
                }
            }
        }
        item {
            JalvoroInsightsSection(
                icon = JalvoroIcons.Transactions,
                title = "Ask your finance assistant",
                subtitle = "Questions use summarized authenticated finance data. Service secrets never enter the mobile binary.",
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    JalvoroStarterPrompt(
                        "Where did I spend the most?",
                        enabled = !chatLoading,
                        onClick = ::sendQuestion,
                    )
                    JalvoroStarterPrompt(
                        "How can I improve my cash flow?",
                        enabled = !chatLoading,
                        onClick = ::sendQuestion,
                    )
                    JalvoroStarterPrompt(
                        "What should I focus on next?",
                        enabled = !chatLoading,
                        onClick = ::sendQuestion,
                    )
                }
                if (messages.isNotEmpty()) {
                    Spacer(Modifier.height(14.dp))
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        messages.forEach { JalvoroAdvisorBubble(it) }
                    }
                }
                if (chatLoading) {
                    Spacer(Modifier.height(12.dp))
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(9.dp),
                    ) {
                        CircularProgressIndicator(Modifier.size(18.dp), strokeWidth = 2.dp)
                        Text(
                            "Preparing a grounded answer…",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }
                chatError?.let {
                    Spacer(Modifier.height(10.dp))
                    JalvoroFeedbackCard(it, JalvoroFeedbackTone.Danger)
                }
                Spacer(Modifier.height(14.dp))
                OutlinedTextField(
                    value = question,
                    onValueChange = {
                        question = it.take(500)
                        chatError = null
                    },
                    modifier = Modifier.fillMaxWidth(),
                    label = { Text("Ask a finance question") },
                    supportingText = { Text("${question.length}/500") },
                    minLines = 2,
                    maxLines = 5,
                    enabled = !chatLoading,
                )
                Spacer(Modifier.height(10.dp))
                Button(
                    onClick = { sendQuestion(question) },
                    modifier = Modifier.fillMaxWidth(),
                    enabled = question.trim().isNotBlank() && !chatLoading,
                    shape = RoundedCornerShape(14.dp),
                ) {
                    Text("Send question")
                }
            }
        }
        item {
            JalvoroInsightsSection(
                icon = JalvoroIcons.Privacy,
                title = "Privacy boundary",
                subtitle = "How this native module protects financial information.",
            ) {
                JalvoroInsightKeyValue("Authentication", "Supabase access token")
                JalvoroInsightKeyValue("Data isolation", "PostgreSQL Row Level Security")
                JalvoroInsightKeyValue("AI key", "Server-side only")
                JalvoroInsightKeyValue("Mobile secrets", "No service-role or provider key")
                JalvoroInsightKeyValue("Fallback", "Deterministic finance calculations")
            }
        }
    }
}

@Composable
private fun JalvoroHealthOverview(insights: AiInsightsPayload) {
    Card(
        shape = RoundedCornerShape(24.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainer),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(20.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(18.dp),
        ) {
            JalvoroHealthRing(insights.healthScore)
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text(
                    "FINANCIAL HEALTH",
                    style = MaterialTheme.typography.labelSmall,
                    fontWeight = FontWeight.Black,
                    color = MaterialTheme.colorScheme.primary,
                )
                Text(
                    insights.healthLabel,
                    style = MaterialTheme.typography.headlineSmall,
                    fontWeight = FontWeight.Bold,
                )
                Text(
                    if (insights.aiAvailable) {
                        "Server AI + verified finance summary"
                    } else {
                        "Secure deterministic finance intelligence"
                    },
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Surface(
                    shape = RoundedCornerShape(999.dp),
                    color = if (insights.aiAvailable) {
                        Color(0x1817855F)
                    } else {
                        MaterialTheme.colorScheme.primaryContainer
                    },
                    contentColor = if (insights.aiAvailable) {
                        Color(0xFF17815F)
                    } else {
                        MaterialTheme.colorScheme.onPrimaryContainer
                    },
                ) {
                    Text(
                        text = if (insights.aiAvailable) "AI AVAILABLE" else "SECURE FALLBACK",
                        modifier = Modifier.padding(horizontal = 9.dp, vertical = 5.dp),
                        style = MaterialTheme.typography.labelSmall,
                        fontWeight = FontWeight.Black,
                    )
                }
            }
        }
    }
}

@Composable
private fun JalvoroHealthRing(score: Int) {
    val normalized = score.coerceIn(0, 100)
    val tone = when {
        normalized >= 75 -> Color(0xFF17815F)
        normalized >= 50 -> Color(0xFFB57816)
        else -> MaterialTheme.colorScheme.error
    }
    val trackColor = MaterialTheme.colorScheme.surfaceContainerHighest
    Box(Modifier.size(96.dp), contentAlignment = Alignment.Center) {
        Canvas(Modifier.fillMaxSize()) {
            val stroke = 10.dp.toPx()
            drawArc(
                color = trackColor,
                startAngle = -90f,
                sweepAngle = 360f,
                useCenter = false,
                style = Stroke(stroke, cap = StrokeCap.Round),
            )
            drawArc(
                color = tone,
                startAngle = -90f,
                sweepAngle = normalized * 3.6f,
                useCenter = false,
                style = Stroke(stroke, cap = StrokeCap.Round),
            )
        }
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text(
                normalized.toString(),
                style = MaterialTheme.typography.headlineSmall,
                fontWeight = FontWeight.Black,
            )
            Text(
                "/ 100",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}

@Composable
private fun JalvoroInsightSummaryGrid(insights: AiInsightsPayload) {
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        insights.summaryCards.chunked(2).take(2).forEach { row ->
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                row.forEach { card ->
                    JalvoroInsightMetric(
                        label = card.label,
                        value = card.value,
                        helper = card.caption,
                        tone = jalvoroInsightTone(card.tone),
                        modifier = Modifier.weight(1f),
                    )
                }
                if (row.size == 1) Spacer(Modifier.weight(1f))
            }
        }
    }
}

@Composable
private fun JalvoroInsightMetric(
    label: String,
    value: String,
    helper: String,
    tone: Color,
    modifier: Modifier = Modifier,
) {
    JalvoroSurfaceCard(modifier) {
        Column(
            Modifier.fillMaxWidth().padding(15.dp),
            verticalArrangement = Arrangement.spacedBy(6.dp),
        ) {
            Text(
                label.uppercase(),
                style = MaterialTheme.typography.labelSmall,
                fontWeight = FontWeight.Black,
                color = tone,
            )
            Text(
                value,
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
            )
            Text(
                helper,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}

@Composable
private fun JalvoroInsightsSection(
    icon: ImageVector,
    title: String,
    subtitle: String,
    content: @Composable () -> Unit,
) {
    JalvoroSurfaceCard {
        Column(Modifier.fillMaxWidth().padding(18.dp)) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(9.dp),
            ) {
                Surface(
                    shape = RoundedCornerShape(12.dp),
                    color = MaterialTheme.colorScheme.primaryContainer,
                    contentColor = MaterialTheme.colorScheme.primary,
                ) {
                    Icon(
                        icon,
                        contentDescription = null,
                        modifier = Modifier.padding(9.dp).size(19.dp),
                    )
                }
                Column(Modifier.weight(1f)) {
                    Text(title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                    Text(
                        subtitle,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
            Spacer(Modifier.height(14.dp))
            content()
        }
    }
}

@Composable
private fun JalvoroInsightCard(insight: AiInsight) {
    val tone = jalvoroInsightTone(insight.type)
    Surface(
        shape = RoundedCornerShape(16.dp),
        color = MaterialTheme.colorScheme.surfaceContainerLow,
    ) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(14.dp),
            horizontalArrangement = Arrangement.spacedBy(11.dp),
            verticalAlignment = Alignment.Top,
        ) {
            Box(Modifier.size(9.dp).background(tone, CircleShape))
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(3.dp)) {
                Text(insight.title, fontWeight = FontWeight.Bold)
                Text(
                    insight.message,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
    }
}

@Composable
private fun JalvoroActionCard(action: AiSuggestedAction) {
    val tone = jalvoroInsightTone(action.priority)
    Surface(
        shape = RoundedCornerShape(16.dp),
        color = MaterialTheme.colorScheme.surfaceContainerLow,
    ) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(14.dp),
            horizontalArrangement = Arrangement.spacedBy(11.dp),
            verticalAlignment = Alignment.Top,
        ) {
            Icon(
                JalvoroIcons.Check,
                contentDescription = null,
                tint = tone,
                modifier = Modifier.size(20.dp),
            )
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text(action.title, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
                    Spacer(Modifier.width(8.dp))
                    Text(
                        action.priority.uppercase(),
                        style = MaterialTheme.typography.labelSmall,
                        fontWeight = FontWeight.Black,
                        color = tone,
                    )
                }
                Text(
                    action.description,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
    }
}

@Composable
private fun JalvoroStarterPrompt(
    label: String,
    enabled: Boolean,
    onClick: (String) -> Unit,
) {
    OutlinedButton(
        onClick = { onClick(label) },
        enabled = enabled,
        shape = RoundedCornerShape(999.dp),
    ) {
        Text(label)
    }
}

@Composable
private fun JalvoroAdvisorBubble(message: JalvoroAdvisorMessage) {
    val user = message.role == "user"
    val followUp = message.role == "follow-up"
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = if (user) Arrangement.End else Arrangement.Start,
    ) {
        Surface(
            modifier = Modifier.fillMaxWidth(if (followUp) 1f else 0.88f),
            shape = RoundedCornerShape(
                topStart = 17.dp,
                topEnd = 17.dp,
                bottomStart = if (user) 17.dp else 5.dp,
                bottomEnd = if (user) 5.dp else 17.dp,
            ),
            color = when {
                user -> MaterialTheme.colorScheme.primaryContainer
                followUp -> MaterialTheme.colorScheme.surfaceContainerLow
                else -> MaterialTheme.colorScheme.surfaceContainerHighest
            },
        ) {
            Column(
                Modifier.padding(horizontal = 14.dp, vertical = 11.dp),
                verticalArrangement = Arrangement.spacedBy(3.dp),
            ) {
                Text(
                    text = when {
                        user -> "You"
                        followUp -> "Suggested follow-up"
                        else -> "JALVORO"
                    },
                    style = MaterialTheme.typography.labelSmall,
                    fontWeight = FontWeight.Black,
                    color = MaterialTheme.colorScheme.primary,
                )
                Text(message.content, style = MaterialTheme.typography.bodyMedium)
            }
        }
    }
}

@Composable
private fun JalvoroInsightKeyValue(label: String, value: String) {
    Row(
        modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.Top,
    ) {
        Text(
            label,
            modifier = Modifier.weight(1f),
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Spacer(Modifier.width(12.dp))
        Text(value, style = MaterialTheme.typography.bodySmall, fontWeight = FontWeight.SemiBold)
    }
}

@Composable
private fun JalvoroInsightsEmpty(message: String) {
    Text(
        message,
        modifier = Modifier.fillMaxWidth().padding(vertical = 16.dp),
        style = MaterialTheme.typography.bodyMedium,
        color = MaterialTheme.colorScheme.onSurfaceVariant,
    )
}

@Composable
private fun jalvoroInsightTone(raw: String): Color {
    val key = raw.trim().lowercase()
    return when {
        key in setOf("success", "positive", "good", "low") -> Color(0xFF17815F)
        key in setOf("danger", "negative", "critical", "high", "loss") -> MaterialTheme.colorScheme.error
        key in setOf("warning", "medium", "caution") -> Color(0xFFB57816)
        else -> MaterialTheme.colorScheme.primary
    }
}
