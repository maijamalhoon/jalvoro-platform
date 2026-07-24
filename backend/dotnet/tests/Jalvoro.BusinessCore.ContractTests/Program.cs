using Jalvoro.BusinessCore.Application;
using Jalvoro.BusinessCore.Application.Modules;
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

if (failures.Count == 0)
{
    Console.WriteLine($"JALVORO Business Core contracts passed: {modules.Count} modules verified.");
    return 0;
}

Console.Error.WriteLine("JALVORO Business Core contract failures:");
foreach (var failure in failures)
{
    Console.Error.WriteLine($"- {failure}");
}

return 1;
