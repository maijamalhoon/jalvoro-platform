# Jalvoro Repository Instructions

## Mission

Improve Jalvoro's reliability, correctness, security, performance, accessibility, responsiveness, scalability, operational safety, and maintainability without removing or weakening legitimate existing functionality.

Jalvoro is expected to serve a large number of users. Treat every change as production-sensitive.

## Instruction Priority

Follow instructions in this order:

1. Explicit instructions from the repository owner.
2. This repository-level `AGENTS.md`.
3. More specific nested `AGENTS.md` files, if present.
4. Existing repository conventions and documentation.
5. Framework and platform best practices.

When instructions conflict, stop the affected change, document the conflict, and choose the safer behavior. Do not silently guess.

## Required Reading

Before making changes, read:

- `docs/codex/REQUIREMENTS.md`
- `docs/codex/AUDIT.md`
- `docs/codex/EXECUTION_PLAN.md`
- `docs/codex/VERIFICATION.md`
- `docs/codex/CHANGELOG.md`
- `docs/codex/ROLLBACK.md`

Also inspect relevant package manifests, lockfiles, configuration, migrations, tests, environment-variable examples, deployment files, and architecture documentation.

## Core Working Rules

1. Inspect and understand the relevant code, data flow, dependencies, database schema, infrastructure, and user journey before editing.
2. Do not begin a broad refactor without an evidence-based plan.
3. Establish a measurable baseline before optimizing.
4. Make small, reviewable, reversible changes.
5. Keep unrelated changes out of the same pull request.
6. Run relevant tests, linting, type checking, builds, and verification after every meaningful change.
7. Review the final diff for regressions, security problems, duplicated logic, accidental behavior changes, and unnecessary complexity.
8. Never claim an issue is fixed without showing how it was reproduced and verified.
9. Do not use appearance, intuition, or a successful local build as proof of production readiness.
10. Mark unknown or inaccessible behavior as unverified rather than guessing.

## Audit Before Broad Implementation

The first broad task must be a read-mostly production-readiness audit.

During the initial audit:

- Do not perform repository-wide rewrites.
- Do not change application behavior unless a minimal change is necessary to safely run diagnostics.
- Do not deploy to production.
- Do not modify production data.
- Do not expose or copy secrets.
- Do not weaken security controls.
- Create evidence-backed findings in `docs/codex/AUDIT.md`.
- Create a dependency-aware implementation sequence in `docs/codex/EXECUTION_PLAN.md`.

Implementation may begin only when the relevant issue has:

- A finding ID.
- Evidence.
- Reproduction steps or a clearly documented inspection method.
- A proposed fix.
- Regression risks.
- Required tests.
- Verification criteria.
- A rollback method.

## Functionality Preservation

Existing calculations, formulas, business rules, search behavior, filtering, sorting, ranking, permissions, workflows, APIs, database relationships, and user-visible features are protected behavior.

Before changing important logic:

1. Identify the current inputs, outputs, edge cases, side effects, and consumers.
2. Locate every implementation of the same rule.
3. Add characterization, contract, or golden tests representing valid current behavior.
4. Determine whether the behavior is correct, incorrect, ambiguous, or undocumented.
5. Preserve APIs and data contracts unless a documented migration is necessary.
6. Improve correctness, clarity, testability, or performance without deleting capability.
7. Record intentional behavior changes in `docs/codex/CHANGELOG.md`.

Never silently change:

- Numerical precision.
- Rounding.
- Currency handling.
- Tax, fee, total, discount, or pricing behavior.
- Date and timezone behavior.
- Locale behavior.
- Search ranking.
- Filtering or sorting semantics.
- Eligibility rules.
- Authorization rules.
- Validation constraints.
- Pagination semantics.
- Idempotency behavior.
- User-visible success or failure conditions.

Never simplify business logic merely because it is difficult to understand.

## Production and Data Safety

- Never make destructive production changes directly.
- Never delete, truncate, overwrite, or fabricate production data to solve a development problem.
- Do not run irreversible database migrations.
- Do not run unreviewed migrations against production.
- Every migration must include validation, compatibility notes, rollout order, backup requirements, and rollback instructions.
- Prefer expand-and-contract migrations for breaking schema changes.
- Do not remove a column, table, policy, index, function, or API contract until all consumers have migrated and rollback is no longer required.
- Protect against duplicate writes, partial writes, race conditions, and retries.
- Use staging, local development, or an isolated test environment for verification.
- Treat backups as unproven until restoration has been tested.

## Secrets and Credentials

- Never expose secrets, tokens, cookies, private keys, connection strings, or privileged environment variables.
- Never commit real secrets.
- Never log secrets or sensitive personal data.
- Never place Supabase service-role credentials or other privileged keys in browser-accessible code.
- Use the least-privileged credentials required for each operation.
- Keep `.env` files out of version control.
- Update `.env.example` only with names and safe descriptions, never real values.
- If a secret appears committed or exposed, treat it as compromised and document required rotation.

## Authentication and Authorization

Authentication proves identity; authorization grants access. Never treat them as interchangeable.

For every sensitive operation:

- Verify authorization on the server or trusted database boundary.
- Do not rely only on hidden UI controls.
- Verify resource ownership and role requirements.
- Review Supabase Row Level Security policies.
- Review storage-bucket policies.
- Prevent horizontal and vertical privilege escalation.
- Avoid user enumeration.
- Validate session-expiry and revoked-session behavior.
- Do not bypass RLS using privileged credentials unless the operation is intentionally server-side, narrowly scoped, and independently authorized.

## Input, Output, and Abuse Safety

Review and protect against:

- SQL injection.
- Cross-site scripting.
- Command injection.
- Path traversal.
- Unsafe redirects.
- Server-side request forgery where applicable.
- Cross-site request forgery where applicable.
- Malicious file uploads.
- Oversized payloads.
- Automated abuse.
- Enumeration.
- Duplicate submissions.
- Replay attacks.
- Webhook forgery.
- Excessive database or API usage.
- Sensitive data in errors.

Validate at trusted boundaries. Client-side validation is for user experience, not security.

## Scope Control

Do not combine unrelated architectural rewrites, dependency replacements, formatting changes, feature changes, and bug fixes in one change.

Separate work into risk-ranked workstreams:

1. Exposed secrets, unauthorized access, and data-loss risks.
2. Incorrect calculations and data-integrity defects.
3. Broken critical user journeys.
4. Reliability and error handling.
5. Database and backend performance.
6. Frontend rendering and interaction performance.
7. Responsive design and accessibility.
8. Maintainability and code organization.
9. Cost optimization.
10. Non-critical visual polish.

## Code Quality

Code must be understandable by a future developer or coding assistant without relying on hidden context.

- Prefer clear names and small cohesive modules.
- Keep business logic separate from presentation and infrastructure concerns.
- Keep components focused.
- Avoid unnecessary abstraction and premature generalization.
- Document non-obvious decisions, contracts, and invariants.
- Follow the repository's established package manager, formatter, linter, type checker, framework, and testing conventions.
- Preserve the existing lockfile and package manager.
- Do not manually edit generated files unless the generating workflow requires it.
- Do not introduce a new dependency when the existing stack can solve the problem adequately.
- Explain every new production dependency, including purpose, maintenance status, security implications, bundle or runtime impact, and free alternatives.
- Remove confirmed dead code only after proving it is unused.
- Consolidate duplication only when behavior is equivalent and protected by tests.
- Avoid repository-wide formatting changes unless formatting itself is the approved task.
- Keep public interfaces stable unless a migration plan is documented.

## Comments and Documentation

Use comments to explain:

- Why a non-obvious choice exists.
- Important invariants.
- Security assumptions.
- Data consistency constraints.
- Compatibility requirements.
- Non-trivial performance tradeoffs.

Do not add comments that merely restate syntax.

Update documentation when changing:

- Environment variables.
- Setup steps.
- Scripts.
- Architecture.
- APIs.
- Database schema.
- Migrations.
- User-visible behavior.
- Operational procedures.
- Deployment or rollback steps.

## Performance Method

Investigate performance with measurements rather than assumptions.

Establish baselines for representative routes and user journeys. Review:

- Initial page loading.
- Server response time.
- Client and server rendering.
- Hydration.
- JavaScript bundle size.
- Images and fonts.
- Search and filtering.
- Scrolling and long lists.
- Animations.
- Network waterfalls.
- Duplicate requests.
- Caching.
- Database query plans.
- Missing or ineffective indexes.
- N+1 queries.
- Large payloads.
- Memory leaks.
- Re-renders.
- Loading, empty, error, and retry states.
- Slow and unreliable networks.
- Low-powered mobile devices.
- Timeouts and cancellation.
- Third-party scripts.
- Serverless cold starts where applicable.

Each optimization must include:

- Baseline measurement.
- Root cause.
- Change.
- Post-change measurement.
- Correctness verification.
- Regression risk.
- Rollback method.

Do not hide performance problems by removing important functionality.

## Search and Scroll Requirements

Search must be tested for:

- Empty queries.
- Leading and trailing whitespace.
- Case behavior.
- Special characters.
- Rapid typing.
- Request cancellation.
- Out-of-order responses.
- No results.
- Large result sets.
- Pagination or infinite loading.
- Error and retry behavior.
- Keyboard and screen-reader use.
- Mobile keyboards.
- Slow connections.

Scrolling and long pages must be tested for:

- Main-thread blocking.
- Expensive scroll listeners.
- Repeated layout measurement.
- Layout shifts.
- Sticky and fixed element conflicts.
- Virtualized list behavior, if used.
- Restored scroll position.
- Modal scroll locking.
- Overscroll and nested scrolling.
- Memory growth during extended use.

## Responsive and Accessible UX

Validate important flows across at least:

- 320 × 568.
- 360 × 800.
- 375 × 667.
- 390 × 844.
- 412 × 915.
- 768 × 1024.
- 820 × 1180.
- 1024 × 768.
- 1280 × 720.
- 1366 × 768.
- 1440 × 900.
- 1920 × 1080.

Also test:

- Portrait and landscape.
- Touch, mouse, and keyboard.
- Browser zoom at 200% where practical.
- Increased text size.
- Long labels.
- Long unbroken content.
- User-generated content.
- Loading, empty, offline, permission-denied, validation, and server-error states.
- Reduced-motion preference.
- Dark and light modes if supported.
- Major browsers supported by the project.

Check for:

- Overflow and clipping.
- Unexpected horizontal scrolling.
- Layout shift.
- Unreadable text.
- Small touch targets.
- Missing labels.
- Broken focus order.
- Invisible focus.
- Inaccessible dialogs.
- Trapped or lost focus.
- Accidental double actions.
- Blocked scrolling.
- Hidden critical functionality.
- Incorrect semantic structure.
- Missing status announcements.
- Contrast failures.
- Motion that causes discomfort.

Do not solve mobile layout problems by hiding necessary functionality.

## Error Handling and Reliability

Every asynchronous user action must have a defined:

- Idle state.
- Loading state.
- Success state.
- Empty state where applicable.
- Validation-error state.
- Authorization-error state.
- Network-error state.
- Server-error state.
- Timeout behavior.
- Retry behavior where safe.
- Duplicate-submission protection.
- Cancellation behavior where relevant.

The interface must never show success when persistence failed.

Errors shown to users must be actionable without revealing sensitive implementation details.

Operational logs must contain enough context to diagnose failures without exposing secrets or personal data.

## Supabase Requirements

Inspect and verify:

- Client creation and environment separation.
- Use of anonymous versus service-role credentials.
- Row Level Security coverage.
- RLS policy correctness and performance.
- Storage policies.
- Database constraints.
- Foreign keys and deletion behavior.
- Indexes and query plans.
- Pagination.
- Realtime subscriptions and cleanup.
- Database functions and triggers.
- Migration ordering.
- Type generation and schema drift.
- Transactional requirements.
- Retry and idempotency behavior.
- Privileged server operations.
- Exposure through views or RPC functions.

Do not assume RLS is correct because it is enabled. Test policies using multiple identities and roles.

## Vercel Requirements

Inspect and verify:

- Build settings.
- Framework and runtime configuration.
- Environment-variable scopes.
- Preview versus production behavior.
- Serverless or edge runtime compatibility.
- Caching and revalidation behavior.
- Redirects, rewrites, and headers.
- Function duration and memory requirements.
- Logs and observability.
- Cron jobs if present.
- Deployment protection where applicable.
- Rollback availability.
- Domain and HTTPS behavior.
- Preview-deployment testing.

Do not deploy to production without explicit authorization.

## GitHub and Pull Request Requirements

- Work on a branch or isolated worktree.
- Keep changes reviewable.
- Use descriptive commits.
- Do not force-push shared branches.
- Do not bypass required checks.
- Do not merge with failing required checks.
- Include risk, testing, screenshots or measurements where relevant, migration notes, and rollback instructions in the pull request.
- Use independent review for security-sensitive, migration, authentication, authorization, payment, calculation, or high-risk changes.
- Treat automated review as additional evidence, not a substitute for tests and human review.

## Testing Strategy

Use the repository's existing test stack where possible.

Add the lowest-cost test that adequately protects behavior:

1. Pure unit tests for calculations and deterministic business logic.
2. Component tests for interactive UI behavior.
3. Integration tests for database and service boundaries.
4. Contract tests for APIs and data shapes.
5. End-to-end tests for critical user journeys.
6. Load tests for capacity assumptions.
7. Manual exploratory checks for visual and device-specific behavior.

Tests must cover meaningful behavior and failure cases, not merely increase coverage numbers.

Do not delete or weaken a valid test to make a change pass.

## Cost Constraints

The project has limited funds.

For every paid, trial-limited, or usage-based service:

- Document its purpose.
- Document the current free allowance where known.
- Identify likely cost drivers.
- Identify scaling thresholds.
- Assess lock-in and data portability.
- Compare free or open-source alternatives.
- Include operational burden, security, backups, monitoring, and maintenance in the comparison.
- Prefer no-cost improvements when reliability and security remain acceptable.

Do not replace a reliable managed service merely because another option is nominally free.

## Required Deliverables

Maintain these files throughout the work:

- `docs/codex/AUDIT.md`
- `docs/codex/EXECUTION_PLAN.md`
- `docs/codex/VERIFICATION.md`
- `docs/codex/CHANGELOG.md`
- `docs/codex/ROLLBACK.md`

Every confirmed finding must include:

- Unique ID.
- Category.
- Severity.
- Confidence.
- Evidence.
- Affected files and flows.
- Reproduction steps.
- Technical cause.
- User or business impact.
- Security or data impact.
- Proposed fix.
- Regression risk.
- Tests required.
- Verification method.
- Rollback method.
- Dependencies.

## Severity Definitions

### P0 — Critical

An active or easily exploitable issue that can cause major unauthorized access, secret exposure, irreversible data loss, severe corruption, or complete outage. Stop unrelated work and escalate.

### P1 — High

A serious security, correctness, reliability, or critical-flow issue with substantial user or business impact. Prioritize before launch.

### P2 — Medium

A meaningful but contained issue affecting performance, accessibility, maintainability, non-critical flows, or resilience. Fix according to the execution plan.

### P3 — Low

Minor polish, cleanup, low-risk optimization, or documentation improvement with limited user impact.

## Definition of Done

Work is not complete until:

- Relevant automated tests pass.
- Type checking passes.
- Linting passes.
- Production build passes.
- Critical user flows have been tested end to end.
- Responsive behavior has been checked.
- Accessibility implications have been reviewed.
- Security implications have been reviewed.
- Database changes have been validated.
- Performance has been compared with the baseline.
- No protected calculation or legitimate feature was removed.
- Failure and edge states were tested.
- Documentation was updated.
- Verification evidence was recorded.
- Rollback instructions were updated.
- The final diff received an independent review appropriate to its risk.

## Mandatory Final Report

At the end of each task, report:

1. What changed.
2. Why it changed.
3. Files changed.
4. Tests and checks run.
5. Results and measurements.
6. Known limitations.
7. Risks that remain.
8. Manual verification still required.
9. Rollback method.
10. Whether production deployment was performed.

Never use phrases such as “looks good,” “should work,” or “probably fixed” as verification.
