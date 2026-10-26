package com.jamalsfinance.nativeapp.ui

import android.app.KeyguardManager
import android.content.Context
import com.jamalsfinance.shared.personal.PersonalClientPreferences
import com.jamalsfinance.shared.privacy.PrivacyLockSettings
import com.jamalsfinance.shared.privacy.PrivacyLockTimeout
import com.jamalsfinance.shared.privacy.shouldRequirePrivacyUnlock
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.asStateFlow

enum class NativeThemeMode(val storageValue: String) {
    System("system"),
    Light("light"),
    Dark("dark");

    companion object {
        fun fromStorage(value: String?): NativeThemeMode =
            entries.firstOrNull { it.storageValue == value } ?: System
    }
}

enum class NativeMotionMode(val storageValue: String) {
    Standard("standard"),
    Fast("fast"),
    None("none");

    companion object {
        fun fromStorage(value: String?): NativeMotionMode =
            entries.firstOrNull { it.storageValue == value } ?: Standard
    }
}

enum class NativeDateFormat(val storageValue: String, val sample: String) {
    MonthFirst("MMM d, yyyy", "Jul 23, 2026"),
    DayFirst("dd MMM yyyy", "23 Jul 2026"),
    Iso("yyyy-MM-dd", "2026-07-23");

    companion object {
        fun fromStorage(value: String?): NativeDateFormat =
            entries.firstOrNull { it.storageValue == value } ?: MonthFirst
    }
}

data class NativeLocalPreferences(
    val themeMode: NativeThemeMode = NativeThemeMode.System,
    val motionMode: NativeMotionMode = NativeMotionMode.Standard,
    val dateFormat: NativeDateFormat = NativeDateFormat.MonthFirst,
    val compactMode: Boolean = false,
    val highContrast: Boolean = false,
    val appLockEnabled: Boolean = false,
    val autoLockTimeout: PrivacyLockTimeout = PrivacyLockTimeout.Immediate,
    val blockScreenshots: Boolean = true,
)

class AndroidNativePreferences(context: Context) {
    private val appContext = context.applicationContext
    private val storage = appContext.getSharedPreferences(
        "jamals-finance-native-preferences",
        Context.MODE_PRIVATE,
    )
    private val mutableState = MutableStateFlow(read())
    private val mutableLockRequests = MutableSharedFlow<Unit>(extraBufferCapacity = 1)

    val state: StateFlow<NativeLocalPreferences> = mutableState.asStateFlow()
    val lockRequests: SharedFlow<Unit> = mutableLockRequests.asSharedFlow()

    val deviceSecurityAvailable: Boolean
        get() = (appContext.getSystemService(Context.KEYGUARD_SERVICE) as? KeyguardManager)
            ?.isDeviceSecure == true

    fun setThemeMode(value: NativeThemeMode) {
        storage.edit().putString(KEY_THEME, value.storageValue).apply()
        mutableState.value = mutableState.value.copy(themeMode = value)
    }

    fun setMotionMode(value: NativeMotionMode) {
        storage.edit().putString(KEY_MOTION, value.storageValue).apply()
        mutableState.value = mutableState.value.copy(motionMode = value)
    }

    fun setDateFormat(value: NativeDateFormat) {
        storage.edit().putString(KEY_DATE_FORMAT, value.storageValue).apply()
        mutableState.value = mutableState.value.copy(dateFormat = value)
    }

    fun setCompactMode(value: Boolean) {
        storage.edit().putBoolean(KEY_COMPACT, value).apply()
        mutableState.value = mutableState.value.copy(compactMode = value)
    }

    fun setHighContrast(value: Boolean) {
        storage.edit().putBoolean(KEY_HIGH_CONTRAST, value).apply()
        mutableState.value = mutableState.value.copy(highContrast = value)
    }

    fun resetAccessibilityDisplay() {
        storage.edit()
            .putString(KEY_THEME, NativeThemeMode.System.storageValue)
            .putString(KEY_MOTION, NativeMotionMode.Standard.storageValue)
            .putBoolean(KEY_COMPACT, false)
            .putBoolean(KEY_HIGH_CONTRAST, false)
            .apply()
        mutableState.value = mutableState.value.copy(
            themeMode = NativeThemeMode.System,
            motionMode = NativeMotionMode.Standard,
            compactMode = false,
            highContrast = false,
        )
    }

    fun setAppLockEnabled(value: Boolean) {
        storage.edit().putBoolean(KEY_APP_LOCK, value).apply()
        mutableState.value = mutableState.value.copy(appLockEnabled = value)
        if (value) requestLockNow() else clearBackgroundTimestamp()
    }

    fun setAutoLockTimeout(value: PrivacyLockTimeout) {
        storage.edit().putString(KEY_AUTO_LOCK_TIMEOUT, value.storageValue).apply()
        mutableState.value = mutableState.value.copy(autoLockTimeout = value)
    }

    fun setBlockScreenshots(value: Boolean) {
        storage.edit().putBoolean(KEY_BLOCK_SCREENSHOTS, value).apply()
        mutableState.value = mutableState.value.copy(blockScreenshots = value)
    }

    fun markBackgrounded(nowMillis: Long = System.currentTimeMillis()) {
        storage.edit().putLong(KEY_LAST_BACKGROUNDED_AT, nowMillis).apply()
    }

    fun clearBackgroundTimestamp() {
        storage.edit().remove(KEY_LAST_BACKGROUNDED_AT).apply()
    }

    fun shouldLockOnResume(nowMillis: Long = System.currentTimeMillis()): Boolean =
        shouldRequirePrivacyUnlock(
            settings = PrivacyLockSettings(
                enabled = state.value.appLockEnabled,
                timeout = state.value.autoLockTimeout,
            ),
            lastBackgroundAtMillis = storage.takeIf {
                it.contains(KEY_LAST_BACKGROUNDED_AT)
            }?.getLong(KEY_LAST_BACKGROUNDED_AT, 0L),
            nowMillis = nowMillis,
        )

    fun requestLockNow() {
        mutableLockRequests.tryEmit(Unit)
    }

    fun clientPreferences(): PersonalClientPreferences = state.value.let {
        PersonalClientPreferences(
            dateFormat = it.dateFormat.storageValue,
            compactMode = it.compactMode,
            themeMode = it.themeMode.storageValue,
        )
    }

    private fun read(): NativeLocalPreferences = NativeLocalPreferences(
        themeMode = NativeThemeMode.fromStorage(storage.getString(KEY_THEME, null)),
        motionMode = NativeMotionMode.fromStorage(storage.getString(KEY_MOTION, null)),
        dateFormat = NativeDateFormat.fromStorage(storage.getString(KEY_DATE_FORMAT, null)),
        compactMode = storage.getBoolean(KEY_COMPACT, false),
        highContrast = storage.getBoolean(KEY_HIGH_CONTRAST, false),
        appLockEnabled = storage.getBoolean(KEY_APP_LOCK, false),
        autoLockTimeout = PrivacyLockTimeout.fromStorage(
            storage.getString(KEY_AUTO_LOCK_TIMEOUT, null),
        ),
        blockScreenshots = storage.getBoolean(KEY_BLOCK_SCREENSHOTS, true),
    )

    private companion object {
        const val KEY_THEME = "theme-mode"
        const val KEY_MOTION = "motion-mode"
        const val KEY_DATE_FORMAT = "date-format"
        const val KEY_COMPACT = "compact-mode"
        const val KEY_HIGH_CONTRAST = "high-contrast"
        const val KEY_APP_LOCK = "app-lock-enabled"
        const val KEY_AUTO_LOCK_TIMEOUT = "auto-lock-timeout"
        const val KEY_BLOCK_SCREENSHOTS = "block-screenshots"
        const val KEY_LAST_BACKGROUNDED_AT = "last-backgrounded-at"
    }
}
