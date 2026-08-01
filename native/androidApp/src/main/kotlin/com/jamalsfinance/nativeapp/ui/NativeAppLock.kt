package com.jamalsfinance.nativeapp.ui

import android.app.Activity
import android.app.KeyguardManager
import android.content.Context
import android.content.ContextWrapper
import android.content.Intent
import android.hardware.biometrics.BiometricManager
import android.hardware.biometrics.BiometricPrompt
import android.hardware.fingerprint.FingerprintManager
import android.os.Build
import android.os.CancellationSignal
import android.provider.Settings
import androidx.activity.ComponentActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.annotation.RequiresApi
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.LocalLifecycleOwner
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import java.util.concurrent.atomic.AtomicBoolean

private data class NativeAuthenticator(
    val available: Boolean,
    val methodLabel: String,
    val authenticate: (
        onSuccess: () -> Unit,
        onFailure: (String) -> Unit,
    ) -> (() -> Unit),
)

private class NativeAuthenticationAttempt(
    private val onSuccess: () -> Unit,
    private val onFailure: (String) -> Unit,
) {
    private val active = AtomicBoolean(true)
    private var cancellationSignal: CancellationSignal? = null

    fun attach(signal: CancellationSignal) {
        if (active.get()) cancellationSignal = signal else signal.cancel()
    }

    fun succeed() {
        if (active.compareAndSet(true, false)) onSuccess()
    }

    fun fail(message: String) {
        if (active.compareAndSet(true, false)) onFailure(message)
    }

    fun cancel() {
        if (active.compareAndSet(true, false)) cancellationSignal?.cancel()
    }
}

@Composable
internal fun NativeAppLockGate(
    preferences: AndroidNativePreferences,
    content: @Composable () -> Unit,
) {
    val localPreferences by preferences.state.collectAsStateWithLifecycle()
    val lifecycleOwner = LocalLifecycleOwner.current
    val context = LocalContext.current
    var authenticatorRefresh by remember { mutableIntStateOf(0) }
    val authenticator = rememberNativeAuthenticator(authenticatorRefresh)
    var unlocked by rememberSaveable(localPreferences.appLockEnabled) {
        mutableStateOf(!localPreferences.appLockEnabled)
    }
    var unlocking by remember { mutableStateOf(false) }
    var message by remember { mutableStateOf<String?>(null) }
    var cancelAuthentication by remember { mutableStateOf<(() -> Unit)?>(null) }

    fun lock() {
        cancelAuthentication?.invoke()
        cancelAuthentication = null
        unlocked = false
        unlocking = false
        message = null
    }

    LaunchedEffect(preferences) {
        preferences.lockRequests.collect {
            if (preferences.state.value.appLockEnabled) lock()
        }
    }

    LaunchedEffect(localPreferences.appLockEnabled) {
        if (!localPreferences.appLockEnabled) {
            cancelAuthentication?.invoke()
            cancelAuthentication = null
            unlocking = false
            message = null
            unlocked = true
        }
    }

    DisposableEffect(Unit) {
        onDispose { cancelAuthentication?.invoke() }
    }

    DisposableEffect(
        lifecycleOwner,
        localPreferences.appLockEnabled,
        localPreferences.autoLockTimeout,
    ) {
        val observer = LifecycleEventObserver { _, event ->
            when (event) {
                Lifecycle.Event.ON_STOP -> preferences.markBackgrounded()
                Lifecycle.Event.ON_START -> {
                    authenticatorRefresh += 1
                    if (!unlocking && preferences.shouldLockOnResume()) lock()
                }
                else -> Unit
            }
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose { lifecycleOwner.lifecycle.removeObserver(observer) }
    }

    if (!localPreferences.appLockEnabled || unlocked) {
        content()
    } else {
        NativeAppLockScreen(
            available = authenticator.available,
            methodLabel = authenticator.methodLabel,
            unlocking = unlocking,
            message = message,
            onUnlock = unlock@{
                if (unlocking || !authenticator.available) return@unlock
                cancelAuthentication?.invoke()
                unlocking = true
                message = null
                val cancellation = authenticator.authenticate(
                    {
                        cancelAuthentication = null
                        preferences.clearBackgroundTimestamp()
                        unlocking = false
                        unlocked = true
                    },
                    {
                        cancelAuthentication = null
                        unlocking = false
                        message = it
                    },
                )
                if (unlocking) cancelAuthentication = cancellation else cancellation()
            },
            onOpenSecuritySettings = {
                val opened = runCatching {
                    context.startActivity(
                        Intent(Settings.ACTION_SECURITY_SETTINGS)
                            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK),
                    )
                }.isSuccess
                if (!opened) message = "Android security settings could not be opened on this device."
            },
        )
    }
}

@Composable
private fun NativeAppLockScreen(
    available: Boolean,
    methodLabel: String,
    unlocking: Boolean,
    message: String?,
    onUnlock: () -> Unit,
    onOpenSecuritySettings: () -> Unit,
) {
    Box(
        modifier = Modifier.fillMaxSize().padding(20.dp),
        contentAlignment = Alignment.Center,
    ) {
        Surface(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(28.dp),
            color = MaterialTheme.colorScheme.surfaceContainer,
        ) {
            Column(
                modifier = Modifier.padding(horizontal = 24.dp, vertical = 28.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center,
            ) {
                JalvoroBrandMark(
                    modifier = Modifier.size(68.dp),
                    contentDescription = "JALVORO logo",
                )
                Spacer(Modifier.height(18.dp))
                Surface(
                    shape = RoundedCornerShape(999.dp),
                    color = MaterialTheme.colorScheme.primaryContainer,
                    contentColor = MaterialTheme.colorScheme.primary,
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 11.dp, vertical = 6.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                    ) {
                        Icon(JalvoroIcons.Shield, contentDescription = null, modifier = Modifier.size(15.dp))
                        Text(
                            text = "DEVICE AUTHENTICATION",
                            style = MaterialTheme.typography.labelSmall,
                            fontWeight = FontWeight.Black,
                        )
                    }
                }
                Spacer(Modifier.height(14.dp))
                Text(
                    text = "JALVORO Personal is locked",
                    style = MaterialTheme.typography.headlineSmall,
                    fontWeight = FontWeight.Bold,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.semantics { heading() },
                )
                Spacer(Modifier.height(8.dp))
                Text(
                    text = if (available) {
                        "Verify with $methodLabel. No personal finance content is shown until Android confirms your identity."
                    } else {
                        "A secure Android PIN, pattern, password or biometric must be configured before App Lock can verify you."
                    },
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    textAlign = TextAlign.Center,
                )
                if (message != null) {
                    Spacer(Modifier.height(13.dp))
                    JalvoroFeedbackCard(message = message, tone = JalvoroFeedbackTone.Danger)
                }
                Spacer(Modifier.height(22.dp))
                if (available) {
                    Button(
                        onClick = onUnlock,
                        enabled = !unlocking,
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(16.dp),
                    ) {
                        Icon(JalvoroIcons.Lock, contentDescription = null, modifier = Modifier.size(19.dp))
                        Spacer(Modifier.size(8.dp))
                        Text(if (unlocking) "Verifying…" else "Unlock securely")
                    }
                } else {
                    Button(
                        onClick = onOpenSecuritySettings,
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(16.dp),
                    ) {
                        Icon(JalvoroIcons.Settings, contentDescription = null, modifier = Modifier.size(19.dp))
                        Spacer(Modifier.size(8.dp))
                        Text("Open Android security settings")
                    }
                }
                Spacer(Modifier.height(9.dp))
                OutlinedButton(
                    onClick = onUnlock,
                    enabled = available && !unlocking,
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                ) {
                    Text(if (available) "Try device authentication" else "Device security required")
                }
                Spacer(Modifier.height(14.dp))
                Text(
                    text = "App Lock protects access on this device. Your Supabase account, database Row Level Security and encrypted transport remain separate security layers.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    textAlign = TextAlign.Center,
                )
            }
        }
    }
}

@Composable
private fun rememberNativeAuthenticator(refreshKey: Int): NativeAuthenticator {
    val context = LocalContext.current
    val activity = remember(context) { context.findComponentActivity() }
    val keyguard = remember(context) {
        context.getSystemService(Context.KEYGUARD_SERVICE) as? KeyguardManager
    }
    val pendingCredentialAttempt = remember { mutableStateOf<NativeAuthenticationAttempt?>(null) }
    val credentialLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.StartActivityForResult(),
    ) { result ->
        val attempt = pendingCredentialAttempt.value
        pendingCredentialAttempt.value = null
        if (result.resultCode == Activity.RESULT_OK) {
            attempt?.succeed()
        } else {
            attempt?.fail("Unlock cancelled. Your finance data remains locked.")
        }
    }

    DisposableEffect(Unit) {
        onDispose {
            pendingCredentialAttempt.value?.cancel()
            pendingCredentialAttempt.value = null
        }
    }

    val available = activity != null && keyguard?.isDeviceSecure == true
    val methodLabel = when {
        Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q -> "biometrics or your device screen lock"
        Build.VERSION.SDK_INT >= Build.VERSION_CODES.P && activity != null && hasEnrolledFingerprintApi28(activity) ->
            "fingerprint or your device screen lock"
        else -> "your device PIN, pattern or password"
    }

    return remember(activity, keyguard, available, methodLabel, credentialLauncher, refreshKey) {
        NativeAuthenticator(
            available = available,
            methodLabel = methodLabel,
            authenticate = { onSuccess, onFailure ->
                val attempt = NativeAuthenticationAttempt(onSuccess, onFailure)
                val currentActivity = activity
                val currentKeyguard = keyguard

                fun launchCredential() {
                    val intent = currentKeyguard?.createConfirmDeviceCredentialIntent(
                        "Unlock JALVORO Personal",
                        "Confirm your Android screen lock to continue.",
                    )
                    if (intent == null) {
                        attempt.fail("Device credential confirmation is unavailable.")
                    } else {
                        pendingCredentialAttempt.value?.cancel()
                        pendingCredentialAttempt.value = attempt
                        credentialLauncher.launch(intent)
                    }
                }

                if (currentActivity == null || currentKeyguard?.isDeviceSecure != true) {
                    attempt.fail("A secure Android screen lock is required.")
                } else {
                    when {
                        Build.VERSION.SDK_INT >= Build.VERSION_CODES.R -> authenticateApi30(currentActivity, attempt)
                        Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q -> authenticateApi29(currentActivity, attempt)
                        Build.VERSION.SDK_INT >= Build.VERSION_CODES.P && hasEnrolledFingerprintApi28(currentActivity) ->
                            authenticateApi28(currentActivity, attempt, ::launchCredential)
                        else -> launchCredential()
                    }
                }

                {
                    if (pendingCredentialAttempt.value === attempt) pendingCredentialAttempt.value = null
                    attempt.cancel()
                }
            },
        )
    }
}

@RequiresApi(Build.VERSION_CODES.R)
private fun authenticateApi30(activity: ComponentActivity, attempt: NativeAuthenticationAttempt) {
    val signal = CancellationSignal().also(attempt::attach)
    BiometricPrompt.Builder(activity)
        .setTitle("Unlock JALVORO Personal")
        .setSubtitle("Use biometrics or your Android screen lock")
        .setAllowedAuthenticators(
            BiometricManager.Authenticators.BIOMETRIC_STRONG or
                BiometricManager.Authenticators.DEVICE_CREDENTIAL,
        )
        .build()
        .authenticate(signal, activity.mainExecutor, nativeAuthenticationCallback(attempt))
}

@RequiresApi(Build.VERSION_CODES.Q)
private fun authenticateApi29(activity: ComponentActivity, attempt: NativeAuthenticationAttempt) {
    val signal = CancellationSignal().also(attempt::attach)
    BiometricPrompt.Builder(activity)
        .setTitle("Unlock JALVORO Personal")
        .setSubtitle("Use biometrics or your Android screen lock")
        .setDeviceCredentialAllowed(true)
        .build()
        .authenticate(signal, activity.mainExecutor, nativeAuthenticationCallback(attempt))
}

@RequiresApi(Build.VERSION_CODES.P)
private fun authenticateApi28(
    activity: ComponentActivity,
    attempt: NativeAuthenticationAttempt,
    onCredentialFallback: () -> Unit,
) {
    val fallbackRequested = AtomicBoolean(false)
    val signal = CancellationSignal().also(attempt::attach)
    BiometricPrompt.Builder(activity)
        .setTitle("Unlock JALVORO Personal")
        .setSubtitle("Verify your identity to continue")
        .setNegativeButton("Use device screen lock", activity.mainExecutor) { _, _ ->
            fallbackRequested.set(true)
            onCredentialFallback()
        }
        .build()
        .authenticate(
            signal,
            activity.mainExecutor,
            object : BiometricPrompt.AuthenticationCallback() {
                override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) {
                    attempt.succeed()
                }

                override fun onAuthenticationError(errorCode: Int, errString: CharSequence) {
                    if (!fallbackRequested.get()) attempt.fail(authenticationErrorMessage(errorCode, errString))
                }
            },
        )
}

@RequiresApi(Build.VERSION_CODES.P)
private fun hasEnrolledFingerprintApi28(activity: ComponentActivity): Boolean {
    val manager = activity.getSystemService(FingerprintManager::class.java)
    return manager?.isHardwareDetected == true && manager.hasEnrolledFingerprints()
}

@RequiresApi(Build.VERSION_CODES.P)
private fun nativeAuthenticationCallback(
    attempt: NativeAuthenticationAttempt,
): BiometricPrompt.AuthenticationCallback = object : BiometricPrompt.AuthenticationCallback() {
    override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) {
        attempt.succeed()
    }

    override fun onAuthenticationError(errorCode: Int, errString: CharSequence) {
        attempt.fail(authenticationErrorMessage(errorCode, errString))
    }
}

@RequiresApi(Build.VERSION_CODES.P)
private fun authenticationErrorMessage(errorCode: Int, errString: CharSequence): String = when (errorCode) {
    BiometricPrompt.BIOMETRIC_ERROR_CANCELED,
    BiometricPrompt.BIOMETRIC_ERROR_USER_CANCELED ->
        "Unlock cancelled. Your finance data remains locked."
    BiometricPrompt.BIOMETRIC_ERROR_LOCKOUT,
    BiometricPrompt.BIOMETRIC_ERROR_LOCKOUT_PERMANENT ->
        "Too many unsuccessful attempts. Use your Android screen lock or try again later."
    BiometricPrompt.BIOMETRIC_ERROR_HW_UNAVAILABLE,
    BiometricPrompt.BIOMETRIC_ERROR_TIMEOUT ->
        "Device authentication is temporarily unavailable. Try again or use your screen lock."
    BiometricPrompt.BIOMETRIC_ERROR_NO_BIOMETRICS ->
        "No biometric is enrolled. Use your Android PIN, pattern or password."
    else -> errString.toString().takeIf { it.isNotBlank() } ?: "Identity verification failed."
}

private fun Context.findComponentActivity(): ComponentActivity? {
    var current: Context? = this
    while (current is ContextWrapper) {
        if (current is ComponentActivity) return current
        current = current.baseContext
    }
    return current as? ComponentActivity
}
