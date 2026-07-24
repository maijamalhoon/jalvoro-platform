# JALVORO .NET Organization and Authorization Foundation

## Status

This is an additive foundation stacked on the validated `.NET Business Core` branch. It does not activate a business runtime, replace Supabase authentication, migrate a database, or receive production traffic.

## Objective

Create the minimum safe organization-security boundary before accounting, inventory, POS, restaurant, payroll, branch, or enterprise write operations are implemented.

## Locked decisions

1. Every protected operation belongs to one exact business tenant.
2. Every authenticated actor uses a validated business subject identifier.
3. Authorization requires an exact tenant match and an exact permission match.
4. Missing identity, cross-tenant access, and missing permissions fail closed.
5. Client-provided identity, tenant, role, or permission headers are never trusted.
6. Business write operations require an idempotency reservation before execution.
7. Unavailable idempotency storage blocks writes instead of risking duplicate execution.
8. Business API requests have a 15-second default server-side timeout.
9. Personal Tracking is not registered, queried, migrated, or modified by this foundation.
10. Existing JALVORO systems remain authoritative until a later verified migration node explicitly changes a boundary.

## Current trusted-provider state

The default authenticated-context provider deliberately returns no context. This means protected business operations cannot become accessible before a real server-verified identity integration is implemented and tested.

The default idempotency coordinator deliberately returns `Unavailable`. This means state-changing operations cannot proceed before a durable tenant-scoped idempotency store is implemented and tested.

## Permission model

The foundation introduces exact permission keys rather than hard-coded UI roles:

- `organization.read`
- `organization.manage`
- `membership.read`
- `membership.manage`

Future roles may group permissions, but server authorization remains permission-based. A role label alone never grants access.

## Request safety

ASP.NET Core request-timeout middleware applies a 15-second default timeout to the Business Core API. Database commands, external integrations, and background work added later must also accept and propagate cancellation tokens.

Long-running work must move to durable background processing rather than keeping an HTTP request open.

## Next verified nodes

1. Server-verified Supabase/JWT identity adapter without trusting browser headers.
2. Tenant membership and permission projection contract.
3. Durable PostgreSQL idempotency reservation storage.
4. Organization read model behind explicit authorization.
5. Additive database migration proposal with rollback and compatibility checks.
6. Only after those nodes: first protected organization write operation.

## Preservation rule

`Preserve -> Extend -> Verify -> Migrate gradually -> Remove only after explicit approval`
