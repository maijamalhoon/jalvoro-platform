# Mutation security inventory

This is the launch-candidate inventory for state-changing HTTP entry points. It is a security contract, not evidence that external runtime tests have passed.

## API routes

| Prefix | Methods | Authentication / authorization | Media and size | CSRF / origin | Rate limit | Audit |
| --- | --- | --- | --- | --- | --- | --- |
| `/api/ai-insights/**` | POST, PUT, DELETE | Supabase user; route-level row ownership | JSON, 64 KiB (saved/preferences 16 KiB) | exact Origin plus Sec-Fetch-Site | 30/min/user; chat 20/min/user | provider diagnostics without prompts or tokens; saved/preferences database policy |
| `/api/native/ai-insights` | POST | Supabase user | JSON, 64 KiB | exact Origin plus Sec-Fetch-Site | 20/min/user | provider diagnostics without sensitive content |
| `/api/business/team/invite` | POST | active business manager/owner; RPC authorization | JSON, 64 KiB | exact Origin plus Sec-Fetch-Site | 10/hour/user | invitation RPC audit |
| `/api/categories` | POST | Supabase user and owner-scoped category RPC | JSON, 64 KiB | exact Origin plus Sec-Fetch-Site | 60/min/user | category mutation request/audit records |
| `/api/profile/avatar` | POST | Supabase user; object path bound to user ID | multipart, 4 MiB | exact Origin plus Sec-Fetch-Site | 6/5 min/user | safe failure logs; no file contents |
| `/api/security/password-check` | POST | intentionally pre-authentication; route-local abuse controls | JSON, 16 KiB | route-local exact-origin contract | route-local IP/privacy-safe limiter | no passwords or request bodies logged |
| `/api/telemetry` | POST | Supabase user | JSON, 16 KiB | exact Origin plus Sec-Fetch-Site | 120/min/user | anonymous performance dimensions only |
| Any future `/api/**` mutation | POST, PUT, PATCH, DELETE | denied by session middleware unless explicitly public | default 10 MiB until a route-specific contract is added | exact Origin plus Sec-Fetch-Site | must add an explicit limiter before launch | must document before launch |

The global middleware runs the origin, fetch-site, content-length, and declared media checks before reading authentication state. Requests fail closed if the database rate-limit control is unavailable.

## Server Actions

Next.js compares each Server Action Origin against Host or X-Forwarded-Host. No additional origins are allowlisted. The configured body limit is 128 KiB. Every active action below validates bounded fields, resolves the current user server-side, consumes a per-user database rate-limit bucket through `requireRateLimitedAdminClient`, and delegates authorization and durable audit behavior to a security-definer RPC with explicit grants. The disabled billing action performs no mutation.

| File | Mutations |
| --- | --- |
| `app/admin/access-actions.ts` | create/revoke/accept operator invitations; role, disable, and restore operations |
| `app/admin/compliance-actions.ts` | compliance review workflow |
| `app/admin/privacy-actions.ts` | privacy-request workflow |
| `app/admin/incident-actions.ts` | incident create and workflow update |
| `app/admin/release-actions.ts` | exact-deployment release approval and revocation |
| `app/admin/organizations/actions.ts` | organization, membership, and scoped grant lifecycle |
| `app/admin/billing-actions.ts` | outside launch scope; the UI and mutation must remain disabled while payments are excluded |

The isolated migration replay must verify every referenced RPC's role checks, grants, and audit writes. That database evidence is still a mandatory gate.

Reference: [Next.js Server Action security](https://nextjs.org/docs/app/guides/server-actions).
