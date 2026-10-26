# Architecture Decision: Additive .NET Business Core Foundation

- **Status:** Accepted for foundation implementation
- **Date:** 2026-07-24
- **Scope:** JALVORO Business Operating Ecosystem only
- **Personal Tracking:** Explicitly excluded

## Decision

JALVORO will retain its existing Next.js, React, TypeScript, Supabase, native, and deployed product foundations while introducing a separate .NET 10 and C# business-core boundary for high-complexity operational systems.

The initial .NET architecture is a secure modular monolith, not a distributed microservice estate.

## Why a modular monolith first

- keeps accounting, POS, restaurant, inventory, workforce, branch, and enterprise boundaries explicit
- avoids premature network, deployment, tracing, transaction, and operational complexity
- allows strong domain and tenant contracts before infrastructure choices become irreversible
- preserves the option to extract only proven high-scale modules later
- supports one consistent audit, authorization, observability, and data-governance model

## System boundary

```text
Existing JALVORO website and applications
                |
                | future versioned integration only
                v
JALVORO Business Core API (.NET/C#)
                |
                +-- Organizations and tenant identity
                +-- Accounting and finance
                +-- Sales and CRM
                +-- Inventory and purchasing
                +-- POS and restaurant operations
                +-- Warehousing and distribution
                +-- Workforce operations
                +-- Branches, dealerships, and franchises
                +-- Enterprise governance
                +-- Integration platform
```

## Preservation guarantees

This foundation does not:

- delete, rename, or move existing application files
- change existing Next.js routes
- change current Supabase authentication or session behavior
- introduce or apply a database migration
- connect to production data
- activate billing or subscriptions
- modify Personal Tracking
- mark unfinished business capabilities as released
- receive production traffic

## Dependency direction

```text
Domain
  ^
  |
Application
  ^
  |
Infrastructure
  ^
  |
API

ContractTests -> Domain + Application
```

Domain must not depend on application, infrastructure, API, Supabase, web frameworks, payment providers, or device SDKs.

## Future migration sequence

1. Define shared business contracts and authorization boundaries.
2. Establish read-only integration against non-production data.
3. Add append-only audit and idempotency foundations.
4. Implement one isolated business capability behind a feature flag.
5. Run dual-read or shadow verification against the existing system.
6. Enable limited preview traffic for approved tenants.
7. Migrate gradually with rollback and reconciliation.
8. Retire old behavior only through separate explicit approval.

## Extraction rule

A module may become an independent service only when measured scale, isolation, deployment cadence, hardware boundary, regulatory boundary, or failure-domain requirements justify the additional distributed-system cost.

## Pakistan-first, global-ready rule

Pakistan receives first-class configuration for PKR, Asia/Karachi, Urdu/English readiness, local tax and invoice needs, regional payments, phone/address formats, cash and COD workflows, and local device realities. These concerns must be configuration and policy packs rather than hard-coded global assumptions.
