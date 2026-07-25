# JALVORO Command Center — Organization Foundation

## Scope

This Phase 3 cycle establishes the private multi-tenant organization foundation for the JALVORO Command Center. It does not activate a customer organization dashboard, public tenant directory, CRM, ERP, POS, billing portal, or organization onboarding experience.

No organization is seeded by the migration. An empty registry means no business organization has been registered yet.

## Private data model

The foundation introduces three normalized private tables:

- `private.command_center_organizations`
- `private.command_center_organization_memberships`
- `private.command_center_organization_audit`

The existing `private.command_center_admin_grants.organization_id` field now has a validated foreign key to the organization registry.

Every new table:

- has Row Level Security enabled;
- has a deny-direct policy;
- revokes all table privileges from `PUBLIC`, `anon`, and `authenticated`;
- grants direct table access only to `service_role`;
- has covering indexes for lifecycle, membership, audit, and organization-scoped grant queries.

The audit table is append-only through the existing platform audit rejection trigger.

## Organization lifecycle

Organizations use these controlled states:

- `draft`
- `active`
- `suspended`
- `closed`

Creation is atomic: an organization draft and its first active `organization_owner` membership are created together.

Only an active JALVORO platform Owner may create or transition an organization. Activation requires at least one active organization owner. Suspension prevents new organization-scoped grants. Closure is irreversible through this contract and atomically:

- marks all non-revoked memberships revoked;
- revokes every active organization-scoped Command Center grant;
- records structured audit events;
- marks the organization closed.

No organization or membership delete RPC exists.

## Membership model

Membership roles are:

- `organization_owner`
- `organization_admin`
- `billing_admin`
- `analyst`
- `member`

Membership states are:

- `active`
- `suspended`
- `revoked`

The control plane prevents suspension, revocation, or demotion of the final active organization owner. Membership operations reference generated membership codes and return pseudonymous member references rather than emails or raw user identifiers.

## Tenant-scoped authorization

The hidden Product Registry module `organizations` is registered as `internal_testing` and has no navigation entry.

Organization permissions are scoped to that module:

- `command-center:organizations:view`
- `command-center:organizations:manage`
- `command-center:organizations:membership-manage`

Owner receives all three permissions. Admin, Analyst, and Support receive aggregate view access only. Mutation RPCs remain Owner-only in this foundation release.

The existing generic administrator grant function now validates an organization scope before writing it:

- the organization must exist and be active;
- a supplied region must not conflict with the organization region;
- a supplied data classification must match the organization classification;
- grant and revoke operations are recorded in both registry audit and organization audit.

A dedicated organization-code RPC resolves the internal UUID server-side so callers do not need raw organization IDs.

## Privacy boundary

The organization foundation snapshot contains only:

- generated organization code and stable organization key;
- display name;
- lifecycle status;
- optional country and configured region codes;
- data classification;
- version and aggregate membership/grant counts.

It excludes:

- email addresses;
- raw user, subject, and session identifiers;
- legal registration, tax, payment-provider, and finance identifiers;
- raw IP addresses and city values;
- arbitrary payloads and metadata;
- customer finance, payroll, transaction, inventory, or message content.

The snapshot reports `identityFieldsIncluded: false` and `directTableAccessEnabled: false`. Its TypeScript parser fails closed on protected fields or inconsistent counts.

## RPC boundary

Authenticated users receive `EXECUTE` only on private security-definer targets that verify `auth.uid()` and the current platform-admin role internally. They receive no private table privileges.

Public invoker wrappers are available for:

- organization creation;
- organization lifecycle transitions;
- membership creation;
- membership role/status transitions;
- organization-scoped administrator grants;
- aggregate foundation snapshot retrieval.

Anonymous execution is revoked.

## Global Operations compatibility

A private registered organization summary is prepared, but composition into the existing Global Operations response is deliberately deferred. This keeps the current parser and live dashboard contract stable until the dedicated organization-operations UI cycle is implemented and reviewed.

## Staging verification

The exact foundation and manifest passed a rollback-only staging scenario with synthetic identities:

- manifest validation, approval, and activation;
- hidden module registration;
- organization draft creation and activation;
- final-owner protection;
- second-owner creation;
- organization-scoped permission grant;
- membership suspension;
- organization suspension and reactivation;
- organization closure;
- automatic membership and grant revocation;
- structured append-only audit production.

All synthetic auth, organization, membership, grant, and audit rows were rolled back.

## Next cycle

The next organization release may add a dedicated server-rendered organization operations page, controlled search, lifecycle actions, membership administration, and scoped grant review. That release must use these RPCs and must not introduce direct browser table access.
