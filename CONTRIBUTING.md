# Contributing to JALVORO

Thank you for taking an interest in the project. The repository is publicly visible, but product direction, release sequencing, and merges are controlled by the maintainer.

## Before making changes

- Check existing issues and pull requests for overlapping work.
- Open an issue before proposing a large feature, schema change, authentication change, or redesign.
- Keep security reports private and follow [SECURITY.md](SECURITY.md).
- Follow the project [Code of Conduct](CODE_OF_CONDUCT.md).
- Do not include real financial records, credentials, access tokens, or production secrets in issues, screenshots, fixtures, or commits.

## Development setup

```bash
git clone https://github.com/maijamalhoon/jalvoro-platform.git
cd jalvoro-platform
npm install
copy .env.example .env.local
npm run dev
```

On macOS or Linux, replace the `copy` command with:

```bash
cp .env.example .env.local
```

## Branches

Create a focused branch from an up-to-date `main`:

```bash
git checkout main
git pull origin main
git checkout -b fix/clear-description
```

Recommended branch prefixes:

- `feat/` — new product capability
- `fix/` — bug, security, or integrity correction
- `refactor/` — behavior-preserving restructuring
- `docs/` — documentation only
- `test/` — tests only
- `chore/` — repository or tooling maintenance
- `node-N-...` — an approved roadmap node

Do not mix unrelated work into one branch.

## Commit messages

Use concise Conventional Commit-style messages:

```text
feat(transactions): add split transaction support
fix(settings): remove misleading security controls
test(analytics): cover invalid date inputs
docs: clarify local environment setup
chore: clean repository metadata
```

Avoid messages such as `fix`, `changes`, `forms`, `dashboard fix`, or long conversational descriptions. Explain the outcome, not the editing process.

## Scope and data integrity

Financial behavior must remain truthful:

- Do not add fabricated fallback balances, transactions, investments, or trends.
- Do not turn failed queries into genuine zero values.
- Do not double-count transfers or account balances.
- Do not infer historical values from current values unless the method is explicitly valid and labelled.
- Keep currency, date range, comparison period, and estimate semantics visible.
- Treat Row Level Security and server-side authorization as the ownership boundary.

## User-interface expectations

A feature is not complete with only its default visual state. Review, where applicable:

- Default, hover, focus, pressed, disabled, loading, success, warning, error, and empty states
- Mobile, tablet, laptop, and desktop layouts
- Keyboard-only and touch interaction
- Light, dark, and system theme behavior
- Long labels, large values, slow requests, failed requests, and empty datasets
- Reduced-motion behavior and visible focus indicators

Avoid broad redesigns inside security or data-integrity fixes unless the issue requires one.

## Validation

Run the checks relevant to your change. For broad changes, use:

```bash
npm run test:analytics
npm run check
npm run build
git diff --check
```

Feature-specific test scripts should also be run when present in `package.json`.

Do not claim that a check passed unless it was actually executed. Include exact results and disclose any skipped check.

## Pull requests

A pull request should contain:

- A focused title
- The problem and root cause
- The implemented behavior
- Files and areas intentionally left unchanged
- Test and validation results
- Screenshots for visible changes
- Migration and environment-variable notes, when applicable
- Risks, limitations, and manual verification steps

Prefer squash merging so `main` receives one clear, reviewable commit per scoped change.

## Database changes

Supabase schema, function, index, and policy changes must be made through versioned migrations. A database change should be idempotent where practical, owner-scoped, and reviewed for Row Level Security effects.

Never edit production data manually as a substitute for a migration.

## License and reuse

No open-source license is currently granted. Contribution or public visibility does not grant permission to redistribute or commercially reuse the project outside the terms accepted by the maintainer.
