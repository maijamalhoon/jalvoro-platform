package com.jamalsfinance.nativeapp.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.unit.dp

private val JalvoroAdvisorStarterPrompts = listOf(
    "Where did I spend the most?",
    "How can I improve my cash flow?",
    "What should I focus on next?",
    "Are any payables becoming risky?",
    "How are my goals progressing?",
    "What changed in my recent finances?",
)

@Composable
internal fun JalvoroAdvisorConversation(
    messages: List<JalvoroAdvisorMessage>,
    followUps: List<String>,
    question: String,
    loading: Boolean,
    error: String?,
    onQuestionChange: (String) -> Unit,
    onUsePrompt: (String) -> Unit,
    onSend: (String) -> Unit,
    onClear: () -> Unit,
) {
    JalvoroSurfaceCard {
        Column(
            modifier = Modifier.fillMaxWidth().padding(18.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Column(Modifier.weight(1f)) {
                    Text(
                        text = "Ask your finances",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                    )
                    Text(
                        text = "Ask about spending, cash flow, payables, goals, investments or recent trends.",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                if (messages.isNotEmpty()) {
                    Spacer(Modifier.width(10.dp))
                    TextButton(
                        onClick = onClear,
                        enabled = !loading,
                    ) {
                        Text("Clear")
                    }
                }
            }

            if (messages.isEmpty()) {
                JalvoroAdvisorConversationEmpty(onUsePrompt = onUsePrompt)
            } else {
                Column(verticalArrangement = Arrangement.spacedBy(9.dp)) {
                    messages.forEach { message ->
                        JalvoroAdvisorMessageBubble(message)
                    }
                }
            }

            if (loading) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(9.dp),
                ) {
                    CircularProgressIndicator(Modifier.size(18.dp), strokeWidth = 2.dp)
                    Text(
                        text = "Preparing a grounded answer…",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }

            error?.let {
                JalvoroFeedbackCard(it, JalvoroFeedbackTone.Danger)
            }

            if (followUps.isNotEmpty() && !loading) {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(
                        text = "Suggested follow-ups",
                        style = MaterialTheme.typography.labelLarge,
                        fontWeight = FontWeight.Bold,
                    )
                    followUps.forEach { followUp ->
                        OutlinedButton(
                            onClick = { onSend(followUp) },
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(14.dp),
                        ) {
                            Text(followUp)
                        }
                    }
                }
            }

            OutlinedTextField(
                value = question,
                onValueChange = onQuestionChange,
                modifier = Modifier.fillMaxWidth(),
                label = { Text("Ask a finance question") },
                supportingText = { Text("${question.length}/500 · summarized finance context only") },
                minLines = 2,
                maxLines = 5,
                enabled = !loading,
                keyboardOptions = KeyboardOptions(imeAction = ImeAction.Send),
                keyboardActions = KeyboardActions(
                    onSend = {
                        if (question.trim().isNotBlank() && !loading) onSend(question)
                    },
                ),
            )

            Button(
                onClick = { onSend(question) },
                modifier = Modifier.fillMaxWidth(),
                enabled = question.trim().isNotBlank() && !loading,
                shape = RoundedCornerShape(14.dp),
            ) {
                Icon(
                    imageVector = JalvoroIcons.ArrowRight,
                    contentDescription = null,
                    modifier = Modifier.size(18.dp),
                )
                Spacer(Modifier.width(7.dp))
                Text("Ask JALVORO")
            }

            Text(
                text = "This conversation is kept in the current screen session and is cleared when the advisor workspace is recreated.",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}

@Composable
private fun JalvoroAdvisorConversationEmpty(
    onUsePrompt: (String) -> Unit,
) {
    Surface(
        shape = RoundedCornerShape(18.dp),
        color = MaterialTheme.colorScheme.surfaceContainerLow,
    ) {
        Column(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 20.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Icon(
                imageVector = JalvoroIcons.Investments,
                contentDescription = null,
                modifier = Modifier.size(28.dp),
                tint = MaterialTheme.colorScheme.primary,
            )
            Text(
                text = "What would you like to understand?",
                fontWeight = FontWeight.Bold,
            )
            Text(
                text = "Choose a prompt to edit it before sending, or write your own question below.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Spacer(Modifier.height(4.dp))
            Column(
                modifier = Modifier.fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                JalvoroAdvisorStarterPrompts.forEach { prompt ->
                    OutlinedButton(
                        onClick = { onUsePrompt(prompt) },
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(999.dp),
                    ) {
                        Text(prompt)
                    }
                }
            }
        }
    }
}

@Composable
private fun JalvoroAdvisorMessageBubble(message: JalvoroAdvisorMessage) {
    val user = message.role == JalvoroAdvisorRole.User
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = if (user) Arrangement.End else Arrangement.Start,
    ) {
        Surface(
            modifier = Modifier.fillMaxWidth(0.9f),
            shape = RoundedCornerShape(
                topStart = 17.dp,
                topEnd = 17.dp,
                bottomStart = if (user) 17.dp else 5.dp,
                bottomEnd = if (user) 5.dp else 17.dp,
            ),
            color = if (user) {
                MaterialTheme.colorScheme.primaryContainer
            } else {
                MaterialTheme.colorScheme.surfaceContainerHighest
            },
        ) {
            Column(
                modifier = Modifier.padding(horizontal = 14.dp, vertical = 11.dp),
                verticalArrangement = Arrangement.spacedBy(4.dp),
            ) {
                Text(
                    text = if (user) "You" else "JALVORO Advisor",
                    style = MaterialTheme.typography.labelSmall,
                    fontWeight = FontWeight.Black,
                    color = MaterialTheme.colorScheme.primary,
                )
                Text(
                    text = message.content,
                    style = MaterialTheme.typography.bodyMedium,
                )
            }
        }
    }
}
