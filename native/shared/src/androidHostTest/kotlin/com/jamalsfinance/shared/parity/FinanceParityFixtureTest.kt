package com.jamalsfinance.shared.parity

import com.jamalsfinance.shared.goals.GoalRow
import com.jamalsfinance.shared.goals.NativeGoal
import com.jamalsfinance.shared.goals.NativePayable
import com.jamalsfinance.shared.goals.PayableRow
import com.jamalsfinance.shared.investments.AnalyticsPeriod
import com.jamalsfinance.shared.investments.AnalyticsSelection
import com.jamalsfinance.shared.investments.AnalyticsTransaction
import com.jamalsfinance.shared.investments.analyticsSelection
import com.jamalsfinance.shared.investments.calculateAnalytics
import com.jamalsfinance.shared.investments.calculateInvestmentPosition
import com.jamalsfinance.shared.investments.convertCurrency
import java.io.File
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import kotlin.math.abs
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import kotlin.test.assertTrue

class FinanceParityFixtureTest {
    private val fixture: FinanceParityFixture by lazy(::loadFixture)

    @Test
    fun contractVersionIsSupported() {
        assertEquals(1, fixture.contractVersion)
    }

    @Test
    fun nativeMonthToDateRangesMatchCanonicalContract() {
        val selection = analyticsSelection(AnalyticsPeriod.Month, fixture.today)

        assertEquals(fixture.monthRange.currentStart, selection.currentStart)
        assertEquals(fixture.monthRange.currentEnd, selection.currentEnd)
        assertEquals(fixture.monthRange.previousStart, selection.previousStart)
        assertEquals(fixture.monthRange.previousEnd, selection.previousEnd)
    }

    @Test
    fun nativeTransactionMathMatchesCanonicalContract() {
        val selection = analyticsSelection(AnalyticsPeriod.Month, fixture.today)
        val transactions = fixture.transactions.map(FixtureTransaction::toAnalyticsTransaction)
        val summary = calculateAnalytics(selection, transactions, emptyList(), emptyList())

        assertClose(fixture.transactionSummary.currentIncome, summary.totalIncome)
        assertClose(fixture.transactionSummary.currentExpenses, summary.totalExpenses)
        assertClose(fixture.transactionSummary.currentNetSavings, summary.netSavings)
        assertClose(fixture.transactionSummary.currentSavingsRate, summary.savingsRate)

        val previousSelection = AnalyticsSelection(
            period = AnalyticsPeriod.Custom,
            currentStart = fixture.monthRange.previousStart,
            currentEnd = fixture.monthRange.previousEnd,
            previousStart = fixture.monthRange.previousStart,
            previousEnd = fixture.monthRange.previousEnd,
        )
        val previous = calculateAnalytics(previousSelection, transactions, emptyList(), emptyList())

        assertClose(fixture.transactionSummary.previousIncome, previous.totalIncome)
        assertClose(fixture.transactionSummary.previousExpenses, previous.totalExpenses)
        assertClose(fixture.transactionSummary.previousNetSavings, previous.netSavings)
        assertClose(fixture.transactionSummary.previousSavingsRate, previous.savingsRate)
    }

    @Test
    fun nativeInvestmentMathMatchesCanonicalContract() {
        fixture.investments.forEach { investment ->
            val position = assertNotNull(
                calculateInvestmentPosition(
                    investment.quantity,
                    investment.purchasePrice,
                    investment.currentPrice,
                ),
            )

            assertClose(investment.expected.totalInvested, position.totalInvested)
            assertClose(investment.expected.currentValue, position.currentValue)
            assertClose(investment.expected.totalPnl, position.totalPnl)
            assertClose(investment.expected.totalPnlPct, position.totalPnlPct)
        }
    }

    @Test
    fun nativeCurrencyConversionMatchesCanonicalContract() {
        fixture.currencyConversions.forEach { conversion ->
            assertClose(
                conversion.expected,
                convertCurrency(
                    conversion.amount,
                    conversion.from,
                    conversion.to,
                    fixture.rates,
                ),
            )
        }
    }

    @Test
    fun nativeGoalProgressMatchesCanonicalContract() {
        fixture.goals.forEachIndexed { index, goal ->
            val nativeGoal = NativeGoal(
                row = GoalRow(
                    id = "fixture-goal-$index",
                    name = "Fixture goal $index",
                    targetAmount = goal.target,
                    targetAmountOriginal = goal.target,
                    currentAmount = goal.current,
                ),
                linkedAccount = null,
                contributions = emptyList(),
            )

            assertClose(goal.expected.ratio, nativeGoal.progress)
            assertClose(goal.expected.percentage, nativeGoal.progress * 100.0)
            assertClose(goal.expected.remaining, nativeGoal.remainingAmount)
            assertEquals(goal.expected.completed, nativeGoal.completed)
        }
    }

    @Test
    fun nativePayableProgressAndStatusMatchCanonicalContract() {
        fixture.payables.forEachIndexed { index, payable ->
            val nativePayable = NativePayable(
                row = PayableRow(
                    id = "fixture-payable-$index",
                    personName = "Fixture vendor $index",
                    reason = "Fixture payable",
                    originalValue = payable.total,
                    originalValueInput = payable.total,
                    paidAmount = payable.paid,
                    remainingAmount = payable.remaining,
                    dueDate = payable.dueDate,
                ),
                linkedAccount = null,
                payments = emptyList(),
            )

            assertClose(payable.expected.ratio, nativePayable.progress)
            assertClose(payable.expected.percentage, nativePayable.progress * 100.0)
            assertEquals(payable.expected.status, nativePayable.displayStatus(fixture.today))
        }
    }

    private fun loadFixture(): FinanceParityFixture {
        val configuredPath = System.getProperty("jalvoro.financeParityFixture")
            ?: error("Finance parity fixture path is not configured.")
        val file = File(configuredPath)
        assertTrue(file.isFile, "Finance parity fixture does not exist at ${file.absolutePath}")
        return Json {
            ignoreUnknownKeys = true
            explicitNulls = false
        }.decodeFromString(file.readText())
    }

    private fun assertClose(expected: Double, actual: Double?, tolerance: Double = 0.000001) {
        assertNotNull(actual)
        assertTrue(
            abs(expected - actual) <= tolerance,
            "Expected $expected but received $actual",
        )
    }
}

private fun FixtureTransaction.toAnalyticsTransaction() = AnalyticsTransaction(
    id = id,
    amount = amount,
    date = date,
    type = type,
    categoryId = categoryId,
    categoryName = categoryName,
    categoryColor = null,
    accountId = null,
    accountName = null,
    accountType = null,
    sourceName = sourceName,
    personName = null,
    itemName = itemName,
)

@Serializable
private data class FinanceParityFixture(
    val contractVersion: Int,
    val today: String,
    val rates: Map<String, Double>,
    val monthRange: FixtureMonthRange,
    val transactions: List<FixtureTransaction>,
    val transactionSummary: FixtureTransactionSummary,
    val investments: List<FixtureInvestment>,
    val currencyConversions: List<FixtureCurrencyConversion>,
    val goals: List<FixtureGoal>,
    val payables: List<FixturePayable>,
)

@Serializable
private data class FixtureMonthRange(
    val currentStart: String,
    val currentEnd: String,
    val previousStart: String,
    val previousEnd: String,
)

@Serializable
private data class FixtureTransaction(
    val id: String,
    val amount: Double,
    val date: String,
    val type: String,
    val categoryId: String,
    val categoryName: String,
    val sourceName: String? = null,
    val itemName: String? = null,
)

@Serializable
private data class FixtureTransactionSummary(
    val currentIncome: Double,
    val currentExpenses: Double,
    val currentNetSavings: Double,
    val currentSavingsRate: Double,
    val previousIncome: Double,
    val previousExpenses: Double,
    val previousNetSavings: Double,
    val previousSavingsRate: Double,
)

@Serializable
private data class FixtureInvestment(
    val quantity: Double,
    val purchasePrice: Double,
    val currentPrice: Double,
    val expected: FixtureInvestmentExpected,
)

@Serializable
private data class FixtureInvestmentExpected(
    val totalInvested: Double,
    val currentValue: Double,
    val totalPnl: Double,
    val totalPnlPct: Double,
)

@Serializable
private data class FixtureCurrencyConversion(
    val amount: Double,
    val from: String,
    val to: String,
    val expected: Double,
)

@Serializable
private data class FixtureGoal(
    val current: Double,
    val target: Double,
    val expected: FixtureGoalExpected,
)

@Serializable
private data class FixtureGoalExpected(
    val ratio: Double,
    val percentage: Double,
    val remaining: Double,
    val completed: Boolean,
)

@Serializable
private data class FixturePayable(
    val paid: Double,
    val total: Double,
    val remaining: Double,
    val dueDate: String? = null,
    val expected: FixturePayableExpected,
)

@Serializable
private data class FixturePayableExpected(
    val ratio: Double,
    val percentage: Double,
    val status: String,
)
