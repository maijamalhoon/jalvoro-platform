# Release candidate stabilization dossier

Integration branch: `release/stabilization-20260726`  
Integration PR: #169  
Base: `main@d63bbcf4b9fd31dc3e978e7c622adce2a7f75ca2`  
Status: changing stops after this dossier commit; certification must restart after any later commit.

## Included source

- PR #164 exact head `857ffe1497d7dd38e695bfe8b85a4ed0e4bce2c7`.
- PR #165 sidebar correction: `app/dashboard/mobile-sidebar-edge-lock.css`, `components/ui/sheet.tsx`, and `lib/mobile-sidebar-positioning.test.ts`.
- Focused stabilization commits on PR #169. The authoritative ordered list is the PR commit history; important remediation commits are recorded below.

## Stabilization change log

| Commit | Outcome |
| --- | --- |
| `e6882eb6`, `efaf81a4`, `e530b659` | integrated and regression-locked the mobile sidebar edge correction |
| `c440c2ae`, `1de75cf3`, `012c34cb` | corrected render impurity, ref misuse, memo callbacks, ARIA, controls, reserved module naming, pricing types, and lint debt |
| `f2016ec0`, `5eb8ecd3`, `2e8200b1`, `fc91c253` | unified environment-driven host identity, removed unowned/legacy public identity, and added a blocking production identity gate |
| `9fd5f94c`, `f4f531ca`, `e9b5ac0b` | applied the API mutation perimeter, per-route rate limits, and privileged Server Action rate limits |
| `ee1329d5`, `14f3ca94`, `95b79659`, `f67ca921`, `c2057f5b` | validated AI provider responses, bounded timeouts/retries, structured errors, correlation IDs, and non-200 failure semantics across every AI surface |
| `a1ba66e2`, `2548a474` | removed Stripe dependencies/configuration and paid-plan administration; payments are outside launch scope |
| `32cf54f6`, `8b2724fc` | added avatar signature/decode sanitization and disabled business-document uploads until malware scanning is certified |
| `0f13bc63`, `bf331f63`, `d8f6233e`, `a7b81f27` | implemented Sentry privacy allowlists, strict SDK types, exact-release source-map preparation, and fixture corrections |
| `84e0d4c0` | added privacy-preserving RUM for Web Vitals, route transitions, API latency/error, device, browser, and route category |
| `fd84ee8a`, `238bd0cb`, `399c46ff` | documented Cloudflare, branch inclusion/exclusion, backup/recovery, migrations, test identities, email, monitoring, and performance gates |
| `273b7630`, `05e0270e`, `b75ebb4d` | removed module warnings, added formatting validation, and made security/dependency gates blocking |

Open draft branches not listed as included remain excluded for the reasons in `docs/release/branch-decisions.md`. They are not alternate certified candidates.

## Finding disposition

| Area | Repository disposition | External/runtime disposition |
| --- | --- | --- |
| Validation failures | fixed in source; formatting/lint passed on a predecessor | exact current head not yet built |
| Branch fragmentation | one integration PR | source PRs remain history only |
| SEO/host identity | environment-driven; private routes excluded; legacy identity removed | owned domain not selected |
| Authentication refresh | stale/transient classification, explicit redirects/401/503, cookie expiry, session tests | authenticated multi-tab/email/browser matrix not run |
| Leaked password protection | application weak-password checks retained | disabled in both Supabase projects; must be enabled externally |
| AI runtime | provider contract and HTTP semantics fixed; failure matrix unit tests | authenticated runtime smoke not run |
| Payments | completely outside launch UI/dependencies/actions | no payment lifecycle claimed |
| CSRF/mutations | API and Server Action contract, limits, size/media/origin checks | cross-origin runtime matrix not run |
| Uploads | avatar verified/sanitized; document uploads fail closed | pending SQL not applied; malware pipeline outside launch |
| Protected routes | explicit redirects and API status semantics | browser/monitoring verification not run |
| Sentry | privacy filters, exact release, build upload preparation | credentials, events, maps, alerts inaccessible |
| Performance | privacy-safe instrumentation | no production samples or controlled before/after runs |
| Recovery/migrations | procedures and pending safety migration committed | no export, restore, clean replay, or drift proof |
| Email/browsers/a11y | test matrices defined | not run |
| Cloudflare/domain | cache-safe template and rollback prepared | no owned domain; nothing connected |

## Evidence ledger

- Vercel deployment for `a1ba66e277ee3d5069331812abfd8a62c6ddfe51`: dependency audit passed with zero known vulnerabilities, brand checks passed, lint passed, strict TypeScript passed, 112 test files / 813 tests passed, and Next production build passed.
- Vercel deployment for `05e0270e8f7ed342f6ebd440df280255ad5b855b`: audit, brand, formatting, and lint passed; TypeScript stopped on the subsequently corrected Sentry fixture.
- Current Vercel exact-head validation is blocked by the account build-rate limit. A failed/queued/skipped deployment is not passing evidence.
- Supabase advisors still report leaked-password protection disabled in both active projects. Production also has documented security-definer and RLS-no-policy advisories.
- Production RUM query returned no usable sample, so no performance improvement is claimed.
- No production database, authentication setting, DNS, Cloudflare, Sentry, or production Vercel deployment was changed.

## Mandatory gates still open

Exact-head lint/format/type/unit/integration/build; blocking GitHub CodeQL and dependency review; Currency Quality Gate; Vercel preview and smoke; backup/export/read/restore; zero-to-head migration replay; password protection; controlled accounts; authenticated E2E; browser/mobile/accessibility; email/DNS authentication; Sentry events/maps/alerts; measured performance; Cloudflare/domain; final immutable tag.

No release tag may be created while any item above remains open.
