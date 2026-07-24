# JALVORO Website ↔ Native Finance Parity Contract

## Purpose

JALVORO Personal treats financial results as a cross-platform product contract, not as duplicated UI logic. The website and Android app must produce the same canonical result for the same validated input before a release can be accepted.

## Canonical fixture

The versioned fixture lives at:

`contracts/finance-parity/v1.json`

It is intentionally deterministic. It uses a fixed civil date, fixed exchange rates, controlled transaction rows and explicit expected values. Live market responses and the current clock are excluded from this gate so the result cannot change between runs.

## Contract v1 coverage

The first certified contract covers:

- month-to-date and same-period-previous-month ranges;
- income totals;
- expenses with refunds subtracted;
- net savings and savings rate;
- investment cost, current value, profit/loss and profit/loss percentage;
- USD-pivot currency conversion;
- bounded goal progress, completion and remaining value;
- payable progress and the completed → overdue → partial → pending display priority.

This does not claim that every future JALVORO calculation is automatically covered. New business rules must extend the fixture and both platform tests before release.

## Website authority

The website suite is:

`lib/finance-parity-contract.test.ts`

It calls production functions from analytics, currency, investments and planning. It does not reimplement the formulas inside the test.

Run locally with:

```bash
npm run test:parity
```

## Native authority

The Android host suite is:

`native/shared/src/androidHostTest/kotlin/com/jamalsfinance/shared/parity/FinanceParityFixtureTest.kt`

It reads the same JSON fixture and calls production Kotlin functions from analytics, investments, goals and payables.

Run locally from `native/` with:

```bash
gradle :shared:testAndroidHostTest
```

## Pull request gate

`.github/workflows/finance-parity-pr-ci.yml` runs the website and native suites in one draft-safe pull-request workflow.

A parity failure is a release blocker. The expected resolution is to identify the authoritative business rule, update production logic safely, extend the canonical fixture when needed, and make both implementations pass. Tests must not be weakened merely to make a mismatch disappear.

## Change workflow

Whenever a website or app change introduces a new financial rule:

1. Define the input and expected output in a new or extended versioned fixture.
2. Update the shared/backend contract where practical.
3. Update the website implementation.
4. Update the native implementation.
5. Run both parity suites.
6. Keep the PR draft until the combined parity gate and platform quality gates pass.

## Integrity boundaries

- UI animations never change calculated values.
- Formatting and currency display happen after canonical calculations.
- Missing or invalid data must remain partial/unavailable rather than becoming a fabricated zero.
- Authentication, RLS and owner-scoped reads remain separate security gates.
- Live exchange rates and market prices require their own availability and freshness handling; deterministic fixtures test the conversion and valuation formulas, not provider uptime.
