# Jalvoro Production Readiness Audit

## Status

- Audit date: 2026-08-02 (Asia/Karachi)
- Repository: `maijamalhoon/jalvoro-platform`
- Product baseline audited: `origin/main@404a8576e3ab52045f11542772ff6efaffeb0fe4` (`Rebuild Command Center as an immersive operating system (#202)`)
- Superseded incorrect baseline: `52f236e999901a8af1b675e890dd866f4cbb001a`, 29 commits and 42 files behind the product baseline
- Audit branch: `audit/deep-production-readiness-20260802`
- Audit worktree: dedicated isolated worktree; local absolute path intentionally omitted
- Branch relation at repair: merge-base exactly `404a8576e3ab52045f11542772ff6efaffeb0fe4`; audit branch 7 documentation commits ahead and 0 product commits behind
- Launch recommendation: **DO NOT LAUNCH**
- Audit mode: read-mostly; no deployment, production write, migration, PR mutation, merge, or implementation
- P0: 0; P1: 7; P2: 6; P3: 1

The required root `AGENTS.md`, `docs/codex/REQUIREMENTS.md`, and original document templates are tracked on the audit branch in seven documentation commits based on current `origin/main`; they are not product-baseline changes. `AGENTS.md` and `REQUIREMENTS.md` remained unchanged during this repair.

## Baseline Repair and Intervening-Change Review

The old audit checkout was not a valid production baseline. All 29 commits and the aggregate 42-file diff (`+6,029/-1,471`) from `52f236e9…` through `404a8576…` were reviewed before evidence was reused. The changed files were confined to Command Center/control-plane auth and UI, User 360, privacy-minimised telemetry, AI Insights presentation, CSP/proxy configuration, `supabase/config.toml`, focused tests, and two main-project migrations.

The old command durations, build result, control-login behavior, migration/config inventory, and commit-relative conclusions were invalidated and replaced. Transaction history, calculation, investment, dependency-manifest, and ordinary Individual/Business auth evidence was retained only after proving those paths were absent from the intervening diff; relevant automated checks were also rerun. Browser, Supabase, GitHub, Vercel, and Sentry-availability evidence was refreshed on the exact current baseline.

## Audit Rules

- Evidence is labeled `PASS`, `FAIL`, `PARTIAL`, `BLOCKED`, `NOT_RUN`, `UNVERIFIED`, or `UNKNOWN`.
- Live Supabase access was SELECT/read-only. No user rows are reproduced in this document.
- GitHub and Vercel access was read-only. No review, comment, branch, deployment, or environment was changed.
- Existing behavior was traced before proposing changes. No calculation or application behavior was modified.
- P0 means active/easy unauthorized access, secret exposure, irreversible loss, severe corruption, or outage. P1 is substantial launch risk. P2 is meaningful but contained. P3 is low-risk cleanup.
- Confidence is `Confirmed`, `High`, `Medium`, or `Low` and reflects evidence quality, not severity.

## Executive Summary

Jalvoro builds and its local unit/type/lint/Edge-function checks are strong. Public pages rendered without horizontal overflow at all 12 required viewports, public axe scans found no violations, live RLS inspection found no public/private table with RLS disabled and data privileges for `anon` or `authenticated`, and the control-plane database correctly enforces AAL2 with recent password and TOTP authentication.

Those positives do not make the system production-ready. All 21 current gateway-operation targets remain directly executable by `authenticated`, and a broader reviewed query finds 31 directly executable privileged candidates without body-level AAL2 checks; the old categorical count of 27 is superseded. Both production Supabase projects are on the Free Plan, the dependency-policy remediation is exact-head green only in unmerged draft PR #206, the local E2E harness fails before Docker because tracked `supabase/config.toml` collides with its temporary-config strategy, no authoritative Jalvoro Vercel project is inspectable, and repository/live migration ledgers are not one-to-one. Full authenticated and tenant-isolation journeys were not executed because no safe test identities or isolated database were available.

### Five Highest Confirmed Risks

1. `FINDING-001`: all 21 current gateway targets and 31 broader privileged candidates remain directly callable from the main project without equivalent AAL2 enforcement.
2. `FINDING-002`: both production databases use a Free Plan with no managed daily backups, no leaked-password protection, and inactivity pausing.
3. `FINDING-003`: the mandatory dependency audit gate is repaired and exact-head green in draft PR #206, but `main` remains unfixed until explicit approval and merge.
4. `FINDING-004`: no inspectable Jalvoro Vercel production target, build logs, environment inventory, or rollback candidate could be proven.
5. `FINDING-005`: migration ledgers, checkout, remote `main`, and live schema history are not deployment-safe as a single verified candidate.

### Current Blockers

- Revoke or service-gate the legacy main-project Command Center RPC surface and prove AAL1 rejection.
- Move both Supabase projects to a production-suitable plan, enable leaked-password protection, establish backups, and complete a restore drill including Storage objects.
- Approve and merge exact-head-green PLAN-002 draft PR #206 without changing its verified three-file scope.
- Merge-order correction: `PLAN-002` remains the prerequisite merge, then `PLAN-001`; the RPC fix may be prepared as a stack on the green PLAN-002 head but is not merge-ready while that prerequisite is unmerged.
- Identify and inspect the actual Jalvoro Vercel production project, environment names, deployment SHA, runtime errors, and rollback target.
- Reconcile Supabase migration history before any `db push` or production migration.
- Run isolated multi-user, multi-tenant, MFA, backup/restore, long-list, failure, and capacity verification.

### Scope Not Verified

- Authenticated Individual, Business, POS, and Command Center browser journeys: `NOT_RUN` (no safe test identities).
- Cross-tenant negative tests and live RLS mutation tests: `NOT_RUN` (no isolated database or authorized test data).
- Local Supabase SQL/pgtap: `BLOCKED` (Docker/local runtime unavailable); `npm run test:e2e` additionally fails before Docker because tracked `supabase/config.toml` collides with the harness.
- Production Vercel environment variables, build logs, runtime logs, analytics, cache behavior, and rollback: `BLOCKED` (connected team does not expose Jalvoro).
- Sentry issue/event health: `BLOCKED` (`SENTRY_AUTH_TOKEN`, org, and project are not set).
- Production load tests, long-session memory, real-network Web Vitals, zoom/text-resize manual review, screen-reader output, and Android modal keyboard behavior: `NOT_RUN`.
- Storage-object restore and deletion retention: `UNVERIFIED`; database backups do not include Storage object bytes.

## Repository and Architecture Inventory

| Area | Evidence |
| --- | --- |
| Web | Next.js 16.2.11 App Router, React 19.2.4, TypeScript, Node 24.x |
| Data/Auth | Supabase JS 2.108.1, SSR 0.12.0, main and isolated control-plane projects |
| Monitoring | Sentry 10.60.0 with default PII disabled, request fields stripped, 10% production traces; live Sentry state unavailable |
| Other providers | Stripe, Anthropic, market/exchange-rate providers, Vercel |
| Native | Android/native tree and native CI assets are present |
| Scale | Current repository inventory reviewed at `404a8576…`; the intervening diff contains 42 changed files |
| Database source | 254 main SQL migrations, 5 control-plane migrations, 8 SQL test files, and tracked `supabase/config.toml` |
| Live database | Main: Postgres 17.6.1.127, 42,429,587 bytes, 125 public/40 private tables; Control: Postgres 17.6.1.147, 11,922,579 bytes, 4 private tables |

### Runtime Boundaries and Data Flow

1. Browser/server Supabase clients use the public URL/key and cookie-backed sessions.
2. Middleware verifies claims/user, realm, redirects, rate limits, content type, request size, and AI-route origin.
3. Tenant-scoped tables use RLS and server functions. Live catalog inspection found zero public/private tables that were both RLS-disabled and data-accessible to `anon`/`authenticated`.
4. Command Center server RPC calls are intercepted by `lib/admin/command-center-client.ts`, which requires matching main/control identities and control AAL2, then invokes `command-center-gateway`.
5. The Edge gateway validates both JWTs and invokes a main-project service-role dispatcher. This secure path is undermined by the still-callable legacy main-project RPC path in `FINDING-001`.
6. Business documents use staged prepare/upload/finalize operations, metadata validation, and signed URLs. Avatar ownership is enforced with Storage policies.
7. Realtime publication includes `public.business_notifications` and related state tables in the main project; the control project publishes none.

## Baseline Results

| Command / check | Result | Duration | Notes |
| --- | --- | ---: | --- |
| `npm ci --silent` via exact npm 11.9.0 | `PASS` | 141.58 s | Canonical install completed with no repository side effect. |
| `npm ls --depth=0` | `PASS` | 5.61 s | Expected direct dependencies present; optional WASM packages appeared extraneous. |
| `npm run audit:ci` | `FAIL` | 10.41 s | Temporary advisory exception expired on 2026-08-01. |
| `npm audit --omit=dev --audit-level=critical` | `PASS` | 4.88 s | 0 production vulnerabilities. |
| `npm audit` | `FAIL` | 4.37 s | 1 high dev-only `brace-expansion <1.1.17`, GHSA-mh99-v99m-4gvg; fix available. |
| `npm run lint` | `PASS` | 202.92 s | No lint errors. |
| `npm run typecheck` | `PASS` | 107.87 s | No TypeScript errors. |
| `npm run check:brand` | `PASS` | 3.77 s | Brand artifacts consistent. |
| `npm test` | `PASS` | 39.91 s | 117 files, 827 tests; Vitest reported 29.28 s. |
| Focused security/calculation/Command Center tests | `PASS` | 8.15 s | 11 files, 51 tests. |
| CI-equivalent placeholder-configured production build | `PASS` | 212.79 s | 35 static pages; compile 110 s, TypeScript 60 s. |
| Four Deno 2.8.1 `--no-lock` checks | `PASS` | 22.81 s total | 8.12 s, 4.48 s, 5.47 s, and 4.74 s; no lockfile written. |
| `npm run test:e2e` | `FAIL` | 16.17 s | Tracked `supabase/config.toml` exists and the harness refuses to replace it; failure occurs before Docker. |
| Local Supabase SQL/pgtap | `BLOCKED` | — | Docker/local Supabase unavailable. |
| Git worktree baseline | `PASS` | — | Dedicated audit branch is based exactly on current `origin/main`; only the five audit documents are intended changes. |

### Findings Changed by the 29 Intervening Commits

| Area | Corrected conclusion |
| --- | --- |
| Control authentication | Improved: isolated `/admin` session, AAL2/recent-auth checks, active-operator validation, main-admin resolution, and service-role dispatch are now the intended path. |
| Privileged authorization | Worsened/expanded: the new User 360 RPC is a directly executable security-definer endpoint; current evidence is 21/21 gateway targets plus 31 broader privileged candidates, replacing the old count of 27. |
| Migration/release checks | Still failing: two migrations and tracked `supabase/config.toml` were added; live timestamps diverge and the config breaks the E2E harness before Docker. |
| Accessibility | Existing install-dialog focus escape remains, and new authenticated Command Center dialog surfaces need dynamic trap/return verification. |
| Telemetry/privacy | Privacy-minimised telemetry is enabled by default and focused contracts pass; authenticated production behavior and retention remain `UNVERIFIED`. |
| AI/calculations/investments | AI Insights presentation changed, but calculation, transaction-history, and investment-identity paths did not; their earlier findings remain applicable and focused tests pass. |
| Dependencies | `package.json` and `package-lock.json` did not change; the expired gate and development advisory remain. |

## Critical User Journey Matrix

| ID | Journey | Result | Evidence / limitation |
| --- | --- | --- | --- |
| J-001 | First visit → understand product → choose experience | `PARTIAL` | Landing and `/start` rendered and navigated locally; anchor navigation scrolled to `#capabilities`; install modal interrupts first Windows visit after 900 ms. |
| J-002 | Individual sign-up/login/callback → dashboard | `PARTIAL` | Form validation and unauthenticated redirects verified; successful identity flow `NOT_RUN`. |
| J-003 | Add/edit/delete transaction → history/search/filter/receipt | `PARTIAL` | Code/RPC/tests/live stats traced; successful authenticated UI and large-history behavior `NOT_RUN`. |
| J-004 | Accounts/goals/liabilities/investments → totals and analytics | `PARTIAL` | Calculations and tests traced; representative authenticated outcomes and multi-currency reconciliation `NOT_RUN`. |
| J-005 | Business creation/invitation → tenant workspace | `PARTIAL` | Realm/membership/RLS and RPC code traced; cross-tenant positive/negative browser tests `NOT_RUN`. |
| J-006 | Business sales/purchases/inventory/payroll/POS | `PARTIAL` | Functions, migrations, Edge typechecks, and policy shape traced; end-to-end ledger posting/refund/approval `NOT_RUN`. |
| J-007 | AI consent → context → insight/history | `PARTIAL` | origin/rate/size checks and consent/data shaping traced; provider failure/privacy/retention behavior `NOT_RUN`. |
| J-008 | Command Center login/MFA → privileged action | `FAIL` | Control path enforces recent AAL2, but direct main RPCs bypass it (`FINDING-001`). |
| J-009 | Backup/export/import → recovery | `FAIL` | App-level finance export exists, but platform is Free Plan and no platform/Storage restore drill exists. |
| J-010 | Deploy → monitor → rollback | `BLOCKED` | Jalvoro Vercel project inaccessible; known hosts 404; Sentry API credentials absent. |

## Business Logic and Calculation Inventory

- Currency supports PKR, USD, INR, EUR, GBP, JPY, and CNY. `convertMoney` pivots through USD; transaction entry preserves original amount/currency/rate and stores PKR normalization. Non-PKR mutations fail closed when a rate is unavailable.
- Rates use bounded external requests, an hourly cache, and validated fallbacks. Client arithmetic uses JavaScript numbers; database money columns are numeric. No production discrepancy was measured.
- Analytics uses explicit date bounds, stable sorting/tie breakers, refund-aware math, and largest-remainder percentage allocation. Existing tests passed.
- Dashboard reads are consolidated or date-bounded where possible and include loading/empty/error fallbacks.
- Transaction history deliberately includes soft-deleted transactions/transfers, but returns an unbounded set and performs client filtering/sorting/pagination (`FINDING-006`).
- Investment lots are weighted for buy price, but group by normalized display name before stable market identifiers and reuse the first live quote (`FINDING-009`).

### Golden Test Candidates

- Cross-currency create/edit/refund/delete with locked rate and exact PKR ledger reconciliation.
- Date boundaries at UTC/local midnight, leap day, month end, DST-observing locale, and inclusive report bounds.
- Tied percentage/ranking rows and deterministic largest-remainder allocation.
- Two assets with the same display name but different symbols/asset IDs and conflicting live-price timestamps.
- Soft-deleted transactions/transfers across cursor pages with stable `(updated_at, created_at, id)` ordering.
- Concurrent duplicate request keys for sale, purchase, return, payroll, POS, backup import, and privileged actions.

## Security, Supabase, and Data Review

### Confirmed Positive Controls

- Live catalog: zero exposed public/private tables with RLS disabled; 328 policies in main, 4 in control at refresh time.
- The 13 policyless main tables deny `anon`/`authenticated`; POS tables are service-role-only and private backup tables have no client data privileges.
- Control-plane `require_recent_control_plane_authentication()` requires JWT `aal2`, password authentication within 12 hours, and TOTP within 20 minutes.
- Session redirects are internal-path sanitized; AI routes validate origin/content-type/size and are rate limited.
- Security-definer functions generally pin `search_path`; auth metadata is not used as the sole source of authorization.
- Sentry removes user, request cookies/data/headers/query/URL, extra data, sensitive keys, credentials, and emails; replay is disabled.

### Live Advisor and Capacity Snapshot

| Project | Security advisors | Performance advisors | Database size | Connections | Edge functions |
| --- | ---: | ---: | ---: | ---: | --- |
| `jalvoro-production` | 28 (15 WARN, 13 INFO) | 397 INFO | 42.43 MB / 500 MB Free limit | 12 / 60; 1 active; 0 idle-in-transaction | 4 active |
| `jalvoro-command-centre` | 12 WARN | 7 INFO | 11.92 MB / 500 MB Free limit | 12 / 60; 1 active; 0 idle-in-transaction | 1 active |

Main security advisors comprise 14 authenticated security-definer functions plus leaked-password protection disabled; 13 policyless-table INFO items were validated as deny-by-default. Control advisors comprise 11 intended authenticated security-definer entries that call the recent-AAL2 guard plus leaked-password protection disabled. Main performance advisors include 44 unindexed POS foreign keys and 353 unused indexes; because most affected tables are empty/new, unused indexes must not be removed without a representative observation window.

### Query and Index Evidence

- `pg_stat_statements` is installed. The live main database is only 42.43 MB; `transactions` is the largest application table at 1.11 MB with about 651 live rows.
- `get_dashboard_payload` recorded 144 calls, 83.88 ms mean, 12.08 s total.
- `load_ledger_history` variants recorded 33–167 calls, 17.23–33.97 ms mean. The private implementation is 3,886 characters and contains no `LIMIT`, `OFFSET`, or `ORDER BY`; the planner exposes it as a 1,000-row function scan.
- Transaction/account-transfer indexes cover user/date/activity paths, but substring search remains application-side and the UI repeatedly reloads the full filtered history.
- Main Realtime recorded 1,294 change-poll calls at 6.56 ms mean in the earlier query-stat snapshot. The refreshed 24-hour API/auth/storage/realtime/Edge log arrays were empty; each project returned 11 Postgres entries, all severity `LOG` (checkpoints plus a client connection reset), with no WARNING/ERROR/FATAL/PANIC severity.
- Main has 44 missing FK-covering-index advisories, all in POS tables: branch settings 6, sale requests 6, security events 6, approval requests 5, cash adjustments 5, operation requests 4, refund payouts 4, devices 3, sessions 3, staff credentials 2.

## Frontend Performance and Reliability Baseline

- Local production landing metrics (unthrottled loopback): TTFB 13 ms, FCP 200 ms, LCP 200 ms on the H1, CLS 0, INP unavailable. These are local diagnostics, not production SLO evidence.
- Build output contains 163 JavaScript chunks totaling 6,559,815 bytes raw and 16 CSS chunks totaling 1,220,962 bytes raw; largest raw JS chunk is 427,491 bytes. Route-attributed compressed transfer cost is `UNVERIFIED`.
- No page or console errors were observed on the checked local production routes.
- Event-listener/timer samples examined generally clean up listeners/timers. The install modal restores body overflow and removes Escape listeners, but backward focus escapes to background navigation. New authenticated Command Center palette/mobile-sheet trapping and focus restoration remain `UNVERIFIED`.
- Search timers are cleared, yet transaction navigation performs full server reloads after a 350 ms debounce and has no cursor/cancellation contract beyond framework navigation.
- Long-session heap growth and thousands-user load were `NOT_RUN`.

## Responsive and Accessibility Matrix

Landing page results; all had `scrollWidth <= innerWidth`:

| Viewport | Scroll height | Result |
| --- | ---: | --- |
| 320×568 | 6,410 | PASS |
| 360×800 | 6,210 | PASS |
| 375×667 | 6,192 | PASS |
| 390×844 | 6,171 | PASS |
| 412×915 | 6,116 | PASS |
| 768×1024 | 4,954 | PASS |
| 820×1180 | 4,981 | PASS |
| 1024×768 | 4,916 | PASS |
| 1280×720 | 3,959 | PASS |
| 1366×768 | 4,112 | PASS |
| 1440×900 | 4,314 | PASS |
| 1920×1080 | 4,437 | PASS |

`/start`, unauthenticated `/admin`, and `/control-login` (which redirects to `/admin`) were checked at 390, 768, and 1440 widths without horizontal overflow. Axe 4.12.1 at 390×844 found zero deterministic violations on `/`, `/start`, and `/admin`; gradient/pseudo-element contrast and role-less `aria-label` containers remain manual-review items (`FINDING-014`). The Windows install modal focused its first action, handled Escape, and restored scroll, but `Shift+Tab` escaped to the background Dashboard link while `aria-modal=true` (`FINDING-008`).

Screenshots were ephemeral local evidence and were not committed; no absolute local path is recorded.

## GitHub, Deployment, Dependencies, and Operations

- Baseline audit GitHub snapshot before PLAN-002 PR creation: 31 open PRs; 22 drafts and 9 ready/non-draft; 9 unmergeable.
- Current topology after opening exact-head-green draft PR #206: 32 open PRs; 23 drafts and 9 ready/non-draft. PR #206 is mergeable and remains draft/unmerged.
- PR #169 is the only non-Dependabot ready PR but is 176 commits/184 files (+9,594/−1,256), unmergeable, based on an old main SHA, and has zero submitted reviews. It is not a release candidate; its recorded Vercel preview no longer resolves.
- PR #100 is 242 commits/90 files and every current workflow is `action_required`; PR #164 is 78 commits/35 files and unmergeable; PR #77 is 118 commits/53 files and unmergeable.
- PRs #99 and #77 retain two and one unresolved GitHub Advanced Security CodeQL threads respectively for DOM text reinterpreted as HTML.
- PRs #108→#111→#118→#120→#124→#130→#134 are a stacked .NET chain. PRs #151→#158→#163 and #161→#162 are other stacked chains whose base order must be preserved or retired.
- The current-base #203–#205 Dependabot PRs are mergeable and reviewed-requested, but CI fails while Security Scanning passes. Older #25, #28, and #181–#183 have pre-expiry green recorded heads and need current reruns after `PLAN-002`.
- Connected Vercel team `jalvoro-platform` exposes only unrelated `pay-pulse`. `jalvoro-app.vercel.app` and `jamals-finance-sable.vercel.app` returned 404; no authoritative Jalvoro deployment was inspectable.
- No `.vercel/` linkage or `vercel.json` exists at the product baseline. A `vercel.json` appears only in the historical broad PR #169 surface.
- Both Supabase projects are healthy at inspection time but on the Free Plan. Official Supabase documentation states Free projects lack managed daily backups, leaked-password protection is Pro+, and low-activity Free projects can pause after a seven-day activity window.

## Findings Register

### FINDING-001 — Legacy main-project admin RPCs bypass dual-project AAL2

- **Status:** OPEN
- **Severity:** P1
- **Confidence:** Confirmed
- **Category:** Security / Authorization
- **Discovered:** 2026-08-02
- **Owner:** Unassigned
- **Affected journey:** J-008
- **Affected logic:** Command Center identity and privileged operations
- **Affected files:** `lib/admin/command-center-client.ts`; `lib/supabase/server.ts`; `supabase/functions/command-center-gateway/index.ts`; `supabase/migrations/20260728110549_command_center_dual_auth_gateway.sql`; `supabase/migrations/20260729223000_command_center_user_360_workspace.sql`; live main RPC catalog
- **Affected environments:** Production, Preview, Local schema

#### Summary and Evidence

The current server path is stronger than the old checkout: `/admin` uses an isolated control session, recent AAL2, active-operator checks, main-admin resolution by email, and a service-role dispatcher. The database boundary is still bypassable. Live catalog inspection shows all 21 functions targeted by the current dispatcher remain directly executable by `authenticated`, and none mentions AAL2 in its own body. A broader reviewed privileged-name/body query finds 31 directly executable candidates without body-level AAL2; this reproducible result supersedes the prior categorical count of 27. `public.get_command_center_user_360(text)`, added in the intervening commits, is itself security-definer and returns privacy-filtered identity, billing, telemetry, approximate location, and session summaries after only a main-project platform-admin lookup.

#### Reproduction or Inspection Steps

1. Enumerate the 21 current `execute_command_center_operation` targets and query live `pg_proc` privileges/body text for each.
2. Run the broader privileged-name/body catalog query and inspect the 31 candidates, public/private wrapper pairs, and `get_command_center_user_360`.
3. Compare those bodies with the control-plane `require_recent_control_plane_authentication()` AAL2 guard and the server gateway interception.

#### Expected / Actual / Cause / Impact

- **Expected:** Every privileged main operation is reachable only through the service-role dispatcher after dual identity and recent control-plane AAL2.
- **Actual:** A valid AAL1 main-project session for an existing platform admin can call legacy REST RPCs directly.
- **Technical cause:** Compatibility grants/wrappers were retained when the gateway was introduced; database authorization does not encode the new assurance boundary.
- **Impact:** Compromise of a main-project admin session can read privileged user telemetry/PII and perform owner/admin actions without the isolated control-plane proof.
- **Security/data impact:** Confidentiality and privileged-change integrity; no arbitrary non-admin exploit was proven.

#### Remediation, Risks, Tests, Verification, Rollback

- **Smallest safe fix:** On current `main`, inventory every gateway operation; grant legacy public/private admin RPC execution only to `service_role` or make public wrappers reject non-service callers, then route user-360 through the allowlisted gateway. Preserve the control-plane AAL2 checks.
- **Alternative:** Add equivalent AAL2/dual-token proof to every legacy function; rejected as duplicative and harder to audit.
- **Regression risk:** High—Command Center pages/actions can fail if any operation is omitted from the dispatcher.
- **Required tests:** anon/AAL1 rejection for all current privileged catalog candidates; AAL2 dual-session success for each allowlisted read/write; mismatched email/project rejection; disabled/expired operator rejection; audit-event assertions.
- **Verification:** Catalog grants plus REST negative tests and gateway positive tests on an isolated branch database.
- **Rollback:** Restore previous grants only behind an incident-approved access freeze; prefer reverting code routing while keeping direct RPCs closed.
- **Dependencies:** `PLAN-002` must be merged and green before this fix is represented as merge-ready. Production activation additionally requires `PLAN-003` through `PLAN-006`, including reconciled migration history and safe control/main test identities.
- **Plan / Verification / Changelog:** `PLAN-001`; `VER-001`; changelog only when implemented.

### FINDING-002 — Free-plan production tier lacks required resilience and password defense

- **Status:** OPEN
- **Severity:** P1
- **Confidence:** Confirmed
- **Category:** Operations / Security / Data
- **Discovered:** 2026-08-02
- **Owner:** Unassigned
- **Affected journey:** J-002, J-005, J-008, J-009, J-010
- **Affected logic:** Authentication, availability, backup/restore
- **Affected files:** Platform configuration; `lib/auth/pwned-passwords.server.ts`; Storage buckets
- **Affected environments:** Production

#### Summary and Evidence

The connected organization reports plan `free` for both active production projects. Both security advisors report leaked-password protection disabled. Supabase documents leaked-password protection as Pro+, managed daily backups for Pro/Team/Enterprise, Free-project inactivity pausing, and a 500 MB database limit. Current sizes are 42.43 MB and 11.92 MB, so capacity is not immediate; resilience is.

#### Reproduction or Inspection Steps

List organization/projects/advisors; query database size/connections; compare with official Supabase backup, password-security, billing, and free-project-pausing documentation.

#### Expected / Actual / Cause / Impact

- **Expected:** Production databases are non-pausing, have tested recoverable backups, protect against known breached passwords, and have explicit capacity/usage alerts.
- **Actual:** No managed daily backup/PITR, no leaked-password protection, automatic pause risk, and no Storage-object restore evidence.
- **Technical cause:** Production resources are hosted in the Free organization tier.
- **Impact:** Avoidable outage, credential-stuffing exposure, and unrecoverable database/Storage loss.
- **Security/data impact:** Account compromise and data loss; database backup alone would not restore Storage object bytes.

#### Remediation, Risks, Tests, Verification, Rollback

- **Smallest safe fix:** Upgrade the organization, enable leaked-password protection, verify daily backup retention, create encrypted off-site database and Storage exports, and perform a non-production restore drill with RPO/RTO evidence.
- **Alternative:** Scheduled CLI dumps on Free; useful interim control but does not remove pausing/SLA/password limitations.
- **Regression risk:** Low application risk; billing/configuration risk.
- **Required tests:** breached-password rejection, backup inventory, database restore, Storage restore, post-restore auth/RLS checks, inactivity/health alert.
- **Verification:** Dashboard/API plan and advisor state plus dated restore evidence.
- **Rollback:** Plan downgrade only after replacement backup/availability/password controls exist; never delete projects.
- **Dependencies:** Owner approval and billing authority; no code PR required for the plan change.
- **Plan / Verification / Changelog:** `PLAN-003`; `VER-002`; operational changelog after implementation.

### FINDING-003 — Dependency audit policy remediation is green but unmerged

- **Status:** REMEDIATED IN DRAFT PR #206 — NOT MERGED
- **Severity:** P1
- **Confidence:** Confirmed
- **Category:** Security / Supply chain / CI
- **Discovered:** 2026-08-02
- **Owner:** Unassigned
- **Affected journey:** J-010
- **Affected logic:** Release gate
- **Implemented files:** `package-lock.json`; `scripts/dependency-audit-policy.mts`; `lib/dependency-audit-policy.test.ts`
- **Unchanged files:** `package.json`; CI/security workflows; application and production dependencies
- **Affected environments:** CI, Preview, Production release

#### Summary and Evidence

The baseline `npm run audit:ci` failed because a temporary exception expired on 2026-08-01 while the full audit reported one high development-only vulnerability in `brace-expansion <1.1.17` (GHSA-mh99-v99m-4gvg); production-only audit reported zero. Draft PR #206 updates only the compatible development copy to `1.1.18`, removes the exception, and makes the policy fail closed. Local verification and exact-head CI, Dependency Review, and CodeQL are green at `947a152da1414f04b3cd6d8f0f802db225621c67`; the remediation is not yet on `main`.

#### Reproduction or Inspection Steps

Run exact npm 11.9.0 `npm audit --omit=dev`, `npm audit`, and `npm run audit:ci`; inspect failed GitHub job steps.

#### Expected / Actual / Cause / Impact

- **Expected:** Policy structurally validates npm audit v2 output, fails closed on malformed or inconsistent reports, and requires zero vulnerability findings for both full and production-only audits before CI reaches every required validation step.
- **Baseline actual:** Before remediation, the gate failed before quality/build checks on newly opened PRs.
- **Current candidate:** Draft PR #206 reaches and passes the full CI and Security Scanning workflows on exact head `947a152da1414f04b3cd6d8f0f802db225621c67`; `main` retains the baseline behavior until merge.
- **Technical cause:** Expired exception plus transitive vulnerable dev dependency/advisory-ID drift.
- **Baseline impact:** Before remediation, main-based release candidates could not obtain green CI; other candidates retain that limitation until the verified PR #206 remediation is merged to `main`.
- **Security/data impact:** Tooling-only advisory was confirmed; no production runtime vulnerability was reported.

#### Remediation, Risks, Tests, Verification, Rollback

- **Implemented smallest safe fix:** Resolve the existing compatible development dependency path to `brace-expansion@1.1.18`; add no override; leave `package.json` and production dependencies unchanged; remove the temporary exception.
- **Rejected alternative:** A renewed exception would preserve avoidable advisory exposure and is not used.
- **Regression risk:** Medium—lockfile/tooling changes can alter CI behavior.
- **Required tests:** Passed — clean install, dependency-tree validation, both audits, audit policy, 37 focused tests, lint, typecheck, 859 complete tests, brand check, four Edge typechecks with `--no-lock`, and production build.
- **Verification:** CI run `30749931181` and Security Scanning run `30749931214` succeeded on exact PR head `947a152da1414f04b3cd6d8f0f802db225621c67`; Dependency Review and CodeQL succeeded; independent review found no blocking issue.
- **Rollback:** Revert the focused lockfile/policy PR; never disable the audit job.
- **Dependencies:** None; this is the first merge prerequisite and should not be mixed with application changes.
- **Plan / Verification / Changelog:** `PLAN-002`; `VER-003`; 2026-08-02 security changelog entry.

### FINDING-004 — Jalvoro production deployment and rollback state is unavailable

- **Status:** OPEN
- **Severity:** P1
- **Confidence:** High
- **Category:** Operations / Deployment
- **Discovered:** 2026-08-02
- **Owner:** Unassigned
- **Affected journey:** J-010
- **Affected logic:** Build, environment, runtime logging, rollback
- **Affected files:** Missing `.vercel/project.json`; missing `vercel.json` at the product baseline; Vercel project configuration
- **Affected environments:** Production, Preview

#### Summary and Evidence

The connected Vercel account lists only an unrelated `pay-pulse` project. The Jalvoro project recorded by GitHub exists under `jamal-s-projects18` but returns 403 to the connector. Three known Jalvoro/legacy/preview hosts return 404. Therefore production SHA, environment-variable names/scopes, build logs, runtime errors, analytics, cache state, domain health, and rollback candidate are unproven.

#### Reproduction or Inspection Steps

List Vercel teams/projects; request Jalvoro by recorded team/project; HEAD known hostnames; inspect repository linkage/config.

#### Expected / Actual / Cause / Impact

- **Expected:** One authoritative production project maps a domain to a known Git SHA with inspectable builds, environments, health, and rollback.
- **Actual:** No live Jalvoro target is accessible or responding.
- **Technical cause:** Account/team linkage or project/domain lifecycle is undocumented and unavailable to this audit.
- **Impact:** Deployment, monitoring, cache, environment, and rollback readiness cannot be certified.
- **Security/data impact:** Environment parity and secret scoping are unknown; no secret value was read.

#### Remediation, Risks, Tests, Verification, Rollback

- **Smallest safe fix:** Restore read access/linkage, identify the authoritative project/domain, and capture project/deployment/environment-name/log/rollback evidence without redeploying.
- **Alternative:** Declare no production deployment exists and create a controlled staging project in a separately authorized task.
- **Regression risk:** None for inspection; high if project linking is changed casually.
- **Required tests:** exact-SHA preview build, protected preview smoke, production-domain health, security headers, cache rules, runtime errors, environment-name matrix, rollback dry run.
- **Verification:** Vercel project/deployment IDs and domain return 200 for the expected SHA.
- **Rollback:** No mutation in this audit; future linking/config change must snapshot previous project settings.
- **Dependencies:** Vercel access from the correct team/account.
- **Plan / Verification / Changelog:** `PLAN-005`; `VER-004`; operational changelog after implementation.

### FINDING-005 — Migration history and release target are not reconciled

- **Status:** OPEN
- **Severity:** P1
- **Confidence:** Confirmed
- **Category:** Data / Release engineering
- **Discovered:** 2026-08-02
- **Owner:** Unassigned
- **Affected journey:** J-005, J-006, J-008, J-010
- **Affected logic:** Schema deployment and rollback
- **Affected files:** `supabase/migrations/**`; `supabase/control-plane/migrations/**`; Git branch state
- **Affected environments:** Local, Preview, Production

#### Summary and Evidence

The product baseline now contains 254 main/5 control migrations while live ledgers contain 274/7, with many semantically matching migrations under different timestamps plus squashed/replaced baselines. The two latest repository migrations map by name to live entries with different versions. `supabase/config.toml` is now tracked, but the local E2E harness refuses to replace an existing file at that path and exits before Docker; no safe schema diff was available.

#### Reproduction or Inspection Steps

Compare Git SHAs/files, repository migration basenames, live `supabase_migrations.schema_migrations`, and catalog state. Do not run `db push`.

#### Expected / Actual / Cause / Impact

- **Expected:** One reviewed commit has a migration ledger that is a strict prefix of production, and a dry-run diff shows only intended forward changes.
- **Actual:** Filename versions and live versions are not one-to-one even on exact current `origin/main`; the local harness also conflicts with the newly tracked config.
- **Technical cause:** Migrations were renamed/squashed or applied from different histories while code continued moving.
- **Impact:** Naive migration tooling can attempt reapplication, fail mid-release, or obscure rollback provenance.
- **Security/data impact:** Schema drift includes privileged RPC changes; incorrect replay risks availability and integrity.

#### Remediation, Risks, Tests, Verification, Rollback

- **Smallest safe fix:** From current `main`, obtain a schema-only dump, reconcile/repair migration history in an isolated project, prove a no-op baseline, then add only forward migrations.
- **Alternative:** Establish a new production baseline after a reviewed schema freeze; higher governance cost.
- **Regression risk:** Critical if repair commands target production incorrectly.
- **Required tests:** local/branch replay from empty, existing-production dry-run, schema diff, pgtap, grants/RLS snapshot, backup/restore rehearsal.
- **Verification:** Local and remote migration lists align exactly and schema diff is expected.
- **Rollback:** Backup before any future repair; repair migration metadata only under explicit approval; forward-fix schema changes.
- **Dependencies:** Docker/CLI or an isolated Supabase branch, backup readiness, and a repaired nonconflicting E2E config strategy.
- **Plan / Verification / Changelog:** `PLAN-004`; `VER-005`; future data/operations changelog.

### FINDING-006 — Transaction history/search loads unbounded history

- **Status:** OPEN
- **Severity:** P2
- **Confidence:** Confirmed
- **Category:** Performance / Cost / Reliability
- **Discovered:** 2026-08-02
- **Owner:** Unassigned
- **Affected journey:** J-003
- **Affected logic:** History filtering, sorting, search, pagination
- **Affected files:** `lib/transactions.ts`; `components/transactions/TransactionFilters.tsx`; transactions page; `load_ledger_history` migration/function
- **Affected environments:** All

#### Summary and Evidence

The history RPC and its private implementation accept filters but no cursor, limit, offset, or server ordering. The UI loads deleted history, then filters/sorts/paginates in memory; a search change updates URL/server state after 350 ms. Live mean query time is currently 17–34 ms at only ~651 transactions, so this is a confirmed unbounded design and future capacity risk, not a present outage.

#### Reproduction or Inspection Steps

Inspect function definition and client loader; query `pg_stat_statements`; generate a large isolated tenant and type searches quickly.

#### Expected / Actual / Cause / Impact

- **Expected:** Stable cursor pagination, bounded server search/filter/sort, cancellation, and authorization before result materialization.
- **Actual:** Each request can materialize the full matching ledger and transfer union; memory and egress grow linearly.
- **Technical cause:** Client pagination is applied after an unbounded RPC.
- **Impact:** Slow search, large server responses, browser memory growth, Free-plan egress pressure, and poor thousands-user behavior.
- **Security/data impact:** RLS/user filtering is present; no cross-user leak was found.

#### Remediation, Risks, Tests, Verification, Rollback

- **Smallest safe fix:** Add keyset cursor/limit and deterministic ordering to a versioned RPC; push search predicates server-side; preserve deleted-history semantics.
- **Alternative:** Hard maximum only; safer short-term but degrades discoverability.
- **Regression risk:** High for ordering, filters, exports, and deleted records.
- **Required tests:** golden order/filter cases, duplicate timestamps, deleted rows, transfers, cursor stability, cancellation/stale response, 10k/100k row plan/load tests.
- **Verification:** bounded rows/bytes and indexed plan with p95 target on representative data.
- **Rollback:** Keep old RPC during compatibility window; switch caller back without dropping new function/indexes.
- **Dependencies:** `PLAN-004`, `PLAN-006`; isolated scale dataset.
- **Plan / Verification / Changelog:** `PLAN-007`; `VER-006`; future performance changelog.

### FINDING-007 — Reload deletes transaction view state

- **Status:** OPEN
- **Severity:** P2
- **Confidence:** Confirmed
- **Category:** UX / Correctness
- **Discovered:** 2026-08-02
- **Owner:** Unassigned
- **Affected journey:** J-003
- **Affected logic:** Search/filter/sort deep links
- **Affected files:** `components/transactions/TransactionSearchAutoClose.tsx`
- **Affected environments:** All browsers

#### Summary and Evidence

On a browser reload, the component deletes every search/type/date/source/category/account/person/item/amount/sort/limit parameter and replaces the URL. This destroys bookmark, refresh, back/forward restoration, and support-link state.

#### Reproduction or Inspection Steps

Open `/dashboard/transactions?search=rent&sort=date_desc`, reload, and inspect lines 34–54. The unauthenticated redirect correctly preserves the original `next`, proving loss occurs only after the page component loads.

#### Expected / Actual / Cause / Impact

- **Expected:** Reload preserves an explicit URL state; only the transient open/closed search affordance resets.
- **Actual:** All transaction query state is removed.
- **Technical cause:** Reload detection conflates UI auto-close state with durable URL filters.
- **Impact:** Users lose work/context and cannot share reliable transaction views.
- **Security/data impact:** None.

#### Remediation, Risks, Tests, Verification, Rollback

- **Smallest safe fix:** Remove URL deletion; close only transient UI state.
- **Alternative:** Reset only an explicit ephemeral parameter.
- **Regression risk:** Low; auto-close behavior may change.
- **Required tests:** reload, deep link, back/forward, IME search, empty query, all filters.
- **Verification:** URL and rendered results remain stable after reload.
- **Rollback:** Revert the focused component change.
- **Dependencies:** None.
- **Plan / Verification / Changelog:** `PLAN-011`; `VER-007`; future UX changelog if used.

### FINDING-008 — Modal focus containment is incomplete

- **Status:** OPEN
- **Severity:** P2
- **Confidence:** Confirmed
- **Category:** Accessibility / UX
- **Discovered:** 2026-08-02
- **Owner:** Unassigned
- **Affected journey:** J-001, J-008
- **Affected logic:** PWA install prompt and authenticated Command Center palette/mobile sheet
- **Affected files:** `components/pwa/WindowsAppManager.tsx`; `components/pwa/AndroidAppManager.tsx`; `components/admin/AdminCommandCenterShellClient.tsx`
- **Affected environments:** Windows install confirmed; Android code-equivalent; authenticated admin runtime unverified

#### Summary and Evidence

The Windows modal focuses its first button and handles Escape/body scroll, but has no focus trap, inert background, or focus restoration. `Shift+Tab` from the first dialog action moved to the background Dashboard link while `aria-modal=true`. Android uses the same pattern. The intervening admin workspace adds a role-dialog command palette and mobile sheet with initial focus, scroll locking, and Escape handling, but static inspection did not find a complete trap, inert-background, or focus-return contract; authenticated runtime verification was unavailable.

#### Reproduction or Inspection Steps

On first Windows landing visit, wait for the prompt and test forward/reverse Tab. With a safe synthetic authenticated admin, separately exercise the Command Center palette and mobile sheet and inspect their focus/inert/return behavior.

#### Expected / Actual / Cause / Impact

- **Expected:** Focus stays inside the modal, background is inert, Escape closes, and focus returns to a logical trigger.
- **Actual:** Install-dialog keyboard users can reach dimmed background content; the new authenticated admin dialogs remain dynamically `UNVERIFIED` and require the same contract.
- **Technical cause:** Hand-rolled dialog implements only initial focus and Escape.
- **Impact:** WCAG modal failure and confusing first-run experience.
- **Security/data impact:** None.

#### Remediation, Risks, Tests, Verification, Rollback

- **Smallest safe fix:** Reuse the existing accessible dialog primitive or add tested focus trap, inert/aria-hidden background, and focus return.
- **Alternative:** Make the install prompt non-modal.
- **Regression risk:** Medium across mobile viewport/scroll behavior.
- **Required tests:** forward/reverse Tab, Escape, screen reader dialog name/description, background inertness, focus return, reduced motion, Android/Windows responsive matrix.
- **Verification:** manual keyboard plus axe; focus never leaves dialog.
- **Rollback:** Revert to current prompt; retain dismissal keys.
- **Dependencies:** None.
- **Plan / Verification / Changelog:** `PLAN-010`; `VER-008`; future accessibility changelog.

### FINDING-009 — Investment grouping can merge distinct assets and apply one live quote

- **Status:** OPEN
- **Severity:** P2
- **Confidence:** High
- **Category:** Correctness / Calculation
- **Discovered:** 2026-08-02
- **Owner:** Unassigned
- **Affected journey:** J-004
- **Affected logic:** Investment holdings, value, P/L, allocation chart
- **Affected files:** `lib/investments/aggregation.ts`; `lib/investments/aggregation.test.ts`
- **Affected environments:** All

#### Summary and Evidence

`getInvestmentGroupKey` chooses normalized display name before symbol or asset ID. Within a group, the first live-priced row supplies one current price for the combined quantity. Distinct instruments sharing a type/name can therefore merge and be valued at the first encountered quote. No test covers same-name/different-identifier lots.

#### Reproduction or Inspection Steps

Aggregate two rows with the same type/name, different symbols/asset IDs, quantities, and live prices; inspect group key and combined valuation.

#### Expected / Actual / Cause / Impact

- **Expected:** Stable provider asset ID/symbol identifies market instruments; weighted totals never mix distinct assets.
- **Actual:** Name wins identity and one quote can value all grouped quantity.
- **Technical cause:** Legacy compatibility priority and first-live-price selection.
- **Impact:** Incorrect portfolio value, P/L, and allocation; no live production mismatch was sampled.
- **Security/data impact:** Financial display correctness; stored transactions are not mutated.

#### Remediation, Risks, Tests, Verification, Rollback

- **Smallest safe fix:** Define a versioned identity precedence using asset ID/provider/symbol, migrate/alias legacy rows, and choose the freshest compatible quote.
- **Alternative:** Refuse grouping when identifiers conflict.
- **Regression risk:** High—holding identity/color/history can change.
- **Required tests:** same/different IDs, aliases, legacy missing metadata, currencies, stale/fresh quotes, deterministic order, edit/delete recalculation.
- **Verification:** golden fixtures reconcile lot-level and aggregate value exactly.
- **Rollback:** Feature-flag new grouping; retain old key mapping for display rollback.
- **Dependencies:** Golden calculation fixtures before implementation.
- **Plan / Verification / Changelog:** `PLAN-008`; `VER-009`; future correctness changelog.

### FINDING-010 — POS schema has 44 unindexed foreign keys

- **Status:** OPEN
- **Severity:** P2
- **Confidence:** Confirmed
- **Category:** Database performance
- **Discovered:** 2026-08-02
- **Owner:** Unassigned
- **Affected journey:** J-006
- **Affected logic:** POS joins, cascades, approval/security workflows
- **Affected files:** POS migrations under `supabase/migrations/**`; live main indexes
- **Affected environments:** Production

#### Summary and Evidence

The live performance advisor reports 44 FK constraints without a covering index across ten POS tables. Tables are currently empty, so no present latency was observed; the defect becomes material once POS traffic/data arrives.

#### Reproduction or Inspection Steps

Run the Supabase performance advisor and validate each FK's leading columns against `pg_index`.

#### Expected / Actual / Cause / Impact

- **Expected:** Referencing FK columns used for joins/cascades have correctly ordered indexes.
- **Actual:** 44 advisory hits.
- **Technical cause:** Large POS schema landed without the final FK index pass.
- **Impact:** Sequential scans, slow deletes/cascades, longer locks, and future approval/POS latency.
- **Security/data impact:** Availability only; service-only RLS policyless design was confirmed.

#### Remediation, Risks, Tests, Verification, Rollback

- **Smallest safe fix:** Prioritize actual query/cascade paths, remove duplicate recommendations, and add necessary indexes concurrently in small batches.
- **Alternative:** Defer indexes on never-queried audit references with documented evidence.
- **Regression risk:** Write amplification, disk use, and lock/build time.
- **Required tests:** FK cascade plans, POS read/write p95 on representative data, duplicate-index check, advisor rerun.
- **Verification:** expected index scans and advisor reduction without write regression.
- **Rollback:** Drop only newly added indexes concurrently after plan comparison.
- **Dependencies:** `PLAN-004`; POS scale fixtures.
- **Plan / Verification / Changelog:** `PLAN-009`; `VER-010`; future performance changelog.

### FINDING-011 — Open PR topology is not reviewable as a release queue

- **Status:** OPEN
- **Severity:** P1
- **Confidence:** Confirmed
- **Category:** Operations / Maintainability
- **Discovered:** 2026-08-02
- **Owner:** Unassigned
- **Affected journey:** J-010
- **Affected logic:** Review, merge ordering, release certification
- **Affected files:** GitHub pull requests and branches
- **Affected environments:** CI, Preview, Production release

#### Summary and Evidence

There are currently 32 open PRs: 23 drafts and 9 non-drafts. The added PR #206 is the focused, exact-head-green PLAN-002 draft. The only non-Dependabot ready PR remains unmergeable and unreviewed at 176 commits/184 files. Multiple long stacked chains target other feature branches, and #99/#77 retain unresolved CodeQL threads. The original baseline audit made no PR mutations; the subsequent PLAN-002 work opened only draft PR #206.

#### Reproduction or Inspection Steps

Search open PRs; fetch each PR metadata, changed filenames, head-SHA workflow runs, review submissions, discussion comments, and review threads.

#### Expected / Actual / Cause / Impact

- **Expected:** Small current PRs target a known base, have current CI/review, and express dependency order.
- **Actual:** Large overlapping/stale/conflicting changes obscure what is safe or current.
- **Technical cause:** Parallel branches accumulated without closure/retarget/rebase governance.
- **Impact:** Review fatigue, accidental duplicate changes, insecure merge order, and no trustworthy release candidate.
- **Security/data impact:** Unresolved CodeQL findings and security/migration changes are mixed with huge surfaces.

#### Remediation, Risks, Tests, Verification, Rollback

- **Smallest safe fix:** In a separate owner-led triage, classify each PR as current/stacked/superseded/conflicting; close/retarget/rebase only after explicit review; replace broad release PRs with small current-main PRs.
- **Alternative:** Archive all non-current drafts after exporting dependency notes; higher coordination risk.
- **Regression risk:** Losing unmerged work or breaking stack bases.
- **Required tests:** Current head CI per retained PR; CodeQL resolution; changed-file review; stack dependency validation.
- **Verification:** No unowned unmergeable release PR; each retained PR has reviewer, base, dependency, and current CI.
- **Rollback:** Reopen incorrectly closed PRs or restore branch refs; no action during this audit.
- **Dependencies:** `PLAN-002` for a functioning CI gate.
- **Plan / Verification / Changelog:** `PLAN-013`; `VER-011`; no changelog for triage alone.

### FINDING-012 — Authenticated, tenant-isolation, recovery, and load verification is incomplete

- **Status:** OPEN
- **Severity:** P1
- **Confidence:** Confirmed
- **Category:** Verification / Reliability
- **Discovered:** 2026-08-02
- **Owner:** Unassigned
- **Affected journey:** J-002 through J-010
- **Affected logic:** Critical flows and non-functional release gates
- **Affected files:** `tests/**`; `supabase/tests/**`; E2E harness; environment/runbooks
- **Affected environments:** Local, Staging, Production

#### Summary and Evidence

Unit/static/build checks pass, but `npm run test:e2e` now fails deterministically before Docker because tracked `supabase/config.toml` collides with the harness's temporary-config path. Docker/local Supabase is also unavailable, no safe test identities were supplied, production writes are prohibited, the Jalvoro Vercel project is unavailable, and Sentry API credentials are absent. Therefore cross-tenant denials, full signup/MFA/invitation/POS/payment flows, restore, long-session memory, screen readers, and realistic load are unproven.

#### Reproduction or Inspection Steps

Run `npm run test:e2e` and observe the explicit existing-config refusal; inspect Docker/runtimes/credentials; map each journey to executed evidence.

#### Expected / Actual / Cause / Impact

- **Expected:** A release candidate has repeatable isolated E2E, RLS, failure, restore, performance, responsive, and accessibility evidence.
- **Actual:** Large portions remain `NOT_RUN`/`BLOCKED`.
- **Technical cause:** A newly tracked config conflicts with the E2E harness design, compounded by missing isolated infrastructure, identities, platform access, and non-functional harnesses.
- **Impact:** High-risk defects can pass unit/build gates and appear only after launch.
- **Security/data impact:** Tenant isolation and privileged negative cases are not dynamically proven.

#### Remediation, Risks, Tests, Verification, Rollback

- **Smallest safe fix:** Repair the harness to preserve tracked `supabase/config.toml` while using a nonconflicting temporary config, provision an isolated Supabase branch/local stack and synthetic identities, restore Vercel/Sentry read access, then execute the matrix in `VERIFICATION.md` without production mutation.
- **Alternative:** Manual staging-only checklist; less repeatable and insufficient alone.
- **Regression risk:** Test fixtures can leak or target production if guardrails are weak.
- **Required tests:** All cases in `VERIFICATION.md`, including destructive-target assertions and synthetic-only data.
- **Verification:** Every critical case is PASS or explicitly accepted with owner/date.
- **Rollback:** Delete only verified temporary branch resources after evidence export; never use production credentials.
- **Dependencies:** Correct access and `PLAN-004` migration-safe branch.
- **Plan / Verification / Changelog:** `PLAN-005`, `PLAN-006`; `VER-012`; future test/operations changelog.

### FINDING-013 — First-visit install prompt interrupts the public journey

- **Status:** OPEN
- **Severity:** P2
- **Confidence:** Confirmed
- **Category:** UX
- **Discovered:** 2026-08-02
- **Owner:** Unassigned
- **Affected journey:** J-001
- **Affected logic:** Acquisition/onboarding
- **Affected files:** `components/pwa/WindowsAppManager.tsx`; `components/pwa/AndroidAppManager.tsx`
- **Affected environments:** Windows, Android

#### Summary and Evidence

The Windows modal opens automatically 900 ms after a first public visit and covers/dims the landing experience; Android opens after 650 ms. This was visually reproduced at tablet/desktop sizes. The modal is dismissible and remembers dismissal.

#### Reproduction or Inspection Steps

Clear prompt local-storage flags, open landing on a matching platform, and wait one second.

#### Expected / Actual / Cause / Impact

- **Expected:** Visitors first understand the product or explicitly request installation.
- **Actual:** A blocking install request interrupts reading almost immediately.
- **Technical cause:** Time-based auto-open independent of intent/engagement.
- **Impact:** Conversion, trust, and accessibility friction.
- **Security/data impact:** None.

#### Remediation, Risks, Tests, Verification, Rollback

- **Smallest safe fix:** Trigger from an explicit install action or a documented engagement threshold, preserving browser install capabilities.
- **Alternative:** Non-modal banner.
- **Regression risk:** Lower install conversion.
- **Required tests:** first/repeat visit, dismissal/version upgrade, mobile/desktop, standalone mode, missing install event.
- **Verification:** No automatic blocking before engagement; install remains discoverable.
- **Rollback:** Restore timer behavior behind a feature flag.
- **Dependencies:** Coordinate with `PLAN-010`.
- **Plan / Verification / Changelog:** `PLAN-010`; `VER-013`; future UX changelog.

### FINDING-014 — Two role-less containers use prohibited aria-label semantics

- **Status:** OPEN
- **Severity:** P3
- **Confidence:** Confirmed
- **Category:** Accessibility
- **Discovered:** 2026-08-02
- **Owner:** Unassigned
- **Affected journey:** J-001, J-008
- **Affected logic:** Public proof/trust content semantics
- **Affected files:** landing hero proof container; `/admin` control-plane trust-list container
- **Affected environments:** All

#### Summary and Evidence

Axe marked `aria-prohibited-attr` incomplete on `.jf-hero-proof` and the `/admin` control-plane trust list because plain `div` elements carry `aria-label` without a compatible semantic role. No automated violation was emitted; manual semantics are ambiguous.

#### Reproduction or Inspection Steps

Run axe on `/` and unauthenticated `/admin` at 390×844 and inspect the labeled elements.

#### Expected / Actual / Cause / Impact

- **Expected:** Semantic list/group/region markup with an accessible name where needed.
- **Actual:** Role-less labeled containers may not expose the intended name.
- **Technical cause:** ARIA label added without native semantics/role.
- **Impact:** Minor screen-reader ambiguity.
- **Security/data impact:** None.

#### Remediation, Risks, Tests, Verification, Rollback

- **Smallest safe fix:** Use native list/section markup or add the precise supported role; remove redundant label if visible text suffices.
- **Alternative:** `aria-labelledby` to a visible heading.
- **Regression risk:** Low.
- **Required tests:** axe and screen-reader name/structure review.
- **Verification:** No prohibited-ARIA incomplete result and sensible accessibility tree.
- **Rollback:** Revert semantic-only change.
- **Dependencies:** None.
- **Plan / Verification / Changelog:** `PLAN-012`; `VER-014`; future accessibility changelog.

## Findings Summary Table

| ID | Severity | Confidence | Title | Release blocking |
| --- | --- | --- | --- | --- |
| FINDING-001 | P1 | Confirmed | Legacy admin RPC dual-auth bypass | Yes |
| FINDING-002 | P1 | Confirmed | Free-plan resilience/password gap | Yes |
| FINDING-003 | P1 | Confirmed | Dependency audit gate remediation exact-head green but unmerged | Yes, until merge |
| FINDING-004 | P1 | High | Vercel production/rollback unavailable | Yes |
| FINDING-005 | P1 | Confirmed | Migration/release target drift | Yes |
| FINDING-006 | P2 | Confirmed | Unbounded transaction history | Before scale |
| FINDING-007 | P2 | Confirmed | Reload deletes transaction state | No |
| FINDING-008 | P2 | Confirmed | Modal focus escapes | Before launch |
| FINDING-009 | P2 | High | Investment identity/quote aggregation | Before calculation changes/scale |
| FINDING-010 | P2 | Confirmed | 44 POS FK indexes missing | Before POS launch |
| FINDING-011 | P1 | Confirmed | Unreviewable PR topology | Yes |
| FINDING-012 | P1 | Confirmed | Critical dynamic verification gap | Yes |
| FINDING-013 | P2 | Confirmed | Interruptive install prompt | No |
| FINDING-014 | P3 | Confirmed | Prohibited ARIA labeling | No |

## Audit Completion Checklist

- [x] Superseded checkout, exact product baseline, audit branch, and isolated-worktree state recorded.
- [x] Architecture, clients, auth, privileged paths, calculations, database, storage, realtime, indexes, and query stats inspected.
- [x] Safe lint/type/test/build/audit/Edge checks run and timed.
- [x] Required 12-viewport landing matrix and representative public routes checked.
- [x] All 32 open PR metadata/head classifications refreshed; earlier detailed conclusions retained only for unchanged heads and focused draft PR #206 recorded separately.
- [x] Live Supabase projects/advisors/catalog/stats/logs inspected read-only.
- [x] Vercel and Sentry access limitations recorded.
- [x] Findings contain evidence, cause, impact, smallest fix, risks, tests, verification, and rollback.
- [x] No production mutation, deployment, migration, merge, or secret exposure; the only later GitHub mutation is focused draft PR #206 and its evidence update.
