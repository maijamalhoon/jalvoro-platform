# .NET Supabase identity and membership projection

## Status

Additive foundation node only. The existing Next.js and Supabase business system remains authoritative. No production traffic is routed to the .NET API.

## Purpose

This node replaces the deliberately unavailable .NET identity context with a server-confirmed, read-only Supabase identity and tenant-membership projection.

It does not create an alternative account system, copy Supabase users into a second identity store, or activate a business write endpoint.

## Authentication boundary

The API accepts one `Authorization: Bearer <user JWT>` credential.

The bearer value is treated as untrusted until Supabase Auth confirms it through:

`GET {SUPABASE_PROJECT_URL}/auth/v1/user`

The request uses:

- the caller JWT in `Authorization`
- a publishable or legacy anonymous API key in `apikey`
- a five-second bounded remote-call policy by default

The resulting principal contains only:

- the server-confirmed user ID
- the expected `authenticated` audience
- the fixed `supabase-auth-server` identity-provider marker

The adapter does not import email, phone, roles, `user_metadata`, or client-supplied permission claims into authorization decisions.

Anonymous, deleted, currently banned, malformed, invalid-audience, expired, revoked, and unverified users fail closed.

## API-key safety

Accepted configuration is limited to:

- `sb_publishable_...` keys
- legacy JWT API keys whose decoded role is exactly `anon`

The adapter rejects:

- `sb_secret_...` keys
- legacy `service_role` JWTs
- unknown key formats
- whitespace or oversized values

A service-role credential is therefore not used for either identity verification or membership projection.

## Tenant selection

The requested tenant comes only from the route value:

`/api/v1/context/{tenantId}`

This value is a resource selector, not an authorization assertion. Tenant headers, role headers, permission headers, and UI state are ignored.

## Membership projection

After authentication, the API queries the existing Supabase Data API with the same caller JWT and publishable key:

`public.business_members`

The query requires an exact match for:

- `business_id`
- server-confirmed `user_id`
- `status = active`

Existing Row Level Security remains authoritative and limits the caller to their own membership row. The projection is read-only and does not use a service-role bypass.

Malformed rows, duplicate rows, unsupported roles, schema drift, request timeouts, and upstream failures do not create an access context.

## Exact permission projection

Legacy database roles and permissions are converted into the new exact permission contract.

| Existing membership authority | Projected permissions |
| --- | --- |
| every active supported role | `organization.read` |
| `owner` | `organization.manage`, `membership.read`, `membership.manage` |
| `admin` | `membership.read`, `membership.manage` |
| `accountant`, `manager`, `viewer` | `membership.read` |
| explicit `team.view` | `membership.read` |
| explicit `team.manage` | `membership.read`, `membership.manage` |

The legacy `*` value is never propagated into the .NET permission set. Owner authority is projected through the validated owner role instead.

## Read-only endpoint

`GET /api/v1/context/{tenantId}` is the first authenticated .NET projection endpoint.

It returns only:

- tenant ID
- subject ID
- authentication method
- exact projected permissions
- read-only status

It does not return user profile data, membership lists, database tokens, API keys, or legacy wildcard permissions.

## Failure behavior

- missing or malformed credential: `401`
- verified user without an active tenant membership: `403`
- invalid tenant route: `400`
- Supabase configuration or dependency unavailable: `503`
- request exceeds the global business-core limit: `504`

No failure state falls back to client headers, cached UI roles, anonymous access, or service-role access.

## Configuration

Preferred server configuration:

- `Jalvoro:Supabase:ProjectUrl`
- `Jalvoro:Supabase:PublishableKey`
- `Jalvoro:Supabase:RemoteCallTimeoutSeconds` between 1 and 10

Compatibility fallbacks are supported for the existing environment:

- `SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, or a validated `NEXT_PUBLIC_SUPABASE_ANON_KEY`

No credential is committed to the repository.

## Verification

The contract executable validates:

- safe publishable-key classification
- service-role rejection
- bearer-token structure and API-key rejection
- server-confirmed subject projection
- anonymous-user rejection
- exact Data API tenant, subject, and active-status filters
- preservation of caller JWT and publishable-key RLS context
- conservative role and legacy-permission mapping
- wildcard removal
- route-only tenant selection
- client tenant-header rejection

## Preservation boundary

This node does not:

- add or apply a database migration
- change Supabase RLS policies
- use a service-role key
- modify Personal Tracking
- remove an existing authentication method
- activate an organization write endpoint
- enable idempotency storage
- deploy the .NET API
- route production traffic
- merge the upstream stacked pull requests

Architecture rule:

`Preserve -> Extend -> Verify -> Migrate gradually -> Remove only after explicit approval`
