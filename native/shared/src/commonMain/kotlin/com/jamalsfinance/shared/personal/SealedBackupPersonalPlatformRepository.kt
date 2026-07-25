package com.jamalsfinance.shared.personal

import com.jamalsfinance.shared.auth.AuthRepository
import com.jamalsfinance.shared.auth.AuthSession
import com.jamalsfinance.shared.auth.AuthState
import com.jamalsfinance.shared.core.AppConfig
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.client.request.HttpRequestBuilder
import io.ktor.client.request.bearerAuth
import io.ktor.client.request.header
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.client.statement.HttpResponse
import io.ktor.client.statement.bodyAsText
import io.ktor.http.ContentType
import io.ktor.http.HttpHeaders
import io.ktor.http.isSuccess
import io.ktor.serialization.kotlinx.json.json
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.intOrNull
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.put

/**
 * Preserves the server-issued JALVORO v2 HMAC seal end-to-end.
 *
 * The legacy repository augmented exports on-device after the server returned them. That was safe
 * for v1, but any semantic mutation of a v2 payload invalidates its HMAC. Client preferences are
 * therefore supplied to the export RPC before the server signs the payload, and the returned JSON
 * is written without adding or changing fields.
 */
class SealedBackupPersonalPlatformRepository(
    baseClient: HttpClient,
    private val config: AppConfig,
    private val authRepository: AuthRepository,
    private val delegate: PersonalPlatformRepository,
) : PersonalPlatformRepository by delegate {
    private val json = defaultPersonalJson()
    private val prettyJson = defaultPersonalJson(pretty = true)
    private val client = baseClient.config {
        expectSuccess = false
        install(ContentNegotiation) { json(json) }
    }

    override suspend fun exportBackup(
        clientPreferences: PersonalClientPreferences,
    ): BackupExportResult = runCatching {
        val session = requireSession()
        val snapshot = currentSnapshot()
        val response = client.post(
            "${config.normalizedSupabaseUrl}/rest/v1/rpc/export_finance_backup",
        ) {
            authenticated(session)
            setBody(buildJsonObject {
                put("p_client_snapshot", buildJsonObject {
                    put("currency", snapshot?.profile?.preferredCurrency ?: "PKR")
                    put("dateFormat", clientPreferences.dateFormat)
                    put("compactMode", clientPreferences.compactMode)
                    put("themeMode", clientPreferences.themeMode)
                })
            })
        }
        response.requireSuccess("Backup could not be prepared.")

        val payload = response.body<JsonElement>().jsonObject
        val raw = prettyJson.encodeToString(JsonElement.serializer(), payload)
        val validation = validateSealedBackupPayload(raw, json)
        if (validation is BackupValidationResult.Invalid) {
            throw SealedBackupException(validation.message)
        }
        val valid = validation as BackupValidationResult.Valid
        val date = snapshot?.todayKey ?: "backup"
        BackupExportResult.Success(
            fileName = "jalvoro-personal-backup-$date.jfinance",
            contents = raw,
            recordCount = valid.recordCount,
        )
    }.getOrElse { BackupExportResult.Failure(it.safeMessage()) }

    override suspend fun importBackup(rawBackup: String): BackupImportResult {
        val validation = validateSealedBackupPayload(rawBackup, json)
        if (validation is BackupValidationResult.Invalid) {
            return BackupImportResult.Failure(validation.message)
        }
        val valid = validation as BackupValidationResult.Valid

        return runCatching {
            val session = requireSession()
            val response = client.post(
                "${config.normalizedSupabaseUrl}/rest/v1/rpc/import_finance_backup",
            ) {
                authenticated(session)
                setBody(buildJsonObject { put("p_backup", valid.payload) })
            }
            response.requireSuccess("Finance backup could not be imported.")
            val result = response.body<JsonElement>().jsonObject
            val parsed = BackupImportResult.Success(
                alreadyImported = result["alreadyImported"]?.jsonPrimitive?.content == "true",
                totalAdded = result["totalAdded"]?.jsonPrimitive?.content?.toIntOrNull() ?: 0,
                added = (result["added"] as? JsonObject)?.intMap().orEmpty(),
                skipped = (result["skipped"] as? JsonObject)?.intMap().orEmpty(),
            )
            currentSnapshot()?.todayKey?.let { delegate.refresh(it, force = true) }
            parsed
        }.getOrElse { BackupImportResult.Failure(it.safeMessage()) }
    }

    private fun currentSnapshot(): PersonalPlatformSnapshot? = when (val value = delegate.state.value) {
        is PersonalPlatformState.Ready -> value.snapshot
        is PersonalPlatformState.Loading -> value.previous
        is PersonalPlatformState.Failure -> value.previous
        PersonalPlatformState.Idle -> null
    }

    private fun requireSession(): AuthSession =
        (authRepository.state.value as? AuthState.SignedIn)?.session
            ?: throw SealedBackupException("Your session expired. Please sign in again.")

    private fun HttpRequestBuilder.authenticated(session: AuthSession) {
        header("apikey", config.supabasePublishableKey)
        bearerAuth(session.accessToken)
        header(HttpHeaders.Accept, ContentType.Application.Json)
        header(HttpHeaders.ContentType, ContentType.Application.Json)
    }

    private suspend fun HttpResponse.requireSuccess(fallback: String) {
        if (status.isSuccess()) return
        val raw = bodyAsText()
        val message = runCatching {
            val payload = json.parseToJsonElement(raw).jsonObject
            payload["message"].stringOrNull()
                ?: payload["msg"].stringOrNull()
                ?: payload["error_description"].stringOrNull()
                ?: payload["hint"].stringOrNull()
        }.getOrNull()
        throw SealedBackupException(message?.take(300) ?: fallback)
    }

    private fun Throwable.safeMessage(): String = when (this) {
        is SealedBackupException -> message.orEmpty().ifBlank {
            "A secure finance backup request could not be completed."
        }
        else -> message?.takeIf(String::isNotBlank)?.take(300)
            ?: "A secure connection could not be completed."
    }
}

internal fun validateSealedBackupPayload(
    raw: String,
    json: Json = defaultPersonalJson(),
): BackupValidationResult {
    val byteSize = raw.encodeToByteArray().size
    if (byteSize <= 0) return BackupValidationResult.Invalid("This backup file is empty.")
    if (byteSize > MAX_FINANCE_BACKUP_BYTES) {
        return BackupValidationResult.Invalid("This backup is too large to import safely.")
    }

    val payload = runCatching { json.parseToJsonElement(raw).jsonObject }.getOrNull()
        ?: return BackupValidationResult.Invalid("This backup file is invalid or damaged.")

    if (payload["format"]?.jsonPrimitive?.contentOrNull != "jalvoro-finance-backup") {
        return BackupValidationResult.Invalid("This is not a sealed JALVORO backup file.")
    }
    if (payload["version"]?.jsonPrimitive?.intOrNull != 2) {
        return BackupValidationResult.Invalid(
            "This backup version is not supported. Export a new JALVORO backup.",
        )
    }

    val uuidPattern = Regex(
        "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$",
    )
    val backupId = payload["backupId"]?.jsonPrimitive?.contentOrNull
    if (backupId == null || !uuidPattern.matches(backupId)) {
        return BackupValidationResult.Invalid("This backup file has an invalid identity.")
    }
    if (payload["exportedAt"]?.jsonPrimitive?.contentOrNull.isNullOrBlank()) {
        return BackupValidationResult.Invalid("This backup file has an invalid export date.")
    }
    val ownerId = runCatching {
        payload["source"]?.jsonObject?.get("ownerId")?.jsonPrimitive?.contentOrNull
    }.getOrNull()
    if (ownerId == null || !uuidPattern.matches(ownerId)) {
        return BackupValidationResult.Invalid("This backup file has an invalid owner identity.")
    }

    val data = payload["data"] as? JsonObject
        ?: return BackupValidationResult.Invalid("This backup file does not contain finance data.")
    val requiredSections = listOf(
        "accounts",
        "categories",
        "investments",
        "goals",
        "liabilities",
        "goalContributions",
        "transactions",
        "accountTransfers",
        "liabilityPayments",
        "investmentWithdrawals",
    )
    val sectionCounts = linkedMapOf<String, Int>()
    var total = 0
    requiredSections.forEach { section ->
        val records = runCatching { data.getValue(section).jsonArray }.getOrNull()
            ?: return BackupValidationResult.Invalid("The $section section in this backup is invalid.")
        sectionCounts[section] = records.size
        total += records.size
        if (total > MAX_FINANCE_BACKUP_RECORDS) {
            return BackupValidationResult.Invalid("This backup contains too many records.")
        }
    }

    val manifest = payload["manifest"] as? JsonObject
        ?: return BackupValidationResult.Invalid(
            "This backup file is missing its sealed integrity summary.",
        )
    val recordCounts = manifest["recordCounts"] as? JsonObject
        ?: return BackupValidationResult.Invalid(
            "This backup file is missing its sealed integrity summary.",
        )
    sectionCounts.forEach { (section, actual) ->
        val expected = recordCounts[section]?.jsonPrimitive?.intOrNull
        if (expected == null || expected != actual) {
            return BackupValidationResult.Invalid(
                "The $section section did not pass the backup integrity check.",
            )
        }
    }
    if (manifest["totalRecords"]?.jsonPrimitive?.intOrNull != total) {
        return BackupValidationResult.Invalid(
            "This backup file did not pass the complete-data integrity check.",
        )
    }

    val seal = payload["seal"] as? JsonObject
        ?: return BackupValidationResult.Invalid("This backup file is not sealed by JALVORO.")
    if (
        seal["issuer"]?.jsonPrimitive?.contentOrNull != "JALVORO" ||
        seal["algorithm"]?.jsonPrimitive?.contentOrNull != "HMAC-SHA256"
    ) {
        return BackupValidationResult.Invalid("This backup file has an unsupported security seal.")
    }
    val keyVersion = seal["keyVersion"]?.jsonPrimitive?.intOrNull
    if (keyVersion == null || keyVersion < 1) {
        return BackupValidationResult.Invalid("This backup file has an invalid security key version.")
    }
    val signature = seal["signature"]?.jsonPrimitive?.contentOrNull
    if (signature == null || !Regex("^[0-9a-fA-F]{64}$").matches(signature)) {
        return BackupValidationResult.Invalid("This backup file has an invalid security signature.")
    }

    return BackupValidationResult.Valid(payload, total)
}

private class SealedBackupException(message: String) : Exception(message)
