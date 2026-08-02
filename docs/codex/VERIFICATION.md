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

## PLAN-002 Clean Release and Remote Verification

- Date: 2026-08-02 (Asia/Karachi)
- Baseline: `origin/main@404a8576e3ab52045f11542772ff6efaffeb0fe4`
- Branch: `fix/dependency-security-gate-main-20260802`
- Exact local/remote head: `947a152da1414f04b3cd6d8f0f802db225621c67`
- Topology: two commits ahead, zero behind; merge-base exactly the baseline
- Draft PR: #206 against `main`; three changed files; unmerged
- Status: **LOCALLY AND REMOTELY VERIFIED — NOT MERGED OR DEPLOYED**

The clean branch cherry-picks only original implementation commits `39b1d4265ac1ee99fe5979d51116277421abd3f0` and `50d5e371d98b52abe5c5ee7c62d90a3c3e9ae75f`, producing clean-branch commits `c96c642a6617ec2bfff17ca968cc953a9ff82e24` and `947a152da1414f04b3cd6d8f0f802db225621c67`. Its diff against `origin/main` contains exactly `package-lock.json`, `scripts/dependency-audit-policy.mts`, and `lib/dependency-audit-policy.test.ts`. Each file is byte-for-byte identical to `origin/fix/dependency-security-gate-20260802`; `package.json`, application files, workflows, migrations, configuration, audit documentation, and `AGENTS.md` are absent from the implementation diff.

The lockfile retains `brace-expansion@1.1.18`, `dev: true`, registry tarball `https://registry.npmjs.org/brace-expansion/-/brace-expansion-1.1.18.tgz`, and integrity `sha512-Edep/X9fGqVNmzKBVsDYIOtD+z1tuezV70LBjdCst9Tqu76lsnvRiZ6oTic1n+/BIwX6QDGAO94PN4N2SADvtw==`. No direct or production dependency changed and no `brace-expansion` override was added; unrelated existing overrides in `package.json` are unchanged.

### Local exact-head evidence

Runtime: Node `v24.14.0`, npm `11.9.0`, Deno `2.8.1`, Next.js `16.2.11`.

| Command / check | Result | Exact evidence |
| --- | --- | --- |
| `npm ci --silent` | `PASS` | Canonical clean install completed. |
| `npm ls --depth=0` | `PASS` | Direct dependency tree valid. |
| `npm ls brace-expansion` | `PASS` | ESLint/minimatch development path resolves `brace-expansion@1.1.18`. |
| `npm audit` | `PASS` | Zero vulnerabilities. |
| `npm audit --omit=dev` | `PASS` | Zero production vulnerabilities. |
| `npm run audit:ci` | `PASS` | Clean audit-v2 production and full reports accepted; no exception remains. |
| Focused dependency-policy tests | `PASS` | 37 tests cover vulnerabilities, malformed/inconsistent reports, launch errors, signals, null/unexpected statuses, malformed JSON, and valid status-1 vulnerability reports. |
| `npm run lint` | `PASS` | One clearly environmental timeout was retried separately without changing files; exact retry passed. |
| `npm run typecheck` | `PASS` | Strict TypeScript passed. |
| `npm test` | `PASS` | 117 files and 859 tests passed. |
| `npm run check:brand` | `PASS` | Brand contract current. |
| Placeholder-configured `npm run build` | `PASS` | 35 static pages; no production credentials or target used. |
| Four documented `deno check --no-lock` commands | `PASS` | Control operator, identity recovery, POS security, and Command Center gateway passed; no lockfile produced. |
| `git diff --check` and exact changed-file inventory | `PASS` | No whitespace errors; exactly three files. |

Independent read-only review found no P0/P1 finding and no blocking P2 defect. It confirmed strict report validation, rejection of every vulnerability and process failure path, exact dependency scope, clean topology, and rollback viability. Non-blocking coverage observations were limited to explicit JSON primitive/array and several parser-composition cases; the implementation itself rejects those inputs.

### Remote exact-head evidence

| Workflow / job | Run | Result |
| --- | ---: | --- |
| CI / Validate | `30749931181` (`3696`) | `SUCCESS`; install, audit policy, lint, typecheck, four Deno checks, security contracts, complete suite, and production build all succeeded. |
| Security Scanning / Dependency Review | `30749931214` (`2390`) | `SUCCESS`. |
| Security Scanning / CodeQL | `30749931214` (`2390`) | `SUCCESS`. |
| Private repository security gate | `30749931214` (`2390`) | `SKIPPED` as designed because the repository is public. |

The repository's established `ready_for_review` event procedure registered the automatic runs; PR #206 was immediately returned to draft. No manual workflow dispatch or workflow/configuration change occurred. The final PR sweep found no status failures, bot comments, submitted reviews, or inline review threads. PR #206 remains draft and requires explicit merge approval. `VER-003` is satisfied for exact head `947a152d`, but `main` remains unchanged until merge.

## Historical PLAN-002 Local Verification (Superseded by Clean Release Evidence Above)

This section records the earlier audit-branch-local implementation checkpoint before the clean release branch, second fail-closed commit, push, PR, and remote runs. Statements below such as “remote CI not run” and the earlier test counts are historical, not the current PLAN-002 state.

- Date: 2026-08-02 (Asia/Karachi)
- Branch: `fix/dependency-security-gate-20260802`
- Starting audit commit: `a73705a078fbe35abfdc25f549facb17f1fadb20`
- Product baseline and merge-base: `origin/main@404a8576e3ab52045f11542772ff6efaffeb0fe4`
- Starting relation: audit branch 8 commits ahead of `origin/main`, 0 behind; the eight commits contained only `AGENTS.md` and `docs/codex/*` audit material
- Focused implementation commit: `39b1d4265ac1ee99fe5979d51116277421abd3f0`
- Status: **LOCALLY IMPLEMENTED AND VERIFIED — NOT MERGED; REMOTE CI NOT RUN**
- Runtime: Node `v24.14.0`; investigation, clean install, audits, and acceptance checks used npm `11.9.0`

The initial full audit failed on one high-severity, development-only `brace-expansion <1.1.17` advisory (`GHSA-mh99-v99m-4gvg`, npm source `1130588`, CVSS 7.5, CWE-400/CWE-770). Production audits were clean. `npm explain` and `npm ls` traced the vulnerable `brace-expansion@1.1.16` copy to the root ESLint toolchain through `minimatch@3.1.5`; that parent accepts `brace-expansion ^1.1.7`. Existing production and other development paths used unaffected `brace-expansion@5.0.8`. No focused compatible Dependabot branch or PR existed, the broad historical security branch did not contain the patch, and upgrading direct ESLint was unnecessary.

The retained dependency change is the normal transitive resolution from `brace-expansion@1.1.16` to `1.1.18`. `package.json`, all direct dependencies, all production dependency paths, and existing overrides are unchanged. The lockfile changes only the package's version, tarball URL, and integrity. npm 11.9.0's attempted lock-only writes were rejected because each also removed 186 unrelated Linux `libc` metadata lines. The retained six-line lockfile diff was produced by the canonical `npm audit fix --package-lock-only --ignore-scripts` command using npm 11.19.0, which preserved that metadata; npm 11.9.0 then consumed the result through the required clean install and all acceptance checks.

The expired exception was removed completely. At that checkpoint, the policy accepted only audit-report version 2 with zero production and zero full-tree findings; it counted the greater of metadata total and vulnerability keys, rejected unknown report versions, and printed the exact returned vulnerability object on a nonzero result. Focused tests proved that production findings, development findings, inconsistent zero metadata with a finding, and future report formats failed closed. The clean release evidence above supersedes this first-commit description with the stricter final parser and validation behavior.

### PLAN-002 command evidence

| Command / check | Result | Duration | Exact evidence |
| --- | --- | ---: | --- |
| Initial `npm audit` | `FAIL` | 61.13 s | One high-severity development advisory for `brace-expansion <1.1.17`; fix available. |
| Initial `npm audit --json` | `FAIL` | 13.25 s | Audit v2; source `1130588`; total/high 1; production path absent. |
| Initial `npm audit --omit=dev` | `PASS` | 8.01 s | Zero production vulnerabilities. |
| Initial `npm audit --omit=dev --json` | `PASS` | 7.50 s | Audit v2; all severity counts zero; empty vulnerability object. |
| Initial `npm run audit:ci` | `FAIL` | 10.57 s | Existing exception had expired on 2026-08-01. |
| Initial `npm explain brace-expansion` | `PASS` | 17.62 s | Vulnerable copy isolated to ESLint/minimatch development paths. |
| Initial `npm ls brace-expansion` | `PASS` | 8.82 s | One `1.1.16` development copy and three unaffected `5.0.8` copies. |
| Initial `npm ls --all` | `PASS` | 8.22 s | Complete tree exited zero; no invalid dependency. |
| Existing policy regression test before editing | `PASS` | 20.51 s | One file and five tests passed. |
| `npm ci --silent` | `PASS` | 127.45 s | Canonical clean install with npm 11.9.0. First attempt stopped at 15.84 s because an allowed local `next start` process held the SWC binary; that process was stopped and the unchanged command passed. |
| `npm ls --depth=0` | `PASS` | 2.81 s | Direct tree resolved; the same generated optional WASM packages were reported as extraneous. |
| `npm ls --all` | `PASS` | 4.63 s | 2,432 output lines; exit zero; only expected platform/peer optional omissions, no invalid dependency. |
| `npm explain brace-expansion` | `PASS` | 3.64 s | Patched root development copy remains under compatible `minimatch@3.1.5`. |
| `npm ls brace-expansion` | `PASS` | 2.69 s | ESLint path resolves `brace-expansion@1.1.18`; three unaffected copies remain `5.0.8`. |
| `npm audit` | `PASS` | 6.40 s | Found zero vulnerabilities. |
| `npm audit --json` | `PASS` | 6.84 s | Audit v2; total/info/low/moderate/high/critical all zero; `vulnerabilities: {}`. |
| `npm audit --omit=dev` | `PASS` | 5.32 s | Found zero production vulnerabilities. |
| `npm audit --omit=dev --json` | `PASS` | 6.95 s | Audit v2; every severity count zero; `vulnerabilities: {}`. |
| `npm run audit:ci` | `PASS` | 28.47 s | `Dependency audit passed with zero known vulnerabilities.` No exception path remains. |
| `npm run lint` | `PASS` | 264.95 s | No lint errors. |
| `npm run typecheck` | `PASS` | 121.75 s | TypeScript completed without error. |
| `npm run check:brand` | `PASS` | 1.03 s | Generated brand files synchronized; brand check passed. |
| `npm test` | `PASS` | 33.82 s | 117 files and 827 tests passed; Vitest time 25.82 s. |
| Focused dependency/security tests | `PASS` | 4.43 s | Four files and 24 tests passed: dependency policy, security hardening, identity recovery wrapper, and POS security contracts. |
| Placeholder-configured `npm run build` | `PASS` | 282.53 s | npm 11.9.0; Next.js 16.2.11; compile 2.9 min; TypeScript 66 s; 35 static pages. |
| `deno check --no-lock` — control-plane operator function | `PASS` | 1.81 s | Deno 2.8.1; no lockfile written. |
| `deno check --no-lock` — business identity recovery | `PASS` | 0.15 s | No lockfile written. |
| `deno check --no-lock` — POS security | `PASS` | 0.14 s | No lockfile written. |
| `deno check --no-lock` — Command Center gateway | `PASS` | 0.18 s | No lockfile written. |
| `git diff --check` | `PASS` | — | No whitespace errors before the implementation commit. |

The same-worktree pre/post production-build comparison held at 160 static JavaScript chunks and 16 CSS chunks. Raw JavaScript changed from 6,558,859 to 6,564,896 bytes (+6,037 bytes, approximately 0.09%); the largest chunk remained 427,491 bytes and CSS remained 1,220,962 bytes. No application source or production package changed, and no runtime behavior change was observed or expected from this development-only patch.

No push, pull request, deployment, migration, database/Supabase/Vercel/production action, production write, or `PLAN-001` implementation occurred. Local evidence satisfies the repository portion of `VER-003`; exact-head GitHub Actions still must pass after review/push before `PLAN-002` is merge-ready, so `PLAN-001` remains not merge-ready.

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

- GitHub: 32 open PRs after draft PR #206 was opened; 23 are drafts and nine are non-drafts. The earlier 31-PR topology classifications remain otherwise unchanged.
- PR #206 is exact-head green at `947a152da1414f04b3cd6d8f0f802db225621c67`, remains draft and mergeable, and has no comments, reviews, or review threads.
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
| Dependencies | Baseline finding reproduced; draft PR #206 now carries an exact-head-green three-file remediation. `main` remains unchanged until merge. |

## Verification Contracts for Future Implementation

- `VER-001` privileged RPC closure: zero direct `anon`/`authenticated` privileged entries; negative AAL1/missing/mismatched/stale/disabled-role tests and positive audited dual-AAL2 gateway tests.
- `VER-002` resilience: production-suitable Supabase plan, leaked-password protection, encrypted database plus Storage backups, and disposable restore with RPO/RTO evidence.
- `VER-003` dependency policy: **SATISFIED ON DRAFT PR #206 HEAD `947a152d`** — clean install, zero production/full audit findings, fail-closed policy tests, and green exact-head CI/Dependency Review/CodeQL; not yet satisfied on `main` because the PR is unmerged.
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

Release remains blocked by direct privileged RPC access, Free-plan recovery/password gaps, unmerged PLAN-002 remediation, unreconciled migrations, broken local E2E harness, unavailable Jalvoro deployment/observability evidence, and unexecuted authenticated/tenant/restore/load journeys. PLAN-002 is exact-head green but unmerged; no production deployment or mutation occurred.
