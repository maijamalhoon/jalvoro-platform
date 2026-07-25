# AI Insights final ecosystem audit

## Audit scope

This audit covers the JALVORO AI Insights web and native server ecosystem: consent, authentication, finance source reads, deterministic calculations, provider requests, localization, currency conversion, quality scoring, saved state, history, Scenario Lab, responsive presentation, privacy boundaries, abuse controls, and release verification.

## Release decision

**Not ready to merge or deploy yet.** The critical code changes are isolated in the stacked audit PR, but strict TypeScript, automated tests, production build, database migration execution, exact-head preview, authenticated visual QA, and runtime verification have not passed. GitHub-hosted jobs have been failing before any step executes, and Vercel is rejecting builds at the account build-rate limit.

## Critical findings fixed in this branch

### Consent and access control

- Replaced localStorage-only consent with a versioned server-side `ai_consents` ledger.
- Added acceptance, revocation, migration metadata, row-level security, and authenticated web/native consent APIs.
- Enforced active consent at the authenticated web API proxy boundary.
- Added bearer-authenticated native consent enforcement.
- Preserved the old browser consent only as a one-time migration signal; server state is authoritative.

### Source integrity

- Added one strict shared finance read model for overview, workspace, web chat, and native AI.
- Required source failures now return unavailable responses instead of fabricated zero values.
- Excluded soft-deleted transactions from overview, trust coverage, quality, and exact finance reads.
- Made payable overdue evaluation use the application date rather than an inconsistent UTC date.

### Provider use and prompt safety

- Removed automatic provider generation and provider translation from page load and refresh.
- Kept deterministic localized briefing available without an external AI call.
- Preserved exact deterministic finance calculations before provider fallback.
- Consolidated web provider chat into one hardened explicit-request handler.
- Added provider timeout, JSON response contract, output sanitization, length limits, low temperature, and safety settings.
- Moved immutable rules into the provider system instruction.
- Kept user question, category labels, summary JSON, and custom user instructions in ordinary untrusted user content.
- Kept raw transaction rows out of provider prompts.

### History, saved state, and data quality

- History snapshots are now recomputed from server workspace and quality sources; client snapshot JSON is not authoritative.
- Added PostgreSQL array-type, item-count, and byte-size constraints for snapshot payloads.
- Changed data-quality source failures from a fake low score to an explicit 503 unavailable state.
- Changed saved-insight read failures from a fake empty list to an explicit 503 unavailable state.
- Expanded snapshot retention cleanup beyond the previous narrow deletion range.

### Currency and frontend correctness

- Localized evidence now uses the canonical currency engine for all supported currencies.
- Scenario Lab converts the selected-currency monthly payment back to base PKR before calculating a payoff plan.
- Scenario input is disabled when a non-PKR conversion is unavailable instead of treating the selected-currency amount as PKR.
- Client-reported exchange-rate status is no longer presented as an independent trust authority.

### Native server hardening

- Native AI GET is deterministic and does not call the provider on screen load.
- Native provider requests require bearer authentication, active server consent, and a per-user database-backed rate limit.
- Native provider output follows the same timeout, JSON, safety, no-raw-row, and prompt-authority boundaries as web chat.
- Added a bearer-authenticated native consent API.

## Existing protections confirmed

- AI web POST endpoints already had a database-backed per-user rate limiter through `consume_api_rate_limit`; this audit preserved it rather than creating a duplicate limiter.
- AI APIs use no-store responses and authenticated Supabase clients with row-level security.
- AI Insights remains read-only and cannot move money or mutate finance records.

## Remaining blockers before global release

### Verification blockers

1. Strict TypeScript has not run successfully on the final head.
2. Vitest contracts have not run successfully on the final head.
3. Production build has not run successfully on the final head.
4. The new PostgreSQL migration has not been applied and verified in a non-production environment.
5. Exact-head Vercel preview is unavailable because of the account build-rate limit.
6. Authenticated mobile, tablet, desktop, wide-screen, light, dark, LTR, and RTL visual QA has not been completed.
7. Provider success, timeout, malformed JSON, consent revoked, rate-limit, source outage, saved-state outage, and history retention runtime cases have not been exercised against the final head.

### Native client blockers

- The native Kotlin repository still contains the old production alias instead of the canonical `jalvoro-app.vercel.app` URL.
- Native UI does not yet expose the new server consent acceptance/revocation flow.
- The native server safely denies provider-backed AI without consent, and the existing client falls back locally, but this is not a complete native consent user experience.

These native client issues must be fixed in a dedicated native change before claiming global native AI readiness.

### Medium-priority privacy and architecture debt

- Exact deterministic chat still stores the last finance question in a short-lived HTTP-only plaintext context cookie. It is not a credential and expires after 30 minutes, but it should be replaced with stateless client-supplied context or an opaque server-side context token.
- The AI page still performs several authenticated API reads. A future bootstrap endpoint could reduce duplicate consent/session/database work after correctness is proven.
- The legacy browser-consent migration assumes the previous accepted wording is materially compatible with the new consent version; legal/product review should confirm that migration policy.

## Required release gate

The stacked audit PR must remain draft until all of the following are true:

1. Migration reviewed and applied successfully in a safe environment.
2. Strict TypeScript passes.
3. AI preference, localization, currency, responsive, security, and ecosystem hardening tests pass.
4. Full production build passes.
5. Exact-head Vercel preview is READY.
6. Authenticated visual QA passes across representative devices, themes, and RTL/LTR languages.
7. Runtime tests prove deterministic load, explicit provider use, consent enforcement, revocation, rate limiting, provider fallback, source failure semantics, saved state, and server-recomputed history.
8. Native canonical URL and consent UI are completed before native global release.

No merge or production deployment should occur before this gate is satisfied.
