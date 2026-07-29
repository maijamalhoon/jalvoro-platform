# Repository Governance

This document defines the maintenance workflow for JALVORO. It complements [CONTRIBUTING.md](CONTRIBUTING.md), [SECURITY.md](SECURITY.md), and the pull request template.

## Protected mainline

`main` is the production branch and should remain deployable.

- Do not push feature, fix, refactor, documentation, dependency, or migration work directly to `main`.
- Start from an up-to-date `main` and use a focused branch.
- Merge only through a reviewed pull request after the required checks pass.
- Emergency fixes still use a short-lived branch and pull request unless GitHub itself is unavailable.

## Branch naming

Use lowercase kebab-case after one of these prefixes:

| Prefix | Purpose | Example |
| --- | --- | --- |
| `feat/` | New product capability | `feat/recurring-transactions` |
| `fix/` | Bug, security, or data-integrity correction | `fix/session-refresh-loop` |
| `refactor/` | Behavior-preserving restructuring | `refactor/transaction-loader` |
| `docs/` | Documentation only | `docs/deployment-guide` |
| `test/` | Tests only | `test/payable-ledger-regressions` |
| `chore/` | Tooling and repository maintenance | `chore/dependency-audit` |
| `node-N-...` | Approved roadmap node | `node-10-release-hardening` |
| `agent/` | Scoped automation-assisted work | `agent/public-repository-audit` |

One branch should represent one reviewable outcome. Do not reuse an old merged branch for unrelated work.

## Commit messages

Use concise Conventional Commit-style messages:

```text
<type>(optional-scope): <imperative outcome>
```

Examples:

```text
feat(reports): add monthly CSV export
fix(auth): preserve validated redirect after login
docs: document production deployment checks
chore(deps): update tested runtime dependencies
```

Avoid messages such as `changes`, `modifications`, `fix`, `update files`, or generated conversational summaries. A commit message should describe the outcome, not the editing process.

## Pull request process

1. Rebase or merge the latest `main` into the branch before final review.
2. Keep the diff focused and remove generated output, debug logs, temporary screenshots, and unrelated formatting churn.
3. Complete every relevant section of the pull request template.
4. Explain the problem, root cause, changes, exclusions, validation, security or data-integrity impact, migration requirements, environment changes, and rollback risk.
5. Add screenshots or recordings for visible changes.
6. Request review only after the branch is self-reviewed and checks are green.

Draft pull requests are encouraged for work in progress. A draft must not be merged.

## Review and approval

At least one maintainer approval is required before merge. The author should not treat their own review as independent approval when another maintainer is available.

Reviewers should verify:

- Scope matches the issue or stated objective.
- No unrelated UI, business-logic, authentication, database, or dependency changes are hidden in the diff.
- Financial calculations and states remain truthful.
- User-owned data remains owner-scoped and protected by Row Level Security.
- New environment variables are documented in `.env.example` without real values.
- Database changes use versioned Supabase migrations.
- Tests and manual verification match the risk of the change.
- No credentials, personal records, access tokens, or private financial information are present.

All blocking review comments must be resolved or explicitly documented before merge.

## Required validation

For broad application changes, the baseline is:

```bash
npm ci
npm run check
npm run build
git diff --check
```

Run feature-specific tests and manual browser checks as needed. Do not mark a check as complete unless it was actually executed. A preview or production deployment does not replace lint, typecheck, tests, or manual verification.

Documentation-only and governance-only pull requests may omit runtime tests when no executable path changes, but the omission must be stated and formatting, links, YAML, and diff scope should still be reviewed.

## Merge strategy

**Squash merge is the default.** The final squash title should be a clear Conventional Commit-style summary, and the body should preserve important validation and migration notes.

Use a regular merge commit only when preserving a deliberately structured multi-commit history is materially useful. Rebase merge is reserved for maintainers who have verified that every individual commit is clean, ordered, and independently meaningful.

Do not merge when required checks are failing, the branch is behind with unresolved conflicts, the pull request template is materially incomplete, or security and migration risks are unclear.

## Branch deletion policy

After a pull request is merged and production or preview verification is complete:

- Delete the remote feature branch.
- Delete the local branch after confirming its commits are reachable from `main` or preserved by the merged pull request.
- Keep release, long-lived integration, or incident branches only when their purpose and owner are documented.
- Close obsolete pull requests with a note identifying the superseding pull request or commit.

Never delete a branch that contains unmerged unique work until its diff and commit reachability have been verified. Branch deletion is not a substitute for preserving important code through a pull request, tag, or backup ref.

## History safety

Do not rewrite shared history merely to improve cosmetic commit messages.

Force-push, interactive rebase, filter-repo, or other history rewrites require all of the following:

1. A documented reason such as verified secret removal or legally required content removal.
2. Immediate credential rotation when secrets are involved.
3. Confirmation that active collaborators, forks, deployment refs, and open pull requests will not be disrupted.
4. A backup tag or branch and a written recovery plan.
5. Explicit maintainer approval.

Prefer additive corrective commits and squash merging for normal cleanup.

## Dependency policy

- Add a dependency only when existing platform or project utilities cannot meet the requirement safely.
- Remove a dependency only after repository-wide usage search, lockfile update, tests, and production build verification.
- Keep runtime and development dependencies in their correct sections.
- Review automated dependency pull requests in small, compatible groups; do not merge solely because CI is green.

## Security and disclosure

Security vulnerabilities must follow [SECURITY.md](SECURITY.md). Do not discuss exploitable details, credentials, private finance data, or account information in public issues or pull requests.

## Repository hygiene

Generated builds, local logs, temporary exports, editor state, local environment files, and QA artifacts must remain untracked. Documentation, configuration, and project structure should be updated in the same pull request as the behavior they describe.
