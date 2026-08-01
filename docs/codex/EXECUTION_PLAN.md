# Jalvoro Production Readiness Execution Plan

## Status

- Plan state: Draft template
- Last updated: YYYY-MM-DD
- Repository commit used for planning: `<commit-sha>`
- Lead: Unassigned
- Implementation started: No

> Do not start broad implementation until `docs/codex/AUDIT.md` contains evidence-backed findings. Replace generic placeholders with actual finding IDs and file scopes.

## Planning Principles

- Correctness, security, and data integrity come before cleanup.
- Protect current valid behavior with tests before refactoring.
- Use small pull requests with one clear purpose.
- Prefer reversible changes.
- Avoid overlapping edits across concurrent agents.
- Measure before and after performance changes.
- Use staging or preview environments.
- Never treat a successful build as complete verification.
- Do not deploy to production without explicit authorization.
- Do not combine database migration, broad refactor, dependency replacement, and visual redesign in one pull request.

## Entry Criteria

Implementation of a finding may begin only when it has:

- A finding ID in `AUDIT.md`.
- Severity and confidence.
- Evidence.
- Affected files and journeys.
- A proposed correction.
- Regression risks.
- Required tests.
- Verification criteria.
- Rollback instructions.
- Dependencies.

## Workstream Order

1. P0 containment and credential rotation.
2. P1 authorization, data integrity, and incorrect business logic.
3. Broken critical journeys.
4. Reliability and error-state defects.
5. Database and backend bottlenecks.
6. Frontend rendering and interaction bottlenecks.
7. Responsive and accessibility failures.
8. Maintainability improvements.
9. Cost optimizations.
10. Non-critical polish.

## Immediate Stop Conditions

Stop implementation and escalate when:

- A secret or privileged key is exposed.
- Production data could be lost or corrupted.
- A migration is irreversible or untested.
- Expected business behavior is ambiguous.
- A security boundary cannot be verified.
- Tests reveal unrelated widespread regressions.
- Required environment access is missing.
- A proposed optimization changes results.
- A preview environment uses production data or credentials unsafely.
- Rollback is not possible for a high-risk change.

## Phase 0 — Safe Working Environment

### Objectives

- Confirm clean repository state.
- Identify package manager and canonical commands.
- Create a branch or isolated worktree.
- Confirm no production deployment will occur.
- Confirm safe local, preview, or staging environment.
- Confirm secrets are not printed.
- Record baseline commit.
- Verify database access level.

### Required Outputs

- Baseline commit recorded.
- Working branch recorded.
- Commands recorded in `AUDIT.md`.
- Environment limitations recorded.
- Initial rollback path confirmed.

### Exit Criteria

- Safe environment exists.
- Baseline commands can run or their blockers are documented.
- No production data will be modified.

## Phase 1 — Audit and Baseline

### Objectives

- Complete repository map.
- Complete critical journey inventory.
- Complete business-logic inventory.
- Run clean checks.
- Capture performance baseline.
- Review authentication, authorization, RLS, storage, and secrets.
- Review database integrity and query patterns.
- Review responsive and accessibility behavior.
- Review deployment and monitoring.
- Rank findings.

### Deliverables

- Updated `AUDIT.md`.
- Evidence-backed findings.
- Initial verification cases in `VERIFICATION.md`.
- Finding-to-plan mapping.
- Launch recommendation.

### Exit Criteria

- Five highest risks identified.
- Every P0/P1 finding has a proposed next action.
- Unknowns are disclosed.
- No broad implementation has begun prematurely.

## Phase 2 — Test Harness and Protected Behavior

### Objectives

Build enough protection to safely change the system.

### Tasks

- Add unit tests for calculations and deterministic logic.
- Add contract tests for APIs and data shapes.
- Add integration tests for Supabase and trusted server boundaries.
- Add RLS tests using multiple identities.
- Add critical end-to-end smoke tests.
- Add reusable test fixtures without production data.
- Add checks for duplicate submission and retries.
- Add regression tests for each confirmed defect before or with the fix.

### Constraints

- Do not chase coverage percentage for its own sake.
- Do not rewrite implementation merely to fit a test tool.
- Do not use real production secrets or personal data.
- Keep tests deterministic.

### Exit Criteria

- Protected logic has golden or characterization tests.
- Critical flow smoke tests run locally or in preview.
- Security boundaries have repeatable tests.

## Phase 3 — P0 and P1 Security/Data Corrections

### Potential Tasks

Only include tasks supported by findings:

- Remove exposed secrets and rotate compromised credentials.
- Correct client-side use of privileged credentials.
- Fix missing or incorrect authorization.
- Correct RLS policies.
- Correct storage policies.
- Add trusted-boundary validation.
- Prevent insecure direct object references.
- Add safe rate limits or abuse controls where justified.
- Fix dangerous file upload handling.
- Correct cache exposure of private data.
- Add webhook verification where applicable.
- Redact sensitive logs.
- Correct destructive or unsafe data operations.

### Pull Request Rules

- One security boundary per pull request where practical.
- Include threat and regression notes.
- Include before/after authorization test matrix.
- Include rollback path.
- Request independent review.

### Exit Criteria

- No unresolved P0.
- P1 security/data findings fixed, mitigated, or explicitly accepted.
- RLS and authorization tests pass.
- Secret rotation actions documented.

## Phase 4 — Calculation and Business-Logic Corrections

### Procedure for Every Logic Change

1. Link the finding and logic ID.
2. Document current examples.
3. Document intended examples.
4. Add tests preserving valid behavior.
5. Add a failing test for the confirmed defect.
6. Make the smallest safe correction.
7. Verify every consumer.
8. Compare old and new results on representative data.
9. Record intentional changes in `CHANGELOG.md`.
10. Define rollback.

### Special Review Areas

- Precision and rounding.
- Currency.
- Dates and timezones.
- Sorting and ranking.
- Search semantics.
- Pagination.
- Eligibility.
- Permissions.
- Totals and derived values.
- Validation.
- Client/server consistency.
- Persisted versus computed values.

### Exit Criteria

- Confirmed defects corrected.
- Valid behavior remains protected.
- No logic removed merely to simplify code.

## Phase 5 — Critical User Journey Reliability

### Objectives

Make all critical journeys robust from start to finish.

### Tasks

- Correct broken navigation.
- Correct stale or invalid state handling.
- Add proper loading states.
- Add empty states.
- Add validation messages.
- Add authorization failure handling.
- Add network/server error handling.
- Add safe retry behavior.
- Prevent duplicate actions.
- Preserve user input after recoverable failures.
- Confirm success only after persistence.
- Handle expired sessions and stale records.
- Verify back/forward/refresh behavior.

### Exit Criteria

- Every critical journey has defined success and failure behavior.
- End-to-end critical tests pass.
- No misleading success states remain in tested flows.

## Phase 6 — Database and Backend Performance

### Method

For each performance change:

1. Identify the slow operation.
2. Capture query or request baseline.
3. Capture query plan where available.
4. Confirm correctness.
5. Implement the smallest change.
6. Measure again using equivalent conditions.
7. Test concurrency and pagination where relevant.
8. Document tradeoffs and rollback.

### Candidate Changes

Only when justified:

- Add or revise indexes.
- Remove N+1 queries.
- Reduce over-fetching.
- Bound queries.
- Correct pagination.
- Batch safe operations.
- Add caching with explicit invalidation.
- Reduce duplicate requests.
- Move trusted logic to the correct boundary.
- Add constraints.
- Make write operations idempotent.
- Correct realtime subscription cleanup.
- Adjust timeout or retry behavior.

### Migration Rules

- Use expand-and-contract when possible.
- Avoid blocking operations on large tables.
- Document lock and runtime risk.
- Validate against production-like data volume.
- Include rollback or forward-recovery.
- Do not remove old schema until all consumers migrate.

### Exit Criteria

- Targeted bottlenecks have before/after evidence.
- Query correctness remains unchanged.
- Migration safety is documented.

## Phase 7 — Frontend Performance and Smoothness

### Objectives

Reduce loading delay, rendering delay, search delay, scrolling jank, memory growth, and interaction blocking without removing features.

### Candidate Tasks

Only when measured:

- Reduce unnecessary client-side rendering.
- Split heavy route code.
- Optimize images.
- Improve font loading.
- Remove duplicate requests.
- Fix data waterfalls.
- Memoize only proven expensive work.
- Correct unnecessary re-renders.
- Cancel stale search requests.
- Debounce search appropriately.
- Improve long-list behavior.
- Remove leaking listeners.
- Reduce expensive scroll work.
- Respect reduced-motion preferences.
- Reduce third-party script impact.
- Improve loading and transition states.

### Verification

- Repeat the same device/network profile.
- Use multiple samples.
- Compare medians and percentiles where possible.
- Check correctness and accessibility after optimization.
- Test low-powered mobile behavior.
- Check memory after extended interaction.

### Exit Criteria

- Targeted metrics improve or the change is reverted.
- No protected functionality is removed.
- Search and scrolling remain correct.

## Phase 8 — Responsive Design and Accessibility

### Objectives

Make critical journeys usable across required viewports and input methods.

### Tasks

- Fix overflow and clipping.
- Fix narrow-layout navigation.
- Fix dialogs, drawers, and dropdowns.
- Fix tables and dense content.
- Correct touch target sizing.
- Correct focus management.
- Add or fix labels and accessible names.
- Correct keyboard interaction.
- Correct semantic structure.
- Add status announcements.
- Correct contrast issues.
- Respect zoom and text resizing.
- Respect reduced motion.
- Test long content and localization expansion.
- Test mobile keyboard and safe areas.

### Constraints

- Do not hide required features on mobile.
- Do not create separate conflicting behavior without need.
- Do not rely only on automated accessibility checks.

### Exit Criteria

- Responsive matrix completed for critical routes.
- Keyboard-only critical journeys pass.
- Critical screen-reader checks pass.
- No P1 accessibility blocker remains.

## Phase 9 — Maintainability Refactoring

Start only after relevant behavior is protected.

### Candidate Tasks

- Separate domain logic from UI.
- Reduce oversized modules.
- Centralize shared validation.
- Centralize stable types.
- Normalize error handling.
- Improve names.
- Remove proven dead code.
- Consolidate equivalent duplication.
- Remove circular dependencies.
- Clarify server/client module boundaries.
- Add architecture documentation.
- Reduce unnecessary abstractions.

### Refactor Rules

- One clear boundary per pull request.
- No intentional behavior change.
- Tests must pass before and after.
- Avoid broad formatting noise.
- Compare generated bundles and performance when relevant.
- Revert if complexity increases without measurable benefit.

### Exit Criteria

- Code is easier to navigate.
- Behavior remains unchanged.
- Future change points are documented.

## Phase 10 — Cost Optimization

### Objectives

Reduce avoidable cost without weakening security, reliability, or maintainability.

### Tasks

- Inventory cost drivers.
- Remove unused paid services.
- Reduce duplicate traffic.
- Reduce unnecessary compute and database usage.
- Improve cache effectiveness where safe.
- Optimize storage and image delivery.
- Add spending alerts if available.
- Compare alternatives using total operational cost.
- Document scaling thresholds.

### Exit Criteria

- Recommendations include migration and maintenance cost.
- No risky “free” replacement is adopted without evidence.

## Phase 11 — Staging, Capacity, and Failure Testing

### Objectives

Verify the application under production-like conditions.

### Tasks

- Deploy to preview or staging.
- Use safe representative data.
- Run critical journeys.
- Run concurrency/load scenarios.
- Test dependency latency and failures.
- Test timeouts and retries.
- Test session expiry.
- Test deployment rollback.
- Test migration rollback or forward-recovery.
- Inspect logs for sensitive data.
- Verify monitoring and alerts.

### Load Test Guardrails

- Do not load-test production without explicit approval.
- Define workload before testing.
- Set maximum traffic and duration.
- Stop on elevated errors or resource risk.
- Record environment differences.
- Do not generalize beyond the tested workload.

### Exit Criteria

- Capacity results documented.
- Failure behavior documented.
- Monitoring is actionable.
- Rollback is rehearsed or credibly verified.

## Phase 12 — Controlled Production Rollout

This phase requires explicit owner authorization.

### Pre-Deployment Checklist

- No unresolved P0.
- P1 disposition documented.
- Required checks pass.
- Staging verified.
- Migration reviewed.
- Backup confirmed.
- Rollback confirmed.
- Monitoring active.
- Responsible person available.
- Deployment window selected.
- Post-deployment tests prepared.

### Rollout Strategy

Prefer:

- Small reversible changes.
- Backward-compatible schema.
- Feature flags where useful and safe.
- Gradual exposure where available.
- Immediate monitoring.
- Defined rollback triggers.

### Post-Deployment

- Run critical smoke tests.
- Check errors, latency, database health, and user-impact signals.
- Confirm no secret or personal-data leakage in logs.
- Compare production metrics to baseline.
- Record outcome in `CHANGELOG.md` and `VERIFICATION.md`.

## Pull Request Template

Copy for every implementation unit.

---

### PLAN-XXX — Concise Pull Request Purpose

- **Findings:** `FINDING-XXX`
- **Severity:** P0 | P1 | P2 | P3
- **Owner:** Unassigned
- **Status:** PLANNED
- **Branch:** `<branch>`
- **Expected files:** `path/to/file`
- **Dependencies:** None
- **Production deployment included:** No

#### Problem

State the verified issue.

#### Scope

List exact intended changes.

#### Out of Scope

List related work intentionally excluded.

#### Protected Behavior

List calculations, contracts, permissions, and flows that must not change.

#### Implementation Steps

1. Add or update tests.
2. Make the smallest safe implementation change.
3. Run verification.
4. Update documentation.
5. Review the diff.

#### Test Plan

- Unit:
- Integration:
- End-to-end:
- Manual:
- Security:
- Performance:

#### Success Criteria

Use measurable pass conditions.

#### Risks

List regressions and operational concerns.

#### Rollback

Reference the exact procedure in `ROLLBACK.md`.

#### Evidence Required

List screenshots, traces, query plans, test output, or measurements.

---

## Plan Register

| Plan ID | Findings | Severity | Purpose | Owner | Status | Dependencies | PR |
|---|---|---|---|---|---|---|---|
| PLAN-001 | TBD | TBD | First approved correction after audit | Unassigned | BLOCKED_BY_AUDIT | TBD | — |

## Suggested Agent/Worktree Boundaries

Concurrent agents may inspect separate areas, but overlapping edits require lead coordination.

| Workstream | Allowed Scope | Must Not Edit Concurrently With |
|---|---|---|
| Security/auth | Auth, authorization, policies, security config | Any agent changing same boundaries |
| Supabase/data | Migrations, queries, RLS tests | Security agent on same policies |
| Business logic | Calculations and domain tests | UI refactor touching same logic |
| Frontend performance | Rendering, bundles, requests | Responsive agent on same components |
| Responsive/accessibility | Layout and interactions | Frontend performance on same components |
| CI/operations | Workflows, Vercel config, monitoring | Deployment agent |

## Completion Checklist

- [ ] Audit entry criteria satisfied.
- [ ] Plan register maps every approved finding.
- [ ] Protected logic has tests.
- [ ] P0 handled.
- [ ] P1 disposition documented.
- [ ] Critical journeys verified.
- [ ] Database changes measured and reversible.
- [ ] Frontend changes measured.
- [ ] Responsive and accessibility checks completed.
- [ ] Cost review completed.
- [ ] Capacity model tested.
- [ ] Staging verified.
- [ ] Monitoring and rollback verified.
- [ ] Production rollout explicitly authorized.
- [ ] Final results documented.
