# Jalvoro Verification Record

## Purpose

This document records objective evidence that changes behave correctly, securely, responsively, and efficiently.

A successful build alone is not verification.

## Status

- Verification state: Not started
- Last updated: YYYY-MM-DD
- Baseline commit: `<commit-sha>`
- Candidate commit: `<commit-sha>`
- Environment: `<local | preview | staging | production>`
- Verifier: Unassigned

## Evidence Rules

- Record exact commands.
- Record relevant environment information.
- Record pass, fail, skipped, or blocked.
- Do not paste secrets or sensitive personal data.
- Store large artifacts in an approved location and reference them.
- Use equivalent conditions for before/after comparisons.
- Repeat noisy performance measurements.
- Separate automated checks from manual checks.
- A check marked `BLOCKED` must state why and what is needed.
- Do not mark a finding verified until its defined success criteria pass.

## Result Values

- `PASS`
- `FAIL`
- `PARTIAL`
- `BLOCKED`
- `NOT_RUN`
- `NOT_APPLICABLE`

## Clean Baseline Verification

| Check | Exact Command | Environment | Result | Duration | Notes |
|---|---|---|---|---:|---|
| Install | TBD | Clean checkout | NOT_RUN | — | — |
| Format | TBD | Local/CI | NOT_RUN | — | — |
| Lint | TBD | Local/CI | NOT_RUN | — | — |
| Type check | TBD | Local/CI | NOT_RUN | — | — |
| Unit tests | TBD | Local/CI | NOT_RUN | — | — |
| Integration tests | TBD | Safe test environment | NOT_RUN | — | — |
| E2E tests | TBD | Preview/staging | NOT_RUN | — | — |
| Production build | TBD | Clean environment | NOT_RUN | — | — |
| Dependency audit | TBD | Local/CI | NOT_RUN | — | — |

## Verification Case Template

Copy this block for every finding or plan item.

---

### VER-XXX — Concise Verification Title

- **Finding:** `FINDING-XXX`
- **Plan:** `PLAN-XXX`
- **Candidate commit:** `<commit-sha>`
- **Environment:** `<environment>`
- **Verifier:** Unassigned
- **Date:** YYYY-MM-DD
- **Overall result:** NOT_RUN

#### Preconditions

- State required identity, data, flags, environment variables, and setup.
- Use synthetic or approved test data.
- Confirm no production mutation unless explicitly authorized.

#### Protected Behavior

List behavior that must remain unchanged.

#### Automated Checks

| Check | Command/Test | Expected | Actual | Result |
|---|---|---|---|---|
| Regression test | TBD | Pass | Not run | NOT_RUN |

#### Manual Steps

1. Step one.
2. Step two.
3. Observe the result.

#### Expected Results

List objective results.

#### Actual Results

Record observations.

#### Security Verification

State identities, permissions, negative tests, and data isolation checks.

#### Performance Verification

State device, network, build mode, sample count, before/after measurements, and variance.

#### Responsive Verification

State tested viewports, orientation, input method, zoom, and content conditions.

#### Accessibility Verification

State keyboard, focus, semantics, names, contrast, screen-reader, reduced-motion, and zoom results as applicable.

#### Data Verification

State database rows, constraints, invariants, query plans, and cleanup.

#### Error and Recovery Verification

Test network failure, server failure, invalid input, duplicate action, timeout, retry, refresh, and stale state where relevant.

#### Evidence

Reference screenshots, videos, logs, traces, reports, test output, or query plans. Redact sensitive information.

#### Limitations

State what was not proven.

#### Rollback Verification

State whether rollback was tested, simulated, inspected, or blocked.

#### Final Decision

`PASS | FAIL | PARTIAL | BLOCKED`

---

## Critical User Journey Verification

Replace generic entries with actual journeys from `AUDIT.md`.

| Journey ID | Journey | Identity | Environment | Mobile | Desktop | Failure States | Result | Evidence |
|---|---|---|---|---|---|---|---|---|
| J-001 | First visit | Anonymous | TBD | NOT_RUN | NOT_RUN | NOT_RUN | NOT_RUN | — |
| J-002 | Registration | Anonymous | TBD | NOT_RUN | NOT_RUN | NOT_RUN | NOT_RUN | — |
| J-003 | Login/logout | User | TBD | NOT_RUN | NOT_RUN | NOT_RUN | NOT_RUN | — |
| J-004 | Search | Applicable users | TBD | NOT_RUN | NOT_RUN | NOT_RUN | NOT_RUN | — |
| J-005 | Primary action | TBD | TBD | NOT_RUN | NOT_RUN | NOT_RUN | NOT_RUN | — |
| J-006 | Final success state | TBD | TBD | NOT_RUN | NOT_RUN | NOT_RUN | NOT_RUN | — |

## Business Logic Verification

### Golden Test Matrix

| Logic ID | Scenario | Input | Expected | Actual | Test Location | Result |
|---|---|---|---|---|---|---|
| L-001 | Nominal | TBD | TBD | Not run | TBD | NOT_RUN |
| L-001 | Boundary | TBD | TBD | Not run | TBD | NOT_RUN |
| L-001 | Invalid | TBD | TBD | Not run | TBD | NOT_RUN |

### Logic Comparison

For changed calculations, compare representative old and new results.

| Logic ID | Case | Old Result | New Result | Intended Difference | Reviewed |
|---|---|---|---|---|---|
| L-001 | TBD | TBD | TBD | None or documented fix | No |

## Authentication and Authorization Verification

Use separate test identities. Never use another real user's private data.

| Operation | Anonymous | Owner/User A | Other User/User B | Admin if applicable | Expected | Result |
|---|---|---|---|---|---|---|
| Read public record | TBD | TBD | TBD | TBD | TBD | NOT_RUN |
| Read private record | TBD | TBD | TBD | TBD | TBD | NOT_RUN |
| Create record | TBD | TBD | TBD | TBD | TBD | NOT_RUN |
| Update own record | TBD | TBD | TBD | TBD | TBD | NOT_RUN |
| Update other's record | TBD | TBD | TBD | TBD | Denied | NOT_RUN |
| Delete own record | TBD | TBD | TBD | TBD | TBD | NOT_RUN |
| Delete other's record | TBD | TBD | TBD | TBD | Denied | NOT_RUN |
| Privileged action | Denied | Denied/TBD | Denied | Allowed | TBD | NOT_RUN |

### Session Cases

| Case | Expected | Result | Evidence |
|---|---|---|---|
| Valid session restored | User remains authenticated safely | NOT_RUN | — |
| Expired session | Safe re-authentication path | NOT_RUN | — |
| Revoked session | Access denied | NOT_RUN | — |
| Logout | Session unusable afterward | NOT_RUN | — |
| Permission changed mid-session | New permissions enforced | NOT_RUN | — |

## Supabase RLS Verification

| Table | Operation | Identity | Expected | Actual | Result | Evidence |
|---|---|---|---|---|---|---|
| TBD | SELECT | Anonymous | TBD | Not run | NOT_RUN | — |
| TBD | SELECT | Owner | TBD | Not run | NOT_RUN | — |
| TBD | SELECT | Other user | Denied or filtered | Not run | NOT_RUN | — |
| TBD | INSERT | Owner | TBD | Not run | NOT_RUN | — |
| TBD | UPDATE | Other user | Denied | Not run | NOT_RUN | — |
| TBD | DELETE | Other user | Denied | Not run | NOT_RUN | — |

## Database and Migration Verification

| Migration/Change | Apply Test | Compatibility Test | Data Validation | Rollback/Recovery | Result |
|---|---|---|---|---|---|
| TBD | NOT_RUN | NOT_RUN | NOT_RUN | NOT_RUN | NOT_RUN |

### Data Invariants

| Invariant | Before | After | Query/Method | Result |
|---|---:|---:|---|---|
| No orphaned rows | TBD | TBD | TBD | NOT_RUN |
| Unique constraint respected | TBD | TBD | TBD | NOT_RUN |
| Required ownership present | TBD | TBD | TBD | NOT_RUN |
| Valid state values only | TBD | TBD | TBD | NOT_RUN |

### Query Plan Comparison

| Query ID | Dataset | Before Plan/Time | After Plan/Time | Rows | Result |
|---|---|---|---|---:|---|
| Q-001 | TBD | Not captured | Not captured | TBD | NOT_RUN |

## Search Verification

| Case | Expected | Result | Evidence |
|---|---|---|---|
| Empty query | Defined empty or default state | NOT_RUN | — |
| Whitespace | Normalized safely | NOT_RUN | — |
| Case variation | Defined behavior | NOT_RUN | — |
| Special characters | No crash/injection | NOT_RUN | — |
| Unicode | Correct behavior | NOT_RUN | — |
| Rapid typing | No stale result overwrite | NOT_RUN | — |
| Canceled request | Safe cleanup | NOT_RUN | — |
| No results | Clear empty state | NOT_RUN | — |
| API failure | Actionable retry/error | NOT_RUN | — |
| Large results | Correct pagination/performance | NOT_RUN | — |
| Authorization filter | No private leakage | NOT_RUN | — |
| Keyboard navigation | Operable | NOT_RUN | — |
| Screen-reader status | Announced | NOT_RUN | — |
| Mobile keyboard | Usable | NOT_RUN | — |
| Slow network | Responsive and cancelable | NOT_RUN | — |

## Scrolling and Long-Session Verification

| Case | Expected | Measurement | Result |
|---|---|---|---|
| Long page scroll | No sustained main-thread blocking | TBD | NOT_RUN |
| Infinite loading | No duplicates or missed rows | TBD | NOT_RUN |
| Sticky/fixed UI | No overlap | Visual | NOT_RUN |
| Modal open/close | Scroll lock restored | Manual | NOT_RUN |
| Back navigation | Scroll state as designed | Manual | NOT_RUN |
| Extended session | No unbounded memory growth | TBD | NOT_RUN |
| Reduced motion | Motion reduced appropriately | Manual | NOT_RUN |

## Frontend Performance Verification

Record build mode, browser, hardware/device profile, viewport, network, cache state, and sample count.

| Route/Journey | Metric | Baseline | Candidate | Target | Samples | Result |
|---|---|---:|---:|---:|---:|---|
| TBD | LCP | TBD | TBD | TBD | TBD | NOT_RUN |
| TBD | INP | TBD | TBD | TBD | TBD | NOT_RUN |
| TBD | CLS | TBD | TBD | TBD | TBD | NOT_RUN |
| Search | Input-to-result | TBD | TBD | TBD | TBD | NOT_RUN |
| Long page | Long tasks | TBD | TBD | TBD | TBD | NOT_RUN |
| TBD | JS transferred | TBD | TBD | TBD | TBD | NOT_RUN |

### Performance Acceptance Rules

- Functional correctness must remain unchanged.
- Improvements must be measured under comparable conditions.
- Regressions outside the targeted metric must be disclosed.
- A noisy single sample is not sufficient.
- If no meaningful improvement exists and complexity increased, revert the change.

## Responsive Verification Matrix

Test critical routes with realistic content and error states.

| Viewport | Portrait/Landscape | Touch | Keyboard | Zoom/Text Resize | Overflow | Result |
|---|---|---|---|---|---|---|
| 320 × 568 | Portrait | NOT_RUN | N/A/TBD | NOT_RUN | NOT_RUN | NOT_RUN |
| 360 × 800 | Portrait | NOT_RUN | N/A/TBD | NOT_RUN | NOT_RUN | NOT_RUN |
| 375 × 667 | Portrait | NOT_RUN | N/A/TBD | NOT_RUN | NOT_RUN | NOT_RUN |
| 390 × 844 | Portrait | NOT_RUN | N/A/TBD | NOT_RUN | NOT_RUN | NOT_RUN |
| 412 × 915 | Portrait | NOT_RUN | N/A/TBD | NOT_RUN | NOT_RUN | NOT_RUN |
| 768 × 1024 | Both | NOT_RUN | NOT_RUN | NOT_RUN | NOT_RUN | NOT_RUN |
| 820 × 1180 | Both | NOT_RUN | NOT_RUN | NOT_RUN | NOT_RUN | NOT_RUN |
| 1024 × 768 | Landscape | TBD | NOT_RUN | NOT_RUN | NOT_RUN | NOT_RUN |
| 1280 × 720 | Landscape | TBD | NOT_RUN | NOT_RUN | NOT_RUN | NOT_RUN |
| 1366 × 768 | Landscape | TBD | NOT_RUN | NOT_RUN | NOT_RUN | NOT_RUN |
| 1440 × 900 | Landscape | TBD | NOT_RUN | NOT_RUN | NOT_RUN | NOT_RUN |
| 1920 × 1080 | Landscape | TBD | NOT_RUN | NOT_RUN | NOT_RUN | NOT_RUN |

## Accessibility Verification

| Check | Tool/Method | Critical Routes | Result | Findings |
|---|---|---|---|---|
| Automated scan | Project-approved tool | TBD | NOT_RUN | — |
| Keyboard-only | Manual | TBD | NOT_RUN | — |
| Focus order | Manual | TBD | NOT_RUN | — |
| Focus restoration | Manual | Dialogs/routes | NOT_RUN | — |
| Semantic headings/landmarks | Inspection | TBD | NOT_RUN | — |
| Accessible names | Inspection | TBD | NOT_RUN | — |
| Forms and errors | Manual/screen reader | TBD | NOT_RUN | — |
| Status announcements | Screen reader | Search/forms | NOT_RUN | — |
| Contrast | Tool/manual | TBD | NOT_RUN | — |
| 200% zoom | Manual | TBD | NOT_RUN | — |
| Reduced motion | Manual | TBD | NOT_RUN | — |

## Reliability and Failure Verification

| Failure | Injection/Method | Expected Behavior | Result | Evidence |
|---|---|---|---|---|
| Offline | Browser/network control | Clear recoverable state | NOT_RUN | — |
| Slow response | Throttling | Responsive loading/cancel | NOT_RUN | — |
| Server 500 | Safe test stub/environment | Actionable error | NOT_RUN | — |
| Unauthorized | Test identity | Denied without leakage | NOT_RUN | — |
| Session expiry | Test setup | Re-authentication path | NOT_RUN | — |
| Duplicate click | Rapid interaction | Single effective action | NOT_RUN | — |
| Refresh during write | Controlled test | Consistent result | NOT_RUN | — |
| Stale record | Controlled test | Clear conflict/not-found | NOT_RUN | — |
| Timeout | Controlled test | Safe error/retry | NOT_RUN | — |

## Capacity and Load Verification

Do not run against production without explicit authorization.

| Scenario | Environment | Data Volume | Duration | Concurrency | RPS | p50 | p95 | p99 | Error Rate | Result |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---|
| TBD | Staging | TBD | TBD | TBD | TBD | TBD | TBD | TBD | TBD | NOT_RUN |

### Capacity Acceptance Criteria

Set explicit thresholds before testing:

- Maximum acceptable error rate: TBD
- Maximum acceptable p95 latency: TBD
- Maximum acceptable p99 latency: TBD
- Database resource threshold: TBD
- Function timeout threshold: TBD
- Recovery behavior after test: TBD

### Capacity Limitations

Document differences from production, including:

- Hardware.
- Data volume.
- Cache state.
- Network.
- Third-party limits.
- Supabase/Vercel plan.
- Background traffic.
- Test duration.

## Deployment Verification

| Check | Preview/Staging | Production | Result | Evidence |
|---|---|---|---|---|
| Clean build | TBD | N/A until authorized | NOT_RUN | — |
| Environment variables scoped correctly | TBD | TBD | NOT_RUN | — |
| Migrations applied safely | TBD | TBD | NOT_RUN | — |
| Critical smoke tests | TBD | TBD | NOT_RUN | — |
| Monitoring active | TBD | TBD | NOT_RUN | — |
| Logs redacted | TBD | TBD | NOT_RUN | — |
| Health checks | TBD | TBD | NOT_RUN | — |
| Rollback available | TBD | TBD | NOT_RUN | — |
| Private pages not cached publicly | TBD | TBD | NOT_RUN | — |
| Domain/HTTPS/redirects | TBD | TBD | NOT_RUN | — |

## Verification Register

| Verification ID | Finding | Plan | Commit | Environment | Result | Date |
|---|---|---|---|---|---|---|
| — | — | — | — | — | — | — |

## Final Release Gate

- [ ] Clean install succeeds.
- [ ] Formatting check passes.
- [ ] Lint passes.
- [ ] Type check passes.
- [ ] Unit tests pass.
- [ ] Integration tests pass.
- [ ] Critical E2E tests pass.
- [ ] Production build passes.
- [ ] No unresolved P0.
- [ ] P1 disposition documented.
- [ ] Protected calculations pass.
- [ ] Authorization and RLS matrix passes.
- [ ] Critical responsive checks pass.
- [ ] Critical accessibility checks pass.
- [ ] Performance regression review completed.
- [ ] Capacity limitations documented.
- [ ] Monitoring and logs verified.
- [ ] Backup and rollback verified.
- [ ] Preview/staging smoke test passes.
- [ ] Production deployment explicitly authorized.
- [ ] Post-deployment smoke test passes, if deployed.
- [ ] Known limitations disclosed.

## Final Verification Statement

Use this format:

> Candidate commit `<sha>` was verified in `<environment>` using the commands and cases recorded above. The release result is `<PASS | FAIL | PARTIAL | BLOCKED>`. The following limitations remain: `<limitations>`. Production deployment `<was | was not>` performed.
