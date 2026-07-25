# JALVORO Global Launch Gate — 2026-07-25

This document freezes the production launch baseline for the worldwide JALVORO release window.

## Release baseline

- Repository: `maijamalhoon/jalvoro-platform`
- Production branch: `main`
- Baseline commit before this launch-marker change: `bfdd6361bdf05c1ea28acbe20525445bb7622c6b`
- Launch surface: current JALVORO web production plus the private JALVORO Command Center
- Excluded from this release: draft native application work, stacked Business Core work, and any unmerged experimental branch

## Hard launch gates

The release is a no-go unless all of the following are true:

1. Dependency review reports no disallowed dependency change.
2. Production dependency audit reports zero known vulnerabilities at the configured threshold.
3. ESLint passes.
4. Strict TypeScript passes.
5. Security contract tests pass.
6. The complete application test suite passes.
7. The main production build passes.
8. Currency tests and the currency production build pass.
9. A Vercel preview for this exact launch gate reaches `READY` and is inspected.
10. The production deployment is created from `main`, reaches `READY`, and identifies the expected verified Git commit.
11. Public aliases do not redirect visitors to Vercel Authentication.
12. Unauthenticated protected application routes redirect to JALVORO login, while protected APIs reject unauthenticated requests.
13. Authenticated smoke testing covers login, dashboard, AI Insights, backup/export/import entry points, and Command Center Owner navigation.
14. Runtime error clusters are reviewed and no unresolved launch-blocking error remains.
15. Supabase production migrations, RLS boundaries, RPC execution grants, advisors, and rollback evidence are verified.
16. A known-good production deployment remains available as the rollback candidate.

## Production safety rules

- No fake production data or synthetic business records.
- No direct production table access for browser roles where RPC boundaries are required.
- No service-role secret in browser code.
- No authorization based on user-editable metadata.
- No merge of unrelated native or Business Core branches into this launch.
- No claim of global availability until ordinary unauthenticated public access is verified.
- No claim of authenticated smoke success unless the authenticated flow is actually executed.
- No destructive database cleanup during the launch window.

## Rollback trigger

Rollback immediately to the latest known-good production deployment if the new deployment introduces authentication failure, data-access regression, backup incompatibility, widespread 5xx responses, security-boundary failure, or a persistent critical runtime error.
