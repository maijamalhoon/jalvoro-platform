# Jalvoro Rollback and Recovery Plan

## Purpose

Define safe, explicit procedures for reversing application, configuration, dependency, database, and deployment changes.

Rollback is not automatically safe. Database writes, schema changes, external side effects, and credential exposure may require forward recovery rather than a simple code revert.

## Status

- Last reviewed: YYYY-MM-DD
- Owner: Unassigned
- Production rollback tested: No
- Database restore tested: No
- Current production deployment: `<identifier>`
- Current production commit: `<commit-sha>`

## Safety Rules

- Do not perform production rollback without explicit owner authorization unless an active incident procedure grants authority.
- Preserve incident evidence before destructive cleanup.
- Do not expose secrets in logs, screenshots, or chat.
- Stop further deployments during a rollback.
- Communicate the affected scope.
- Prefer the smallest safe rollback.
- Verify data integrity after rollback.
- A code rollback does not automatically undo database writes.
- A database rollback can destroy valid new data; evaluate forward repair first.
- If credentials were exposed, reverting code is insufficient. Rotate credentials.
- If private data was exposed, contain access and follow incident-response obligations.
- Record the rollback in `CHANGELOG.md`.

## Rollback Triggers

Consider rollback when one or more occur:

- Unauthorized access or data leakage.
- Secret exposure.
- Data corruption or unexpected deletion.
- Critical calculation regression.
- Critical user journey failure.
- Severe error-rate increase.
- Severe latency increase.
- Deployment causes repeated crashes or timeouts.
- Migration leaves the application incompatible.
- Monitoring or logs indicate widespread user impact.
- A security control was weakened.
- Recovery through a small forward fix is riskier or slower than rollback.

Define numeric thresholds per release where possible.

## Roles

| Role | Responsibility | Assigned |
|---|---|---|
| Incident lead | Coordinates decision and communication | TBD |
| Application owner | Approves production change | TBD |
| Database owner | Evaluates data impact and recovery | TBD |
| Verifier | Runs smoke tests and integrity checks | TBD |

One person may hold multiple roles in a small team, but responsibilities must still be explicit.

## Pre-Change Rollback Readiness

Before any high-risk change:

- [ ] Baseline commit recorded.
- [ ] Current production deployment recorded.
- [ ] Change scope documented.
- [ ] Feature flag or safe disable path considered.
- [ ] Database migration classified.
- [ ] Backup requirement assessed.
- [ ] Restoration feasibility assessed.
- [ ] Backward compatibility assessed.
- [ ] Rollback command or deployment action documented.
- [ ] Verification steps prepared.
- [ ] Monitoring prepared.
- [ ] Responsible person available.
- [ ] External side effects identified.
- [ ] Secrets rotation procedure identified if relevant.

## Change Classification

### Class A — Code-Only, Backward-Compatible

Examples:

- UI correction.
- Server logic correction that uses existing schema.
- Performance change without data-format change.

Typical rollback: redeploy prior known-good commit.

### Class B — Configuration or Environment

Examples:

- Environment-variable change.
- Vercel configuration.
- Headers, redirects, runtime settings.

Typical rollback: restore prior configuration and redeploy if required.

### Class C — Dependency Change

Examples:

- Package upgrade.
- Build tooling change.
- Runtime upgrade.

Typical rollback: restore manifest and lockfile from known-good commit, reinstall cleanly, rebuild, and redeploy.

### Class D — Backward-Compatible Database Expansion

Examples:

- Add nullable column.
- Add new table.
- Add index.
- Add policy while old code remains compatible.

Typical rollback: roll back application first; retain additive schema until safe removal.

### Class E — Data Transformation or Breaking Schema

Examples:

- Column type change.
- Renaming/removing a column.
- Destructive migration.
- Rewriting stored values.
- Changing ownership or permissions model.

Typical response: use expand-and-contract. Prefer forward recovery. Restore only with explicit impact analysis.

### Class F — Security Incident

Examples:

- Exposed credential.
- Authorization bypass.
- Private-data leakage.

Typical response: contain, rotate, revoke, patch, investigate, verify, and document. Code rollback alone is insufficient.

## General Incident Procedure

1. **Detect and confirm**
   - Confirm the signal.
   - Identify affected environment, routes, identities, and time window.
   - Avoid broad conclusions before evidence.

2. **Contain**
   - Pause deployments.
   - Disable a feature safely if available.
   - Revoke or rotate compromised credentials.
   - Restrict access where necessary.
   - Avoid destroying evidence.

3. **Decide**
   - Compare rollback, forward fix, feature disable, and traffic restriction.
   - Evaluate data compatibility.
   - Evaluate external side effects.
   - Choose the lowest-risk path.

4. **Execute**
   - Follow the relevant procedure below.
   - Record commands and timestamps.
   - Use a second reviewer for high-risk actions where possible.

5. **Verify**
   - Run critical smoke tests.
   - Verify authorization and data integrity.
   - Check errors and latency.
   - Confirm the original issue stopped.
   - Confirm rollback did not create a new issue.

6. **Monitor**
   - Observe for a defined period.
   - Check delayed jobs, webhooks, caches, and retries.
   - Confirm user-facing state is consistent.

7. **Document**
   - Add a changelog rollback entry.
   - Update the finding.
   - Record root cause and follow-up actions.

## Procedure A — Application Code Rollback

Use for Class A changes.

### Preconditions

- Prior deployment is known-good.
- Schema remains compatible.
- No irreversible external side effect requires separate recovery.

### Steps

1. Identify the last known-good commit and deployment.
2. Confirm current database schema is compatible with old code.
3. Prefer Vercel rollback to the known-good deployment when safe and available, or create a revert commit through the normal Git workflow.
4. Do not force-push shared branches.
5. Deploy the known-good version.
6. Clear or invalidate caches only when required and understood.
7. Run post-rollback verification.

### Verification

- Critical routes load.
- Authentication works.
- Authorization remains correct.
- Primary read/write journey works.
- Error rate returns to acceptable range.
- Latency returns to acceptable range.
- No new client/server version mismatch exists.

### Follow-Up

- Preserve the failed commit for investigation.
- Create a finding for the regression.
- Do not reapply without a new verification record.

## Procedure B — Configuration Rollback

Use for Class B changes.

### Steps

1. Record current configuration values without exposing secrets.
2. Restore prior values from an approved secure source.
3. Confirm preview and production scopes separately.
4. Redeploy if the platform requires it.
5. Verify runtime behavior.
6. Confirm logs do not expose values.

### Special Cases

- Secret changes may require rotation rather than restoration.
- A compromised secret must not be reused.
- Environment-variable rollback can make old deployments incompatible; verify version expectations.

## Procedure C — Dependency Rollback

Use for Class C changes.

### Steps

1. Restore package manifest and lockfile from the known-good commit.
2. Remove untracked build artifacts if safe.
3. Perform a clean dependency install using the repository's package manager.
4. Run format, lint, type check, tests, and production build.
5. Deploy the verified candidate.
6. Verify runtime behavior.

Do not manually reconstruct lockfile entries.

## Procedure D — Backward-Compatible Database Expansion

Use for Class D changes.

### Preferred Method

1. Roll back application code first.
2. Leave additive schema in place if it does not create risk.
3. Confirm old code ignores the new schema safely.
4. Schedule schema cleanup as a separate reviewed change.
5. Remove additive schema only after all consumers and rollback windows are closed.

### Index Rollback

Before dropping an index:

- Confirm it is not required by another query.
- Confirm drop operation risk.
- Check lock and runtime behavior.
- Record before/after query plans.

### Policy Rollback

Never restore an insecure RLS policy merely to regain functionality. Prefer a safe forward correction or temporary feature disable.

## Procedure E — Data Transformation or Breaking Migration Recovery

Use for Class E changes.

### Required Assessment

- What rows changed?
- Can transformed values be reversed exactly?
- Were new writes created under the new schema?
- Is the old application compatible with current data?
- Will restore discard valid new data?
- Are external systems affected?
- Is a backup available?
- Has restoration been tested?
- Is forward repair safer?

### Preferred Strategy

Use forward recovery when rollback would destroy or misinterpret data.

### Restore Strategy

A database restore requires explicit approval and a documented loss window.

1. Stop writes if required.
2. Record current state.
3. Identify backup timestamp.
4. Calculate potential lost writes.
5. Notify the owner of data-loss implications.
6. Restore to an isolated environment first when possible.
7. Validate integrity.
8. Perform approved production restoration.
9. Reconcile external side effects and writes after the backup.
10. Run full verification.

Never claim backups are valid without a tested restore.

## Procedure F — Secret Exposure

Use for Class F.

1. Treat the secret as compromised.
2. Revoke or rotate it at the provider.
3. Update approved environment stores.
4. Remove it from current code and configuration.
5. Assess repository history, logs, build output, browser bundles, and deployment artifacts.
6. Restrict or rotate downstream credentials reachable by the secret.
7. Verify old credentials no longer work.
8. Review access logs where available.
9. Correct the root cause.
10. Record the incident without writing the secret value.

A Git revert does not remove a secret from history or artifacts.

## Procedure G — Authorization or RLS Incident

1. Restrict the affected operation.
2. Disable the vulnerable feature if necessary.
3. Preserve evidence.
4. Identify affected tables, users, operations, and time range.
5. Correct authorization at the trusted boundary.
6. Correct RLS/storage policies.
7. Test with anonymous, owner, other user, and privileged identities.
8. Review access logs where available.
9. Assess whether private data was accessed.
10. Do not restore an insecure policy as rollback.

## Procedure H — Performance Regression

1. Confirm regression against comparable baseline.
2. Identify whether impact is client, server, database, network, or third party.
3. Disable the specific optimization or feature flag if available.
4. Revert the isolated change.
5. Verify correctness and performance.
6. Check caches and query plans.
7. Continue monitoring after rollback.

Do not “fix” a performance regression by removing required functionality without approval.

## Procedure I — Broken Calculation or Business Logic

1. Stop or disable the affected action if wrong results could be persisted.
2. Identify affected records and time range.
3. Roll back code only if current data remains compatible.
4. Restore the last verified logic.
5. Run golden tests.
6. Determine whether persisted data requires correction.
7. Create an auditable data-repair plan.
8. Do not silently overwrite historical records without owner approval.
9. Notify affected users if required by product or legal obligations.

## Procedure J — Search Failure

1. Determine whether failure is UI, API, database, index, permissions, or external service.
2. Preserve authorization filtering.
3. Disable a faulty optimization rather than leaking broader results.
4. Restore known-good search behavior.
5. Verify empty, rapid typing, stale response, no-result, error, pagination, and private-data cases.

## Post-Rollback Verification Checklist

- [ ] Correct deployment/version is active.
- [ ] Application loads.
- [ ] Authentication works.
- [ ] Authorization and RLS remain correct.
- [ ] Critical read flow works.
- [ ] Critical write flow works.
- [ ] Calculations match golden tests.
- [ ] Search works without private-data leakage.
- [ ] Error rate is acceptable.
- [ ] Latency is acceptable.
- [ ] Database integrity checks pass.
- [ ] Background jobs/webhooks are consistent.
- [ ] Logs contain no secrets.
- [ ] Monitoring is active.
- [ ] Original incident has stopped.
- [ ] No new regression was introduced.
- [ ] Changelog updated.
- [ ] Follow-up finding created.

## Rollback Record Template

---

### ROLLBACK-XXX — Concise Incident/Change Title

- **Date/time:** `<timestamp>`
- **Environment:** `<environment>`
- **Change:** `CHANGE-XXX`
- **Finding:** `FINDING-XXX`
- **From commit/deployment:** `<identifier>`
- **To commit/deployment:** `<identifier>`
- **Authorized by:** `<owner>`
- **Executed by:** `<person/agent>`
- **Class:** A | B | C | D | E | F
- **Data impact:** None | Possible | Confirmed
- **User impact:** `<summary>`

#### Trigger

State the objective trigger.

#### Decision

Explain why rollback was safer than a forward fix.

#### Steps Executed

List exact actions without secrets.

#### Verification

Reference `VER-XXX`.

#### Data Reconciliation

Describe any repair, replay, or cleanup.

#### Outcome

State whether the system recovered and what remains unresolved.

#### Follow-Up

List new findings, tests, or process changes.

---

## Release-Specific Rollback Section

Before each production deployment, add:

### Release `<identifier>`

- Known-good deployment:
- Candidate deployment:
- Candidate commit:
- Database migrations:
- Configuration changes:
- Feature flags:
- External side effects:
- Rollback class:
- Exact rollback action:
- Data compatibility:
- Verification owner:
- Monitoring window:
- Rollback thresholds:
