using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Jalvoro.BusinessCore.Api;
using Jalvoro.BusinessCore.Application.Organizations;
using Jalvoro.BusinessCore.Application.Tenancy;
using Jalvoro.BusinessCore.Domain.Security;
using Jalvoro.BusinessCore.Domain.Tenancy;
using Jalvoro.BusinessCore.Infrastructure.Security;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Hosting.Server;
using Microsoft.AspNetCore.Hosting.Server.Features;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Hosting;

internal static class OrganizationProfileHttpContracts
{
  public static async Task RunAsync(Action<bool, string> check)
  {
    ArgumentNullException.ThrowIfNull(check);

    await CheckMissingIdempotencyKeyAsync(check);
    await CheckViewerDeniedAsync(check);
    await CheckUpdatedAndReplayedResponsesAsync(check);
    await CheckConflictResponsesAsync(check);
    await CheckDependencyFailureAsync(check);
    await CheckSecurityContractAsync(check);
  }

  private static async Task CheckMissingIdempotencyKeyAsync(Action<bool, string> check)
  {
    var fixture = CreateFixture("owner", OrganizationProfileWriteResult.TemporarilyUnavailable());
    await using var host = await IntegrationHost.StartAsync(fixture);
    using var request = CreateRequest(fixture.TenantId, fixture.Token, expectedVersion: 1);
    using var response = await host.Client.SendAsync(request, CancellationToken.None);
    using var body = await ParseBodyAsync(response);

    check(
      response.StatusCode is HttpStatusCode.BadRequest &&
      body.RootElement.GetProperty("code").GetString() == "idempotency_key_invalid" &&
      fixture.Store.InvocationCount == 0,
      "A profile write without a valid idempotency key must fail before the store runs.");
  }

  private static async Task CheckViewerDeniedAsync(Action<bool, string> check)
  {
    var fixture = CreateFixture("viewer", OrganizationProfileWriteResult.TemporarilyUnavailable());
    await using var host = await IntegrationHost.StartAsync(fixture);
    using var request = CreateRequest(fixture.TenantId, fixture.Token, expectedVersion: 1);
    request.Headers.TryAddWithoutValidation("Idempotency-Key", "01JALVORO-HTTP-PROFILE-01");
    using var response = await host.Client.SendAsync(request, CancellationToken.None);

    check(
      response.StatusCode is HttpStatusCode.Forbidden && fixture.Store.InvocationCount == 0,
      "A verified viewer must receive 403 before the profile write store runs.");
  }

  private static async Task CheckUpdatedAndReplayedResponsesAsync(Action<bool, string> check)
  {
    var tenantId = BusinessTenantId.Create(Guid.NewGuid());
    var updatedSnapshot = new OrganizationProfileSnapshot(
      tenantId,
      2,
      "JALVORO Services",
      "Updated through HTTP",
      "Asia/Karachi",
      1);
    var updatedFixture = CreateFixture(
      "owner",
      OrganizationProfileWriteResult.Updated(updatedSnapshot),
      tenantId);

    await using (var host = await IntegrationHost.StartAsync(updatedFixture))
    {
      using var request = CreateRequest(tenantId, updatedFixture.Token, expectedVersion: 1);
      request.Headers.TryAddWithoutValidation("Idempotency-Key", "01JALVORO-HTTP-PROFILE-02");
      using var response = await host.Client.SendAsync(request, CancellationToken.None);
      using var body = await ParseBodyAsync(response);

      check(
        response.StatusCode is HttpStatusCode.OK &&
        body.RootElement.GetProperty("code").GetString() == "updated" &&
        !body.RootElement.GetProperty("replayed").GetBoolean() &&
        body.RootElement.GetProperty("profileVersion").GetInt64() == 2,
        "A successful owner command must return the normalized updated profile and version.");
      check(
        updatedFixture.Store.LastCommand is { } command &&
        command.TenantId == tenantId &&
        command.ExpectedVersion == 1 &&
        command.Profile.Name == "JALVORO Services" &&
        command.Profile.Description == "Updated through HTTP" &&
        command.Profile.Timezone == "Asia/Karachi",
        "The HTTP boundary must pass only the route tenant and normalized request document to the command store.");
    }

    var replayFixture = CreateFixture(
      "owner",
      OrganizationProfileWriteResult.Replayed(updatedSnapshot),
      tenantId);
    await using var replayHost = await IntegrationHost.StartAsync(replayFixture);
    using var replayRequest = CreateRequest(tenantId, replayFixture.Token, expectedVersion: 1);
    replayRequest.Headers.TryAddWithoutValidation("Idempotency-Key", "01JALVORO-HTTP-PROFILE-02");
    using var replayResponse = await replayHost.Client.SendAsync(
      replayRequest,
      CancellationToken.None);
    using var replayBody = await ParseBodyAsync(replayResponse);

    check(
      replayResponse.StatusCode is HttpStatusCode.OK &&
      replayBody.RootElement.GetProperty("code").GetString() == "replayed" &&
      replayBody.RootElement.GetProperty("replayed").GetBoolean(),
      "An exact duplicate command must return a stable successful replay response.");
  }

  private static async Task CheckConflictResponsesAsync(Action<bool, string> check)
  {
    var idempotencyFixture = CreateFixture(
      "owner",
      OrganizationProfileWriteResult.IdempotencyConflict());
    await using (var host = await IntegrationHost.StartAsync(idempotencyFixture))
    {
      using var request = CreateRequest(
        idempotencyFixture.TenantId,
        idempotencyFixture.Token,
        expectedVersion: 1);
      request.Headers.TryAddWithoutValidation("Idempotency-Key", "01JALVORO-HTTP-PROFILE-03");
      using var response = await host.Client.SendAsync(request, CancellationToken.None);
      using var body = await ParseBodyAsync(response);

      check(
        response.StatusCode is HttpStatusCode.Conflict &&
        body.RootElement.GetProperty("code").GetString() == "idempotency_conflict",
        "Reusing an idempotency key with another payload must receive 409.");
    }

    var versionFixture = CreateFixture(
      "owner",
      OrganizationProfileWriteResult.VersionConflict(7));
    await using var versionHost = await IntegrationHost.StartAsync(versionFixture);
    using var versionRequest = CreateRequest(
      versionFixture.TenantId,
      versionFixture.Token,
      expectedVersion: 6);
    versionRequest.Headers.TryAddWithoutValidation("Idempotency-Key", "01JALVORO-HTTP-PROFILE-04");
    using var versionResponse = await versionHost.Client.SendAsync(
      versionRequest,
      CancellationToken.None);
    using var versionBody = await ParseBodyAsync(versionResponse);

    check(
      versionResponse.StatusCode is HttpStatusCode.Conflict &&
      versionBody.RootElement.GetProperty("code").GetString() == "version_conflict" &&
      versionBody.RootElement.GetProperty("currentVersion").GetInt64() == 7,
      "A stale expected version must receive 409 with the current server version.");
  }

  private static async Task CheckDependencyFailureAsync(Action<bool, string> check)
  {
    var fixture = CreateFixture(
      "owner",
      OrganizationProfileWriteResult.TemporarilyUnavailable());
    await using var host = await IntegrationHost.StartAsync(fixture);
    using var request = CreateRequest(fixture.TenantId, fixture.Token, expectedVersion: 1);
    request.Headers.TryAddWithoutValidation("Idempotency-Key", "01JALVORO-HTTP-PROFILE-05");
    using var response = await host.Client.SendAsync(request, CancellationToken.None);

    check(
      response.StatusCode is HttpStatusCode.ServiceUnavailable,
      "An unavailable transactional profile store must receive 503 and never fail open.");
  }

  private static async Task CheckSecurityContractAsync(Action<bool, string> check)
  {
    var fixture = CreateFixture("viewer", OrganizationProfileWriteResult.TemporarilyUnavailable());
    await using var host = await IntegrationHost.StartAsync(fixture);
    using var response = await host.Client.GetAsync("/api/v1/security", CancellationToken.None);
    using var body = await ParseBodyAsync(response);
    var commands = body.RootElement.GetProperty("activeWriteCommands")
      .EnumerateArray()
      .Select(value => value.GetString())
      .ToArray();

    check(
      response.StatusCode is HttpStatusCode.OK &&
      body.RootElement.GetProperty("idempotencyStorage").GetString() == "supabase-transactional-rpc" &&
      commands.Contains("organization.profile.update.v1", StringComparer.Ordinal) &&
      body.RootElement.GetProperty("legacyWritePathsPreserved").GetBoolean(),
      "The runtime security contract must disclose the exact active idempotent command and preserved legacy paths.");
  }

  private static Fixture CreateFixture(
    string role,
    OrganizationProfileWriteResult storeResult,
    BusinessTenantId? tenantId = null)
  {
    var resolvedTenant = tenantId ?? BusinessTenantId.Create(Guid.NewGuid());
    var subjectId = BusinessSubjectId.Create(Guid.NewGuid());
    var token = CreateJwt();
    var identityVerifier = new StubIdentityVerifier(subjectId);
    var membershipReader = new StubMembershipProjectionReader(
      new BusinessMembershipProjection(
        resolvedTenant,
        subjectId,
        BusinessMembershipRole.Create(role),
        []));
    return new Fixture(
      resolvedTenant,
      token,
      identityVerifier,
      membershipReader,
      new RecordingCommandStore(storeResult));
  }

  private static HttpRequestMessage CreateRequest(
    BusinessTenantId tenantId,
    string token,
    long expectedVersion)
  {
    var request = new HttpRequestMessage(
      HttpMethod.Put,
      $"/api/v1/organizations/{tenantId}/profile");
    request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
    request.Content = JsonContent.Create(new UpdateOrganizationProfileRequest(
      "  JALVORO Services  ",
      "  Updated through HTTP  ",
      "  Asia/Karachi  ",
      1,
      expectedVersion));
    return request;
  }

  private static async Task<JsonDocument> ParseBodyAsync(HttpResponseMessage response) =>
    await JsonDocument.ParseAsync(
      await response.Content.ReadAsStreamAsync(CancellationToken.None),
      cancellationToken: CancellationToken.None);

  private static string CreateJwt()
  {
    var header = Base64Url(JsonSerializer.SerializeToUtf8Bytes(new { alg = "HS256", typ = "JWT" }));
    var payload = Base64Url(JsonSerializer.SerializeToUtf8Bytes(new
    {
      sub = Guid.NewGuid(),
      aud = "authenticated",
    }));
    return $"{header}.{payload}.{new string('a', 43)}";
  }

  private static string Base64Url(byte[] value) =>
    Convert.ToBase64String(value)
      .TrimEnd('=')
      .Replace('+', '-')
      .Replace('/', '_');

  private sealed record Fixture(
    BusinessTenantId TenantId,
    string Token,
    ISupabaseIdentityVerifier IdentityVerifier,
    IBusinessMembershipProjectionReader MembershipReader,
    RecordingCommandStore Store);

  private sealed class IntegrationHost : IAsyncDisposable
  {
    private IntegrationHost(WebApplication application, HttpClient client)
    {
      Application = application;
      Client = client;
    }

    private WebApplication Application { get; }

    public HttpClient Client { get; }

    public static async Task<IntegrationHost> StartAsync(Fixture fixture)
    {
      var builder = WebApplication.CreateBuilder(new WebApplicationOptions
      {
        EnvironmentName = Environments.Production,
      });
      builder.WebHost.ConfigureKestrel(options =>
      {
        options.Listen(IPAddress.Loopback, 0);
      });
      builder.AddJalvoroBusinessCoreApi();
      builder.Services.RemoveAll<ISupabaseIdentityVerifier>();
      builder.Services.RemoveAll<IBusinessMembershipProjectionReader>();
      builder.Services.RemoveAll<IOrganizationProfileCommandStore>();
      builder.Services.AddSingleton(fixture.IdentityVerifier);
      builder.Services.AddSingleton(fixture.MembershipReader);
      builder.Services.AddSingleton<IOrganizationProfileCommandStore>(fixture.Store);

      var application = builder.Build();
      application.UseJalvoroBusinessCoreApi();
      await application.StartAsync(CancellationToken.None);

      var server = application.Services.GetRequiredService<IServer>();
      var address = server.Features.Get<IServerAddressesFeature>()?.Addresses.SingleOrDefault();
      if (string.IsNullOrWhiteSpace(address))
      {
        await application.DisposeAsync();
        throw new InvalidOperationException("The organization profile integration host did not publish an HTTP address.");
      }

      return new IntegrationHost(
        application,
        new HttpClient
        {
          BaseAddress = new Uri(address, UriKind.Absolute),
          Timeout = TimeSpan.FromSeconds(5),
        });
    }

    public async ValueTask DisposeAsync()
    {
      Client.Dispose();
      await Application.StopAsync(CancellationToken.None);
      await Application.DisposeAsync();
    }
  }

  private sealed class StubIdentityVerifier(BusinessSubjectId subjectId)
    : ISupabaseIdentityVerifier
  {
    public ValueTask<SupabaseIdentityVerificationResult> VerifyAsync(
      string bearerToken,
      CancellationToken cancellationToken)
    {
      cancellationToken.ThrowIfCancellationRequested();
      return ValueTask.FromResult(SupabaseIdentityVerificationResult.Verified(
        new SupabaseVerifiedIdentity(
          subjectId,
          SupabaseIdentityConfiguration.ExpectedAudience,
          "supabase-auth-server")));
    }
  }

  private sealed class StubMembershipProjectionReader(BusinessMembershipProjection membership)
    : IBusinessMembershipProjectionReader
  {
    public ValueTask<BusinessMembershipLookupResult> ReadActiveAsync(
      BusinessTenantId tenantId,
      BusinessSubjectId subjectId,
      string bearerToken,
      CancellationToken cancellationToken)
    {
      cancellationToken.ThrowIfCancellationRequested();
      return ValueTask.FromResult(
        tenantId == membership.TenantId && subjectId == membership.SubjectId
          ? BusinessMembershipLookupResult.Found(membership)
          : BusinessMembershipLookupResult.NotFound());
    }
  }

  private sealed class RecordingCommandStore(OrganizationProfileWriteResult result)
    : IOrganizationProfileCommandStore
  {
    public int InvocationCount { get; private set; }

    public UpdateOrganizationProfileCommand? LastCommand { get; private set; }

    public ValueTask<OrganizationProfileWriteResult> UpdateAsync(
      UpdateOrganizationProfileCommand command,
      CancellationToken cancellationToken)
    {
      cancellationToken.ThrowIfCancellationRequested();
      InvocationCount++;
      LastCommand = command;
      return ValueTask.FromResult(result);
    }
  }
}
