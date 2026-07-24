using System.Text.Json.Serialization;
using Jalvoro.BusinessCore.Application;
using Jalvoro.BusinessCore.Application.Modules;
using Jalvoro.BusinessCore.Application.Operations;
using Jalvoro.BusinessCore.Application.Security;
using Jalvoro.BusinessCore.Infrastructure;
using Jalvoro.BusinessCore.Infrastructure.Security;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.AspNetCore.Http.Timeouts;

var builder = WebApplication.CreateBuilder(args);

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

var app = builder.Build();

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
          idempotencyStorageConfigured = false,
          writeEndpointsActive = false,
          requestTimeoutSeconds = (int)BusinessRequestPolicy.MaximumExecutionTime.TotalSeconds,
          permissions = new[]
          {
            BusinessPermissions.OrganizationRead.Value,
            BusinessPermissions.OrganizationManage.Value,
            BusinessPermissions.MembershipRead.Value,
            BusinessPermissions.MembershipManage.Value,
          },
        }))
    .WithName("GetBusinessCoreSecurityContract");

app.MapGet(
        "/api/v1/context/{tenantId:guid}",
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

app.Run();

public partial class Program;
