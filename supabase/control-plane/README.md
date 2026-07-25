# JALVORO Control Plane database

These migrations belong only to the isolated Supabase project:

- project: `jalvoro-control-plane`
- ref: `zzvpovvuybfihwgjrder`

They are deliberately outside `supabase/migrations`. The normal JALVORO production migration runner must never apply them to `jalvoro-production`.

The deployed control realm requires an authenticated operator, `aal2`, a password authentication event no older than 12 hours, and a TOTP event no older than 20 minutes before any bounded Control Plane RPC can run.
