# JALVORO Command Center World

## Product intent

The JALVORO Command Center is a separate private operational world, not a collection of customer-dashboard pages. It is the internal control plane for global administration, operations, governance, security, observability, billing, support, design infrastructure, configuration, and future ecosystem products.

This architecture keeps the current business-first platform intact while creating permanent places for future capabilities.

## Experience architecture

### Desktop

- Persistent grouped sidebar for registered modules.
- Global control-plane status and environment context.
- Sticky context bar for the active module.
- Command search available from the shell or `Ctrl/Cmd + K`.
- Refresh and safe exit to the customer workspace.
- Wide operational canvas for dense global information.

### Mobile

- Compact Command Center identity bar.
- Four registry-prioritised primary destinations.
- Persistent bottom operating dock.
- “More” sheet containing every remaining authorized module.
- No tiny unlabeled icon-only navigation.
- Safe-area spacing and reachable controls.

### Future modules

Navigation is resolved by the server from the Product and Module Registry. The client shell does not own the authoritative module list.

Each resolved module is enriched with:

- an operating group;
- a concise description;
- search keywords;
- a compact mobile label;
- an icon key;
- deterministic fallback placement.

Unknown future modules automatically receive a place based on registry order:

1. Command
2. Global operations
3. Governance
4. Infrastructure
5. Ecosystem

Publishing a future module therefore requires registry registration, permission mapping, route implementation, testing, approval, and activation—not another hard-coded top navigation redesign.

## Organization Operations

The Organizations module is promoted from an internal hidden foundation to a registered public-release Command Center module at `/admin/organizations`.

It provides:

- paginated organization registry;
- local page search and status filtering;
- controlled organization creation by existing account email;
- draft, active, suspended, and closed lifecycle;
- membership creation and lifecycle controls;
- last-active-Owner protection;
- organization-scoped administrator permissions;
- grant expiry and revocation;
- recent append-only audit timeline;
- read-only views for non-Owner Command Center roles.

No organization is seeded by the migration.

## Privacy and authorization boundaries

- Organization tables remain in the private schema.
- RLS remains enabled and direct table privileges remain revoked.
- Public functions are invoker wrappers around private, input-validating functions.
- Mutations require an authenticated active Command Center Owner.
- Email is accepted only as an action input and resolved server-side.
- Operations snapshots never return email, raw user IDs, legal names, tax identifiers, registration numbers, raw IP addresses, cities, payloads, or arbitrary metadata.
- Members and administrators appear only as stable opaque references.
- Organization closure revokes memberships and tenant-scoped grants.
- Every lifecycle, membership, and grant operation is append-only audited.

## Scale boundaries

- List snapshots are paginated with a maximum page size of 100.
- Selected organization details cap members and grants at 250 and audit events at 100.
- Registry navigation remains server-authorized.
- No browser-side database client or permission calculation is introduced.
- Unknown modules do not break the shell.
- The shell and Organization Operations styles are scoped to `/admin`.

## Current non-goals

This cycle does not modify:

- the public website;
- customer dashboards;
- personal-finance records;
- POS, ERP, CRM, inventory, payroll, or accounting products;
- pricing or payment-provider configuration;
- public organization self-service;
- automatic tenant creation.
