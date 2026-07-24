package com.jamalsfinance.nativeapp.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.jamalsfinance.shared.auth.AuthRepository
import com.jamalsfinance.shared.auth.AuthResult
import kotlinx.coroutines.launch

private const val WEBSITE_RECOVERY_URL =
    "https://jamals-finance-sable.vercel.app/login?mode=forgot"
private const val WEBSITE_PRIVACY_URL =
    "https://jamals-finance-sable.vercel.app/#privacy"
private const val PASSWORD_MIN_LENGTH = 12
private const val PASSWORD_MAX_LENGTH = 128

private enum class NativeAuthMode {
    Login,
    SignUp,
}

private enum class NativeAuthStep {
    Email,
    Password,
    CheckEmail,
}

@Composable
fun NativeAuthScreen(
    repository: AuthRepository,
    online: Boolean,
    initialMessage: String? = null,
) {
    val scope = rememberCoroutineScope()
    val uriHandler = LocalUriHandler.current
    val emailFocus = remember { FocusRequester() }
    val passwordFocus = remember { FocusRequester() }

    var mode by rememberSaveable { mutableStateOf(NativeAuthMode.Login) }
    var step by rememberSaveable { mutableStateOf(NativeAuthStep.Email) }
    var email by rememberSaveable { mutableStateOf("") }
    var password by rememberSaveable { mutableStateOf("") }
    var passwordVisible by rememberSaveable { mutableStateOf(false) }
    var loading by remember { mutableStateOf(false) }
    var message by rememberSaveable { mutableStateOf(initialMessage) }
    var confirmationEmail by rememberSaveable { mutableStateOf("") }

    LaunchedEffect(initialMessage) {
        if (!initialMessage.isNullOrBlank()) message = initialMessage
    }

    LaunchedEffect(step) {
        when (step) {
            NativeAuthStep.Email -> emailFocus.requestFocus()
            NativeAuthStep.Password -> passwordFocus.requestFocus()
            NativeAuthStep.CheckEmail -> Unit
        }
    }

    fun switchMode(next: NativeAuthMode) {
        mode = next
        step = NativeAuthStep.Email
        password = ""
        passwordVisible = false
        message = null
        confirmationEmail = ""
    }

    fun continueWithEmail() {
        val normalized = email.trim().lowercase()
        message = when {
            !online -> "You are offline. Reconnect before continuing."
            !isValidEmail(normalized) -> "Enter a valid email address."
            else -> null
        }
        if (message == null) {
            email = normalized
            step = NativeAuthStep.Password
        }
    }

    fun submitCredentials() {
        if (loading) return
        val normalizedEmail = email.trim().lowercase()
        val validation = when {
            !online -> "You are offline. Reconnect before continuing."
            !isValidEmail(normalizedEmail) -> "Enter a valid email address."
            password.isBlank() -> "Enter your password."
            mode == NativeAuthMode.SignUp -> validateNewPassword(password)
            else -> null
        }
        if (validation != null) {
            message = validation
            return
        }

        scope.launch {
            loading = true
            message = null
            val result = runCatching {
                if (mode == NativeAuthMode.Login) {
                    repository.signIn(normalizedEmail, password)
                } else {
                    repository.signUp(normalizedEmail, password)
                }
            }.getOrElse {
                AuthResult.Failure(
                    it.message?.takeIf(String::isNotBlank)
                        ?: "A secure connection could not be completed.",
                )
            }

            when (result) {
                is AuthResult.Success -> Unit
                is AuthResult.ConfirmationRequired -> {
                    confirmationEmail = result.email
                    password = ""
                    step = NativeAuthStep.CheckEmail
                }
                is AuthResult.Failure -> message = result.message
            }
            loading = false
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .safeDrawingPadding()
            .imePadding()
            .padding(horizontal = 20.dp),
        contentAlignment = Alignment.Center,
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .widthIn(max = 520.dp)
                .verticalScroll(rememberScrollState())
                .padding(vertical = 24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            JalvoroBrandLockup(subtitle = JALVORO_PERSONAL)
            Spacer(Modifier.height(20.dp))

            JalvoroSurfaceCard(modifier = Modifier.fillMaxWidth()) {
                Column(
                    modifier = Modifier.fillMaxWidth().padding(22.dp),
                    verticalArrangement = Arrangement.spacedBy(14.dp),
                ) {
                    AuthHeading(mode = mode, step = step)

                    if (!online) {
                        JalvoroFeedbackCard(
                            message = "You are offline. Reconnect before continuing.",
                            tone = JalvoroFeedbackTone.Warning,
                        )
                    }

                    message?.takeIf(String::isNotBlank)?.let {
                        JalvoroFeedbackCard(
                            message = it,
                            tone = JalvoroFeedbackTone.Danger,
                            modifier = Modifier.semantics {
                                liveRegion = LiveRegionMode.Assertive
                            },
                        )
                    }

                    when (step) {
                        NativeAuthStep.Email -> {
                            OutlinedTextField(
                                value = email,
                                onValueChange = {
                                    email = it
                                    message = null
                                },
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .focusRequester(emailFocus),
                                label = { Text("Email address") },
                                placeholder = { Text("you@example.com") },
                                leadingIcon = {
                                    Icon(
                                        imageVector = JalvoroIcons.Mail,
                                        contentDescription = null,
                                        modifier = Modifier.size(20.dp),
                                    )
                                },
                                singleLine = true,
                                enabled = !loading,
                                shape = RoundedCornerShape(14.dp),
                                keyboardOptions = KeyboardOptions(
                                    keyboardType = KeyboardType.Email,
                                    imeAction = ImeAction.Next,
                                ),
                                keyboardActions = KeyboardActions(
                                    onNext = { continueWithEmail() },
                                ),
                                colors = jalvoroTextFieldColors(),
                            )

                            Button(
                                onClick = ::continueWithEmail,
                                enabled = !loading && online,
                                modifier = Modifier.fillMaxWidth().height(52.dp),
                                shape = RoundedCornerShape(14.dp),
                            ) {
                                Text("Continue", fontWeight = FontWeight.Bold)
                                Spacer(Modifier.size(8.dp))
                                Icon(
                                    imageVector = JalvoroIcons.ArrowRight,
                                    contentDescription = null,
                                    modifier = Modifier.size(18.dp),
                                )
                            }

                            AuthModeSwitch(
                                mode = mode,
                                enabled = !loading,
                                onSwitch = {
                                    switchMode(
                                        if (mode == NativeAuthMode.Login) {
                                            NativeAuthMode.SignUp
                                        } else {
                                            NativeAuthMode.Login
                                        },
                                    )
                                },
                            )

                            TextButton(
                                onClick = { uriHandler.openUri(WEBSITE_PRIVACY_URL) },
                                modifier = Modifier.align(Alignment.CenterHorizontally),
                            ) {
                                Text(
                                    text = "Privacy information",
                                    style = MaterialTheme.typography.labelLarge,
                                )
                            }
                        }

                        NativeAuthStep.Password -> {
                            TextButton(
                                onClick = {
                                    password = ""
                                    message = null
                                    step = NativeAuthStep.Email
                                },
                                enabled = !loading,
                                contentPadding = androidx.compose.foundation.layout.PaddingValues(0.dp),
                            ) {
                                Icon(
                                    imageVector = JalvoroIcons.ArrowLeft,
                                    contentDescription = null,
                                    modifier = Modifier.size(17.dp),
                                )
                                Spacer(Modifier.size(7.dp))
                                Text("Use another account")
                            }

                            Surface(
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(14.dp),
                                color = MaterialTheme.colorScheme.surfaceContainerLow,
                            ) {
                                Row(
                                    modifier = Modifier.padding(horizontal = 14.dp, vertical = 12.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                                ) {
                                    Icon(
                                        imageVector = JalvoroIcons.Mail,
                                        contentDescription = null,
                                        modifier = Modifier.size(18.dp),
                                        tint = MaterialTheme.colorScheme.onSurfaceVariant,
                                    )
                                    Text(
                                        text = email,
                                        modifier = Modifier.weight(1f),
                                        style = MaterialTheme.typography.bodyMedium,
                                        fontWeight = FontWeight.SemiBold,
                                    )
                                    TextButton(
                                        onClick = {
                                            password = ""
                                            step = NativeAuthStep.Email
                                        },
                                        enabled = !loading,
                                    ) {
                                        Text("Change")
                                    }
                                }
                            }

                            OutlinedTextField(
                                value = password,
                                onValueChange = {
                                    password = it
                                    message = null
                                },
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .focusRequester(passwordFocus),
                                label = { Text("Password") },
                                placeholder = {
                                    Text(
                                        if (mode == NativeAuthMode.Login) {
                                            "Enter your password"
                                        } else {
                                            "Create a secure password"
                                        },
                                    )
                                },
                                leadingIcon = {
                                    Icon(
                                        imageVector = JalvoroIcons.Lock,
                                        contentDescription = null,
                                        modifier = Modifier.size(20.dp),
                                    )
                                },
                                trailingIcon = {
                                    IconButton(
                                        onClick = { passwordVisible = !passwordVisible },
                                    ) {
                                        Icon(
                                            imageVector = if (passwordVisible) {
                                                JalvoroIcons.EyeOff
                                            } else {
                                                JalvoroIcons.Eye
                                            },
                                            contentDescription = if (passwordVisible) {
                                                "Hide password"
                                            } else {
                                                "Show password"
                                            },
                                            modifier = Modifier.size(20.dp),
                                        )
                                    }
                                },
                                singleLine = true,
                                enabled = !loading,
                                visualTransformation = if (passwordVisible) {
                                    VisualTransformation.None
                                } else {
                                    PasswordVisualTransformation()
                                },
                                shape = RoundedCornerShape(14.dp),
                                keyboardOptions = KeyboardOptions(
                                    keyboardType = KeyboardType.Password,
                                    imeAction = ImeAction.Done,
                                ),
                                keyboardActions = KeyboardActions(
                                    onDone = { submitCredentials() },
                                ),
                                colors = jalvoroTextFieldColors(),
                            )

                            if (mode == NativeAuthMode.SignUp) {
                                PasswordRequirements(password)
                            } else {
                                TextButton(
                                    onClick = { uriHandler.openUri(WEBSITE_RECOVERY_URL) },
                                    modifier = Modifier.align(Alignment.End),
                                    enabled = !loading,
                                ) {
                                    Text("Forgot password?")
                                }
                            }

                            Button(
                                onClick = ::submitCredentials,
                                enabled = !loading && online,
                                modifier = Modifier.fillMaxWidth().height(52.dp),
                                shape = RoundedCornerShape(14.dp),
                            ) {
                                if (loading) {
                                    CircularProgressIndicator(
                                        modifier = Modifier.size(21.dp),
                                        strokeWidth = 2.dp,
                                        color = MaterialTheme.colorScheme.onPrimary,
                                    )
                                    Spacer(Modifier.size(10.dp))
                                    Text(
                                        if (mode == NativeAuthMode.Login) {
                                            "Signing you in…"
                                        } else {
                                            "Creating account…"
                                        },
                                    )
                                } else {
                                    Text(
                                        if (mode == NativeAuthMode.Login) {
                                            "Log in"
                                        } else {
                                            "Create account"
                                        },
                                        fontWeight = FontWeight.Bold,
                                    )
                                    Spacer(Modifier.size(8.dp))
                                    Icon(
                                        imageVector = JalvoroIcons.ArrowRight,
                                        contentDescription = null,
                                        modifier = Modifier.size(18.dp),
                                    )
                                }
                            }
                        }

                        NativeAuthStep.CheckEmail -> {
                            Surface(
                                modifier = Modifier.align(Alignment.CenterHorizontally),
                                shape = RoundedCornerShape(18.dp),
                                color = MaterialTheme.colorScheme.primaryContainer,
                                contentColor = MaterialTheme.colorScheme.onPrimaryContainer,
                            ) {
                                Icon(
                                    imageVector = JalvoroIcons.Mail,
                                    contentDescription = null,
                                    modifier = Modifier.padding(15.dp).size(30.dp),
                                )
                            }

                            Text(
                                text = "Check your email",
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .semantics { heading() },
                                style = MaterialTheme.typography.titleLarge,
                                fontWeight = FontWeight.Bold,
                                textAlign = TextAlign.Center,
                            )
                            Text(
                                text = "A confirmation link was requested for ${maskEmail(confirmationEmail)}. Check your inbox and spam folder before logging in.",
                                modifier = Modifier.fillMaxWidth(),
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                textAlign = TextAlign.Center,
                            )

                            Button(
                                onClick = { switchMode(NativeAuthMode.Login) },
                                modifier = Modifier.fillMaxWidth().height(52.dp),
                                shape = RoundedCornerShape(14.dp),
                            ) {
                                Text("Back to login", fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                }
            }

            Spacer(Modifier.height(16.dp))
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(7.dp),
            ) {
                Icon(
                    imageVector = JalvoroIcons.Shield,
                    contentDescription = null,
                    modifier = Modifier.size(17.dp),
                    tint = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Text(
                    text = "Secure Supabase authentication • JALVORO never displays your password",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    textAlign = TextAlign.Center,
                )
            }
        }
    }
}

@Composable
private fun AuthHeading(
    mode: NativeAuthMode,
    step: NativeAuthStep,
) {
    val title = when (step) {
        NativeAuthStep.Email -> if (mode == NativeAuthMode.Login) "Welcome back" else "Create your account"
        NativeAuthStep.Password -> if (mode == NativeAuthMode.Login) "Enter your password" else "Secure your account"
        NativeAuthStep.CheckEmail -> "Email confirmation"
    }
    val description = when (step) {
        NativeAuthStep.Email -> if (mode == NativeAuthMode.Login) {
            "Log in to continue to your private personal finance workspace."
        } else {
            "Start with your email. Your finance records remain owner-scoped and private."
        }
        NativeAuthStep.Password -> if (mode == NativeAuthMode.Login) {
            "Use the password connected to this JALVORO account."
        } else {
            "Use 12–128 characters with a letter and a number or symbol."
        }
        NativeAuthStep.CheckEmail -> "Confirm the address before using the new account."
    }

    Column(verticalArrangement = Arrangement.spacedBy(5.dp)) {
        Text(
            text = when (step) {
                NativeAuthStep.Email -> "Step 1 of 2"
                NativeAuthStep.Password -> "Step 2 of 2"
                NativeAuthStep.CheckEmail -> "Confirmation required"
            },
            style = MaterialTheme.typography.labelLarge,
            color = MaterialTheme.colorScheme.primary,
            fontWeight = FontWeight.Bold,
        )
        Text(
            text = title,
            modifier = Modifier.semantics { heading() },
            style = MaterialTheme.typography.headlineSmall,
            fontWeight = FontWeight.Bold,
        )
        Text(
            text = description,
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

@Composable
private fun AuthModeSwitch(
    mode: NativeAuthMode,
    enabled: Boolean,
    onSwitch: () -> Unit,
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.Center,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            text = if (mode == NativeAuthMode.Login) {
                "New to JALVORO?"
            } else {
                "Already have an account?"
            },
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        TextButton(onClick = onSwitch, enabled = enabled) {
            Text(
                text = if (mode == NativeAuthMode.Login) "Create an account" else "Log in",
                fontWeight = FontWeight.Bold,
            )
        }
    }
}

@Composable
private fun PasswordRequirements(password: String) {
    val lengthValid = password.length in PASSWORD_MIN_LENGTH..PASSWORD_MAX_LENGTH
    val letterValid = password.any(Char::isLetter)
    val numberOrSymbolValid = password.any { it.isDigit() || !it.isLetterOrDigit() }

    Surface(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(14.dp),
        color = MaterialTheme.colorScheme.surfaceContainerLow,
    ) {
        Column(
            modifier = Modifier.padding(horizontal = 14.dp, vertical = 12.dp),
            verticalArrangement = Arrangement.spacedBy(7.dp),
        ) {
            RequirementRow(
                valid = lengthValid,
                label = "$PASSWORD_MIN_LENGTH–$PASSWORD_MAX_LENGTH characters",
            )
            RequirementRow(valid = letterValid, label = "At least one letter")
            RequirementRow(
                valid = numberOrSymbolValid,
                label = "At least one number or symbol",
            )
        }
    }
}

@Composable
private fun RequirementRow(valid: Boolean, label: String) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        Icon(
            imageVector = if (valid) JalvoroIcons.Check else JalvoroIcons.More,
            contentDescription = null,
            modifier = Modifier.size(16.dp),
            tint = if (valid) {
                MaterialTheme.colorScheme.tertiary
            } else {
                MaterialTheme.colorScheme.onSurfaceVariant
            },
        )
        Text(
            text = label,
            style = MaterialTheme.typography.bodySmall,
            color = if (valid) {
                MaterialTheme.colorScheme.onSurface
            } else {
                MaterialTheme.colorScheme.onSurfaceVariant
            },
        )
    }
}

@Composable
private fun jalvoroTextFieldColors() = OutlinedTextFieldDefaults.colors(
    focusedBorderColor = MaterialTheme.colorScheme.primary,
    focusedLabelColor = MaterialTheme.colorScheme.primary,
    cursorColor = MaterialTheme.colorScheme.primary,
    unfocusedBorderColor = MaterialTheme.colorScheme.outlineVariant,
    errorBorderColor = MaterialTheme.colorScheme.error,
)

private fun isValidEmail(value: String): Boolean =
    Regex("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$").matches(value)

private fun validateNewPassword(value: String): String? = when {
    value.length !in PASSWORD_MIN_LENGTH..PASSWORD_MAX_LENGTH ->
        "Use $PASSWORD_MIN_LENGTH–$PASSWORD_MAX_LENGTH characters."
    value.none(Char::isLetter) -> "Add at least one letter."
    value.none { it.isDigit() || !it.isLetterOrDigit() } ->
        "Add at least one number or symbol."
    else -> null
}

private fun maskEmail(value: String): String {
    val parts = value.split("@", limit = 2)
    if (parts.size != 2) return value
    val local = parts[0]
    val visible = local.take(2)
    val hidden = "•".repeat((local.length - visible.length).coerceAtLeast(3))
    return "$visible$hidden@${parts[1]}"
}
