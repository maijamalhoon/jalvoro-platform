# Payment scope for the stabilization release

Payments and subscriptions are outside this release candidate.

The launch product requirements represented by this candidate do not depend on checkout, billing-plan purchase, subscription entitlements, invoices, refunds, or a customer portal. The repository has no payment API routes, verified webhook receiver, subscription state model, or entitlement synchronization contract. Shipping the previous Stripe placeholders would therefore represent a partial and unsafe lifecycle.

For this candidate:

- Stripe runtime dependencies and environment placeholders are removed.
- No payment, subscription, checkout, renewal, refund, or customer-portal claim is approved for public launch.
- Payment UI must remain absent and payment routes must return not found because none are included.
- A future payment release requires a separately reviewed end-to-end lifecycle, signed and idempotent webhooks, test-mode evidence, entitlement tests, failure recovery, and an explicit launch decision.

Rollback is a normal revert of the focused payment-scope commit. Restoring dependency placeholders alone is not sufficient to enable payments.
