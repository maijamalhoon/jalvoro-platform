# JALVORO Control Plane database and functions

These migrations and functions belong only to the isolated Supabase project:

- project: `jalvoro-control-plane`
- ref: `zzvpovvuybfihwgjrder`

They are deliberately outside `supabase/migrations`. The normal JALVORO production migration runner must never apply them to `jalvoro-production`.

Security boundaries:

- every bounded Control Plane RPC requires an active operator and `aal2`;
- password authentication must be no older than 12 hours;
- TOTP verification must be no older than 20 minutes, including invitation acceptance;
- Root Owner identity, role and active status are immutable through delegated controls;
- private tables deny direct `anon` and `authenticated` data privileges;
- operator account creation uses the JWT-protected `control-plane-create-operator` Edge Function;
- the operator-creation function accepts only exact approved browser origins, JSON requests no larger than 4 KiB, valid delegated roles and a 1–168 hour invitation lifetime;
- `CONTROL_PLANE_ALLOWED_ORIGINS` may add comma-separated exact origins for an approved custom domain; wildcard origins are forbidden;
- the server-side secret is read only from the Edge Function environment and no secret value is committed;
- invitation tokens are hashed in storage and delivered in URL fragments so they are not sent in HTTP request paths;
- new operators verify a one-time Supabase invite, create a permanent password, perform a fresh password login, enroll MFA and accept the one-time expiring access invitation before authorization is created.

Build boundary:

- Control Plane Edge Functions use the Supabase Deno runtime and `npm:`/`jsr:` specifiers;
- they are intentionally excluded from the Next.js TypeScript program so the web build does not reinterpret Deno modules;
- repository contract tests inspect their security invariants, while deployment and post-deployment smoke checks validate the Deno runtime artifact.

Deployment evidence:

- `control-plane-create-operator` version 5 is active in `zzvpovvuybfihwgjrder` with gateway JWT verification enabled;
- the active source uses the reviewed exact-origin, request-size, validation, AAL2 Root Owner and partial-cleanup controls;
- authenticated operator creation remains a human smoke-test gate because no operator credentials, password, TOTP secret or recovery code may be copied into automation.

Remaining release gates:

1. enable Supabase Auth leaked-password protection in the Control Plane project dashboard;
2. rerun Security Advisor;
3. complete an authenticated Root Owner invitation test from an approved application origin;
4. verify an unrelated browser origin is denied;
5. confirm failed or oversized requests create neither an Auth user nor a private invitation;
6. remove the temporary review origin after the release branch is retired.
