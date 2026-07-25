package com.jamalsfinance.shared.personal

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertIs
import kotlin.test.assertTrue

class SealedBackupPersonalPlatformRepositoryTest {
    private val validBackup = """
        {
          "format": "jalvoro-finance-backup",
          "version": 2,
          "backupId": "11111111-1111-1111-1111-111111111111",
          "exportedAt": "2026-07-25T08:00:00Z",
          "source": {
            "ownerId": "22222222-2222-2222-2222-222222222222",
            "app": "jalvoro"
          },
          "data": {
            "accounts": [{"id":"1"}],
            "categories": [],
            "investments": [],
            "goals": [],
            "liabilities": [],
            "goalContributions": [],
            "transactions": [{"id":"2"}],
            "accountTransfers": [],
            "liabilityPayments": [],
            "investmentWithdrawals": []
          },
          "manifest": {
            "totalRecords": 2,
            "recordCounts": {
              "accounts": 1,
              "categories": 0,
              "investments": 0,
              "goals": 0,
              "liabilities": 0,
              "goalContributions": 0,
              "transactions": 1,
              "accountTransfers": 0,
              "liabilityPayments": 0,
              "investmentWithdrawals": 0
            }
          },
          "seal": {
            "issuer": "JALVORO",
            "algorithm": "HMAC-SHA256",
            "keyVersion": 1,
            "signature": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
          }
        }
    """.trimIndent()

    @Test
    fun acceptsCompleteSealedV2Payload() {
        val valid = assertIs<BackupValidationResult.Valid>(
            validateSealedBackupPayload(validBackup),
        )
        assertEquals(2, valid.recordCount)
    }

    @Test
    fun rejectsManifestDriftBeforeNetworkImport() {
        val invalid = assertIs<BackupValidationResult.Invalid>(
            validateSealedBackupPayload(validBackup.replace("\"totalRecords\": 2", "\"totalRecords\": 3")),
        )
        assertTrue(invalid.message.contains("complete-data integrity"))
    }

    @Test
    fun rejectsLegacyOrUnsealedPayloads() {
        val legacy = assertIs<BackupValidationResult.Invalid>(
            validateSealedBackupPayload(
                validBackup
                    .replace("\"jalvoro-finance-backup\"", "\"jamals-finance-backup\"")
                    .replace("\"version\": 2", "\"version\": 1"),
            ),
        )
        assertTrue(legacy.message.contains("sealed JALVORO"))

        val unsealed = assertIs<BackupValidationResult.Invalid>(
            validateSealedBackupPayload(validBackup.replace(Regex(",\n  \"seal\": \\{[\\s\\S]*?\\n  \\}"), "")),
        )
        assertTrue(unsealed.message.contains("sealed by JALVORO") || unsealed.message.contains("invalid"))
    }
}
