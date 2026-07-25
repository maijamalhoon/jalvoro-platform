using System.Text.Json.Serialization;
using Jalvoro.BusinessCore.Application;
using Jalvoro.BusinessCore.Application.Modules;
using Jalvoro.BusinessCore.Application.Operations;
using Jalvoro.BusinessCore.Application.Organizations;
using Jalvoro.BusinessCore.Application.Security;
using Jalvoro.BusinessCore.Domain.Operations;
using Jalvoro.BusinessCore.Domain.Tenancy;
using Jalvoro.BusinessCore.Infrastructure;
using Jalvoro.BusinessCore.Infrastructure.Security;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.AspNetCore.Http.Timeouts;

namespace Jalvoro.BusinessCore.Api;

public static class BusinessCoreApiApplication
{
  private static readonly string[] ActiveWriteCommands =
  [
    "organization.profile.update.v1",
  ];

  private static readonly string[] PublishedPermissions =
  [
    BusinessPermissions.OrganizationRead.Value,
    BusinessPermissions.OrganizationManage.Value,
    BusinessPermissions.MembershipRead.Value,
    BusinessPermissions.MembershipManage.Value,
  ];

  public static WebApplicationBuilder AddJalvoroBusinessCoreApi(
    this WebApplicationBuilder builder)
  {
    ArgumentNullException.ThrowIfNull(builder);

    builder.Services.AddProblemDetails();
    builder.Services.AddJalvoroBusinessCore(builder.Configuration);
    builder.Services.AddRequestTimeouts(options =>
    {
      options.DefaultPolicy = new RequestTimeoutPolicy
      {
        Timeout = BusinessRequestPolicy.MaximumExecutionTime,
        TimeoutStatusCode = StatusCodes.Status504GatewayTimeout,
      };
    });
    builder.Services.ConfigureHttpJsonOptions(options =>
    {
      options.SerializerOptions.Converters.Add(new JsonStringEnumConverter());
    });

    return builder;
  }

  public static WebApplication UseJalvoroBusinessCoreApi(this WebApplication app)
  {
    ArgumentNullException.ThrowIfNull(app);

    app.UseExceptionHandler();
    app.UseRequestTimeouts();
    app.Use(async (context, next) =>
    {
      const string correlationHeader = "X-Correlation-ID";
      var incomingCorrelationId = context.Request.Headers[correlationHeader].FirstOrDefault();
      var correlationId = string.IsNullOrWhiteSpace(incomingCorrelationId) || incomingCorrelationId.Length > 128
        ? Guid.NewGuid().ToString("N")
        : incomingCorrelationId;

      context.TraceIdentifier = correlationId;
      context.Response.OnStarting(() =>
      {
        context.Response.Headers[correlationHeader] = correlationId;
        context.Response.Headers["X-Content-Type-Options"] = "nosniff";
        context.Response.Headers["X-Frame-Options"] = "DENY";
        context.Response.Headers["Referrer-Policy"] = "no-referrer";
        context.Response.Headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()";
        context.Response.Headers["Cache-Control"] = "no-store";
        return Task.CompletedTask;
      });

      await next();
    });
    app.UseAuthentication();
    app.UseAuthorization();

    app.MapGet(
          "/",
          () => Results.Ok(new
          {
            product = BusinessCoreContract.Product,
            apiVersion = BusinessCoreContract.ApiVersion,
            architecture = BusinessCoreContract.Architecture,
            status = BusinessCoreContract.RuntimeStatus,
            message = "Additive foundation only. Existing JALVORO systems remain authoritative.",
          }))
      .ExcludeFromDescription();

    app.MapGet(
          "/api/v1/platform",
          () => Results.Ok(new
          {
            product = BusinessCoreContract.Product,
            apiVersion = BusinessCoreContract.ApiVersion,
            architecture = BusinessCoreContract.Architecture,
            status = BusinessCoreContract.RuntimeStatus,
            destructiveMigrationEnabled = false,
            legacySystemsPreserved = true,
            personalTrackingIntegrated = false,
          }))
      .WithName("GetBusinessCorePlatformContract");

    app.MapGet(
          "/api/v1/modules",
          (IBusinessModuleCatalog catalog) => Results.Ok(new
          {
            status = BusinessCoreContract.RuntimeStatus,
            modules = catalog.GetAll(),
          }))
      .WithName("GetBusinessCoreModules");

    app.MapGet(
          "/api/v1/security",
          (SupabaseIdentityConfigurationState supabaseConfiguration) => Results.Ok(new
          {
            authorization = "fail-closed",
            identityProviderConfigured = supabaseConfiguration.IsConfigured,
            identityVerification = "supabase-auth-server",
            expectedAudience = SupabaseIdentityConfiguration.ExpectedAudience,
            anonymousUsersAccepted = false,
            userMetadataUsedForAuthorization = false,
            membershipProjection = "supabase-data-api-rls",
            membershipProjectionConfigured = supabaseConfiguration.IsConfigured,
            tenantSelection = "route-only-and-membership-verified",
            trustClientIdentityHeaders = BusinessRequestPolicy.TrustClientIdentityHeaders,
            serviceRoleUsed = false,
            exactTenantMatchRequired = true,
            exactPermissionMatchRequired = true,
            idempotencyRequiredForWrites = BusinessRequestPolicy.RequireIdempotencyForWrites,
            idempotencyStorageConfigured = supabaseConfiguration.IsConfigured,
            idempotencyStorage = "supabase-transactional-rpc",
            activeWriteCommands = ActiveWriteCommands,
            legacyWritePathsPreserved = true,
            businessCoreWriteEndpointMapped = true,
            writeEndpointsActive = supabaseConfiguration.IsConfigured,
            productionWriteTrafficActive = false,
            requestTimeoutSeconds = (int)BusinessRequestPolicy.MaximumExecutionTime.TotalSeconds,
            permissions = PublishedPermissions,
          }))
      .WithName("GetBusinessCoreSecurityContract");

    app.MapGet(
          "/api/v1/context/{tenantId}",
          async (IBusinessContextResolver resolver, CancellationToken cancellationToken) =>
          {
            var resolution = await resolver.ResolveCurrentAsync(cancellationToken);
            return resolution.Code switch
            {
              BusinessContextResolutionCode.Resolved when resolution.Context is { } context =>
                Results.Ok(new
                {
                  status = "resolved",
                  tenantId = context.TenantId.ToString(),
                  subjectId = context.SubjectId.ToString(),
                  authenticationMethod = context.AuthenticationMethod,
                  permissions = context.Permissions
                    .Select(permission => permission.Value)
                    .OrderBy(permission => permission, StringComparer.Ordinal)
                    .ToArray(),
                  readOnly = true,
                }),
              BusinessContextResolutionCode.TenantUnavailable =>
                Results.BadRequest(new { code = "tenant_unavailable" }),
              BusinessContextResolutionCode.MembershipDenied =>
                Results.Forbid(),
              BusinessContextResolutionCode.TemporarilyUnavailable =>
                Results.Problem(
                  statusCode: StatusCodes.Status503ServiceUnavailable,
                  title: "Business identity is temporarily unavailable."),
              _ => Results.Unauthorized(),
            };
          })
      .RequireAuthorization()
      .WithName("GetVerifiedBusinessContext");

    app.MapPut(
          "/api/v1/organizations/{tenantId}/profile",
          async (
            string tenantId,
            UpdateOrganizationProfileRequest request,
            HttpContext httpContext,
            OrganizationProfileCommandHandler handler,
            CancellationToken cancellationToken) =>
          {
            if (!BusinessTenantId.TryParse(tenantId, out var parsedTenantId))
            {
              return Results.BadRequest(new { code = "tenant_unavailable" });
            }

            var idempotencyValue = httpContext.Request.Headers["Idempotency-Key"].FirstOrDefault();
            if (!IdempotencyKey.TryParse(idempotencyValue, out var idempotencyKey))
            {
              return Results.BadRequest(new { code = "idempotency_key_invalid" });
            }

            if (!OrganizationProfileDocument.TryCreate(
                  request.Name,
                  request.Description,
                  request.Timezone,
                  request.FiscalYearStartMonth,
                  out var profile))
            {
              return Results.BadRequest(new { code = "organization_profile_invalid" });
            }

            var result = await handler.ExecuteAsync(
              parsedTenantId,
              idempotencyKey,
              request.ExpectedVersion,
              profile,
              cancellationToken);

            return result.Code switch
            {
              OrganizationProfileWriteCode.Updated when result.Profile is { } updated =>
                Results.Ok(CreateOrganizationProfileResponse("updated", false, updated)),
              OrganizationProfileWriteCode.Replayed when result.Profile is { } replayed =>
                Results.Ok(CreateOrganizationProfileResponse("replayed", true, replayed)),
              OrganizationProfileWriteCode.IdempotencyConflict =>
                Results.Conflict(new { code = "idempotency_conflict" }),
              OrganizationProfileWriteCode.VersionConflict =>
                Results.Conflict(new
                {
                  code = "version_conflict",
                  currentVersion = result.CurrentVersion,
                }),
              OrganizationProfileWriteCode.ValidationFailed =>
                Results.BadRequest(new { code = "organization_profile_invalid" }),
              OrganizationProfileWriteCode.Forbidden =>
                Results.Forbid(),
              OrganizationProfileWriteCode.NotFound =>
                Results.NotFound(new { code = "organization_not_found" }),
              _ => Results.Problem(
                statusCode: StatusCodes.Status503ServiceUnavailable,
                title: "The organization profile command is temporarily unavailable."),
            };
          })
      .RequireAuthorization()
      .WithName("UpdateOrganizationProfile");

    app.MapHealthChecks(
      "/health/live",
      new HealthCheckOptions
      {
        Predicate = _ => false,
      });

    app.MapHealthChecks(
      "/health/ready",
      new HealthCheckOptions
      {
        Predicate = registration => registration.Tags.Contains("ready"),
      });

    return app;
  }

  private static object CreateOrganizationProfileResponse(
    string code,
    bool replayed,
    OrganizationProfileSnapshot profile) =>
    new
    {
      code,
      replayed,
      tenantId = profile.TenantId.ToString(),
      profileVersion = profile.Version,
      profile.Name,
      profile.Description,
      profile.Timezone,
      profile.FiscalYearStartMonth,
    };
}
