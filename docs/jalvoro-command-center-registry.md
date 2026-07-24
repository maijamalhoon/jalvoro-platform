# JALVORO Command Center Registry Foundation

## Official identity

- **Interface name:** JALVORO Command Center
- **Full product name:** JALVORO Global Admin & Operations Control Center
- **Technical description:** Central internal administration, analytics, observability, security, billing, support, governance, configuration, and operational-control platform for the entire JALVORO ecosystem.

The Command Center is one shared internal platform. Product-specific operational areas must register with this platform instead of creating disconnected admin systems.

## Scope of this foundation

This first registry cycle introduces a versioned, fail-closed TypeScript manifest contract and converts the existing Command Center navigation from a fixed component array to validated registry output.

The current registry contains only real, already implemented internal areas:

- Global Overview
- JALVORO Icon System

No unfinished POS, ERP, CRM, accounting, inventory, personal-user, mobile, desktop, partner, or developer product is activated by this foundation.

## Product manifest contract

`ProductManifestV1` records:

- Stable product, family, and category identifiers
- Product name, description, and JALVORO icon key
- Lifecycle and registration status
- Environment, country, region, currency, language, and platform availability
- Applications and current versions
- Modules and their permission requirements
- Service dependencies
- Subscription-plan references
- Analytics metric references
- Event-schema references
- Health-check references
- Error-source references
- Feature-flag references
- Support-category references
- Security-policy references
- Data classification, retention, and residency metadata
- Responsible internal team and repository documentation
- Command Center navigation entries

References use stable keys rather than executing arbitrary code or trusting arbitrary URLs.

## Controlled registration lifecycle

A product manifest may use these registration states:

1. `draft`
2. `validation_pending`
3. `approved`
4. `active`
5. `suspended`
6. `rejected`

Only `active` manifests can contribute navigation.

Lifecycle visibility is also enforced. Concept, internal-development, internal-testing, alpha, and beta products are hidden by default. An explicit internal context is required to include unreleased products.

## Validation boundaries

`validateProductManifest` rejects malformed or unsafe registration data, including:

- Unsupported schema versions
- Invalid or unstable identifiers
- Duplicate product application, module, navigation, or reference keys
- Navigation to an unknown module
- External URLs
- Query strings and fragments in registered admin routes
- Routes outside `/admin`
- Invalid permission keys
- Invalid environments and platforms
- Invalid country and currency codes
- Invalid versions
- Missing ownership or governance metadata
- Invalid retention periods
- Documentation references outside repository `docs/*.md` files

Invalid manifests fail closed and contribute no Command Center navigation.

## Navigation exposure rules

`buildCommandCenterNavigation` exposes an entry only when all of the following are true:

- The manifest passes schema validation
- Product registration status is `active`
- Product lifecycle is permitted for the current context
- Product is available in the current environment
- Administrator has the product permission
- Referenced module exists and is enabled
- Administrator has the module permission
- Administrator has the navigation-entry permission
- Navigation entry is available in the current environment

Navigation is then sorted deterministically by order, product, and label.

## Current compatibility boundary

The existing Admin system currently exposes broad roles: Owner, Admin, Analyst, and Support. Product-, region-, environment-, organization-, action-, and data-classification-scoped grants are not yet stored in the database.

For this first migration-safe cycle, `COMMAND_CENTER_COMPATIBILITY_PERMISSIONS` maps the already accessible Command Center areas into the registry. This preserves current access behavior while removing hard-coded navigation structure.

This compatibility set is temporary. It must be replaced by server-resolved scoped permissions during Phase 2 before newly registered product areas are activated.

## Security and privacy rules

The registry controls discoverability, not backend authorization.

Every page, server action, RPC, API endpoint, export, refund, suspension, configuration change, permission change, and privileged operation must continue to verify authorization independently on the server.

A manifest must never grant access to customer private data. Registration metadata must not include passwords, tokens, card details, bank credentials, raw request bodies, customer messages, accounting contents, payroll contents, inventory contents, or private financial records.

## Next implementation cycle

The next controlled foundation cycle should add migration-safe private registry entities for:

- Product families
- Products
- Applications
- Modules
- Services
- Environments
- Regions
- Manifest versions
- Validation results
- Approval records
- Scoped administrator grants
- Append-only registry audit events

Database activation must remain approval-controlled, RLS-protected, server-authorized, and fully audited. No product should become visible merely because a row or arbitrary manifest was submitted.
