# JALVORO Billing and Regional Pricing

## Product universes

JALVORO billing belongs to a scoped account rather than directly to one user:

- one Personal Finance billing account per verified user identity
- one separate billing account per Business workspace
- one separate billing account per Enterprise group

Personal, Business, and Enterprise subscriptions, invoices, users, roles, and data remain isolated. AI entitlement exists only in Personal Finance. Business and Enterprise plans contain no AI entitlement.

## Personal plans

- Free
- Go
- Student
- Plus
- Pro

Personal paid plans support monthly and annual Paddle prices. The public Pro call-to-action starts the separate 14-day no-card trial first. Trial activation is manually initiated, cannot auto-charge, and is controlled independently by `BILLING_TRIAL_ENABLED`.

Student checkout requires the authenticated user's current verified-student status. The browser cannot assert student eligibility and cannot read verification evidence.

## Business plans

- Business Free
- Solo
- Starter
- Growth
- Scale
- Enterprise contract

Business Free and Enterprise are excluded from self-service card checkout. Each business nature uses a dedicated commercial system while reusing verified private accounting and permission primitives where appropriate.

## Regional pricing

JALVORO maintains five commercial pricing tiers, A through E, across the supported ISO country and territory list. Page and locale detection are preview signals only. Paddle checkout country, tax, currency, and approved country-specific overrides remain the final purchase source of truth.

Every self-service monthly and annual plan has a dedicated Paddle price environment variable. Checkout activation requires all 16 price IDs to be present, valid, and unique.

## Checkout security

Personal and Business checkout use separate authenticated endpoints.

The browser supplies only a selected plan, billing cycle, and—where required—the business workspace ID. Server code resolves:

- authenticated user
- billing account scope
- ownership or current-user authorization
- provider-neutral plan code
- Paddle price ID from server environment
- current subscription status
- Student eligibility for the Student plan

Server-created Paddle transactions contain private JALVORO scope references in `custom_data`. No access changes until a verified provider webhook updates the private subscription state.

`BILLING_CHECKOUT_ENABLED=false` remains the safe default. The centralized readiness validator blocks checkout if credentials, environment, webhook tolerance, or any price ID is incomplete, malformed, or duplicated.

## Pro trial

The Personal Pro trial:

- lasts 14 days
- is started manually by the authenticated user
- requires no card
- schedules no automatic charge
- is limited to one use per account
- returns access to Free after expiry
- has a separate `BILLING_TRIAL_ENABLED` activation flag

## Customer billing management

Existing provider subscriptions use Paddle's hosted customer portal rather than opening duplicate checkout transactions. Portal sessions are temporary and are never stored in JALVORO.

## Webhook security and lifecycle

The isolated Supabase Edge Function:

- accepts POST JSON only
- limits body size
- verifies the exact raw body with `Paddle-Signature`
- uses HMAC-SHA256 and a bounded timestamp tolerance
- supports multiple signatures during provider key rotation
- stores a SHA-256 payload hash, never the raw payload
- sends only normalized fields to service-role-only database RPCs
- treats duplicate event IDs idempotently
- ignores stale out-of-order lifecycle events
- safely retries previously failed events
- rejects Personal/Business/Enterprise price-scope mismatches

Subscription and transaction events cover activation, renewal, failure, recovery, pause, resume, cancellation, replay, and stale delivery.

The original signature and transport version is ACTIVE and negative-path tested on the existing staging project. The newer adjustment-routing version must not be deployed there until the matching adjustment migration and RPC are present in that target database.

## Refunds, credits, and chargebacks

Paddle adjustment events are stored in a separate private `billing.adjustments` table with only:

- account scope
- provider adjustment, transaction, and optional subscription references
- normalized action and status
- amount and currency
- review flag
- provider occurrence timestamp

Raw adjustment payloads and free-text reasons are never stored. Refunds, credits, and chargebacks do not directly change subscription access. Chargebacks and chargeback warnings require operational review; access changes only through verified subscription lifecycle events.

## Zero-cost database verification

The `Billing database contract` GitHub Actions workflow creates a fresh local Supabase/Postgres environment, applies the exact payment migration slice, runs rollback-only SQL contracts, and destroys the environment on every run.

The contract verifies:

- regional plan and price seeds
- Personal, Business, and Enterprise account isolation
- Personal-only AI entitlements
- Personal Pro and Business Growth trials
- Student verification states
- browser denial of private billing tables
- subscription and transaction lifecycle behavior
- refunds and chargebacks
- duplicate and stale event handling
- safe retries
- no raw payment payload or free-text adjustment storage

No paid Supabase development branch is required.

## Launch gates

Production payment activation requires:

1. Paddle business verification and approved checkout domain/payment link.
2. Sandbox and production products and prices with country-specific overrides.
3. All unique Paddle price IDs configured in Vercel and corresponding database plan rows.
4. Real webhook destination and Edge Function secret configuration.
5. Complete Paddle simulator and sandbox lifecycle testing.
6. Verified customer portal, invoice, cancellation, refund, and dispute procedures.
7. Reviewed migrations applied through the controlled production deployment process.
8. `BILLING_TRIAL_ENABLED=true` enabled separately when the trial migration is present.
9. `BILLING_CHECKOUT_ENABLED=true` enabled only after the centralized readiness validator passes.

See `docs/paddle-launch-runbook.md` for the operational catalog, event list, sandbox matrix, activation steps, and incident stop procedure.
