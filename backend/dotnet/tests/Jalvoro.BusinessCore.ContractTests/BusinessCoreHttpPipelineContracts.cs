using System.Net;
using System.Net.Http.Headers;
using System.Text.Json;
using Jalvoro.BusinessCore.Api;
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

internal static class BusinessCoreHttpPipelineContracts
{
  private const string CorrelationHeader = "X-Correlation-ID";

  public static async Task RunAsync(Action<bool, string> check)
  {
    ArgumentNullException.ThrowIfNull(check);

    await CheckAnonymousChallengeAsync(check);
    await CheckMalformedBearerAsync(check);
    await CheckIdentityDependencyFailureAsync(check);
    await CheckInvalidTenantAsync(check);
    await CheckMembershipDeniedAsync(check);
    await CheckMembershipDependencyFailureAsync(check);
    await CheckResolvedContextAsync(check);
  }

  private static async Task CheckAnonymousChallengeAsync(Action<bool, string> check)
  {
    var tenantId = BusinessTenantId.Create(Guid.NewGuid());
    var identityVerifier = StubIdentityVerifier.Verified(BusinessSubjectId.Create(Guid.NewGuid()));
    var membershipReader = StubMembershipProjectionReader.NotFound();

    await using var host = await IntegrationHost.StartAsync(identityVerifier, membershipReader);
    using var response = await host.Client.GetAsync(
      $"/api/v1/context/{tenantId}",
      CancellationToken.None);

    check(
      response.StatusCode is HttpStatusCode.Unauthorized,
      "An unauthenticated HTTP request must receive 401.");
    check(
      response.Headers.WwwAuthenticate.Any(value => value.Scheme == "Bearer"),
      "An unauthenticated HTTP request must receive a Bearer challenge.");
    check(
      identityVerifier.InvocationCount == 0,
      "A missing bearer credential must not invoke the remote identity verifier.");
    CheckSecurityHeaders(response, check);
  }

  private static async Task CheckMalformedBearerAsync(Action<bool, string> check)
  {
    var tenantId = BusinessTenantId.Create(Guid.NewGuid());
    var identityVerifier = StubIdentityVerifier.Verified(BusinessSubjectId.Create(Guid.NewGuid()));
    var membershipReader = StubMembershipProjectionReader.NotFound();

    await using var host = await IntegrationHost.StartAsync(identityVerifier, membershipReader);
    using var request = new HttpRequestMessage(HttpMethod.Get, $"/api/v1/context/{tenantId}");
    request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", "sb_publishable_not_a_user_token");
    using var response = await host.Client.SendAsync(
      request,
      CancellationToken.None);

    check(
      response.StatusCode is HttpStatusCode.Unauthorized,
      "A malformed or API-key bearer credential must receive 401.");
    check(
      identityVerifier.InvocationCount == 0,
      "A structurally invalid bearer credential must not reach identity verification.");
  }

  private static async Task CheckIdentityDependencyFailureAsync(Action<bool, string> check)
  {
    var tenantId = BusinessTenantId.Create(Guid.NewGuid());
    var identityVerifier = StubIdentityVerifier.TemporarilyUnavailable();
    var membershipReader = StubMembershipProjectionReader.NotFound();

    await using var host = await IntegrationHost.StartAsync(identityVerifier, membershipReader);
    using var request = CreateAuthenticatedRequest($"/api/v1/context/{tenantId}", CreateJwt());
    using var response = await host.Client.SendAsync(
      request,
      CancellationToken.None);

    check(
      response.StatusCode is HttpStatusCode.ServiceUnavailable,
      "An unavailable identity provider must receive 503 rather than 401 or fail open.");
    check(
      HeaderContains(response, "Retry-After", "5"),
      "An unavailable identity provider challenge must include a bounded Retry-After value.");
    check(
      membershipReader.InvocationCount == 0,
      "Membership projection must not run when identity verification is unavailable.");
  }

  private static async Task CheckInvalidTenantAsync(Action<bool, string> check)
  {
    var subjectId = BusinessSubjectId.Create(Guid.NewGuid());
    var identityVerifier = StubIdentityVerifier.Verified(subjectId);
    var membershipReader = StubMembershipProjectionReader.NotFound();

    await using var host = await IntegrationHost.StartAsync(identityVerifier, membershipReader);
    using var request = CreateAuthenticatedRequest("/api/v1/context/not-a-guid", CreateJwt());
    using var response = await host.Client.SendAsync(
      request,
      CancellationToken.None);
    using var body = JsonDocument.Parse(await response.Content.ReadAsStreamAsync(
      CancellationToken.None));

    check(
      response.StatusCode is HttpStatusCode.BadRequest,
      "An authenticated request with an invalid route tenant must receive 400, not 404.");
    check(
      body.RootElement.GetProperty("code").GetString() == "tenant_unavailable",
      "An invalid route tenant must return the stable tenant_unavailable code.");
    check(
      membershipReader.InvocationCount == 0,
      "An invalid route tenant must be rejected before membership lookup.");
  }

  private static async Task CheckMembershipDeniedAsync(Action<bool, string> check)
  {
    var tenantId = BusinessTenantId.Create(Guid.NewGuid());
    var subjectId = BusinessSubjectId.Create(Guid.NewGuid());
    var token = CreateJwt();
    var identityVerifier = StubIdentityVerifier.Verified(subjectId);
    var membershipReader = StubMembershipProjectionReader.NotFound();

    await using var host = await IntegrationHost.StartAsync(identityVerifier, membershipReader);
    using var request = CreateAuthenticatedRequest($"/api/v1/context/{tenantId}", token);
    using var response = await host.Client.SendAsync(
      request,
      CancellationToken.None);

    check(
      response.StatusCode is HttpStatusCode.Forbidden,
      "A verified subject without an exact active tenant membership must receive 403.");
    check(
      membershipReader.LastTenantId == tenantId &&
      membershipReader.LastSubjectId == subjectId &&
      membershipReader.LastBearerToken == token,
      "Membership denial must still use the exact route tenant, verified subject, and caller token.");
  }

  private static async Task CheckMembershipDependencyFailureAsync(Action<bool, string> check)
  {
    var tenantId = BusinessTenantId.Create(Guid.NewGuid());
    var subjectId = BusinessSubjectId.Create(Guid.NewGuid());
    var identityVerifier = StubIdentityVerifier.Verified(subjectId);
    var membershipReader = StubMembershipProjectionReader.TemporarilyUnavailable();

    await using var host = await IntegrationHost.StartAsync(identityVerifier, membershipReader);
    using var request = CreateAuthenticatedRequest($"/api/v1/context/{tenantId}", CreateJwt());
    using var response = await host.Client.SendAsync(
      request,
      CancellationToken.None);

    check(
      response.StatusCode is HttpStatusCode.ServiceUnavailable,
      "An unavailable membership projection must receive 503 and never fail open.");
  }

  private static async Task CheckResolvedContextAsync(Action<bool, string> check)
  {
    var tenantId = BusinessTenantId.Create(Guid.NewGuid());
    var ignoredHeaderTenant = BusinessTenantId.Create(Guid.NewGuid());
    var subjectId = BusinessSubjectId.Create(Guid.NewGuid());
    var token = CreateJwt();
    var correlationId = "jalvoro-http-contract-001";
    var identityVerifier = StubIdentityVerifier.Verified(subjectId);
    var membership = new BusinessMembershipProjection(
      tenantId,
      subjectId,
      BusinessMembershipRole.Create("viewer"),
      []);
    var membershipReader = StubMembershipProjectionReader.Found(membership);

    await using var host = await IntegrationHost.StartAsync(identityVerifier, membershipReader);
    using var request = CreateAuthenticatedRequest($"/api/v1/context/{tenantId}", token);
    request.Headers.TryAddWithoutValidation("X-Jalvoro-Tenant-ID", ignoredHeaderTenant.ToString());
    request.Headers.TryAddWithoutValidation(CorrelationHeader, correlationId);
    using var response = await host.Client.SendAsync(
      request,
      CancellationToken.None);
    using var body = JsonDocument.Parse(await response.Content.ReadAsStreamAsync(
      CancellationToken.None));

    check(
      response.StatusCode is HttpStatusCode.OK,
      "A server-verified subject with an exact active tenant membership must receive 200.");
    check(
      body.RootElement.GetProperty("tenantId").GetString() == tenantId.ToString() &&
      body.RootElement.GetProperty("subjectId").GetString() == subjectId.ToString() &&
      body.RootElement.GetProperty("readOnly").GetBoolean(),
      "A resolved context response must expose only the verified tenant, subject, and read-only state.");

    var permissions = body.RootElement.GetProperty("permissions")
      .EnumerateArray()
      .Select(value => value.GetString())
      .ToHashSet(StringComparer.Ordinal);
    check(
      permissions.Contains(BusinessPermissions.OrganizationRead.Value) &&
      permissions.Contains(BusinessPermissions.MembershipRead.Value) &&
      !permissions.Contains(BusinessPermissions.OrganizationManage.Value),
      "A verified viewer must receive exact conservative permissions only.");
    check(
      membershipReader.LastTenantId == tenantId &&
      membershipReader.LastTenantId != ignoredHeaderTenant,
      "The HTTP pipeline must ignore client tenant headers and use only the route tenant.");
    check(
      HeaderContains(response, CorrelationHeader, correlationId),
      "A safe incoming correlation ID must round-trip in the response.");
    CheckSecurityHeaders(response, check);

    using var securityResponse = await host.Client.GetAsync(
      "/api/v1/security",
      CancellationToken.None);
    using var securityBody = JsonDocument.Parse(await securityResponse.Content.ReadAsStreamAsync(
      CancellationToken.None));
    check(
      securityResponse.StatusCode is HttpStatusCode.OK &&
      !securityBody.RootElement.GetProperty("writeEndpointsActive").GetBoolean() &&
      !securityBody.RootElement.GetProperty("serviceRoleUsed").GetBoolean(),
      "The HTTP security contract must continue to declare no active writes and no service-role usage.");
  }

  private static HttpRequestMessage CreateAuthenticatedRequest(string path, string token)
  {
    var request = new HttpRequestMessage(HttpMethod.Get, path);
    request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
    return request;
  }

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

  private static bool HeaderContains(
    HttpResponseMessage response,
    string name,
    string expectedValue) =>
    response.Headers.TryGetValues(name, out var values) &&
    values.Contains(expectedValue, StringComparer.Ordinal);

  private static void CheckSecurityHeaders(
    HttpResponseMessage response,
    Action<bool, string> check)
  {
    check(
      response.Headers.CacheControl?.NoStore is true,
      "Business API responses must remain no-store.");
    check(
      HeaderContains(response, "X-Content-Type-Options", "nosniff") &&
      HeaderContains(response, "X-Frame-Options", "DENY") &&
      HeaderContains(response, "Referrer-Policy", "no-referrer"),
      "Business API responses must include the baseline security headers.");
  }

  private sealed class IntegrationHost : IAsyncDisposable
  {
    private IntegrationHost(WebApplication application, HttpClient client)
    {
      Application = application;
      Client = client;
    }

    private WebApplication Application { get; }

    public HttpClient Client { get; }

    public static async Task<IntegrationHost> StartAsync(
      ISupabaseIdentityVerifier identityVerifier,
      IBusinessMembershipProjectionReader membershipReader)
    {
      ArgumentNullException.ThrowIfNull(identityVerifier);
      ArgumentNullException.ThrowIfNull(membershipReader);

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
      builder.Services.AddSingleton(identityVerifier);
      builder.Services.AddSingleton(membershipReader);

      var application = builder.Build();
      application.UseJalvoroBusinessCoreApi();
      await application.StartAsync(CancellationToken.None);

      var server = application.Services.GetRequiredService<IServer>();
      var addresses = server.Features.Get<IServerAddressesFeature>()?.Addresses;
      var address = addresses?.SingleOrDefault();
      if (string.IsNullOrWhiteSpace(address))
      {
        await application.DisposeAsync();
        throw new InvalidOperationException("The Business Core integration host did not publish an HTTP address.");
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

  private sealed class StubIdentityVerifier(
    SupabaseIdentityVerificationResult result) : ISupabaseIdentityVerifier
  {
    public int InvocationCount { get; private set; }

    public static StubIdentityVerifier Verified(BusinessSubjectId subjectId) =>
      new(SupabaseIdentityVerificationResult.Verified(
        new SupabaseVerifiedIdentity(
          subjectId,
          SupabaseIdentityConfiguration.ExpectedAudience,
          "supabase-auth-server")));

    public static StubIdentityVerifier TemporarilyUnavailable() =>
      new(SupabaseIdentityVerificationResult.TemporarilyUnavailable());

    public ValueTask<SupabaseIdentityVerificationResult> VerifyAsync(
      string bearerToken,
      CancellationToken cancellationToken)
    {
      ArgumentException.ThrowIfNullOrWhiteSpace(bearerToken);
      cancellationToken.ThrowIfCancellationRequested();
      InvocationCount++;
      return ValueTask.FromResult(result);
    }
  }

  private sealed class StubMembershipProjectionReader(
    BusinessMembershipLookupResult result) : IBusinessMembershipProjectionReader
  {
    public int InvocationCount { get; private set; }

    public BusinessTenantId? LastTenantId { get; private set; }

    public BusinessSubjectId? LastSubjectId { get; private set; }

    public string? LastBearerToken { get; private set; }

    public static StubMembershipProjectionReader Found(BusinessMembershipProjection membership) =>
      new(BusinessMembershipLookupResult.Found(membership));

    public static StubMembershipProjectionReader NotFound() =>
      new(BusinessMembershipLookupResult.NotFound());

    public static StubMembershipProjectionReader TemporarilyUnavailable() =>
      new(BusinessMembershipLookupResult.TemporarilyUnavailable());

    public ValueTask<BusinessMembershipLookupResult> ReadActiveAsync(
      BusinessTenantId tenantId,
      BusinessSubjectId subjectId,
      string bearerToken,
      CancellationToken cancellationToken)
    {
      cancellationToken.ThrowIfCancellationRequested();
      InvocationCount++;
      LastTenantId = tenantId;
      LastSubjectId = subjectId;
      LastBearerToken = bearerToken;
      return ValueTask.FromResult(result);
    }
  }
}
