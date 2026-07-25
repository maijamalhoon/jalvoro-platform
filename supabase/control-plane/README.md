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

Release gates:

1. deploy the exact reviewed Edge Function source only to `zzvpovvuybfihwgjrder`;
2. configure any approved custom application origin before deployment;
3. verify allowed-origin preflight succeeds and an unrelated origin is denied;
4. verify an invalid/oversized JSON request is denied without creating an Auth user or invitation;
5. enable Supabase Auth leaked-password protection in the Control Plane project dashboard;
6. rerun Security Advisor and authenticated Root Owner invitation smoke tests after deployment.
