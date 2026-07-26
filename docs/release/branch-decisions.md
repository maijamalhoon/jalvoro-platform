# Release branch consolidation decisions

Integration branch: `release/stabilization-20260726`  
Integration PR: #169  
Base: `main` at `d63bbcf4b9fd31dc3e978e7c622adce2a7f75ca2`

The candidate is one branch. No other branch or deployment may be certified as part of this release.

## Included

| Source | Decision | Included material |
| --- | --- | --- |
| PR #164 | Included at exact head `857ffe1497d7dd38e695bfe8b85a4ed0e4bce2c7` | Command Center and isolated Control Plane hardening, tests, prepared organization-summary migration, and exact-head runner. |
| PR #165 | Included selectively | All three verified sidebar files: `app/dashboard/mobile-sidebar-edge-lock.css`, `components/ui/sheet.tsx`, and `lib/mobile-sidebar-positioning.test.ts`. |
| Integration remediation | Included as focused commits on PR #169 | Lint/render purity, canonical host/indexing, auth failure handling already present in the selected base, CSRF contract, AI provider reliability, payment-scope removal, upload verification, Sentry privacy diagnostics, performance instrumentation, and release runbooks. |

## Excluded open drafts

| PR | Decision and reason |
| --- | --- |
| #163 | Excluded. Stacked workspace-entry architecture and unapplied atomic-setup migrations are a separate incomplete product expansion. Existing launch workspaces remain the candidate scope. |
| #162 | Excluded as a whole. It is stacked on an AI redesign and carries a consent/read-model migration that has not passed this candidate's migration gates. The concrete launch finding—provider validation, timeouts, retry exhaustion, status codes, structured errors, and correlation IDs—was implemented independently on the integration branch. |
| #161 | Excluded. Responsive AI presentation redesign is not required to correct the audited runtime failure and is not independently certified. |
| #158 | Excluded. Resumable workspace-domain foundation is a stacked new architecture with unapplied migrations. |
| #156 | Excluded. Paid-grade AI presentation polish is unrelated to the mandatory runtime remediation and payments are outside launch scope. |
| #151 | Excluded. New product experience-entry architecture is a separate feature stack. |
| #147 | Excluded as a branch. Its public-launch trust work is not merged wholesale; canonical host, private indexing, and release controls were corrected directly in this candidate. |
| #134 | Excluded. Organization profile command is stacked on the incomplete .NET staging chain. |
| #130 | Excluded. Live staging business identity path is part of the incomplete .NET staging chain. |
| #124 | Excluded. Staging Supabase smoke harness depends on the incomplete .NET chain and is not the production application runtime. |
| #120 | Excluded. Business Core HTTP pipeline contracts are part of the separate .NET service stack. |
| #118 | Excluded. Supabase tenant identity projection is part of the separate .NET service stack. |
| #111 | Excluded. Organization authorization foundation is part of the separate .NET service stack. |
| #108 | Excluded. Additive .NET 10 Business Core is not part of the current Next.js launch runtime. |
| #103 | Excluded. Business ecosystem website/onboarding foundation is an unverified feature expansion. |
| #100 | Excluded. Native parity shell is a separate platform surface and is not being represented as launch-ready. |
| #99 | Excluded. Frontend-only pricing would make payment claims without a lifecycle; the candidate removes payment claims/dependencies instead. |
| #94 | Excluded. Broad delete-button styling is unrelated to the accepted Critical/High launch findings. Existing destructive-action security controls remain. |
| #77 | Excluded. Regional billing foundation is incomplete and uses a different proposed lifecycle; payments are explicitly outside this release. |
| #35 | Excluded as obsolete/superseded. The current main line already contains later security-hardening migrations and controls; merging the old branch would reintroduce branch fragmentation. |

PRs #164 and #165 remain open only as source-history references. They must not be merged separately after #169 because their required content is already consolidated.

## Freeze rules

- Record the final head only after repository and external prerequisites stop changing.
- During certification: no commits, merges, rebases, or force-pushes.
- Tag only a SHA that passed every mandatory gate.
- A skipped, queued, cancelled, bypassed, or continue-on-error check is not evidence.
- If any post-freeze correction is required, invalidate the run, create a new SHA, and restart the complete matrix.
