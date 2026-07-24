using Jalvoro.BusinessCore.Application;
using Jalvoro.BusinessCore.Application.Modules;
using Jalvoro.BusinessCore.Application.Operations;
using Jalvoro.BusinessCore.Application.Security;
using Jalvoro.BusinessCore.Domain.Operations;
using Jalvoro.BusinessCore.Domain.Security;
using Jalvoro.BusinessCore.Domain.Tenancy;

var failures = new List<string>();

void Check(bool condition, string message)
{
  if (!condition)
  {
    failures.Add(message);
  }
}

var catalog = new BusinessModuleCatalog();
var modules = catalog.GetAll();
var requiredModules = new[]
{
  "platform.foundation",
  "identity.organizations",
  "finance.accounting",
  "sales.crm",
  "commerce.inventory",
  "commerce.pos",
  "hospitality.restaurant",
  "operations.warehouse",
  "people.workforce",
  "operations.branches",
  "enterprise.governance",
  "integrations.platform",
};

Check(BusinessCoreContract.ApiVersion == "v1", "The first public business-core API contract must remain v1.");
Check(BusinessCoreContract.Architecture == "modular-monolith", "The initial architecture must remain a modular monolith.");
Check(BusinessCoreContract.RuntimeStatus == "foundation", "The new runtime must remain foundation-only until explicit activation.");
Check(modules.Count >= requiredModules.Length, "The module catalog is missing required business foundations.");
Check(
  modules.Select(module => module.Id).Distinct(StringComparer.Ordinal).Count() == modules.Count,
  "Business module IDs must be unique.");
Check(
  modules.All(module => module.Lifecycle is not BusinessModuleLifecycle.Active),
  "No business module may be marked active in the foundation node.");
Check(
  modules.All(module => !module.Id.Contains("personal", StringComparison.OrdinalIgnoreCase)),
  "Personal Tracking must not be registered in the Business Core catalog.");
Check(
  modules.All(module => !module.Name.Contains("personal", StringComparison.OrdinalIgnoreCase)),
  "Personal Tracking must not appear in Business Core module names.");
Check(
  requiredModules.All(required => modules.Any(module => module.Id == required)),
  "At least one required JALVORO business module is not registered.");
Check(
  modules.Where(module => module.RequiresHardwareIntegration)
    .All(module => module.RequiresOfflineReadiness),
  "Hardware-integrated modules must declare offline-readiness requirements.");
Check(
  !BusinessTenantId.TryParse(null, out _),
  "A null tenant ID must fail validation.");
Check(
  !BusinessTenantId.TryParse(Guid.Empty.ToString(), out _),
  "An empty tenant ID must fail validation.");

var expectedTenantId = Guid.NewGuid();
Check(
  BusinessTenantId.TryParse(expectedTenantId.ToString(), out var tenantId) &&
  tenantId.Value == expectedTenantId,
  "A valid tenant ID must round-trip without mutation.");

Check(!BusinessSubjectId.TryParse(null, out _), "A null business subject ID must fail validation.");
Check(!BusinessSubjectId.TryParse(Guid.Empty.ToString(), out _), "An empty business subject ID must fail validation.");
Check(BusinessSubjectId.TryParse(Guid.NewGuid().ToString(), out _), "A valid business subject ID must parse.");

Check(!PermissionKey.TryParse("organization", out _), "Permission keys require at least two segments.");
Check(!PermissionKey.TryParse("Organization.Read", out _), "Permission keys must reject uppercase values.");
Check(!PermissionKey.TryParse("organization..read", out _), "Permission keys must reject empty segments.");
Check(PermissionKey.TryParse("organization.read", out _), "A valid permission key must parse.");

Check(!IdempotencyKey.TryParse("too-short", out _), "Short idempotency keys must fail validation.");
Check(!IdempotencyKey.TryParse("contains whitespace 123", out _), "Idempotency keys must reject whitespace.");
Check(IdempotencyKey.TryParse("01JALVORO-ORDER-0001", out _), "A valid idempotency key must parse.");
Check(BusinessRequestPolicy.MaximumExecutionTime == TimeSpan.FromSeconds(15), "Business API requests must remain bounded to 15 seconds by default.");
Check(BusinessRequestPolicy.RequireIdempotencyForWrites, "Business writes must require idempotency.");
Check(!BusinessRequestPolicy.TrustClientIdentityHeaders, "Client identity headers must never be trusted.");

var requiredTenant = BusinessTenantId.Create(Guid.NewGuid());
var anotherTenant = BusinessTenantId.Create(Guid.NewGuid());
var subjectId = BusinessSubjectId.Create(Guid.NewGuid());
var mutablePermissions = new List<PermissionKey> { BusinessPermissions.OrganizationRead };
var accessContext = new BusinessAccessContext(
  requiredTenant,
  subjectId,
  mutablePermissions,
  "contract-test");
mutablePermissions.Clear();

var authorization = new FailClosedBusinessAuthorizationService();
Check(
  authorization.Evaluate(null, requiredTenant, BusinessPermissions.OrganizationRead).Code == AuthorizationDecisionCode.Unauthenticated,
  "Missing authentication context must deny access.");
Check(
  authorization.Evaluate(accessContext, anotherTenant, BusinessPermissions.OrganizationRead).Code == AuthorizationDecisionCode.TenantMismatch,
  "Cross-tenant authorization must be denied.");
Check(
  authorization.Evaluate(accessContext, requiredTenant, BusinessPermissions.OrganizationManage).Code == AuthorizationDecisionCode.MissingPermission,
  "Missing exact permission must deny access.");
Check(
  authorization.Evaluate(accessContext, requiredTenant, BusinessPermissions.OrganizationRead).Allowed,
  "Matching tenant and exact permission must allow access.");
Check(
  accessContext.Permissions.Contains(BusinessPermissions.OrganizationRead),
  "Business access context permissions must be copied defensively.");
var permissionCollection = accessContext.Permissions as ICollection<PermissionKey>;
Check(
  permissionCollection is null || permissionCollection.IsReadOnly,
  "Business access context permissions must not expose a mutable collection.");

var unavailableIdempotency = new IdempotencyDecision(IdempotencyDecisionCode.Unavailable);
var duplicateIdempotency = new IdempotencyDecision(IdempotencyDecisionCode.Duplicate);
var reservedIdempotency = new IdempotencyDecision(IdempotencyDecisionCode.Reserved);
Check(!unavailableIdempotency.MayExecute, "Unavailable idempotency storage must block execution.");
Check(!duplicateIdempotency.MayExecute, "Duplicate idempotency reservations must block execution.");
Check(reservedIdempotency.MayExecute, "Only a reserved idempotency scope may execute.");

await SupabaseIdentityContracts.RunAsync(Check);

if (failures.Count == 0)
{
  Console.WriteLine($"JALVORO Business Core contracts passed: {modules.Count} modules, fail-closed organization security, and verified Supabase identity projection.");
  return 0;
}

Console.Error.WriteLine("JALVORO Business Core contract failures:");
foreach (var failure in failures)
{
  Console.Error.WriteLine($"- {failure}");
}

return 1;
