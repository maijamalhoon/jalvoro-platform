using System.Globalization;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
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

public static class StagingOrganizationProfileWriteSafetyContract
{
  public const string RequiredMode = "organization-profile-write";
  public const string RequiredConfirmation = "STAGING_ORGANIZATION_PROFILE_WRITE_RESTORE";
}

public static class StagingOrganizationProfileWriteSmokeRunner
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

    if (!TryReadConfiguration(readVariable, out var configuration, out var rejectionCode))
    {
      error.WriteLine($"[staging-write-smoke] configuration_rejected:{rejectionCode}");
      return Result(StagingSupabaseSmokeCode.ConfigurationRejected);
    }

    output.WriteLine(
      $"[staging-write-smoke] target_ref={StagingSupabaseSafetyContract.AllowedProjectRef} mode=organization-profile-write-restore");

    using var remoteClient = new HttpClient
    {
      Timeout = Timeout.InfiniteTimeSpan,
      MaxResponseContentBufferSize = MaximumResponseBytes,
    };

    OrganizationProfileState original;
    try
    {
      original = await ReadProfileAsync(remoteClient, configuration, cancellationToken);
    }
    catch (UnauthorizedAccessException)
    {
      error.WriteLine("[staging-write-smoke] profile_read_denied");
      return Result(StagingSupabaseSmokeCode.AuthenticationRejected);
    }
    catch (InvalidDataException)
    {
      error.WriteLine("[staging-write-smoke] profile_read_contract_failed");
      return Result(StagingSupabaseSmokeCode.ContractViolation);
    }
    catch (HttpRequestException)
    {
      error.WriteLine("[staging-write-smoke] profile_read_dependency_unavailable");
      return Result(StagingSupabaseSmokeCode.DependencyUnavailable);
    }
    catch (OperationCanceledException) when (!cancellationToken.IsCancellationRequested)
    {
      error.WriteLine("[staging-write-smoke] profile_read_timeout");
      return Result(StagingSupabaseSmokeCode.DependencyUnavailable);
    }

    output.WriteLine("[staging-write-smoke] original_profile_captured");

    await using var host = await LiveWriteApiHost.StartAsync(configuration, cancellationToken);
    var suffix = Guid.NewGuid().ToString("N", CultureInfo.InvariantCulture);
    var updateKey = $"jalvoro-profile-update-{suffix}";
    var conflictKey = updateKey;
    var staleKey = $"jalvoro-profile-stale-{suffix}";
    var crossTenantKey = $"jalvoro-profile-cross-{suffix}";
    var restoreKey = $"jalvoro-profile-restore-{suffix}";
    var temporary = original with
    {
      Description = $"JALVORO staging write smoke {suffix}",
    };

    var mutationApplied = false;
    var updatedVersion = original.Version;
    var proofPassed = false;
    var restorationPassed = false;

    try
    {
      using var updateResponse = await SendProfileCommandAsync(
        host.Client,
        configuration,
        configuration.TenantId,
        updateKey,
        original.Version,
        temporary,
        cancellationToken);
      if (!await IsSuccessfulProfileResponseAsync(
            updateResponse,
            "updated",
            replayed: false,
            configuration.TenantId,
            original.Version + 1,
            temporary,
            cancellationToken))
      {
        error.WriteLine("[staging-write-smoke] initial_update_failed");
        return Result(StagingSupabaseSmokeCode.ContractViolation);
      }

      mutationApplied = true;
      updatedVersion = original.Version + 1;
      output.WriteLine("[staging-write-smoke] initial_update_passed");

      using var replayResponse = await SendProfileCommandAsync(
        host.Client,
        configuration,
        configuration.TenantId,
        updateKey,
        original.Version,
        temporary,
        cancellationToken);
      if (!await IsSuccessfulProfileResponseAsync(
            replayResponse,
            "replayed",
            replayed: true,
            configuration.TenantId,
            updatedVersion,
            temporary,
            cancellationToken))
      {
        error.WriteLine("[staging-write-smoke] exact_replay_failed");
        return Result(StagingSupabaseSmokeCode.ContractViolation);
      }

      output.WriteLine("[staging-write-smoke] exact_replay_passed");

      using var idempotencyConflictResponse = await SendProfileCommandAsync(
        host.Client,
        configuration,
        configuration.TenantId,
        conflictKey,
        original.Version,
        temporary with { Description = $"JALVORO staging conflict {suffix}" },
        cancellationToken);
      if (!await IsConflictAsync(
            idempotencyConflictResponse,
            "idempotency_conflict",
            expectedCurrentVersion: null,
            cancellationToken))
      {
        error.WriteLine("[staging-write-smoke] idempotency_conflict_failed");
        return Result(StagingSupabaseSmokeCode.ContractViolation);
      }

      output.WriteLine("[staging-write-smoke] idempotency_conflict_passed");

      using var versionConflictResponse = await SendProfileCommandAsync(
        host.Client,
        configuration,
        configuration.TenantId,
        staleKey,
        original.Version,
        temporary,
        cancellationToken);
      if (!await IsConflictAsync(
            versionConflictResponse,
            "version_conflict",
            updatedVersion,
            cancellationToken))
      {
        error.WriteLine("[staging-write-smoke] version_conflict_failed");
        return Result(StagingSupabaseSmokeCode.ContractViolation);
      }

      output.WriteLine("[staging-write-smoke] version_conflict_passed");

      using var crossTenantResponse = await SendProfileCommandAsync(
        host.Client,
        configuration,
        BusinessTenantId.Create(Guid.NewGuid()),
        crossTenantKey,
        1,
        temporary,
        cancellationToken);
      if (crossTenantResponse.StatusCode is not HttpStatusCode.Forbidden)
      {
        error.WriteLine("[staging-write-smoke] cross_tenant_denial_failed");
        return Result(StagingSupabaseSmokeCode.ContractViolation);
      }

      output.WriteLine("[staging-write-smoke] cross_tenant_denial_passed");
      proofPassed = true;
    }
    catch (HttpRequestException)
    {
      error.WriteLine("[staging-write-smoke] command_dependency_unavailable");
    }
    catch (JsonException)
    {
      error.WriteLine("[staging-write-smoke] command_response_invalid");
    }
    catch (OperationCanceledException) when (!cancellationToken.IsCancellationRequested)
    {
      error.WriteLine("[staging-write-smoke] command_timeout");
    }
    finally
    {
      if (mutationApplied)
      {
        using var restoreTimeout = new CancellationTokenSource(TimeSpan.FromSeconds(30));
        try
        {
          using var restoreResponse = await SendProfileCommandAsync(
            host.Client,
            configuration,
            configuration.TenantId,
            restoreKey,
            updatedVersion,
            original,
            restoreTimeout.Token);
          restorationPassed = await IsSuccessfulProfileResponseAsync(
            restoreResponse,
            "updated",
            replayed: false,
            configuration.TenantId,
            updatedVersion + 1,
            original,
            restoreTimeout.Token);
        }
        catch (Exception exception) when (
          exception is HttpRequestException or JsonException or OperationCanceledException)
        {
          restorationPassed = false;
        }

        if (restorationPassed)
        {
          output.WriteLine("[staging-write-smoke] original_profile_restored");
        }
        else
        {
          error.WriteLine("[staging-write-smoke] original_profile_restore_failed");
        }
      }
    }

    if (!proofPassed || !restorationPassed)
    {
      return Result(StagingSupabaseSmokeCode.ContractViolation);
    }

    try
    {
      var finalProfile = await ReadProfileAsync(remoteClient, configuration, cancellationToken);
      if (
        finalProfile.Version != original.Version + 2 ||
        !SameProfile(finalProfile, original))
      {
        error.WriteLine("[staging-write-smoke] final_profile_verification_failed");
        return Result(StagingSupabaseSmokeCode.ContractViolation);
      }
    }
    catch (Exception exception) when (
      exception is HttpRequestException or InvalidDataException or UnauthorizedAccessException or OperationCanceledException)
    {
      error.WriteLine("[staging-write-smoke] final_profile_verification_unavailable");
      return Result(StagingSupabaseSmokeCode.DependencyUnavailable);
    }

    output.WriteLine("[staging-write-smoke] final_profile_verified");
    output.WriteLine("[staging-write-smoke] passed");
    return Result(StagingSupabaseSmokeCode.Passed);
  }

  private static bool TryReadConfiguration(
    Func<string, string?> readVariable,
    out StagingWriteConfiguration configuration,
    out string rejectionCode)
  {
    configuration = null!;
    rejectionCode = "unknown";

    if (!string.Equals(
          readVariable("JALVORO_SMOKE_MODE"),
          StagingOrganizationProfileWriteSafetyContract.RequiredMode,
          StringComparison.Ordinal))
    {
      rejectionCode = "mode";
      return false;
    }

    if (!string.Equals(
          readVariable("JALVORO_SMOKE_ENVIRONMENT"),
          StagingSupabaseSafetyContract.RequiredEnvironment,
          StringComparison.Ordinal) ||
        !string.Equals(
          readVariable("JALVORO_SMOKE_CONFIRMATION"),
          StagingOrganizationProfileWriteSafetyContract.RequiredConfirmation,
          StringComparison.Ordinal))
    {
      rejectionCode = "scope";
      return false;
    }

    var projectUrlValue = readVariable("JALVORO_SUPABASE_STAGING_URL");
    if (
      !Uri.TryCreate(projectUrlValue, UriKind.Absolute, out var projectUrl) ||
      !string.Equals(projectUrl.Scheme, Uri.UriSchemeHttps, StringComparison.OrdinalIgnoreCase) ||
      !string.Equals(
        projectUrl.Host,
        StagingSupabaseSafetyContract.AllowedHost,
        StringComparison.OrdinalIgnoreCase) ||
      !string.IsNullOrEmpty(projectUrl.UserInfo) ||
      !string.IsNullOrEmpty(projectUrl.Query) ||
      !string.IsNullOrEmpty(projectUrl.Fragment) ||
      (projectUrl.AbsolutePath.Length != 0 && projectUrl.AbsolutePath != "/"))
    {
      rejectionCode = "project_url";
      return false;
    }

    var publishableKey = readVariable("JALVORO_SUPABASE_STAGING_PUBLISHABLE_KEY");
    if (
      string.IsNullOrWhiteSpace(publishableKey) ||
      !publishableKey.StartsWith("sb_publishable_", StringComparison.Ordinal) ||
      publishableKey.Length > 2048 ||
      publishableKey.Any(char.IsWhiteSpace) ||
      publishableKey.Any(char.IsControl))
    {
      rejectionCode = "publishable_key";
      return false;
    }

    var jwt = readVariable("JALVORO_SUPABASE_STAGING_TEST_JWT");
    if (SupabaseBearerTokenReader.Read(
          string.IsNullOrWhiteSpace(jwt) ? null : $"Bearer {jwt}").Code is not
        SupabaseBearerTokenReadCode.Valid)
    {
      rejectionCode = "bearer";
      return false;
    }

    if (!BusinessSubjectId.TryParse(
          readVariable("JALVORO_SUPABASE_STAGING_TEST_USER_ID"),
          out var subjectId) ||
        !BusinessTenantId.TryParse(
          readVariable("JALVORO_SUPABASE_STAGING_TENANT_ID"),
          out var tenantId))
    {
      rejectionCode = "identity";
      return false;
    }

    var timeoutSeconds = 5;
    var timeoutValue = readVariable("JALVORO_SUPABASE_STAGING_TIMEOUT_SECONDS");
    if (
      timeoutValue is not null &&
      (!int.TryParse(
         timeoutValue,
         NumberStyles.Integer,
         CultureInfo.InvariantCulture,
         out timeoutSeconds) ||
       timeoutSeconds is < 1 or > 10))
    {
      rejectionCode = "timeout";
      return false;
    }

    configuration = new StagingWriteConfiguration(
      new Uri(
        $"{Uri.UriSchemeHttps}://{StagingSupabaseSafetyContract.AllowedHost}/",
        UriKind.Absolute),
      publishableKey,
      jwt!,
      subjectId,
      tenantId,
      TimeSpan.FromSeconds(timeoutSeconds));
    return true;
  }

  private static async Task<OrganizationProfileState> ReadProfileAsync(
    HttpClient client,
    StagingWriteConfiguration configuration,
    CancellationToken cancellationToken)
  {
    var query = string.Join(
      '&',
      "select=id,name,description,timezone,fiscal_year_start_month,profile_version",
      $"id=eq.{Uri.EscapeDataString(configuration.TenantId.ToString())}",
      "limit=1");
    var endpoint = new Uri(configuration.ProjectUrl, $"rest/v1/businesses?{query}");
    using var request = new HttpRequestMessage(HttpMethod.Get, endpoint);
    AddSupabaseHeaders(request, configuration);

    using var timeout = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
    timeout.CancelAfter(configuration.RemoteCallTimeout);
    using var response = await client.SendAsync(
      request,
      HttpCompletionOption.ResponseHeadersRead,
      timeout.Token);
    if (response.StatusCode is HttpStatusCode.Unauthorized or HttpStatusCode.Forbidden)
    {
      throw new UnauthorizedAccessException();
    }

    response.EnsureSuccessStatusCode();
    await using var stream = await response.Content.ReadAsStreamAsync(timeout.Token);
    using var document = await JsonDocument.ParseAsync(
      stream,
      new JsonDocumentOptions { MaxDepth = 16 },
      timeout.Token);
    if (
      document.RootElement.ValueKind is not JsonValueKind.Array ||
      document.RootElement.GetArrayLength() != 1)
    {
      throw new InvalidDataException();
    }

    var row = document.RootElement[0];
    if (
      !TryReadString(row, "id", out var tenantValue) ||
      !BusinessTenantId.TryParse(tenantValue, out var tenantId) ||
      tenantId != configuration.TenantId ||
      !TryReadString(row, "name", out var name) ||
      !TryReadNullableString(row, "description", out var description) ||
      !TryReadString(row, "timezone", out var timezone) ||
      !row.TryGetProperty("fiscal_year_start_month", out var fiscalProperty) ||
      !fiscalProperty.TryGetInt16(out var fiscalMonth) ||
      !row.TryGetProperty("profile_version", out var versionProperty) ||
      !versionProperty.TryGetInt64(out var version) ||
      version < 1)
    {
      throw new InvalidDataException();
    }

    return new OrganizationProfileState(
      tenantId,
      version,
      name,
      description,
      timezone,
      fiscalMonth);
  }

  private static async Task<HttpResponseMessage> SendProfileCommandAsync(
    HttpClient client,
    StagingWriteConfiguration configuration,
    BusinessTenantId tenantId,
    string idempotencyKey,
    long expectedVersion,
    OrganizationProfileState profile,
    CancellationToken cancellationToken)
  {
    var request = new HttpRequestMessage(
      HttpMethod.Put,
      $"/api/v1/organizations/{tenantId}/profile");
    request.Headers.Authorization = new AuthenticationHeaderValue(
      "Bearer",
      configuration.TestUserJwt);
    request.Headers.TryAddWithoutValidation("Idempotency-Key", idempotencyKey);
    request.Content = JsonContent.Create(new UpdateOrganizationProfileRequest(
      profile.Name,
      profile.Description,
      profile.Timezone,
      profile.FiscalYearStartMonth,
      expectedVersion));
    return await client.SendAsync(
      request,
      HttpCompletionOption.ResponseContentRead,
      cancellationToken);
  }

  private static async Task<bool> IsSuccessfulProfileResponseAsync(
    HttpResponseMessage response,
    string expectedCode,
    bool replayed,
    BusinessTenantId tenantId,
    long version,
    OrganizationProfileState profile,
    CancellationToken cancellationToken)
  {
    if (response.StatusCode is not HttpStatusCode.OK)
    {
      return false;
    }

    await using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
    using var document = await JsonDocument.ParseAsync(
      stream,
      new JsonDocumentOptions { MaxDepth = 16 },
      cancellationToken);
    var root = document.RootElement;
    return TryReadString(root, "code", out var code) &&
      string.Equals(code, expectedCode, StringComparison.Ordinal) &&
      root.TryGetProperty("replayed", out var replayProperty) &&
      replayProperty.ValueKind == (replayed ? JsonValueKind.True : JsonValueKind.False) &&
      TryReadString(root, "tenantId", out var tenantValue) &&
      string.Equals(tenantValue, tenantId.ToString(), StringComparison.Ordinal) &&
      root.TryGetProperty("profileVersion", out var versionProperty) &&
      versionProperty.TryGetInt64(out var returnedVersion) &&
      returnedVersion == version &&
      TryReadString(root, "name", out var name) &&
      string.Equals(name, profile.Name, StringComparison.Ordinal) &&
      TryReadNullableString(root, "description", out var description) &&
      string.Equals(description, profile.Description, StringComparison.Ordinal) &&
      TryReadString(root, "timezone", out var timezone) &&
      string.Equals(timezone, profile.Timezone, StringComparison.Ordinal) &&
      root.TryGetProperty("fiscalYearStartMonth", out var fiscalProperty) &&
      fiscalProperty.TryGetInt16(out var fiscalMonth) &&
      fiscalMonth == profile.FiscalYearStartMonth;
  }

  private static async Task<bool> IsConflictAsync(
    HttpResponseMessage response,
    string expectedCode,
    long? expectedCurrentVersion,
    CancellationToken cancellationToken)
  {
    if (response.StatusCode is not HttpStatusCode.Conflict)
    {
      return false;
    }

    await using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
    using var document = await JsonDocument.ParseAsync(
      stream,
      new JsonDocumentOptions { MaxDepth = 8 },
      cancellationToken);
    var root = document.RootElement;
    if (!TryReadString(root, "code", out var code) ||
        !string.Equals(code, expectedCode, StringComparison.Ordinal))
    {
      return false;
    }

    return expectedCurrentVersion is null ||
      (root.TryGetProperty("currentVersion", out var versionProperty) &&
       versionProperty.TryGetInt64(out var currentVersion) &&
       currentVersion == expectedCurrentVersion.Value);
  }

  private static void AddSupabaseHeaders(
    HttpRequestMessage request,
    StagingWriteConfiguration configuration)
  {
    request.Headers.Authorization = new AuthenticationHeaderValue(
      "Bearer",
      configuration.TestUserJwt);
    request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
    request.Headers.TryAddWithoutValidation("apikey", configuration.PublishableKey);
    request.Headers.TryAddWithoutValidation("Accept-Profile", "public");
  }

  private static bool SameProfile(
    OrganizationProfileState left,
    OrganizationProfileState right) =>
    left.TenantId == right.TenantId &&
    string.Equals(left.Name, right.Name, StringComparison.Ordinal) &&
    string.Equals(left.Description, right.Description, StringComparison.Ordinal) &&
    string.Equals(left.Timezone, right.Timezone, StringComparison.Ordinal) &&
    left.FiscalYearStartMonth == right.FiscalYearStartMonth;

  private static bool TryReadString(
    JsonElement source,
    string propertyName,
    out string? value)
  {
    if (
      source.ValueKind is not JsonValueKind.Object ||
      !source.TryGetProperty(propertyName, out var property) ||
      property.ValueKind is not JsonValueKind.String)
    {
      value = null;
      return false;
    }

    value = property.GetString();
    return !string.IsNullOrWhiteSpace(value);
  }

  private static bool TryReadNullableString(
    JsonElement source,
    string propertyName,
    out string? value)
  {
    value = null;
    if (!source.TryGetProperty(propertyName, out var property))
    {
      return false;
    }

    if (property.ValueKind is JsonValueKind.Null)
    {
      return true;
    }

    if (property.ValueKind is not JsonValueKind.String)
    {
      return false;
    }

    value = property.GetString();
    return value is not null;
  }

  private static StagingSupabaseSmokeRunResult Result(StagingSupabaseSmokeCode code) =>
    new(code, code is StagingSupabaseSmokeCode.Passed ? 0 : 1);

  private sealed record StagingWriteConfiguration(
    Uri ProjectUrl,
    string PublishableKey,
    string TestUserJwt,
    BusinessSubjectId ExpectedSubjectId,
    BusinessTenantId TenantId,
    TimeSpan RemoteCallTimeout);

  private sealed record OrganizationProfileState(
    BusinessTenantId TenantId,
    long Version,
    string Name,
    string? Description,
    string Timezone,
    short FiscalYearStartMonth);

  private sealed class LiveWriteApiHost : IAsyncDisposable
  {
    private LiveWriteApiHost(WebApplication application, HttpClient client)
    {
      Application = application;
      Client = client;
    }

    private WebApplication Application { get; }

    public HttpClient Client { get; }

    public static async Task<LiveWriteApiHost> StartAsync(
      StagingWriteConfiguration configuration,
      CancellationToken cancellationToken)
    {
      var builder = WebApplication.CreateBuilder(new WebApplicationOptions
      {
        EnvironmentName = Environments.Production,
      });
      builder.WebHost.ConfigureKestrel(options =>
      {
        options.Listen(IPAddress.Loopback, 0);
      });
      builder.Configuration.AddInMemoryCollection(new Dictionary<string, string?>
      {
        ["Jalvoro:Supabase:ProjectUrl"] = configuration.ProjectUrl.ToString(),
        ["Jalvoro:Supabase:PublishableKey"] = configuration.PublishableKey,
        ["Jalvoro:Supabase:RemoteCallTimeoutSeconds"] =
          ((int)configuration.RemoteCallTimeout.TotalSeconds).ToString(CultureInfo.InvariantCulture),
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
        throw new InvalidOperationException("The staging write smoke host did not publish an HTTP address.");
      }

      return new LiveWriteApiHost(
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
