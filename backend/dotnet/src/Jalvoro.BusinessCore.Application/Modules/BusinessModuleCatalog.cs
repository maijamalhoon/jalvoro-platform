namespace Jalvoro.BusinessCore.Application.Modules;

public sealed class BusinessModuleCatalog : IBusinessModuleCatalog
{
  private static readonly IReadOnlyList<BusinessModuleDescriptor> Modules =
      Array.AsReadOnly<BusinessModuleDescriptor>(
      [
          new(
                "platform.foundation",
                "Platform foundation",
                "Shared contracts, tenancy, health, security, observability, and module registration.",
                BusinessModuleLifecycle.Foundation),
            new(
                "identity.organizations",
                "Organizations and identity",
                "Business tenants, memberships, roles, permissions, branches, and verified ownership.",
                BusinessModuleLifecycle.Planned),
            new(
                "finance.accounting",
                "Accounting and finance",
                "Double-entry accounting, invoicing, expenses, tax-ready records, approvals, and reporting.",
                BusinessModuleLifecycle.Planned),
            new(
                "sales.crm",
                "Sales and CRM",
                "Customers, leads, opportunities, quotations, orders, follow-ups, and ownership.",
                BusinessModuleLifecycle.Planned),
            new(
                "commerce.inventory",
                "Inventory and purchasing",
                "Products, suppliers, purchasing, stock movement, valuation, and replenishment.",
                BusinessModuleLifecycle.Planned,
                RequiresOfflineReadiness: true),
            new(
                "commerce.pos",
                "Point of sale",
                "Counter sales, shifts, returns, receipts, local devices, and resilient synchronization.",
                BusinessModuleLifecycle.Planned,
                RequiresOfflineReadiness: true,
                RequiresHardwareIntegration: true),
            new(
                "hospitality.restaurant",
                "Restaurant operations",
                "Tables, menus, modifiers, kitchen flow, order states, staff, payments, and stock usage.",
                BusinessModuleLifecycle.Planned,
                RequiresOfflineReadiness: true,
                RequiresHardwareIntegration: true),
            new(
                "operations.warehouse",
                "Warehousing and distribution",
                "Receiving, dispatch, transfers, multi-location stock, fulfillment, and delivery control.",
                BusinessModuleLifecycle.Planned,
                RequiresOfflineReadiness: true),
            new(
                "people.workforce",
                "Workforce operations",
                "Employees, departments, attendance, shifts, payroll inputs, responsibilities, and approvals.",
                BusinessModuleLifecycle.Planned),
            new(
                "operations.branches",
                "Branches and networks",
                "Multi-branch control, dealerships, franchises, territories, transfers, and branch performance.",
                BusinessModuleLifecycle.Planned),
            new(
                "enterprise.governance",
                "Enterprise governance",
                "Advanced authorization, audit, policy, integrations, provisioning, and executive control.",
                BusinessModuleLifecycle.Planned),
            new(
                "integrations.platform",
                "Integration platform",
                "Versioned APIs, webhooks, imports, exports, connectors, events, and external system boundaries.",
                BusinessModuleLifecycle.Planned),
      ]);

  public IReadOnlyList<BusinessModuleDescriptor> GetAll() => Modules;
}
