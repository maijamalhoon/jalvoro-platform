namespace Jalvoro.BusinessCore.Application.Modules;

public enum BusinessModuleLifecycle
{
    Foundation,
    Planned,
    Preview,
    Active,
    Retired,
}

public sealed record BusinessModuleDescriptor(
    string Id,
    string Name,
    string Capability,
    BusinessModuleLifecycle Lifecycle,
    bool RequiresOfflineReadiness = false,
    bool RequiresHardwareIntegration = false);

public interface IBusinessModuleCatalog
{
    IReadOnlyList<BusinessModuleDescriptor> GetAll();
}
