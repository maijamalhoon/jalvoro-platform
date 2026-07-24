using System.Text.Json;
using Jalvoro.BusinessCore.StagingSmoke;

internal static class StagingSupabaseSmokeContracts
{
  public static void Run(Action<bool, string> check)
  {
    ArgumentNullException.ThrowIfNull(check);

    var valid = Read();
    check(
      valid.IsValid &&
      valid.Configuration?.ProjectUrl.Host == StagingSupabaseSafetyContract.AllowedHost,
      "The staging smoke configuration must accept only the approved staging project.");
    check(
      valid.Configuration?.RemoteCallTimeout == TimeSpan.FromSeconds(5),
      "The staging smoke configuration must use a bounded five-second default timeout.");

    check(
      Read(new Dictionary<string, string?>
      {
        ["JALVORO_SMOKE_ENVIRONMENT"] = "production",
      }).Code is StagingSmokeConfigurationCode.MissingEnvironment,
      "The staging smoke harness must reject every non-staging environment.");

    check(
      Read(new Dictionary<string, string?>
      {
        ["JALVORO_SMOKE_CONFIRMATION"] = "yes",
      }).Code is StagingSmokeConfigurationCode.MissingConfirmation,
      "The staging smoke harness must require an explicit read-only staging confirmation.");

    check(
      Read(new Dictionary<string, string?>
      {
        ["JALVORO_SUPABASE_STAGING_URL"] =
          $"https://{StagingSupabaseSafetyContract.BlockedProductionHost}",
      }).Code is StagingSmokeConfigurationCode.UnsafeProjectUrl,
      "The known production Supabase project must be structurally blocked.");

    check(
      Read(new Dictionary<string, string?>
      {
        ["JALVORO_SUPABASE_STAGING_URL"] = "https://example.supabase.co",
      }).Code is StagingSmokeConfigurationCode.UnsafeProjectUrl,
      "An unapproved Supabase project must never pass the staging target guard.");

    check(
      Read(new Dictionary<string, string?>
      {
        ["JALVORO_SUPABASE_STAGING_PUBLISHABLE_KEY"] = "sb_secret_contract-do-not-use",
      }).Code is StagingSmokeConfigurationCode.UnsafeApiKey,
      "A Supabase secret key must never be accepted by the staging smoke harness.");

    check(
      Read(new Dictionary<string, string?>
      {
        ["JALVORO_SUPABASE_STAGING_PUBLISHABLE_KEY"] = CreateLegacyAnonymousJwt(),
      }).Code is StagingSmokeConfigurationCode.UnsafeApiKey,
      "The new staging harness must require a modern publishable key rather than a legacy anon JWT.");

    check(
      Read(new Dictionary<string, string?>
      {
        ["JALVORO_SUPABASE_STAGING_TEST_JWT"] = "not-a-user-jwt",
      }).Code is StagingSmokeConfigurationCode.InvalidBearerToken,
      "A malformed staging test JWT must be rejected before any remote call.");

    check(
      Read(new Dictionary<string, string?>
      {
        ["JALVORO_SUPABASE_STAGING_TEST_USER_ID"] = Guid.Empty.ToString(),
      }).Code is StagingSmokeConfigurationCode.InvalidSubjectId,
      "An empty staging test-user ID must fail validation.");

    check(
      Read(new Dictionary<string, string?>
      {
        ["JALVORO_SUPABASE_STAGING_TENANT_ID"] = "not-a-guid",
      }).Code is StagingSmokeConfigurationCode.InvalidTenantId,
      "An invalid staging tenant ID must fail validation.");

    check(
      Read(new Dictionary<string, string?>
      {
        ["JALVORO_SUPABASE_STAGING_TIMEOUT_SECONDS"] = "11",
      }).Code is StagingSmokeConfigurationCode.InvalidTimeout,
      "A staging remote-call timeout above ten seconds must be rejected.");
  }

  private static StagingSmokeConfigurationResult Read(
    IReadOnlyDictionary<string, string?>? overrides = null)
  {
    var values = new Dictionary<string, string?>(StringComparer.Ordinal)
    {
      ["JALVORO_SMOKE_ENVIRONMENT"] = StagingSupabaseSafetyContract.RequiredEnvironment,
      ["JALVORO_SMOKE_CONFIRMATION"] = StagingSupabaseSafetyContract.RequiredConfirmation,
      ["JALVORO_SUPABASE_STAGING_URL"] =
        $"https://{StagingSupabaseSafetyContract.AllowedHost}",
      ["JALVORO_SUPABASE_STAGING_PUBLISHABLE_KEY"] = "sb_publishable_contract-key",
      ["JALVORO_SUPABASE_STAGING_TEST_JWT"] = CreateUserJwt(),
      ["JALVORO_SUPABASE_STAGING_TEST_USER_ID"] = Guid.NewGuid().ToString(),
      ["JALVORO_SUPABASE_STAGING_TENANT_ID"] = Guid.NewGuid().ToString(),
    };

    if (overrides is not null)
    {
      foreach (var pair in overrides)
      {
        values[pair.Key] = pair.Value;
      }
    }

    return StagingSupabaseSmokeConfigurationReader.Read(
      name => values.GetValueOrDefault(name));
  }

  private static string CreateUserJwt()
  {
    var header = Base64Url(JsonSerializer.SerializeToUtf8Bytes(new
    {
      alg = "ES256",
      typ = "JWT",
    }));
    var payload = Base64Url(JsonSerializer.SerializeToUtf8Bytes(new
    {
      sub = Guid.NewGuid(),
      aud = "authenticated",
    }));
    return $"{header}.{payload}.{new string('a', 86)}";
  }

  private static string CreateLegacyAnonymousJwt()
  {
    var header = Base64Url(JsonSerializer.SerializeToUtf8Bytes(new
    {
      alg = "HS256",
      typ = "JWT",
    }));
    var payload = Base64Url(JsonSerializer.SerializeToUtf8Bytes(new
    {
      role = "anon",
    }));
    return $"{header}.{payload}.{new string('a', 43)}";
  }

  private static string Base64Url(byte[] value) =>
    Convert.ToBase64String(value)
      .TrimEnd('=')
      .Replace('+', '-')
      .Replace('/', '_');
}
