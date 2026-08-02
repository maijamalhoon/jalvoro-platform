# Jalvoro Audit Changelog

## 2026-08-02 — PLAN-002 dependency security gate restoration

- **Type:** Dependency security and CI policy
- **Status:** Locally implemented and verified on `fix/dependency-security-gate-20260802`; not merged; remote CI not run
- **Finding:** `FINDING-003`
- **Plan / verification:** `PLAN-002` / `VER-003`
- **Starting audit commit:** `a73705a078fbe35abfdc25f549facb17f1fadb20`
- **Product baseline:** `origin/main@404a8576e3ab52045f11542772ff6efaffeb0fe4`
- **Implementation commit:** `39b1d4265ac1ee99fe5979d51116277421abd3f0`
- **Production deployment:** None
- **Production mutation:** None

Resolved the vulnerable development-only ESLint/minimatch path from `brace-expansion@1.1.16` to patched `1.1.18` through the existing compatible semver range. The manifest, direct dependencies, production dependency graph, and overrides are unchanged; `package-lock.json` changes only that package's version, tarball URL, and integrity. Direct ESLint was not upgraded because the transitive patch was sufficient, and no focused compatible Dependabot solution existed.

Removed the expired advisory exception instead of extending or broadening it. The audit gate now requires zero production and full-tree findings, rejects unexpected audit formats and inconsistent finding totals, and prints npm's exact vulnerability object on rejection. The existing focused policy test file now proves there is no remaining development advisory bypass.

Local verification passed with Node 24, npm 11.9.0, a canonical clean install, direct/full dependency-tree checks, full and production audits in human and JSON forms, `audit:ci`, lint, typecheck, brand integrity, all 827 tests, 24 focused dependency/security tests, a production build, and four Deno 2.8.1 checks. No workflow change was necessary because current CI and security workflows already call the fail-closed gate. No push, PR, deployment, migration, production write, or `PLAN-001` implementation was performed. Review and exact-head remote CI remain required before merge.

## 2026-08-02 — Corrected production-readiness audit package

- **Type:** Documentation
- **Status:** Audit documentation corrected on `audit/deep-production-readiness-20260802`
- **Product baseline:** `origin/main@404a8576e3ab52045f11542772ff6efaffeb0fe4`
- **Superseded incorrect baseline:** `52f236e999901a8af1b675e890dd866f4cbb001a`
- **Product implementation:** Not started
- **Production deployment:** None
- **Production mutation:** None
- **Findings:** `FINDING-001` through `FINDING-014`
- **Plans:** `PLAN-001` through `PLAN-013`
- **Verification:** `VER-001` through `VER-014`

Corrected the completed audit onto the exact latest `origin/main` at repair start. The repair inspected all 29 intervening commits and 42 changed files, reran the safe repository/browser/live read-only checks, superseded invalid stale-checkout evidence, recorded the new User 360 exposure and E2E config collision, refreshed PR classifications, and made `PLAN-002` the merge prerequisite for `PLAN-001`.

Only the five canonical audit documents were changed by this repair. No application source, test, dependency, lockfile, migration, database data, Supabase configuration, Vercel deployment, environment variable, GitHub PR/review, or production service was changed. Future implementation requires its own dated changelog entry linked to the relevant finding, plan, verification evidence, exact commit, environment, and rollback result.
