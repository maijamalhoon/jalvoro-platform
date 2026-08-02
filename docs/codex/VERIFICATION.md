# Jalvoro Production Readiness Verification Record

## Status

- Date: 2026-08-02 (Asia/Karachi)
- Product baseline: `origin/main@404a8576e3ab52045f11542772ff6efaffeb0fe4`
- Previous invalid baseline: `52f236e999901a8af1b675e890dd866f4cbb001a`
- Audit branch: `audit/deep-production-readiness-20260802`
- Worktree: dedicated isolated audit worktree; local absolute path intentionally omitted
- Branch relation at verification: merge-base with `origin/main` was exactly `404a8576e3ab52045f11542772ff6efaffeb0fe4`; audit branch was 7 documentation commits ahead and 0 product commits behind
- Overall result: **FAIL — RELEASE NOT VERIFIED**
- Scope: read-mostly audit verification; no production write, migration, deployment, merge, PR mutation, or implementation

`PASS` means only that the named observation passed on this exact baseline. It does not certify an authenticated journey, production deployment, restore, or scale condition that was not run.

## Baseline Repair Verification

The old baseline was 29 commits and 42 files behind current `origin/main` (`+6,029/-1,471`). Every intervening commit and aggregate changed file was inspected. The changed surface was limited to Command Center/control-plane authentication and UI, User 360, privacy-minimised telemetry, AI Insights presentation, CSP/proxy configuration, `supabase/config.toml`, tests, and two main-project migrations.

Evidence was handled as follows:

| Evidence class | Disposition |
| --- | --- |
| Old command durations, build output, control-login behavior, migration/config inventory, and commit-relative claims | Invalidated and rerun/replaced |
| Transaction history, calculations, investment aggregation, dependency manifests, and ordinary Individual/Business auth paths | Reused only after the 42-file diff proved those paths unchanged; relevant automated checks were rerun |
| Landing and `/start` responsive/accessibility evidence | Rerun on the current production build |
| Live Supabase, GitHub, Vercel, and Sentry availability evidence | Refreshed read-only |
| Authenticated Command Center, tenant, POS, restore, and production-runtime journeys | `BLOCKED` or `UNVERIFIED`; no safe identities or isolated runtime were available |

## Executed Repository Checks

Runtime: bundled Node `v24.14.0`; exact npm `11.9.0` invoked through the bundled package runner.

| Command / check | Result | Duration | Exact evidence |
| --- | --- | ---: | --- |
| `npm ci --silent` | `PASS` | 141.58 s | Canonical clean install completed; repository diff unchanged. |
| `npm ls --depth=0` | `PASS` | 5.61 s | Direct tree present; optional WASM packages reported as extraneous. |
| `npm run audit:ci` | `FAIL` | 10.41 s | Temporary development exception expired on 2026-08-01. |
| `npm audit --omit=dev --audit-level=critical` | `PASS` | 4.88 s | Zero production vulnerabilities. |
| `npm audit` | `FAIL` | 4.37 s | One high-severity development-only `brace-expansion <1.1.17` advisory; fix available. |
| `npm run check:brand` | `PASS` | 3.77 s | Generated brand contract was current. |
| `npm run lint` | `PASS` | 202.92 s | No lint errors. |
| `npm run typecheck` | `PASS` | 107.87 s | Strict TypeScript passed. |
| `npm test` | `PASS` | 39.91 s | 117 files and 827 tests passed; Vitest time 29.28 s. |
| Focused security/calculation/Command Center tests | `PASS` | 8.15 s | 11 files and 51 tests covering security hardening, identity recovery, POS, gateway/workspace, investments, currency, and transaction filters. |
| Production `next build` with documented placeholder public configuration | `PASS` | 212.79 s | Next.js 16.2.11; 35 static pages; compile 110 s and TypeScript 60 s. |
| `deno check --no-lock` — control-plane operator function | `PASS` | 8.12 s | Deno 2.8.1; no lockfile written. |
| `deno check --no-lock` — business identity recovery | `PASS` | 4.48 s | No lockfile written. |
| `deno check --no-lock` — POS security | `PASS` | 5.47 s | No lockfile written. |
| `deno check --no-lock` — Command Center gateway | `PASS` | 4.74 s | No lockfile written. |
| `npm run test:e2e` | `FAIL` | 16.17 s | Deterministic pre-Docker failure: tracked `supabase/config.toml` now exists while the harness refuses to replace an existing config. |
| Formatting gate | `NOT_RUN` | — | No repository formatting script exists. |
| Native Gradle build/test | `NOT_RUN` | — | No native file changed in the 29-commit window; a complete native toolchain run was unavailable. |
| Local Supabase SQL/pgtap | `BLOCKED` | — | Docker/local Supabase runtime unavailable; the E2E harness also fails earlier on the config collision. |

The build emitted 163 JavaScript chunks totaling 6,559,815 bytes raw (largest 427,491 bytes) and 16 CSS chunks totaling 1,220,962 bytes raw. Route-attributed compressed transfer cost remains `UNVERIFIED`.

## Browser and Accessibility Verification

The exact local production build was exercised with placeholder public Supabase configuration and no credentials. It did not connect to or mutate production data.

- Landing responsive matrix passed with no horizontal overflow at: `320x568`, `360x800`, `375x667`, `390x844`, `412x915`, `768x1024`, `820x1180`, `1024x768`, `1280x720`, `1366x768`, `1440x900`, and `1920x1080`.
- `/start`, `/admin`, and the `/control-login` redirect to `/admin` passed at `390x844`, `768x1024`, and `1440x900` with no horizontal overflow.
- Axe 4.12.1 reported zero deterministic violations at 390x844 on `/`, `/start`, and unauthenticated `/admin`.
- Manual review remains required for gradient/pseudo-element contrast and role-less containers carrying `aria-label` on `/` and `/admin`.
- The first-visit Windows install dialog correctly focused its first button, supported Escape, and locked body scrolling, but `Shift+Tab` escaped to the background Dashboard link while `aria-modal=true`: `FAIL`.
- New authenticated Command Center palette/mobile-sheet focus trapping and focus restoration are `UNVERIFIED`; static inspection found no complete trap/inert/return-focus contract.
- Local unthrottled landing diagnostics: TTFB 13 ms, FCP 200 ms, LCP 200 ms on the H1, CLS 0; INP unavailable. No page or console errors were observed.
- Screenshots were ephemeral local evidence and were not committed; no absolute machine path appears in this record.

## Live Supabase Read-Only Verification

- Main `tdagzmgcgjlyqzegmizg` and control `zzvpovvuybfihwgjrder` were `ACTIVE_HEALTHY`; the shared organization plan was `free`.
- Main: Postgres 17.6, 165 public/private tables, 328 policies, 42,429,587 database bytes. Control: Postgres 17.6, four private tables, four policies, 11,922,579 bytes.
- Catalog query found zero public/private tables that were both RLS-disabled and data-accessible to `anon` or `authenticated`.
- Main security advisors: 28 (13 informational policyless-table notices, 14 authenticated security-definer warnings, one leaked-password warning). Main performance advisors: 397, including 44 unindexed foreign keys.
- Control security advisors: 12 (11 authenticated security-definer warnings and one leaked-password warning). Control performance advisors: seven unused indexes.
- Current gateway-operation inventory: all 21 public functions dispatched by the service-only Command Center operation switch remain directly executable by `authenticated`, and none mentions AAL2 in its own body.
- A broader reviewed privileged-name/body query found 31 directly executable candidate admin/Command Center wrappers with no body-level AAL2 check. The prior report's categorical count of 27 is therefore superseded, not merely incremented.
- `public.get_command_center_user_360(text)`, added in the intervening commits, is `SECURITY DEFINER`, is executable by `authenticated`, and checks only main-project platform-admin membership before returning its privacy-filtered investigation payload.
- Repository migrations: 254 main / 5 control. Live ledgers: 274 main / 7 control. The two newest repository migrations map by name to live entries with different timestamps, so migration readiness remains `FAIL`.
- Refreshed 24-hour API/auth/storage/realtime/Edge log arrays were empty. Each project returned 11 Postgres entries, all severity `LOG`; no WARNING/ERROR/FATAL/PANIC severity was present. This is a bounded snapshot, not proof of error-free production.
- No SQL mutation, migration, branch creation, deployment, restore, or user-row retrieval was performed.

## GitHub, Vercel, and Sentry Verification

- GitHub: 31 open PRs, 22 drafts, nine non-drafts, nine unmergeable. All current head SHAs and classifications were refreshed read-only.
- PR #169 is the only non-Dependabot ready PR; it is unmergeable, 176 commits/184 files, and based on obsolete main. It is not a release candidate.
- Dependabot PRs #203–#205 are current-base and mergeable, but exact-head CI fails while Security Scanning passes. Older Dependabot heads #25, #28, and #181–#183 passed at their recorded heads before the policy exception expired and require current reruns after `PLAN-002`.
- The long stacks `#108→#111→#118→#120→#124→#130→#134`, `#151→#158→#163`, and `#161→#162` retain explicit dependency ordering and are not independent release candidates.
- Vercel: connected team `jalvoro-platform` exposes only unrelated project `pay-pulse`; no authoritative Jalvoro project/deployment was inspectable. `jalvoro-app.vercel.app` and `jamals-finance-sable.vercel.app` returned 404. Deployment SHA, build/runtime logs, environment-name inventory, cache behavior, and rollback target remain `BLOCKED`.
- Sentry: issue/event inspection remains `BLOCKED`; no local read-only token, organization, project, or public DSN configuration was available.

## Intervening-Commit Finding Changes

| Area | Corrected conclusion |
| --- | --- |
| Control authentication | Improved: `/admin` now uses the isolated control session, recent AAL2, active operator checks, main-admin resolution, and a service-role dispatcher. This does not close direct main-project RPC access. |
| Privileged RPCs | Worsened/expanded: User 360 adds a confirmed directly executable security-definer endpoint; the current reproducible inventory is 21/21 gateway targets and 31 broader candidates, replacing the old “27” claim. |
| Migration/release safety | Still failing: two migrations and tracked `supabase/config.toml` were added, but live timestamps diverge and the new config breaks the E2E harness. |
| Accessibility | Existing install-modal escape remains; new authenticated admin modal surfaces require focused runtime verification. |
| Telemetry/privacy | Production telemetry was enabled by default with privacy-minimised contracts and focused tests; authenticated production behavior and retention outcomes remain `UNVERIFIED`. |
| AI Insights | Presentation changed; finance calculation, investment identity, and source-ledger paths were unchanged, so related findings remain open. |
| Dependencies | `package.json` and `package-lock.json` were unchanged; the expired policy and development advisory remain. |

## Verification Contracts for Future Implementation

- `VER-001` privileged RPC closure: zero direct `anon`/`authenticated` privileged entries; negative AAL1/missing/mismatched/stale/disabled-role tests and positive audited dual-AAL2 gateway tests.
- `VER-002` resilience: production-suitable Supabase plan, leaked-password protection, encrypted database plus Storage backups, and disposable restore with RPO/RTO evidence.
- `VER-003` dependency policy: clean install, zero production/full audit findings or an approved unexpired policy, green exact-head CI.
- `VER-004` deployment/observability: authoritative Vercel project/domain/deployment SHA, environment names/scopes, logs, Sentry health, preview smoke, and rollback candidate.
- `VER-005` migrations: exact repository/live ledger reconciliation, empty replay, existing-schema no-op proof, grants/RLS diff, and rollback rehearsal.
- `VER-006` transaction scale: bounded cursor/search tests at 10k/100k rows with no gaps/duplicates and acceptable p95/heap/egress.
- `VER-007` transaction URL state: reload/bookmark/back-forward/IME/filter preservation.
- `VER-008` accessibility: focus trap, inert background, Escape, scroll restoration, focus return, screen-reader and full viewport matrix for every modal.
- `VER-009` investments: same-name/different-ID fixtures, explicit aliasing, freshest compatible quote, currency/history reconciliation.
- `VER-010` POS indexes: representative plans and write/cascade cost before/after each nonredundant index.
- `VER-011` PR topology: current-main bases, independent review, exact-head checks, resolved security threads, and explicit stack order.
- `VER-012` critical journeys: isolated synthetic Individual, two-tenant Business, POS, main-admin, control-role, invitation, expiry, idempotency, provider-failure, MFA, and recovery flows.
- `VER-013` install timing: no sub-second blocking first-visit prompt; explicit or approved non-modal engagement behavior.
- `VER-014` semantics: native semantic group/list/region markup and clean axe/accessibility-tree review.

## Final Verification State

Release remains blocked by direct privileged RPC access, Free-plan recovery/password gaps, a failing dependency policy, unreconciled migrations, broken local E2E harness, unavailable Jalvoro deployment/observability evidence, and unexecuted authenticated/tenant/restore/load journeys. No implementation was started.
