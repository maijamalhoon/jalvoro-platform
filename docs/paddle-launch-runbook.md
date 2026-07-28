# JALVORO Paddle Launch Runbook

This runbook controls payment activation for Personal Finance and isolated Business workspaces. It does not authorize Business or Enterprise data for AI processing.

## Non-negotiable launch rules

- Keep `BILLING_CHECKOUT_ENABLED=false` until every sandbox and operational gate passes.
- Keep `BILLING_TRIAL_ENABLED=false` until the reviewed billing migrations are applied in the target environment.
- Never store card numbers, CVV, bank credentials, raw webhook bodies, Paddle portal URLs, or free-text adjustment reasons.
- A browser may select a plan and billing cycle, but it never supplies a trusted amount, Paddle price ID, billing account ID, or user ID.
- Subscription access changes only after a verified Paddle subscription or transaction lifecycle event.
- Refund, credit, and chargeback records never change subscription access directly.
- Enterprise remains contract/invoice based and is excluded from self-service checkout.

## Provider account prerequisites

Complete these in Paddle sandbox before any production activation:

1. Complete the Paddle business and identity verification process.
2. Add and approve the JALVORO checkout domain/payment link.
3. Create the Personal Finance and Business products below.
4. Create monthly and annual recurring prices for every self-service plan.
5. Add approved country-specific price overrides matching JALVORO regional policy.
6. Create an API key with only the permissions required for transactions and customer portal sessions.
7. Create a client-side token for Paddle checkout.
8. Create a notification destination for the Supabase `paddle-webhook` Edge Function.
9. Copy the notification destination secret into the Edge Function secret store as `PADDLE_WEBHOOK_SECRET`.
10. Keep sandbox and production credentials completely separate.

## Product and price catalog

### Personal Finance

| Product | Monthly environment | Annual environment | Notes |
|---|---|---|---|
| Go | `PADDLE_PRICE_GO_MONTHLY` | `PADDLE_PRICE_GO_ANNUAL` | Self-service |
| Student | `PADDLE_PRICE_STUDENT_MONTHLY` | `PADDLE_PRICE_STUDENT_ANNUAL` | Current verified-student status required |
| Plus | `PADDLE_PRICE_PLUS_MONTHLY` | `PADDLE_PRICE_PLUS_ANNUAL` | Self-service |
| Pro | `PADDLE_PRICE_PRO_MONTHLY` | `PADDLE_PRICE_PRO_ANNUAL` | Paid catalog exists, but the public CTA starts the separate no-card trial first |

Free has no Paddle price. The 14-day Pro trial is internal, manually started, card-free, and cannot auto-charge.

### Business

| Product | Monthly environment | Annual environment | Notes |
|---|---|---|---|
| Solo | `PADDLE_PRICE_SOLO_MONTHLY` | `PADDLE_PRICE_SOLO_ANNUAL` | Self-service |
| Starter | `PADDLE_PRICE_STARTER_MONTHLY` | `PADDLE_PRICE_STARTER_ANNUAL` | Self-service |
| Growth | `PADDLE_PRICE_GROWTH_MONTHLY` | `PADDLE_PRICE_GROWTH_ANNUAL` | Self-service; separate internal trial supported |
| Scale | `PADDLE_PRICE_SCALE_MONTHLY` | `PADDLE_PRICE_SCALE_ANNUAL` | Self-service |

Business Free has no Paddle price. Enterprise uses a reviewed contract and invoice process.

Every one of the 16 price IDs must be a unique `pri_...` reference. JALVORO's launch-readiness validator blocks checkout when a price is missing, malformed, or duplicated.

## Required application configuration

### Vercel server environment

- `BILLING_CHECKOUT_ENABLED=false`
- `BILLING_TRIAL_ENABLED=false`
- `NEXT_PUBLIC_PADDLE_ENV=sandbox`
- `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN`
- `PADDLE_API_KEY`
- all 16 Paddle price environment variables

### Supabase Edge Function secrets

- `PADDLE_WEBHOOK_SECRET`
- `PADDLE_WEBHOOK_TOLERANCE_SECONDS=300`

Do not prefix API keys or webhook secrets with `NEXT_PUBLIC_`.

## Notification events

Subscribe the Paddle notification destination to at least:

- `subscription.created`
- `subscription.updated`
- `subscription.activated`
- `subscription.trialing`
- `subscription.past_due`
- `subscription.paused`
- `subscription.resumed`
- `subscription.canceled`
- `transaction.completed`
- `transaction.past_due`
- `transaction.payment_failed`
- `adjustment.created`
- `adjustment.updated`

The Edge Function verifies the exact raw request body and `Paddle-Signature` before parsing JSON. Invalid, expired, malformed, or oversized requests receive non-success responses without logging the body.

## Sandbox lifecycle matrix

Run every case with both a Personal billing account and a Business billing account where applicable.

1. Start checkout and confirm the amount is produced from the server-selected Paddle price.
2. Complete the first subscription payment.
3. Replay the same webhook event and confirm it is treated as a duplicate.
4. Deliver an older event after a newer event and confirm it is ignored.
5. Complete a renewal.
6. Fail a renewal and confirm `past_due` plus the configured grace behavior.
7. Recover the failed renewal and confirm access returns to `active`.
8. Schedule cancellation and confirm access remains until the verified period end.
9. Cancel immediately and confirm the verified subscription event controls access.
10. Pause and resume a subscription.
11. Upgrade and downgrade within the same product universe.
12. Attempt a Business price on a Personal account and confirm scope rejection.
13. Attempt a Personal price on a Business account and confirm scope rejection.
14. Create a refund adjustment, update it to approved, and confirm subscription access is unchanged.
15. Create a chargeback adjustment and confirm it is flagged for operational review without an automatic access mutation.
16. Retry a previously failed webhook and confirm idempotent recovery.
17. Open the hosted customer portal and verify payment-method, invoice, and cancellation links.
18. Confirm JALVORO stores no raw webhook payload, card data, portal URL, or free-text adjustment reason.

## Refund and dispute policy

- Customer-requested refunds must be created or approved through Paddle's authorized workflow.
- The database stores only provider references, action, status, amount, currency, timestamps, account scope, and a review flag.
- Refunds and credits do not automatically cancel a subscription.
- Chargebacks and chargeback warnings are marked `requires_review=true`.
- Access changes only when a verified subscription lifecycle event instructs the system to pause, cancel, expire, or otherwise change status.
- Support must record its internal case separately from financial webhook data; do not copy sensitive customer messages into billing tables.
- Any manual goodwill credit or exceptional refund needs a recorded operator, reason category, approval, and provider reference in the future support/admin workflow.

## Activation procedure

1. Confirm the latest PR head is merged only after CI, CodeQL, currency build, and the fresh billing database contract are green.
2. Apply reviewed migrations through the controlled production deployment process.
3. Deploy `paddle-webhook` with JWT verification disabled only because Paddle uses its own verified HMAC signature.
4. Set production Edge Function secrets.
5. Set production Vercel Paddle credentials and all unique price IDs.
6. Keep `NEXT_PUBLIC_PADDLE_ENV=sandbox` and run the full sandbox matrix.
7. Switch credentials and environment to production only after Paddle approval.
8. Run one controlled low-value live purchase using an authorized operator account.
9. Verify transaction, subscription, customer portal, invoice, webhook audit, cancellation, and refund paths.
10. Enable `BILLING_TRIAL_ENABLED=true` separately when the no-card trial migration is present.
11. Enable `BILLING_CHECKOUT_ENABLED=true` only after the launch-readiness validator reports a complete configuration.

## Incident stop procedure

For any duplicate charge, incorrect price, signature failure, webhook backlog, entitlement mismatch, or suspected credential exposure:

1. Set `BILLING_CHECKOUT_ENABLED=false` immediately.
2. Do not delete provider events or subscription records.
3. Preserve normalized event IDs, hashes, timestamps, and provider references.
4. Rotate exposed Paddle API/client/webhook credentials as appropriate.
5. Keep customer access decisions tied to verified subscription state while the incident is reviewed.
6. Resolve customer money movement in Paddle; never manufacture a local-only refund state.
7. Re-run the full sandbox lifecycle and fresh-database contracts before re-enabling checkout.
