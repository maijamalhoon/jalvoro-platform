# Unified JALVORO Command Center entry

The owner-approved Command Center contract is:

1. open `/commandcenter`;
2. authenticate once with the email and password registered in the dedicated JALVORO Command Center Supabase project;
3. validate active owner membership in that project's private registry;
4. establish the matching production Admin session through a bounded, one-time session bridge;
5. render the complete Command Center.

There is no user-facing `/control`, `/control-login`, `/control-invite`, or `/admin` entry. Those legacy paths redirect to `/commandcenter`. The user is never asked for a second password and the retired authenticator-enrollment screen is not part of this flow.

## Trust boundaries

- Dedicated Command Center credentials are submitted only to the dedicated Supabase Auth project.
- The bridge receives only the dedicated access token, validates it server-side, and requires the active owner contract.
- Production resolves only a confirmed, active, same-email owner through a service-role-only RPC.
- The bridge returns a one-time token hash; it never returns or stores either account password.
- Both Command Center and production Admin sessions must resolve to the same normalized email before the operational shell renders.
- All private surfaces are no-store and noindex.

## Applied infrastructure

- dedicated project: `zzvpovvuybfihwgjrder`
- production project: `tdagzmgcgjlyqzegmizg`
- dedicated RPC: `get_my_command_center_access`
- production resolver: `resolve_command_center_bridge_target`
- production Edge Function: `command-center-session-bridge`

The legacy transposed-email Admin owner was disabled only after the intended Command Center account was activated as the production owner, with structured Admin access-audit entries.
