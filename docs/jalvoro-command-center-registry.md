# JALVORO Command Center Registry

## Official identity

- **Interface name:** JALVORO Command Center
- **Full product name:** JALVORO Global Admin & Operations Control Center
- **Technical description:** Central internal administration, analytics, observability, security, billing, support, governance, configuration, and operational-control platform for the entire JALVORO ecosystem.

The Command Center is one shared internal platform. Product-specific operational areas register with this platform instead of creating disconnected administration systems.

## Implemented foundations

### Phase 1: application manifest contract

`ProductManifestV1` defines stable product, family, category, application, module, lifecycle, environment, permission, telemetry-reference, governance, retention, residency, ownership, documentation, and navigation metadata.

The application validator rejects malformed identities, duplicate keys, unknown modules, external routes, query strings, fragments, routes outside `/admin`, invalid permission keys, invalid environments, invalid versions, missing governance, and unsafe documentation references.

### Phase 2: private database control plane

The database now models:

- Product families
- Products
- Applications
- Modules
- Services
- Environments
- Regions
- Product environment and region availability
- Navigation registrations
- Versioned submitted manifests
- Validation results
- Short-lived Owner approvals
- Role permission defaults
- Scoped administrator grants
- Append-only registry audit events

All registry entities live in the private schema, have row-level security enabled, deny direct anonymous and authenticated table access, and are accessed through server-authorized functions only.

## Controlled registration lifecycle

A submitted product manifest follows this sequence:

1. Owner or Admin submits a complete manifest.
2. The database validates the manifest independently from the application validator.
3. Failed manifests are stored as failed validation evidence and cannot be approved.
4. An Owner approves a passed manifest for no more than 24 hours.
5. Activation verifies the stored SHA-256 digest and reruns validation.
6. The approved version is normalized into product, application, module, service, environment, region, and navigation entities.
7. The approval is consumed atomically.
8. The product becomes discoverable only when registration and lifecycle controls permit it.

A product may use these registration states:

- `draft`
- `validation_pending`
- `approved`
- `active`
- `suspended`
- `rejected`

Only active products with released lifecycle states can contribute normal Command Center navigation.

## Scoped authorization

The current Admin roles remain:

- Owner
- Admin
- Analyst
- Support

The former browser compatibility permission set has been removed. Current-area compatibility is represented by server-side role permission rows, while exceptional grants may be scoped by:

- User
- Permission
- Product
- Module
- Environment
- Region
- Organization
- Data classification
- Expiration time

Grant creation and revocation are Owner-only and append structured audit events. Revoked and expired grants do not authorize navigation.

## Server-resolved navigation

`public.get_command_center_navigation(environment)` is the navigation authority. It returns only entries whose product, module, environment, lifecycle, role permissions, and active scoped grants permit visibility.

The shared web shell calls this RPC in a server component. The browser receives only validated navigation presentation fields:

- Product key and name
- Navigation and module keys
- Label
- Internal `/admin` route
- JALVORO icon key
- Display order

Registry visibility does not replace authorization on pages, server actions, RPCs, APIs, exports, billing operations, user operations, or configuration changes.

## Audit and privacy boundaries

Validation evidence and registry audit rows are append-only. Registry audit records retain structured identifiers and state transitions for 24 months.

Manifest validation rejects sensitive field names including passwords, tokens, secrets, card numbers, CVV, bank credentials, raw IP addresses, customer messages, financial content, payroll content, and inventory content.

The registry must never store customer finance records, accounting ledgers, payroll entries, invoices, payment credentials, private communications, or arbitrary raw request payloads.

## Current registered product

Only the already implemented JALVORO Command Center is bootstrapped:

- Global Overview
- JALVORO Icon System

No unfinished POS, ERP, CRM, accounting, inventory, payroll, personal-user, mobile, desktop, partner, or developer product is activated by this foundation.

## Verification status

The complete lifecycle was first applied and tested on the isolated `jamals-finance-load-test-staging` Supabase project. Transactional staging records used for submit, validate, approve, activate, grant, revoke, and audit verification were rolled back.

The same control-plane schema, validator, lifecycle functions, authorization RPCs, bootstrap records, and covering indexes were then applied to `jalvoro-production` before the web-shell integration was merged.

Verified behavior includes:

- RLS and direct-access denial on all 16 registry tables
- One bootstrapped product, two modules, two navigation entries, one activated manifest, one validation result, twelve role-permission rows, and one bootstrap audit event
- Existing two-item production Command Center navigation for the active Owner
- Submit, validate, approve, activate, grant, revoke, and audit lifecycle in staging
- Permission-gated navigation appearance and removal in staging
- External-route rejection in staging and production
- Sensitive-field rejection in staging and production
- Non-Owner approval denial in staging
- Append-only audit enforcement in staging
- Complete covering indexes for every new foreign key
- No new Command Center security-advisor warning
- No missing-index advisor warning for the Command Center registry

Production verification used read-only checks after the idempotent bootstrap. No customer finance, accounting, payroll, inventory, billing, authentication, or business records were read into the registry or modified by verification.
