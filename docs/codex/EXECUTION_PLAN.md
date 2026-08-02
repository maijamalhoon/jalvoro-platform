# Jalvoro Production Readiness Execution Plan

## Status

- Date: 2026-08-02
- Source audit: `docs/codex/AUDIT.md`
- Product baseline: `origin/main@404a8576e3ab52045f11542772ff6efaffeb0fe4`
- Superseded incorrect baseline: `52f236e999901a8af1b675e890dd866f4cbb001a`
- Audit branch: `audit/deep-production-readiness-20260802` in a dedicated isolated worktree
- Plan state: **IN PROGRESS — PLAN-002 EXACT-HEAD GREEN IN DRAFT PR #206; NOT MERGED**
- Production deployment included: No

## Planning Principles

- Start all implementation from a freshly fetched, reviewed `main`, never from the superseded detached checkout or from the documentation branch.
- Security, unauthorized access, data loss/recovery, migration safety, and CI integrity precede product/performance work.
- One purpose per pull request; do not recreate PR #169's 184-file release surface.
- Preserve current valid calculation, tenant, soft-delete, audit, and idempotency behavior with golden tests before changing it.
- No production migration until migration history is reconciled, a backup exists, and a branch/staging rehearsal passes.
- Every PR must link one or more findings and verification cases, include a rollback, and obtain an independent reviewer.

## Entry Criteria

1. Create a clean worktree at current GitHub `main` and record exact SHA.
2. Restore access to the authoritative Jalvoro Vercel project and a read-only Sentry token, or explicitly declare staging-only work.
3. Provision an isolated Supabase branch/local stack with synthetic identities for both projects.
4. Reconcile local/live migration histories without applying production DDL.
5. Export encrypted database and Storage backups and document restore ownership.
6. Restore a passing dependency policy or record a narrowly time-bounded approved exception.
7. Assign an owner and reviewer to each retained PR; do not merge from stale broad branches.

## Immediate Stop Conditions

- A command targets a production project for migration, write, restore, reset, branch merge, or deployment.
- Migration dry-run includes any unexpected existing object or privilege change.
- A security fix requires reopening direct authenticated admin RPCs.
- Synthetic tests can reach or identify real user/tenant data.
- Backup/restore evidence is absent before a schema/configuration change.
- Calculation golden fixtures change without explicit product/accounting approval.
- CI, CodeQL, RLS negative tests, or exact-SHA build is not green.

## Ordered Workstreams

Plan identifiers are retained for stable finding references, but merge execution starts with `PLAN-002`, then `PLAN-001`. The section order below is not authorization to merge `PLAN-001` first.

### PLAN-001 — Close the legacy Command Center RPC surface

- **Findings:** `FINDING-001`
- **Severity:** P1
- **Status:** PLANNED
- **Expected files:** one new main migration; `lib/admin/command-center-client.ts`; gateway allowlist; focused SQL/Deno/application tests
- **Merge dependency:** `PLAN-002` must be merged and green before this plan is represented as merge-ready.
- **Production activation dependencies:** isolated main/control verification plus `PLAN-003`, `PLAN-004`, `PLAN-005`, and `PLAN-006`; merging source is not authorization to apply its migration or deploy it.
- **Production deployment included:** No

#### Problem and Scope

Make the service-role dispatcher the only main-project entry for every privileged Command Center operation, including user-360. Revoke `anon`/`authenticated` execution on legacy public/private admin functions or make wrappers fail for non-service callers. Do not weaken the control-plane recent-AAL2 guard.

#### Protected Behavior

- Matching dual identities and current AAL2 succeed through the gateway.
- Control operator role/permission checks, audit events, idempotency, and privacy masking remain intact.
- Ordinary Individual/Business RPCs are unaffected.

#### Test Plan and Success Criteria

- Enumerate the catalog and assert zero direct `authenticated` admin/Command Center entry points, including all 21 current gateway-operation targets and every broader privileged candidate.
- For every operation: anon, main AAL1, missing control token, mismatched email, stale TOTP, disabled operator, and insufficient role fail; valid dual session succeeds.
- User-360 masking/audit assertions pass.
- Exact lint/type/test/Edge/build suite passes.
- Rollback: revert code routing while keeping direct grants closed; forward-fix any omitted allowlist operation.

### PLAN-002 — Restore the dependency security gate

- **Findings:** `FINDING-003`
- **Severity:** P1
- **Status:** LOCALLY AND REMOTELY VERIFIED — DRAFT PR #206; NOT MERGED
- **Implemented files:** `package-lock.json`, `scripts/dependency-audit-policy.mts`, `lib/dependency-audit-policy.test.ts`; `package.json` and workflows unchanged
- **Clean branch / exact head:** `fix/dependency-security-gate-main-20260802` / `947a152da1414f04b3cd6d8f0f802db225621c67`
- **Clean commits:** `c96c642a6617ec2bfff17ca968cc953a9ff82e24`, `947a152da1414f04b3cd6d8f0f802db225621c67`
- **Remote evidence:** CI `30749931181` and Security Scanning `30749931214` succeeded on the exact head; Dependency Review and CodeQL succeeded
- **Dependencies:** None; this is the first merge prerequisite
- **Production deployment included:** No

The implementation resolves the vulnerable development-only `brace-expansion` path from `1.1.16` to `1.1.18` through its existing compatible minimatch range and removes the expired exception. It accepts only well-formed audit v2 reports with zero production and full-tree findings and fails closed on audit/process errors. Clean install, both audits, focused fail-closed tests, complete repository checks, production build, and four Deno checks passed locally; exact-head CI, Dependency Review, and CodeQL passed remotely. PR #206 remains draft and unmerged. `PLAN-001` may be prepared as a stack on this exact green head, but it is not merge-ready until PLAN-002 is explicitly approved and merged.

### PLAN-003 — Establish production-grade Supabase resilience

- **Findings:** `FINDING-002`
- **Severity:** P1
- **Status:** PLANNED
- **Expected files:** operations/runbook evidence; possibly environment-name documentation; no application change required initially
- **Dependencies:** billing/owner approval
- **Production deployment included:** Configuration change only in a separately authorized task

Upgrade the organization, enable leaked-password protection, confirm non-pausing status and daily backup retention, create encrypted off-site database plus Storage-object backups, and run a restore into a non-production project. Record RPO/RTO, custom-role password handling, Storage reconciliation, and post-restore RLS/auth checks. Do not treat app-level finance export as a platform backup.

### PLAN-004 — Reconcile migration history and freeze an exact release candidate

- **Findings:** `FINDING-005`, `FINDING-011`
- **Severity:** P1
- **Status:** PLANNED
- **Expected files:** migration reconciliation evidence and, only if necessary, metadata/baseline changes in a dedicated PR
- **Dependencies:** `PLAN-002`, `PLAN-003`, isolated database branch
- **Production deployment included:** No

From current `main`, compare local/remote migration lists and schema-only dumps for both projects. Rehearse any `migration repair` only on a disposable branch, prove an empty replay, prove a no-op existing-project baseline, and freeze one small exact-SHA candidate. Never run `db push` while versions are divergent. Rollback is restore of migration metadata/branch only; production catalog changes require forward repair.

### PLAN-005 — Restore Vercel and Sentry release observability

- **Findings:** `FINDING-004`, `FINDING-012`
- **Severity:** P1
- **Status:** PLANNED
- **Expected files:** minimal project/runbook/health configuration only after inspection
- **Dependencies:** correct Vercel team access; local read-only Sentry token
- **Production deployment included:** No

Identify the authoritative Jalvoro project/domain and current deployment SHA. Inventory environment variable **names/scopes only**, build/runtime errors, domains, cache configuration, analytics, and rollback candidates. Query unresolved Sentry production issues with PII redaction. Add missing health/runbook configuration in separate focused PRs; do not deploy as part of the audit follow-up until exact-SHA preview verification passes.

### PLAN-006 — Build the isolated critical-journey and tenant harness

- **Findings:** `FINDING-012`
- **Severity:** P1
- **Status:** PLANNED
- **Expected files:** E2E fixtures/tests and test-only configuration
- **Dependencies:** `PLAN-004`, isolated main/control projects, synthetic users
- **Production deployment included:** No

Create deterministic synthetic users for Individual, two Business tenants, POS staff, main platform admin, control owner/admin/support, disabled operator, and invitation cases. Cover signup/callback/realm, session expiry, cross-tenant denial, business posting/refunds, POS approval, AI consent/failure, Command Center MFA, backup/restore, and duplicate requests. Hard-fail if project refs or emails do not match the test allowlist.

First repair the current harness/config contract: `supabase/config.toml` is now tracked, while `scripts/run-local-e2e.mjs` refuses to replace any existing file at that path and exits before Docker. Preserve the tracked baseline config, generate isolated test configuration in a nonconflicting temporary location, and prove repository cleanliness after both success and failure.

### PLAN-007 — Add bounded transaction search/history

- **Findings:** `FINDING-006`
- **Severity:** P2
- **Status:** PLANNED
- **Expected files:** one versioned RPC migration; transaction loader/page/filter tests
- **Dependencies:** `PLAN-004`, `PLAN-006`
- **Production deployment included:** No

Protect existing order/filter/deleted semantics with fixtures, then add keyset pagination and bounded server filtering/search. Use deterministic `(updated_at, created_at, id)` or approved equivalent cursor; avoid `%LIKE%` scans at scale by selecting a reviewed search strategy. Measure 10k/100k rows, response bytes, browser heap, egress, stale response handling, and p95.

### PLAN-008 — Correct investment asset identity and valuation aggregation

- **Findings:** `FINDING-009`
- **Severity:** P2
- **Status:** PLANNED
- **Expected files:** investment aggregation, tests, optional additive identity migration
- **Dependencies:** calculation golden fixtures from `PLAN-006`
- **Production deployment included:** No

Define asset identity precedence (provider/asset ID/symbol/type), explicit legacy alias behavior, currency compatibility, and freshest-price selection. Add same-name/different-asset fixtures before implementation. Feature-flag or version the grouping key so chart colors/history can roll back without mutating transaction history.

### PLAN-009 — Index the verified POS foreign-key paths

- **Findings:** `FINDING-010`
- **Severity:** P2
- **Status:** PLANNED
- **Expected files:** small additive index migrations and plan tests
- **Dependencies:** `PLAN-004`; representative POS fixture/load data
- **Production deployment included:** No

Rank the 44 advisories by actual query/cascade paths, reject redundant indexes, and add required indexes in small concurrent batches. Capture before/after `EXPLAIN (ANALYZE, BUFFERS)` in staging, write throughput, disk use, and advisor output. Each index batch has an independent concurrent-drop rollback.

### PLAN-010 — Fix install-dialog semantics and first-visit timing

- **Findings:** `FINDING-008`, `FINDING-013`
- **Severity:** P2
- **Status:** PLANNED
- **Expected files:** Windows/Android install managers and focused accessibility tests
- **Dependencies:** None
- **Production deployment included:** No

Use the existing accessible dialog primitive or a fully tested focus/inert implementation; restore focus on close. Replace sub-second auto-open with an explicit action, engagement threshold, or non-modal banner. Verify keyboard, screen reader, reduced motion, standalone/install-event absence, safe-area layout, and the full viewport matrix.

### PLAN-011 — Preserve transaction URL state

- **Findings:** `FINDING-007`
- **Severity:** P2
- **Status:** PLANNED
- **Expected files:** `TransactionSearchAutoClose.tsx` and URL-state tests
- **Dependencies:** None; coordinate with `PLAN-007`
- **Production deployment included:** No

Remove reload-time query deletion and reset only transient open/closed UI state. Test reload, bookmark, back/forward, IME composition, every filter, and unauthenticated `next` preservation. Roll back by reverting this single component/test PR.

### PLAN-012 — Resolve low-risk public semantics

- **Findings:** `FINDING-014`
- **Severity:** P3
- **Status:** PLANNED
- **Expected files:** landing/control-login semantic markup and accessibility tests
- **Dependencies:** None
- **Production deployment included:** No

Replace role-less labeled containers with native list/section/group markup or remove redundant ARIA. Verify axe and accessibility-tree names. Keep visual CSS unchanged.

### PLAN-013 — Owner-led PR topology triage

- **Findings:** `FINDING-011`
- **Severity:** P1
- **Status:** PLANNED
- **Expected files:** None initially; GitHub governance action requires explicit owner authorization
- **Dependencies:** `PLAN-002` so retained heads can obtain current CI
- **Production deployment included:** No

Classify all 32 PRs using the table below. Preserve work before any close/retarget/rebase, resolve CodeQL threads, and replace broad branches with small current-main PRs.

## Open PR Classification Snapshot

| PRs | Classification | Required disposition |
| --- | --- | --- |
| #206 | Current-main, exact-head-green three-file PLAN-002 draft | Preserve exact head and scope; explicit approval required before merge; prerequisite for the PLAN-001 stack |
| #203–#205 | Current, mergeable Dependabot CI actions; CI audit gate failing | Retest after `PLAN-002`, review breaking action changes separately |
| #181–#183 | Mergeable dependency updates on older main | Rebase, current CI, focused review |
| #28, #25 | Mergeable dependency PRs on older main with pre-expiry green checks | Rebase and rerun after `PLAN-002`, or supersede with current focused updates |
| #169 | Obsolete/conflicting release aggregate; 176 commits/184 files, no review | Do not merge; extract only still-needed items into small current-main PRs |
| #164 | Conflicting 78-commit Command Center audit branch overlapping later main work | Compare to current main/`PLAN-001`, preserve unique work, then retire |
| #165 | Small draft mobile-sidebar fix | Rebase and verify if still reproducible; otherwise retire |
| #151→#158→#163 | Stacked experience/workspace chain | Preserve stack order; re-evaluate against current main before retargeting |
| #161→#162 plus #156 | AI design/hardening branches, parent conflict/overlap | Consolidate requirements; do not merge child without parent; replace if superseded |
| #108→#111→#118→#120→#124→#130→#134 | Long stacked .NET business-core chain | Treat as one program with explicit dependency graph; not a production release candidate |
| #100 | 242-commit/90-file native parity draft; workflows `action_required` | Split or retire; re-authorize workflows and independent review |
| #99 | Mergeable pricing draft with two unresolved CodeQL threads | Block until findings resolved and current main verified |
| #77 | Unmergeable 118-commit billing branch with unresolved CodeQL | Do not merge; extract secure billing requirements into small new PRs |
| #35 | Old unmergeable security branch with no current workflow evidence | Compare with landed hardening, extract missing tests only, then retire |
| #147, #103, #94 | Old public/business/one-line drafts | Reproduce against current main; close as superseded if behavior already landed |

## Release Order and Gates

1. Obtain explicit approval and merge exact-head-green draft PR #206 (`PLAN-002`) first; do not auto-merge it.
2. Prepare the focused `PLAN-001` source/migration change as a draft stack on PLAN-002 head `947a152da1414f04b3cd6d8f0f802db225621c67`. It must not be represented as merge-ready or retargeted to `main` until PLAN-002 is merged and the resulting diff is reverified. This merge is not production activation.
3. Complete production-tier/backup controls (`PLAN-003`) and migration reconciliation (`PLAN-004`) before any production schema or privilege action.
4. Restore deployment/observability access (`PLAN-005`) and repair/execute the isolated critical-journey harness (`PLAN-006`).
5. Only then activate `PLAN-001` through a separately authorized protected preview, staged production change, and defined monitoring window.
6. Implement bounded history (`PLAN-007`), investment correctness (`PLAN-008`), and POS indexes (`PLAN-009`) as separate PRs in their verified dependency order.
7. Complete accessibility/UX PRs (`PLAN-010` through `PLAN-012`).
8. Conduct GitHub triage (`PLAN-013`) throughout, with no broad branch merged into the release candidate.

## Pull Request Rules

- Target current `main`; branch prefix `codex/` unless owner chooses otherwise.
- Prefer fewer than 10 changed files; explain every exception.
- Include finding, protected behavior, exact checks, preview evidence, rollback, and owner.
- No secrets, production data, generated backup files, `.env` values, or service keys in commits/logs.
- Migrations are additive/forward-first, idempotency-aware, and rehearsed from empty plus existing state.
- Security/database/calculation PRs need independent review and exact-SHA evidence.

## Final Exit Criteria

- `FINDING-001` through `FINDING-005`, `FINDING-011`, and `FINDING-012` are verified or explicitly accepted by an accountable owner.
- All exact safe checks and current GitHub Actions pass.
- One exact commit is linked to one preview and one production deployment.
- Both database migration lists align; branch replay, schema diff, RLS negatives, backup, and restore pass.
- All critical journeys pass with synthetic accounts; no cross-tenant access.
- Required responsive/accessibility matrix passes, including modal focus and screen-reader review.
- Performance/capacity gates pass on representative scale with documented budgets.
- A tested rollback candidate and monitoring window are recorded before rollout.
