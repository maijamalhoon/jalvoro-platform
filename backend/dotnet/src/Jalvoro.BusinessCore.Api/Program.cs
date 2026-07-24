using System.Text.Json.Serialization;
using Jalvoro.BusinessCore.Application;
using Jalvoro.BusinessCore.Application.Modules;
using Jalvoro.BusinessCore.Infrastructure;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddProblemDetails();
builder.Services.AddJalvoroBusinessCore();
builder.Services.ConfigureHttpJsonOptions(options =>
{
    options.SerializerOptions.Converters.Add(new JsonStringEnumConverter());
});

var app = builder.Build();

app.UseExceptionHandler();
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
