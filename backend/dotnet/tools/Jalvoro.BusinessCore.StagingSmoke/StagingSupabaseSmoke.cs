using System.Globalization;
using System.Net;
using System.Net.Http.Headers;
using System.Text.Json;
using Jalvoro.BusinessCore.Api;
using Jalvoro.BusinessCore.Domain.Security;
using Jalvoro.BusinessCore.Domain.Tenancy;
using Jalvoro.BusinessCore.Infrastructure.Security;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Hosting.Server;
using Microsoft.AspNetCore.Hosting.Server.Features;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

namespace Jalvoro.BusinessCore.StagingSmoke;

public static class StagingSupabaseSafetyContract
{
  public const string RequiredEnvironment = "staging";
  public const string RequiredConfirmation = "STAGING_ONLY_READ_ONLY";
  public const string AllowedProjectRef = "zqhdwjivyfzeoqvahjme";
  public const string BlockedProductionProjectRef = "tdagzmgcgjlyqzegmizg";
  public const string RequiredTable = "business_members";

  public static string AllowedHost => $"{AllowedProjectRef}.supabase.co";

  public static string BlockedProductionHost => $"{BlockedProductionProjectRef}.supabase.co";
}

public enum StagingSmokeConfigurationCode
{
  Valid,
  MissingEnvironment,
  MissingConfirmation,
  UnsafeProjectUrl,
  UnsafeApiKey,
  InvalidBearerToken,
  InvalidSubjectId,
  InvalidTenantId,
  InvalidTimeout,
}

public sealed record StagingSupabaseSmokeConfiguration(
  Uri ProjectUrl,
  string PublishableKey,
  string TestUserJwt,
  BusinessSubjectId ExpectedSubjectId,
  BusinessTenantId TenantId,
  TimeSpan RemoteCallTimeout);

public sealed record StagingSmokeConfigurationResult(
  StagingSmokeConfigurationCode Code,
  StagingSupabaseSmokeConfiguration? Configuration)
{
  public bool IsValid => Code is StagingSmokeConfigurationCode.Valid && Configuration is not null;
}

public static class StagingSupabaseSmokeConfigurationReader
{
  private const int MaximumApiKeyLength = 2048;

  public static StagingSmokeConfigurationResult Read(Func<string, string?> readVariable)
  {
    ArgumentNullException.ThrowIfNull(readVariable);

    if (!string.Equals(
          readVariable("JALVORO_SMOKE_ENVIRONMENT"),
          StagingSupabaseSafetyContract.RequiredEnvironment,
          StringComparison.Ordinal))
    {
      return Invalid(StagingSmokeConfigurationCode.MissingEnvironment);
    }

    if (!string.Equals(
          readVariable("JALVORO_SMOKE_CONFIRMATION"),
          StagingSupabaseSafetyContract.RequiredConfirmation,
          StringComparison.Ordinal))
    {
      return Invalid(StagingSmokeConfigurationCode.MissingConfirmation);
    }

    if (!TryReadSafeProjectUrl(
          readVariable("JALVORO_SUPABASE_STAGING_URL"),
          out var projectUrl))
    {
      return Invalid(StagingSmokeConfigurationCode.UnsafeProjectUrl);
    }

    var publishableKey = readVariable("JALVORO_SUPABASE_STAGING_PUBLISHABLE_KEY");
    if (!IsModernPublishableKey(publishableKey))
    {
      return Invalid(StagingSmokeConfigurationCode.UnsafeApiKey);
    }

    var testUserJwt = readVariable("JALVORO_SUPABASE_STAGING_TEST_JWT");
    if (
      SupabaseBearerTokenReader.Read(
        string.IsNullOrWhiteSpace(testUserJwt) ? null : $"Bearer {testUserJwt}").Code is not
        SupabaseBearerTokenReadCode.Valid)
    {
      return Invalid(StagingSmokeConfigurationCode.InvalidBearerToken);
    }

    if (!BusinessSubjectId.TryParse(
          readVariable("JALVORO_SUPABASE_STAGING_TEST_USER_ID"),
          out var expectedSubjectId))
    {
      return Invalid(StagingSmokeConfigurationCode.InvalidSubjectId);
    }

    if (!BusinessTenantId.TryParse(
          readVariable("JALVORO_SUPABASE_STAGING_TENANT_ID"),
          out var tenantId))
    {
      return Invalid(StagingSmokeConfigurationCode.InvalidTenantId);
    }

    if (!TryReadTimeout(
          readVariable("JALVORO_SUPABASE_STAGING_TIMEOUT_SECONDS"),
          out var timeout))
    {
      return Invalid(StagingSmokeConfigurationCode.InvalidTimeout);
    }

    return new StagingSmokeConfigurationResult(
      StagingSmokeConfigurationCode.Valid,
      new StagingSupabaseSmokeConfiguration(
        projectUrl,
        publishableKey!,
        testUserJwt!,
        expectedSubjectId,
        tenantId,
        timeout));
  }

  private static StagingSmokeConfigurationResult Invalid(
    StagingSmokeConfigurationCode code) => new(code, null);

  private static bool TryReadSafeProjectUrl(string? value, out Uri projectUrl)
  {
    if (
      !Uri.TryCreate(value, UriKind.Absolute, out var parsed) ||
      !string.Equals(parsed.Scheme, Uri.UriSchemeHttps, StringComparison.OrdinalIgnoreCase) ||
      !string.IsNullOrEmpty(parsed.UserInfo) ||
      !string.IsNullOrEmpty(parsed.Query) ||
      !string.IsNullOrEmpty(parsed.Fragment) ||
      (parsed.AbsolutePath.Length != 0 && parsed.AbsolutePath != "/") ||
      string.Equals(
        parsed.Host,
        StagingSupabaseSafetyContract.BlockedProductionHost,
        StringComparison.OrdinalIgnoreCase) ||
      !string.Equals(
        parsed.Host,
        StagingSupabaseSafetyContract.AllowedHost,
        StringComparison.OrdinalIgnoreCase))
    {
      projectUrl = null!;
      return false;
    }

    projectUrl = new Uri(
      $"{Uri.UriSchemeHttps}://{StagingSupabaseSafetyContract.AllowedHost}/",
      UriKind.Absolute);
    return true;
  }

  private static bool IsModernPublishableKey(string? value) =>
    !string.IsNullOrWhiteSpace(value) &&
    value.Length <= MaximumApiKeyLength &&
    value.StartsWith("sb_publishable_", StringComparison.Ordinal) &&
    !value.Any(char.IsWhiteSpace) &&
    !value.Any(char.IsControl);

  private static bool TryReadTimeout(string? value, out TimeSpan timeout)
  {
    var seconds = 5;
    if (
      value is not null &&
      (!int.TryParse(
         value,
         NumberStyles.Integer,
         CultureInfo.InvariantCulture,
         out seconds) ||
       seconds is < 1 or > 10))
    {
      timeout = default;
      return false;
    }

    timeout = TimeSpan.FromSeconds(seconds);
    return true;
  }
}

public enum StagingSupabaseSmokeCode
{
  Passed,
  ConfigurationRejected,
  AuthenticationRejected,
  SchemaNotReady,
  SchemaAccessDenied,
  MembershipDenied,
  DependencyUnavailable,
  ContractViolation,
}

public sealed record StagingSupabaseSmokeRunResult(
  StagingSupabaseSmokeCode Code,
  int ExitCode)
{
  public bool Passed => Code is StagingSupabaseSmokeCode.Passed;
}

public static class StagingSupabaseSmokeRunner
{
  private const int MaximumResponseBytes = 65_536;

  public static async Task<StagingSupabaseSmokeRunResult> RunAsync(
    Func<string, string?> readVariable,
    TextWriter output,
    TextWriter error,
    CancellationToken cancellationToken)
  {
    ArgumentNullException.ThrowIfNull(readVariable);
    ArgumentNullException.ThrowIfNull(output);
    ArgumentNullException.ThrowIfNull(error);

    var configurationResult = StagingSupabaseSmokeConfigurationReader.Read(readVariable);
    if (!configurationResult.IsValid || configurationResult.Configuration is not { } configuration)
    {
      error.WriteLine(
        $"[staging-smoke] configuration_rejected:{configurationResult.Code.ToString().ToLowerInvariant()}");
      return Result(StagingSupabaseSmokeCode.ConfigurationRejected);
    }

    output.WriteLine(
      $"[staging-smoke] target_ref={StagingSupabaseSafetyContract.AllowedProjectRef} mode=read-only");

    using var remoteClient = new HttpClient
    {
      Timeout = Timeout.InfiniteTimeSpan,
      MaxResponseContentBufferSize = MaximumResponseBytes,
    };

    var configurationState = CreateProductionConfigurationState(configuration);
    if (!configurationState.IsConfigured)
    {
      error.WriteLine("[staging-smoke] production_configuration_contract_rejected");
      return Result(StagingSupabaseSmokeCode.ContractViolation);
    }

    var identityVerifier = new SupabaseRemoteIdentityVerifier(remoteClient, configurationState);
    var identityResult = await identityVerifier.VerifyAsync(
      configuration.TestUserJwt,
      cancellationToken);

    if (
      identityResult.Code is not SupabaseIdentityVerificationCode.Verified ||
      identityResult.Identity is not { } identity)
    {
      var code = identityResult.Code is SupabaseIdentityVerificationCode.Invalid
        ? StagingSupabaseSmokeCode.AuthenticationRejected
        : StagingSupabaseSmokeCode.DependencyUnavailable;
      error.WriteLine($"[staging-smoke] identity_check_failed:{identityResult.Code.ToString().ToLowerInvariant()}");
      return Result(code);
    }

    if (identity.SubjectId != configuration.ExpectedSubjectId)
    {
      error.WriteLine("[staging-smoke] identity_subject_mismatch");
      return Result(StagingSupabaseSmokeCode.AuthenticationRejected);
    }

    output.WriteLine("[staging-smoke] identity_verified");

    var schemaProbe = await ProbeMembershipSchemaAsync(
      remoteClient,
      configurationState.Current!,
      configuration.TestUserJwt,
      cancellationToken);
    if (schemaProbe is not StagingSchemaProbeCode.Ready)
    {
      error.WriteLine($"[staging-smoke] schema_probe_failed:{schemaProbe.ToString().ToLowerInvariant()}");
      return Result(schemaProbe switch
      {
        StagingSchemaProbeCode.NotReady => StagingSupabaseSmokeCode.SchemaNotReady,
        StagingSchemaProbeCode.AccessDenied => StagingSupabaseSmokeCode.SchemaAccessDenied,
        _ => StagingSupabaseSmokeCode.DependencyUnavailable,
      });
    }

    output.WriteLine("[staging-smoke] membership_schema_ready");

    await using var host = await LiveApiHost.StartAsync(configuration, cancellationToken);
    using var securityResponse = await host.Client.GetAsync(
      "/api/v1/security",
      cancellationToken);
    if (!await HasSafeSecurityContractAsync(securityResponse, cancellationToken))
    {
      error.WriteLine("[staging-smoke] public_security_contract_failed");
      return Result(StagingSupabaseSmokeCode.ContractViolation);
    }

    using var contextRequest = new HttpRequestMessage(
      HttpMethod.Get,
      $"/api/v1/context/{configuration.TenantId}");
    contextRequest.Headers.Authorization = new AuthenticationHeaderValue(
      "Bearer",
      configuration.TestUserJwt);
    contextRequest.Headers.TryAddWithoutValidation(
      "X-Jalvoro-Tenant-ID",
      BusinessTenantId.Create(Guid.NewGuid()).ToString());

    using var contextResponse = await host.Client.SendAsync(
      contextRequest,
      HttpCompletionOption.ResponseContentRead,
      cancellationToken);

    if (contextResponse.StatusCode is HttpStatusCode.Forbidden)
    {
      error.WriteLine("[staging-smoke] exact_active_membership_not_found");
      return Result(StagingSupabaseSmokeCode.MembershipDenied);
    }

    if (contextResponse.StatusCode is HttpStatusCode.Unauthorized)
    {
      error.WriteLine("[staging-smoke] api_identity_rejected");
      return Result(StagingSupabaseSmokeCode.AuthenticationRejected);
    }

    if (contextResponse.StatusCode is HttpStatusCode.ServiceUnavailable)
    {
      error.WriteLine("[staging-smoke] api_dependency_unavailable");
      return Result(StagingSupabaseSmokeCode.DependencyUnavailable);
    }

    if (
      contextResponse.StatusCode is not HttpStatusCode.OK ||
      !await IsExpectedContextAsync(contextResponse, configuration, cancellationToken))
    {
      error.WriteLine("[staging-smoke] resolved_context_contract_failed");
      return Result(StagingSupabaseSmokeCode.ContractViolation);
    }

    output.WriteLine("[staging-smoke] verified_context_resolved read_only=true");
    output.WriteLine("[staging-smoke] passed");
    return Result(StagingSupabaseSmokeCode.Passed);
  }

  private static SupabaseIdentityConfigurationState CreateProductionConfigurationState(
    StagingSupabaseSmokeConfiguration configuration)
  {
    var values = new Dictionary<string, string?>
    {
      ["Jalvoro:Supabase:ProjectUrl"] = configuration.ProjectUrl.ToString(),
      ["Jalvoro:Supabase:PublishableKey"] = configuration.PublishableKey,
      ["Jalvoro:Supabase:RemoteCallTimeoutSeconds"] =
        ((int)configuration.RemoteCallTimeout.TotalSeconds).ToString(CultureInfo.InvariantCulture),
    };
    var source = new ConfigurationBuilder()
      .AddInMemoryCollection(values)
      .Build();
    return SupabaseIdentityConfigurationState.FromConfiguration(source);
  }

  private static async Task<bool> HasSafeSecurityContractAsync(
    HttpResponseMessage response,
    CancellationToken cancellationToken)
  {
    if (response.StatusCode is not HttpStatusCode.OK)
    {
      return false;
    }

    try
    {
      await using var body = await response.Content.ReadAsStreamAsync(cancellationToken);
      using var document = await JsonDocument.ParseAsync(
        body,
        new JsonDocumentOptions { MaxDepth = 16 },
        cancellationToken);
      var root = document.RootElement;
      return root.TryGetProperty("identityProviderConfigured", out var configured) &&
        configured.ValueKind is JsonValueKind.True &&
        root.TryGetProperty("writeEndpointsActive", out var writes) &&
        writes.ValueKind is JsonValueKind.False &&
        root.TryGetProperty("serviceRoleUsed", out var serviceRole) &&
        serviceRole.ValueKind is JsonValueKind.False &&
        response.Headers.CacheControl?.NoStore is true;
    }
    catch (JsonException)
    {
      return false;
    }
  }

  private static async Task<bool> IsExpectedContextAsync(
    HttpResponseMessage response,
    StagingSupabaseSmokeConfiguration configuration,
    CancellationToken cancellationToken)
  {
    try
    {
      await using var body = await response.Content.ReadAsStreamAsync(cancellationToken);
      using var document = await JsonDocument.ParseAsync(
        body,
        new JsonDocumentOptions { MaxDepth = 16 },
        cancellationToken);
      var root = document.RootElement;
      return root.TryGetProperty("status", out var status) &&
        string.Equals(status.GetString(), "resolved", StringComparison.Ordinal) &&
        root.TryGetProperty("tenantId", out var tenant) &&
        string.Equals(tenant.GetString(), configuration.TenantId.ToString(), StringComparison.Ordinal) &&
        root.TryGetProperty("subjectId", out var subject) &&
        string.Equals(subject.GetString(), configuration.ExpectedSubjectId.ToString(), StringComparison.Ordinal) &&
        root.TryGetProperty("readOnly", out var readOnly) &&
        readOnly.ValueKind is JsonValueKind.True &&
        root.TryGetProperty("permissions", out var permissions) &&
        permissions.ValueKind is JsonValueKind.Array &&
        permissions.EnumerateArray().Any(value =>
          string.Equals(
            value.GetString(),
            BusinessPermissions.OrganizationRead.Value,
            StringComparison.Ordinal)) &&
        response.Headers.CacheControl?.NoStore is true;
    }
    catch (JsonException)
    {
      return false;
    }
  }

  private static async Task<StagingSchemaProbeCode> ProbeMembershipSchemaAsync(
    HttpClient httpClient,
    SupabaseIdentityConfiguration configuration,
    string bearerToken,
    CancellationToken cancellationToken)
  {
    var endpoint = new Uri(
      configuration.DataApiEndpoint,
      "business_members?select=business_id,user_id,role,status,permissions&limit=0");
    using var request = new HttpRequestMessage(HttpMethod.Get, endpoint);
    request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", bearerToken);
    request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
    request.Headers.TryAddWithoutValidation("apikey", configuration.PublishableKey);
    request.Headers.TryAddWithoutValidation("Accept-Profile", "public");

    using var timeout = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
    timeout.CancelAfter(configuration.RemoteCallTimeout);

    try
    {
      using var response = await httpClient.SendAsync(
        request,
        HttpCompletionOption.ResponseContentRead,
        timeout.Token);
      if (response.IsSuccessStatusCode)
      {
        return StagingSchemaProbeCode.Ready;
      }

      if (response.StatusCode is HttpStatusCode.Unauthorized or HttpStatusCode.Forbidden)
      {
        return StagingSchemaProbeCode.AccessDenied;
      }

      var responseBody = await response.Content.ReadAsStringAsync(timeout.Token);
      if (
        responseBody.Length <= MaximumResponseBytes &&
        IsMissingSchemaResponse(response.StatusCode, responseBody))
      {
        return StagingSchemaProbeCode.NotReady;
      }

      return StagingSchemaProbeCode.Unavailable;
    }
    catch (OperationCanceledException) when (!cancellationToken.IsCancellationRequested)
    {
      return StagingSchemaProbeCode.Unavailable;
    }
    catch (HttpRequestException)
    {
      return StagingSchemaProbeCode.Unavailable;
    }
  }

  private static bool IsMissingSchemaResponse(
    HttpStatusCode statusCode,
    string responseBody)
  {
    if (statusCode is not HttpStatusCode.NotFound and not HttpStatusCode.BadRequest)
    {
      return false;
    }

    try
    {
      using var document = JsonDocument.Parse(responseBody);
      var root = document.RootElement;
      if (
        root.TryGetProperty("code", out var code) &&
        string.Equals(code.GetString(), "PGRST205", StringComparison.Ordinal))
      {
        return true;
      }

      return root.TryGetProperty("message", out var message) &&
        message.GetString() is { } text &&
        text.Contains(StagingSupabaseSafetyContract.RequiredTable, StringComparison.OrdinalIgnoreCase) &&
        (text.Contains("schema cache", StringComparison.OrdinalIgnoreCase) ||
         text.Contains("find the table", StringComparison.OrdinalIgnoreCase));
    }
    catch (JsonException)
    {
      return false;
    }
  }

  private static StagingSupabaseSmokeRunResult Result(StagingSupabaseSmokeCode code) =>
    new(code, code switch
    {
      StagingSupabaseSmokeCode.Passed => 0,
      StagingSupabaseSmokeCode.ConfigurationRejected => 20,
      StagingSupabaseSmokeCode.AuthenticationRejected => 21,
      StagingSupabaseSmokeCode.SchemaNotReady => 22,
      StagingSupabaseSmokeCode.SchemaAccessDenied => 23,
      StagingSupabaseSmokeCode.MembershipDenied => 24,
      StagingSupabaseSmokeCode.DependencyUnavailable => 25,
      _ => 26,
    });

  private enum StagingSchemaProbeCode
  {
    Ready,
    NotReady,
    AccessDenied,
    Unavailable,
  }

  private sealed class LiveApiHost : IAsyncDisposable
  {
    private LiveApiHost(WebApplication application, HttpClient client)
    {
      Application = application;
      Client = client;
    }

    private WebApplication Application { get; }

    public HttpClient Client { get; }

    public static async Task<LiveApiHost> StartAsync(
      StagingSupabaseSmokeConfiguration configuration,
      CancellationToken cancellationToken)
    {
      ArgumentNullException.ThrowIfNull(configuration);

      var builder = WebApplication.CreateBuilder(new WebApplicationOptions
      {
        EnvironmentName = Environments.Staging,
      });
      builder.Configuration.AddInMemoryCollection(new Dictionary<string, string?>
      {
        ["Jalvoro:Supabase:ProjectUrl"] = configuration.ProjectUrl.ToString(),
        ["Jalvoro:Supabase:PublishableKey"] = configuration.PublishableKey,
        ["Jalvoro:Supabase:RemoteCallTimeoutSeconds"] =
          ((int)configuration.RemoteCallTimeout.TotalSeconds).ToString(CultureInfo.InvariantCulture),
      });
      builder.WebHost.ConfigureKestrel(options =>
      {
        options.Listen(IPAddress.Loopback, 0);
      });
      builder.AddJalvoroBusinessCoreApi();

      var application = builder.Build();
      application.UseJalvoroBusinessCoreApi();
      await application.StartAsync(cancellationToken);

      var server = application.Services.GetRequiredService<IServer>();
      var address = server.Features.Get<IServerAddressesFeature>()?.Addresses.SingleOrDefault();
      if (string.IsNullOrWhiteSpace(address))
      {
        await application.DisposeAsync();
        throw new InvalidOperationException("The staging smoke host did not publish a loopback address.");
      }

      return new LiveApiHost(
        application,
        new HttpClient
        {
          BaseAddress = new Uri(address, UriKind.Absolute),
          Timeout = TimeSpan.FromSeconds(15),
          MaxResponseContentBufferSize = MaximumResponseBytes,
        });
    }

    public async ValueTask DisposeAsync()
    {
      Client.Dispose();
      await Application.StopAsync(CancellationToken.None);
      await Application.DisposeAsync();
    }
  }
}
