# Temporary ESLint brace-expansion advisory boundary

## Advisory

- GitHub advisory: `GHSA-mh99-v99m-4gvg`
- npm advisory source: `1124334`
- package: `brace-expansion`
- affected range currently reported by npm: `<=5.0.7`
- first advisory-cleared upstream release: `5.0.8`
- temporary exception expiry: **August 8, 2026 at 23:59:59 UTC**

The advisory describes an out-of-memory denial of service caused by unbounded total expansion length.

## Why an immediate forced override is unsafe

The repository's current Next.js ESLint configuration still includes established plugins that depend on the legacy `minimatch 3.x` line, which in turn requires the CommonJS `brace-expansion 1.x` API. The advisory-cleared `brace-expansion 5.0.8` release uses the newer API line.

Forcing `5.0.8` under every legacy minimatch consumer without upstream compatibility evidence could silently change file matching or break lint execution. A non-forced `npm audit fix --package-lock-only` was generated and validated in CI; npm could not produce a zero-advisory compatible tree without a major toolchain change.

A blind ESLint/Next lint-stack major upgrade was rejected because it would mix an unrelated broad tooling migration into the staging-readiness node.

## Enforced risk boundary

`scripts/enforce-dependency-audit.mjs` does not generically ignore npm audit failures. It enforces all of the following:

1. `npm audit --omit=dev --audit-level=low` must report **zero** production vulnerabilities.
2. A completely clean full audit passes immediately.
3. While the exception is active, the full audit must contain exactly these nine nodes and no others:
   - `brace-expansion`
   - `minimatch`
   - `eslint`
   - `eslint-config-next`
   - `@eslint/config-array`
   - `@eslint/eslintrc`
   - `eslint-plugin-import`
   - `eslint-plugin-jsx-a11y`
   - `eslint-plugin-react`
4. The only direct affected dependencies must remain `eslint` and `eslint-config-next`, and both must remain in `devDependencies` rather than production dependencies.
5. The only direct advisory object must remain source `1124334` and URL `GHSA-mh99-v99m-4gvg`.
6. No critical, moderate, or low advisory may be present.
7. Every indirect finding must resolve only through the exact approved ESLint chain.
8. The exception automatically fails after August 8, 2026.
9. Any advisory-set, severity, range, package-classification, or dependency-path change fails CI.

## Exposure assessment

The affected dependency chain is development-only. It is used by repository linting over trusted source configuration and is not bundled into the Next.js production runtime. Production dependencies must remain audit-clean independently of this exception.

This boundary does not claim that the upstream vulnerability is fixed. It temporarily contains a newly published upstream tooling advisory while preserving lint correctness and preventing a misleading generic audit bypass.

## Removal condition

Remove this document and the exception branch from the audit script as soon as one of these conditions is met:

- upstream Next.js ESLint dependencies publish a compatible tree using an advisory-cleared brace expansion implementation;
- the repository completes a separately reviewed ESLint 10/tooling migration with all lint, type, test, and build gates green;
- npm/GitHub advisory metadata recognizes a compatible patched maintenance release for the legacy API line.

The expiry is intentionally short so this decision cannot become permanent debt.
