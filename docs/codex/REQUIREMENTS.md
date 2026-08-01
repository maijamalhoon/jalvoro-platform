# Jalvoro Production Readiness Requirements

## Document Status

- Owner: Jalvoro repository owner
- Audience: Codex agents, developers, reviewers, and future maintainers
- Status: Active
- Scope: Entire application, infrastructure configuration, database integration, deployment setup, and critical user journeys

## Objective

Prepare Jalvoro for a safe public launch and future growth by deeply auditing and improving the product from the user's first interaction to the final outcome.

This is not a cosmetic review. Investigate architecture, implementation, business logic, infrastructure, database behavior, security boundaries, user experience, performance, operational reliability, accessibility, and maintainability.

No document can guarantee zero defects or unlimited scale. The required standard is evidence-backed risk reduction, measurable behavior, tested critical paths, controlled rollout, monitoring, and rollback readiness.

## Business Constraints

- Budget is extremely limited.
- Prefer free-tier, open-source, or existing-stack solutions when they meet security and reliability requirements.
- Avoid unnecessary migrations to new vendors or frameworks.
- Do not introduce operational complexity that the owner cannot maintain.
- Thousands of users may arrive after launch; capacity assumptions must be tested rather than asserted.
- Existing calculations and functionality must be improved where defective, not removed to simplify development.

## Non-Negotiable Product Requirements

- Preserve all legitimate existing features and user flows.
- Preserve and protect calculations, formulas, and business rules.
- Improve incorrect or fragile logic rather than deleting it.
- Prevent silent failures and misleading success states.
- Provide understandable loading, empty, error, retry, offline, and permission states.
- Avoid freezes, blocked interaction, duplicate submissions, and unresponsive controls.
- Maintain usable behavior across mobile, tablet, laptop, and large desktop screens.
- Keep the codebase readable and safe to modify later.
- Do not trade security, correctness, or data integrity for apparent speed.
- Do not introduce an avoidable paid dependency.
- Do not claim production readiness without evidence.
- Do not directly change production without explicit authorization and a rollback plan.

## Success Criteria

Jalvoro is considered ready for controlled launch only when:

- No unresolved P0 finding remains.
- Every unresolved P1 finding has either been fixed or explicitly accepted by the owner with mitigation.
- Critical business calculations have automated protection.
- Critical user journeys pass end-to-end verification.
- Authentication and authorization boundaries have been tested.
- Supabase RLS and storage policies have been tested with multiple identities.
- A production build succeeds from a clean environment.
- Responsive and accessibility checks cover representative screens and states.
- Performance baselines and post-change measurements exist.
- Capacity tests document their workload, environment, limitations, and results.
- Error monitoring and actionable logging exist.
- Backup and rollback procedures are documented.
- A production-like staging or preview deployment has been verified.
- Known limitations are disclosed.

## Phase 1 — Discovery and Baseline

Map and document:

- Repository structure.
- Frameworks and runtimes.
- Package manager and scripts.
- Application entry points.
- Routes and layouts.
- Public and protected user flows.
- Authentication and authorization.
- Supabase clients and privileged operations.
- Database tables, relationships, indexes, functions, triggers, and policies.
- API routes, server actions, jobs, webhooks, and external services.
- Search, filters, pagination, and sorting.
- Business calculations and shared utilities.
- State management and caching.
- Environment variables and deployment configuration.
- Vercel build and runtime configuration.
- GitHub workflows and branch protections visible to the agent.
- Logging, analytics, and monitoring.
- Existing tests and missing coverage.
- Current failures, warnings, and technical debt.
- Paid and usage-based dependencies.
- Data-classification and privacy assumptions.

### Required Baseline Commands

Use repository-defined commands whenever available. Record exact commands and results for:

- Dependency installation from a clean state.
- Formatting check.
- Linting.
- Type checking.
- Unit tests.
- Integration tests.
- End-to-end tests.
- Production build.
- Dependency audit.
- Bundle analysis, if available.
- Database checks, if safely available.
- Preview or staging smoke test, if accessible.

Do not invent commands. If a command does not exist, record the gap.

## Phase 2 — Critical User Journey Inventory

Identify and document every important journey, including applicable variants:

- First visit.
- Landing-page navigation.
- Registration.
- Login.
- Logout.
- Session restoration.
- Session expiration.
- Password or account recovery.
- Email verification.
- Onboarding.
- Profile creation and editing.
- Search.
- Filtering.
- Sorting.
- Pagination or infinite scrolling.
- Viewing details.
- Creating user-owned data.
- Editing user-owned data.
- Deleting or archiving user-owned data.
- Uploading and removing files.
- Saving drafts.
- Submitting forms.
- Confirmation and final success states.
- Administrative or privileged operations.
- Back and forward navigation.
- Refresh during an operation.
- Deep links.
- Invalid or expired links.
- Slow network.
- Offline transition.
- Permission denial.
- Empty results.
- Server failure.
- Invalid input.
- Deleted or stale records.
- Repeated clicks.
- Concurrent edits.
- Mobile keyboard behavior.
- Long content and user-generated content.

For each journey, document:

- Entry point.
- Required identity and permissions.
- Preconditions.
- Steps.
- API and database interactions.
- Expected success outcome.
- Failure states.
- Data written or read.
- Security boundary.
- Devices and viewport coverage.
- Automated and manual test coverage.
- Observability requirements.

## Phase 3 — Correctness and Business Logic

For each calculation and important decision:

- Identify its source of truth.
- Trace all inputs and consumers.
- Check null, empty, negative, zero, maximum, minimum, malformed, and extreme inputs.
- Check rounding and numerical precision.
- Check currency and localization.
- Check date, time, daylight-saving, and timezone behavior where relevant.
- Check ordering, ranking, filtering, and sorting stability.
- Detect duplicated or conflicting implementations.
- Check client/server consistency.
- Check persisted versus calculated values.
- Check stale-data behavior.
- Check concurrency and retry behavior.
- Add characterization or golden tests for valid existing behavior.
- Fix confirmed defects without changing unrelated behavior.
- Document unresolved product-rule ambiguity instead of guessing.

### Protected Logic Change Procedure

A business-logic change is allowed only when the change includes:

1. A finding ID.
2. Current behavior examples.
3. Expected behavior examples.
4. Automated tests for unchanged behavior.
5. Automated tests for the defect.
6. Reasoning for the correction.
7. Impacted consumers.
8. Migration or compatibility notes, if needed.
9. Verification evidence.
10. Rollback instructions.

## Phase 4 — Security Review

Review at minimum:

- Authentication lifecycle.
- Session storage and refresh.
- Session invalidation.
- Authorization on every sensitive operation.
- Supabase Row Level Security.
- Supabase storage policies.
- Privileged keys and environment variables.
- Client/server trust boundaries.
- Input validation.
- Output encoding.
- SQL injection.
- Cross-site scripting.
- Cross-site request forgery where applicable.
- Open redirects.
- Unsafe URL handling.
- Server-side request forgery where applicable.
- File upload restrictions.
- Rate limiting and abuse paths.
- Enumeration of users or private records.
- Sensitive information in logs, URLs, analytics, and errors.
- Dependency and supply-chain risk.
- Account recovery.
- Privilege escalation.
- Administrative functions.
- Webhook authenticity and replay protection.
- CORS behavior.
- Security headers.
- Cache exposure of private content.
- Access after account or permission changes.
- Insecure direct object references.
- Multi-tenant isolation if applicable.
- Personal-data retention and deletion behavior.
- Preview and staging environment exposure.

Provide proof for every serious finding. Do not weaken controls to make tests pass.

## Phase 5 — Backend and Supabase Health

Investigate:

- Slow queries.
- Missing, redundant, or ineffective indexes.
- Query plans.
- N+1 access patterns.
- Over-fetching.
- Repeated requests.
- Unbounded result sets.
- Incorrect pagination.
- Offset pagination problems on large or changing datasets.
- Race conditions.
- Duplicate writes.
- Non-idempotent operations.
- Transaction boundaries.
- Connection and timeout behavior.
- Retry safety.
- Database constraints.
- Orphaned records.
- Inconsistent validation.
- RLS correctness.
- RLS performance.
- Storage usage and policies.
- Realtime subscriptions and cleanup.
- Error propagation.
- Migration safety.
- Schema drift.
- Generated types.
- Database functions and triggers.
- Privileged RPC functions.
- Cascading deletion behavior.
- Concurrency conflicts.
- Auditability of sensitive changes.
- Backup and restoration assumptions.

All database changes must be reversible or have a documented forward-recovery plan.

## Phase 6 — Frontend Performance

Profile representative pages and flows on both desktop and constrained mobile conditions.

Investigate:

- Slow initial rendering.
- Time to first meaningful content.
- Interaction delay.
- Server response time.
- Excessive hydration.
- Unnecessary client components.
- Repeated component renders.
- Large JavaScript bundles.
- Route-level code splitting.
- Image dimensions and formats.
- Font loading.
- Layout shifts.
- Long main-thread tasks.
- Expensive effects.
- Leaking or duplicated event listeners.
- Memory leaks.
- Scroll handlers.
- Search latency.
- Debouncing and cancellation.
- Out-of-order responses.
- Long lists.
- Pagination.
- Animation cost.
- Duplicate network requests.
- Cache behavior.
- Stale data.
- Loading waterfalls.
- Failed or interrupted navigation.
- Third-party scripts.
- Unnecessary prefetching.
- Serverless cold starts.
- Oversized API payloads.
- Repeated serialization.
- Client-side data waterfalls.
- Mobile CPU and memory pressure.

Each optimization must include before-and-after evidence and correctness verification.

## Phase 7 — Search Quality and Reliability

Search must be verified for:

- Empty input.
- Whitespace normalization.
- Case behavior.
- Special characters.
- Punctuation.
- Unicode.
- Misspellings if fuzzy search is intended.
- Rapid typing.
- Request debouncing.
- Request cancellation.
- Out-of-order responses.
- Duplicate requests.
- No-result state.
- Error state.
- Retry state.
- Very large result sets.
- Pagination consistency.
- Stable ordering.
- Authorization filtering.
- Private-data leakage.
- Keyboard navigation.
- Screen-reader announcements.
- Mobile keyboard behavior.
- Slow network.
- Offline interruption.
- Back-navigation restoration.
- Analytics or logs that could leak search terms.

## Phase 8 — Scrolling and Interaction Smoothness

Investigate:

- Main-thread blocking.
- Expensive scroll events.
- Passive event-listener use where appropriate.
- Repeated layout reads and writes.
- Forced synchronous layout.
- Sticky and fixed element conflicts.
- Layout shifts.
- Infinite-scroll termination.
- Virtualization correctness.
- Focus management after loading more content.
- Restored scroll position.
- Modal and drawer scroll locking.
- Nested scrolling.
- Overscroll.
- Touch gesture conflicts.
- Memory growth during long sessions.
- Animation under reduced-motion settings.
- Low-powered mobile behavior.

Do not introduce virtualization unless list size and measurements justify its complexity.

## Phase 9 — End-to-End User Experience

The interface must:

- Clearly communicate current state.
- Prevent accidental duplicate actions.
- Preserve entered data where reasonable after recoverable errors.
- Never display success before persistence is confirmed.
- Provide actionable errors.
- Avoid exposing internal stack traces or sensitive identifiers.
- Keep navigation predictable.
- Avoid trapping the user.
- Handle stale records and permission changes.
- Support keyboard-only operation for critical flows.
- Remain usable on constrained mobile screens.
- Fail safely when dependencies are unavailable.

## Phase 10 — Responsive Design and Accessibility

Test representative pages at all viewport sizes listed in `AGENTS.md`.

Check:

- Content hierarchy.
- Overflow.
- Fixed and sticky elements.
- Navigation.
- Forms.
- Tables.
- Dialogs.
- Drawers.
- Dropdowns.
- Tooltips.
- Toasts.
- Search results.
- Images.
- Empty states.
- Error states.
- Keyboard operation.
- Visible focus.
- Semantic structure.
- Labels and accessible names.
- Contrast.
- Screen-reader announcements.
- Reduced-motion preferences.
- Zoom.
- Text resizing.
- Long translated or user-generated content.
- Touch target size.
- Orientation changes.
- Browser back behavior with overlays.
- Safe areas on mobile devices.

Do not hide required functionality to make a narrow layout appear clean.

## Phase 11 — Maintainability

After correctness tests exist:

- Organize modules by responsibility.
- Extract business logic from UI code.
- Centralize shared validation and types when appropriate.
- Remove confirmed dead code.
- Consolidate genuine duplication.
- Normalize error handling.
- Improve naming.
- Reduce oversized files and components.
- Document architecture and important invariants.
- Preserve public interfaces unless a migration is documented.
- Avoid a repository-wide rewrite.
- Avoid speculative abstractions.
- Keep tests close to protected behavior.
- Keep generated code and handwritten code clearly separated.
- Avoid mixing server-only and client-safe modules.
- Prevent circular dependencies.
- Review boundaries between UI, domain, data, and infrastructure layers.

## Phase 12 — Cost Review

Inventory all paid, trial-limited, or usage-based services.

For each one, document:

- Current purpose.
- Current usage.
- Free allowance, if verified.
- Expected scaling point.
- Cost drivers.
- Lock-in risk.
- Data portability.
- Security implications.
- Self-hosted or open-source alternatives.
- Operational burden of each alternative.
- Backup requirements.
- Monitoring requirements.
- Migration risk.
- Recommended action.

Do not replace a reliable service solely because an alternative is free. Include maintenance, backups, security, downtime, and owner skill requirements in the comparison.

## Phase 13 — Testing Requirements

At minimum, protect:

- Critical calculations.
- Authentication.
- Authorization.
- RLS policies.
- Data ownership.
- Critical create, read, update, and delete flows.
- Search.
- Filtering and sorting.
- Pagination.
- Duplicate submission prevention.
- Error handling.
- Session expiry.
- File upload restrictions if applicable.
- Critical responsive flows.
- Critical accessibility interactions.
- Database migrations.
- Production build.

Testing must include both happy paths and failure paths.

## Phase 14 — Observability and Operations

Define:

- Structured application logging.
- Request or correlation identifiers where practical.
- Error reporting.
- Performance monitoring.
- Database health indicators.
- Deployment health checks.
- Alert thresholds.
- Log redaction.
- Retention.
- Ownership of alerts.
- Runbooks.
- Incident severity.
- Incident communication.
- Backup schedule.
- Restoration verification.
- Rollback triggers.
- Post-deployment checks.

Monitoring must not collect unnecessary sensitive data.

## Phase 15 — Capacity and Load Validation

A statement such as “supports thousands of users” is invalid without a workload model.

Document:

- Expected concurrent users.
- Requests per user.
- Read/write ratio.
- Search frequency.
- Payload sizes.
- Expensive routes.
- Database query mix.
- Realtime usage.
- File-upload behavior.
- Cache assumptions.
- Test environment.
- Test data volume.
- Test duration.
- Success thresholds.
- Error thresholds.
- Latency percentiles.
- Resource limits.
- Results.
- Limitations and differences from production.

Load tests must not target production without explicit approval and safeguards.

## Phase 16 — Production Readiness

Before launch:

- Create or verify a production-like staging environment.
- Verify migrations against a safe database copy.
- Run representative concurrency and load tests.
- Test critical flows under failures and slow dependencies.
- Confirm logs do not contain secrets.
- Confirm monitoring and actionable error reporting.
- Define health checks and alert conditions.
- Define backup and restoration procedures.
- Define rollback criteria.
- Use a staged rollout where possible.
- Re-run critical user journeys after deployment.
- Confirm environment-variable scope.
- Confirm domain, HTTPS, redirects, and caching.
- Confirm privacy-sensitive pages are not publicly cached.
- Confirm preview deployments do not expose production secrets or data.

## Completion Reporting

The final report must clearly separate:

- Fixed and verified issues.
- Partially mitigated risks.
- Unresolved risks.
- Product decisions requiring owner input.
- Capacity assumptions that were not proven.
- Items deferred because of cost or infrastructure limitations.
- Manual checks still required.
- Production changes actually performed.
- Rollback readiness.

Do not use “looks good,” “should work,” or “probably fixed” as verification.
