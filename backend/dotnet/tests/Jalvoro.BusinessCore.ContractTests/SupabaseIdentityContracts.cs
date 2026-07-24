using System.Net;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using Jalvoro.BusinessCore.Application.Security;
using Jalvoro.BusinessCore.Application.Tenancy;
using Jalvoro.BusinessCore.Domain.Security;
using Jalvoro.BusinessCore.Domain.Tenancy;
using Jalvoro.BusinessCore.Infrastructure.Security;
using Jalvoro.BusinessCore.Infrastructure.Tenancy;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;

internal static class SupabaseIdentityContracts
{
  public static async Task RunAsync(Action<bool, string> check)
  {
    ArgumentNullException.ThrowIfNull(check);

    CheckApiKeyPolicy(check);
    CheckBearerTokenPolicy(check);
    CheckPermissionProjection(check);
    await CheckRemoteIdentityVerificationAsync(check);
    await CheckMembershipProjectionAsync(check);
    await CheckBusinessContextResolutionAsync(check);
  }

  private static void CheckApiKeyPolicy(Action<bool, string> check)
  {
    check(
      SupabaseApiKeyPolicy.IsSafePublishableKey("sb_publishable_jalvoro_contract"),
      "A Supabase publishable key must be accepted for server-side verification.");
    check(
      !SupabaseApiKeyPolicy.IsSafePublishableKey("sb_secret_jalvoro_contract"),
      "A Supabase secret key must be rejected by the identity adapter.");
    check(
      SupabaseApiKeyPolicy.IsSafePublishableKey(CreateJwt(new { role = "anon" })),
      "A legacy anonymous JWT API key must remain supported.");
    check(
      !SupabaseApiKeyPolicy.IsSafePublishableKey(CreateJwt(new { role = "service_role" })),
      "A legacy service-role JWT must be rejected.");

    var configured = CreateConfigurationState();
    check(configured.IsConfigured, "Valid HTTPS Supabase identity configuration must be accepted.");

    var insecure = SupabaseIdentityConfigurationState.FromConfiguration(
      new ConfigurationBuilder()
        .AddInMemoryCollection(new Dictionary<string, string?>
        {
          ["Jalvoro:Supabase:ProjectUrl"] = "http://example.supabase.co",
          ["Jalvoro:Supabase:PublishableKey"] = "sb_publishable_jalvoro_contract",
        })
        .Build());
    check(!insecure.IsConfigured, "Plain HTTP Supabase configuration must fail closed.");
  }

  private static void CheckBearerTokenPolicy(Action<bool, string> check)
  {
    var accessToken = CreateJwt(new
    {
      sub = Guid.NewGuid().ToString(),
      aud = "authenticated",
      role = "authenticated",
    });
    check(
      SupabaseBearerTokenReader.Read($"Bearer {accessToken}").Code is SupabaseBearerTokenReadCode.Valid,
      "A structurally valid bearer JWT must be accepted for remote verification.");
    check(
      SupabaseBearerTokenReader.Read("Bearer sb_publishable_not_a_user_jwt").Code is SupabaseBearerTokenReadCode.Invalid,
      "A publishable API key must never be accepted as a user bearer token.");
    check(
      SupabaseBearerTokenReader.Read("Bearer first, Bearer second").Code is SupabaseBearerTokenReadCode.Invalid,
      "Multiple bearer credentials must be rejected.");
    check(
      SupabaseBearerTokenReader.Read(null).Code is SupabaseBearerTokenReadCode.Missing,
      "A missing Authorization header must remain unauthenticated.");
  }

  private static void CheckPermissionProjection(Action<bool, string> check)
  {
    var mapper = new BusinessMembershipPermissionMapper();
    var tenantId = BusinessTenantId.Create(Guid.NewGuid());
    var subjectId = BusinessSubjectId.Create(Guid.NewGuid());

    var owner = new BusinessMembershipProjection(
      tenantId,
      subjectId,
      BusinessMembershipRole.Create("owner"),
      ["*"]);
    var ownerPermissions = mapper.Map(owner);
    check(
      ownerPermissions.Contains(BusinessPermissions.OrganizationManage) &&
      ownerPermissions.Contains(BusinessPermissions.MembershipManage) &&
      ownerPermissions.All(permission => permission.Value != "*"),
      "The owner role must map to exact permissions without propagating a wildcard.");

    var admin = new BusinessMembershipProjection(
      tenantId,
      subjectId,
      BusinessMembershipRole.Create("admin"),
      []);
    var adminPermissions = mapper.Map(admin);
    check(
      !adminPermissions.Contains(BusinessPermissions.OrganizationManage) &&
      adminPermissions.Contains(BusinessPermissions.MembershipManage),
      "An admin must not receive owner-only organization management authority.");

    var cashierWithTeamAccess = new BusinessMembershipProjection(
      tenantId,
      subjectId,
      BusinessMembershipRole.Create("cashier"),
      ["team.manage"]);
    var cashierPermissions = mapper.Map(cashierWithTeamAccess);
    check(
      cashierPermissions.Contains(BusinessPermissions.MembershipRead) &&
      cashierPermissions.Contains(BusinessPermissions.MembershipManage),
      "An explicit legacy team.manage grant must map to exact membership permissions.");
  }

  private static async Task CheckRemoteIdentityVerificationAsync(Action<bool, string> check)
  {
    var expectedSubject = Guid.NewGuid();
    var handler = new StubHttpMessageHandler(request =>
    {
      check(
        request.RequestUri?.AbsolutePath == "/auth/v1/user",
        "Identity verification must use the Supabase Auth user endpoint.");
      check(
        request.Headers.Authorization?.Scheme == "Bearer" &&
        !string.IsNullOrWhiteSpace(request.Headers.Authorization.Parameter),
        "Identity verification must forward the user JWT as a bearer credential.");
      check(
        request.Headers.TryGetValues("apikey", out var values) &&
        values.Single() == "sb_publishable_jalvoro_contract",
        "Identity verification must use only the configured publishable key.");

      return JsonResponse(
        HttpStatusCode.OK,
        new
        {
          id = expectedSubject,
          aud = "authenticated",
          is_anonymous = false,
          deleted_at = (string?)null,
          banned_until = (string?)null,
        });
    });
    var verifier = new SupabaseRemoteIdentityVerifier(
      new HttpClient(handler) { Timeout = Timeout.InfiniteTimeSpan },
      CreateConfigurationState());

    var result = await verifier.VerifyAsync(
      CreateJwt(new { sub = expectedSubject, aud = "authenticated" }),
      CancellationToken.None);
    check(
      result.Code is SupabaseIdentityVerificationCode.Verified &&
      result.Identity?.SubjectId.Value == expectedSubject,
      "The identity adapter must use the server-confirmed Supabase subject.");

    var anonymousVerifier = new SupabaseRemoteIdentityVerifier(
      new HttpClient(new StubHttpMessageHandler(_ => JsonResponse(
        HttpStatusCode.OK,
        new
        {
          id = Guid.NewGuid(),
          aud = "authenticated",
          is_anonymous = true,
        }))) { Timeout = Timeout.InfiniteTimeSpan },
      CreateConfigurationState());
    var anonymousResult = await anonymousVerifier.VerifyAsync(
      CreateJwt(new { sub = Guid.NewGuid(), aud = "authenticated" }),
      CancellationToken.None);
    check(
      anonymousResult.Code is SupabaseIdentityVerificationCode.Invalid,
      "Anonymous Supabase users must not enter the business authorization context.");
  }

  private static async Task CheckMembershipProjectionAsync(Action<bool, string> check)
  {
    var tenantId = BusinessTenantId.Create(Guid.NewGuid());
    var subjectId = BusinessSubjectId.Create(Guid.NewGuid());
    var handler = new StubHttpMessageHandler(request =>
    {
      var uri = request.RequestUri?.ToString() ?? string.Empty;
      check(
        uri.Contains("/rest/v1/business_members?", StringComparison.Ordinal) &&
        uri.Contains($"business_id=eq.{tenantId}", StringComparison.Ordinal) &&
        uri.Contains($"user_id=eq.{subjectId}", StringComparison.Ordinal) &&
        uri.Contains("status=eq.active", StringComparison.Ordinal),
        "Membership projection must filter the exact tenant, subject, and active status.");
      check(
        request.Headers.Authorization?.Scheme == "Bearer" &&
        request.Headers.TryGetValues("apikey", out var values) &&
        values.Single() == "sb_publishable_jalvoro_contract",
        "Membership projection must preserve the caller JWT and publishable key for RLS.");

      return JsonResponse(
        HttpStatusCode.OK,
        new[]
        {
          new
          {
            business_id = tenantId.Value,
            user_id = subjectId.Value,
            role = "manager",
            status = "active",
            permissions = new[] { "team.view" },
          },
        });
    });
    var reader = new SupabaseMembershipProjectionReader(
      new HttpClient(handler) { Timeout = Timeout.InfiniteTimeSpan },
      CreateConfigurationState());

    var result = await reader.ReadActiveAsync(
      tenantId,
      subjectId,
      CreateJwt(new { sub = subjectId.Value, aud = "authenticated" }),
      CancellationToken.None);
    check(
      result.Code is BusinessMembershipLookupCode.Found &&
      result.Membership?.TenantId == tenantId &&
      result.Membership.SubjectId == subjectId &&
      result.Membership.LegacyPermissions.Contains("team.view"),
      "A valid active RLS membership row must create a read-only projection.");
  }

  private static async Task CheckBusinessContextResolutionAsync(Action<bool, string> check)
  {
    var tenantId = BusinessTenantId.Create(Guid.NewGuid());
    var ignoredHeaderTenant = BusinessTenantId.Create(Guid.NewGuid());
    var subjectId = BusinessSubjectId.Create(Guid.NewGuid());
    var accessToken = CreateJwt(new { sub = subjectId.Value, aud = "authenticated" });
    var membership = new BusinessMembershipProjection(
      tenantId,
      subjectId,
      BusinessMembershipRole.Create("viewer"),
      []);
    var reader = new StubMembershipProjectionReader(
      BusinessMembershipLookupResult.Found(membership));
    var httpContext = new DefaultHttpContext();
    httpContext.User = new ClaimsPrincipal(
      new ClaimsIdentity(
        [
          new Claim(ClaimTypes.NameIdentifier, subjectId.ToString()),
          new Claim(
            SupabaseAuthenticationDefaults.IdentityProviderClaim,
            SupabaseAuthenticationDefaults.IdentityProviderValue),
        ],
        SupabaseAuthenticationDefaults.Scheme));
    httpContext.Request.RouteValues["tenantId"] = tenantId.ToString();
    httpContext.Request.Headers.Authorization = $"Bearer {accessToken}";
    httpContext.Request.Headers["X-Jalvoro-Tenant-ID"] = ignoredHeaderTenant.ToString();

    var resolver = new SupabaseBusinessContextResolver(
      new HttpContextAccessor { HttpContext = httpContext },
      reader,
      new BusinessMembershipPermissionMapper());
    var resolution = await resolver.ResolveCurrentAsync(CancellationToken.None);

    check(
      resolution.Code is BusinessContextResolutionCode.Resolved &&
      resolution.Context?.TenantId == tenantId &&
      reader.LastTenantId == tenantId &&
      reader.LastTenantId != ignoredHeaderTenant,
      "Business context resolution must use the route tenant and ignore client tenant headers.");
    check(
      resolution.Context?.Permissions.Contains(BusinessPermissions.OrganizationRead) is true &&
      resolution.Context.Permissions.Contains(BusinessPermissions.OrganizationManage) is false,
      "A verified viewer membership must receive only its exact conservative permissions.");
  }

  private static SupabaseIdentityConfigurationState CreateConfigurationState() =>
    SupabaseIdentityConfigurationState.FromConfiguration(
      new ConfigurationBuilder()
        .AddInMemoryCollection(new Dictionary<string, string?>
        {
          ["Jalvoro:Supabase:ProjectUrl"] = "https://example.supabase.co",
          ["Jalvoro:Supabase:PublishableKey"] = "sb_publishable_jalvoro_contract",
          ["Jalvoro:Supabase:RemoteCallTimeoutSeconds"] = "5",
        })
        .Build());

  private static HttpResponseMessage JsonResponse(HttpStatusCode statusCode, object value) =>
    new(statusCode)
    {
      Content = new StringContent(
        JsonSerializer.Serialize(value),
        Encoding.UTF8,
        "application/json"),
    };

  private static string CreateJwt(object payload)
  {
    var header = Base64Url(JsonSerializer.SerializeToUtf8Bytes(new { alg = "HS256", typ = "JWT" }));
    var body = Base64Url(JsonSerializer.SerializeToUtf8Bytes(payload));
    var signature = new string('a', 43);
    return $"{header}.{body}.{signature}";
  }

  private static string Base64Url(byte[] value) =>
    Convert.ToBase64String(value)
      .TrimEnd('=')
      .Replace('+', '-')
      .Replace('/', '_');

  private sealed class StubHttpMessageHandler(
    Func<HttpRequestMessage, HttpResponseMessage> responder) : HttpMessageHandler
  {
    protected override Task<HttpResponseMessage> SendAsync(
      HttpRequestMessage request,
      CancellationToken cancellationToken)
    {
      cancellationToken.ThrowIfCancellationRequested();
      return Task.FromResult(responder(request));
    }
  }

  private sealed class StubMembershipProjectionReader(
    BusinessMembershipLookupResult result) : IBusinessMembershipProjectionReader
  {
    public BusinessTenantId? LastTenantId { get; private set; }

    public ValueTask<BusinessMembershipLookupResult> ReadActiveAsync(
      BusinessTenantId tenantId,
      BusinessSubjectId subjectId,
      string bearerToken,
      CancellationToken cancellationToken)
    {
      cancellationToken.ThrowIfCancellationRequested();
      LastTenantId = tenantId;
      return ValueTask.FromResult(result);
    }
  }
}
