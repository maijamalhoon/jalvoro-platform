using Jalvoro.BusinessCore.Application.Modules;
using Jalvoro.BusinessCore.Application.Operations;
using Jalvoro.BusinessCore.Application.Security;
using Jalvoro.BusinessCore.Application.Tenancy;
using Jalvoro.BusinessCore.Infrastructure.Operations;
using Jalvoro.BusinessCore.Infrastructure.Security;
using Jalvoro.BusinessCore.Infrastructure.Tenancy;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Diagnostics.HealthChecks;

namespace Jalvoro.BusinessCore.Infrastructure;

public static class ServiceCollectionExtensions
{
  public static IServiceCollection AddJalvoroBusinessCore(
    this IServiceCollection services,
    IConfiguration configuration)
  {
    ArgumentNullException.ThrowIfNull(services);
    ArgumentNullException.ThrowIfNull(configuration);

    var supabaseConfiguration = SupabaseIdentityConfigurationState.FromConfiguration(configuration);

    services.AddSingleton(supabaseConfiguration);
    services.AddSingleton<IBusinessModuleCatalog, BusinessModuleCatalog>();
    services.AddSingleton<IBusinessAuthorizationService, FailClosedBusinessAuthorizationService>();
    services.AddSingleton<BusinessMembershipPermissionMapper>();
    services.AddScoped<IBusinessContextResolver, SupabaseBusinessContextResolver>();
    services.AddScoped<IAuthenticatedBusinessContextProvider, SupabaseBusinessContextProvider>();
    services.AddSingleton<IIdempotencyCoordinator, UnavailableIdempotencyCoordinator>();
    services.AddHttpContextAccessor();
    services
      .AddHttpClient<ISupabaseIdentityVerifier, SupabaseRemoteIdentityVerifier>(client =>
      {
        client.Timeout = Timeout.InfiniteTimeSpan;
      });
    services
      .AddHttpClient<IBusinessMembershipProjectionReader, SupabaseMembershipProjectionReader>(client =>
      {
        client.Timeout = Timeout.InfiniteTimeSpan;
      });
    services
      .AddAuthentication(options =>
      {
        options.DefaultAuthenticateScheme = SupabaseAuthenticationDefaults.Scheme;
        options.DefaultChallengeScheme = SupabaseAuthenticationDefaults.Scheme;
        options.DefaultForbidScheme = SupabaseAuthenticationDefaults.Scheme;
      })
      .AddScheme<AuthenticationSchemeOptions, SupabaseAuthenticationHandler>(
        SupabaseAuthenticationDefaults.Scheme,
        _ => { });
    services.AddAuthorization();
    services
      .AddHealthChecks()
      .AddCheck(
        "business-core-self",
        () => HealthCheckResult.Healthy("The additive business core foundation is available."),
        tags: ["ready"]);

    return services;
  }
}
