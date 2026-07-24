using Jalvoro.BusinessCore.Application.Modules;
using Jalvoro.BusinessCore.Application.Operations;
using Jalvoro.BusinessCore.Application.Security;
using Jalvoro.BusinessCore.Infrastructure.Operations;
using Jalvoro.BusinessCore.Infrastructure.Security;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Diagnostics.HealthChecks;

namespace Jalvoro.BusinessCore.Infrastructure;

public static class ServiceCollectionExtensions
{
  public static IServiceCollection AddJalvoroBusinessCore(this IServiceCollection services)
  {
    ArgumentNullException.ThrowIfNull(services);

    services.AddSingleton<IBusinessModuleCatalog, BusinessModuleCatalog>();
    services.AddSingleton<IBusinessAuthorizationService, FailClosedBusinessAuthorizationService>();
    services.AddSingleton<IAuthenticatedBusinessContextProvider, UnavailableBusinessContextProvider>();
    services.AddSingleton<IIdempotencyCoordinator, UnavailableIdempotencyCoordinator>();
    services
        .AddHealthChecks()
        .AddCheck(
            "business-core-self",
            () => HealthCheckResult.Healthy("The additive business core foundation is available."),
            tags: ["ready"]);

    return services;
  }
}
