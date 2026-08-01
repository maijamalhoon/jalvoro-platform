# JALVORO Business Core (.NET)

This directory contains the additive .NET/C# foundation for the future JALVORO Business Operating Ecosystem.

## Current status

`foundation` only.

The code in this directory does **not** replace, migrate, disable, or delete any existing Next.js, Supabase, Personal Tracking, business workspace, POS, native, billing, authentication, database, or production implementation.

## Technology contract

- .NET 10 LTS
- ASP.NET Core
- C# with nullable reference types and warnings treated as errors
- secure modular monolith first
- PostgreSQL integration later through explicit, versioned infrastructure work
- no active production database connection in this foundation
- no third-party NuGet dependency in this first node

## Projects

```text
Jalvoro.BusinessCore.Domain
  Business invariants and strongly validated domain identities.

Jalvoro.BusinessCore.Application
  Use-case contracts, module catalog, and product-level application boundaries.

Jalvoro.BusinessCore.Infrastructure
  Dependency registration and future adapters for persistence, messaging, devices, and external systems.

Jalvoro.BusinessCore.Api
  Versioned HTTP boundary, health checks, security headers, and truthful foundation metadata.

Jalvoro.BusinessCore.ContractTests
  Dependency-free architecture and preservation verification.
```

## Registered business modules

The catalog reserves controlled boundaries for:

- organizations and identity
- accounting and finance
- sales and CRM
- inventory and purchasing
- POS
- restaurant operations
- warehousing and distribution
- workforce operations
- branches, dealerships, and franchises
- enterprise governance
- integrations

Only the platform foundation is present. No operational module is marked active.

## Preservation rule

```text
Preserve -> Extend -> Verify -> Migrate gradually -> Remove only after explicit approval
```

The following actions are prohibited without a separate approved migration plan:

- deleting or rewriting existing product code
- modifying Personal Tracking
- replacing current authentication
- applying destructive database migrations
- moving production traffic to this API
- activating unfinished modules
- silently changing billing, permissions, RLS, or customer data ownership

## Local validation

From this directory:

```bash
dotnet restore Jalvoro.BusinessCore.sln
dotnet build Jalvoro.BusinessCore.sln --configuration Release --no-restore
dotnet run --project tests/Jalvoro.BusinessCore.ContractTests/Jalvoro.BusinessCore.ContractTests.csproj --configuration Release --no-build
dotnet publish src/Jalvoro.BusinessCore.Api/Jalvoro.BusinessCore.Api.csproj --configuration Release --no-build --output artifacts/publish
```

## Foundation endpoints

- `GET /` — truthful foundation identity
- `GET /api/v1/platform` — architecture and preservation contract
- `GET /api/v1/modules` — registered module boundaries and lifecycle states
- `GET /health/live` — process liveness
- `GET /health/ready` — foundation readiness

These endpoints expose no customer, financial, employee, personal, tenant, payment, or operational records.
