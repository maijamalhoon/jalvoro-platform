package com.jamalsfinance.shared.privacy

import kotlin.test.Test
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class PrivacyLockPolicyTest {
    @Test
    fun disabledLockNeverRequiresUnlock() {
        assertFalse(
            shouldRequirePrivacyUnlock(
                settings = PrivacyLockSettings(enabled = false),
                lastBackgroundAtMillis = null,
                nowMillis = 10_000L,
            ),
        )
    }

    @Test
    fun disabledLockIgnoresMalformedBackgroundTimestamp() {
        assertFalse(
            shouldRequirePrivacyUnlock(
                settings = PrivacyLockSettings(enabled = false),
                lastBackgroundAtMillis = -1L,
                nowMillis = 10_000L,
            ),
        )
    }

    @Test
    fun enabledLockRequiresUnlockAfterFreshProcessStart() {
        assertTrue(
            shouldRequirePrivacyUnlock(
                settings = PrivacyLockSettings(enabled = true),
                lastBackgroundAtMillis = null,
                nowMillis = 10_000L,
            ),
        )
    }

    @Test
    fun immediateTimeoutLocksOnResume() {
        assertTrue(
            shouldRequirePrivacyUnlock(
                settings = PrivacyLockSettings(
                    enabled = true,
                    timeout = PrivacyLockTimeout.Immediate,
                ),
                lastBackgroundAtMillis = 10_000L,
                nowMillis = 10_000L,
            ),
        )
    }

    @Test
    fun delayedTimeoutWaitsUntilBoundary() {
        val settings = PrivacyLockSettings(
            enabled = true,
            timeout = PrivacyLockTimeout.FiveMinutes,
        )

        assertFalse(
            shouldRequirePrivacyUnlock(
                settings = settings,
                lastBackgroundAtMillis = 1_000L,
                nowMillis = 300_999L,
            ),
        )
        assertTrue(
            shouldRequirePrivacyUnlock(
                settings = settings,
                lastBackgroundAtMillis = 1_000L,
                nowMillis = 301_000L,
            ),
        )
    }

    @Test
    fun negativeBackgroundTimestampLocksFailClosed() {
        assertTrue(
            shouldRequirePrivacyUnlock(
                settings = PrivacyLockSettings(
                    enabled = true,
                    timeout = PrivacyLockTimeout.ThirtyMinutes,
                ),
                lastBackgroundAtMillis = -1L,
                nowMillis = 10_000L,
            ),
        )
    }

    @Test
    fun clockRollbackLocksFailClosed() {
        assertTrue(
            shouldRequirePrivacyUnlock(
                settings = PrivacyLockSettings(
                    enabled = true,
                    timeout = PrivacyLockTimeout.ThirtyMinutes,
                ),
                lastBackgroundAtMillis = 20_000L,
                nowMillis = 10_000L,
            ),
        )
    }
}
