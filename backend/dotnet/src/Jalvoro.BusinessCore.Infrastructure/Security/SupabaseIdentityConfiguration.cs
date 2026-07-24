using System.Globalization;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Configuration;

namespace Jalvoro.BusinessCore.Infrastructure.Security;

public sealed record SupabaseIdentityConfiguration(
  Uri ProjectUrl,
  string PublishableKey,
  TimeSpan RemoteCallTimeout)
{
  public const string ExpectedAudience = "authenticated";

  public Uri AuthUserEndpoint => new(ProjectUrl, "auth/v1/user");

  public Uri DataApiEndpoint => new(ProjectUrl, "rest/v1/");
}

public sealed class SupabaseIdentityConfigurationState
{
  private SupabaseIdentityConfigurationState(SupabaseIdentityConfiguration? current)
  {
    Current = current;
  }

  public SupabaseIdentityConfiguration? Current { get; }

  public bool IsConfigured => Current is not null;

  public static SupabaseIdentityConfigurationState FromConfiguration(IConfiguration configuration)
  {
    ArgumentNullException.ThrowIfNull(configuration);

    var projectUrl = configuration["Jalvoro:Supabase:ProjectUrl"] ??
      configuration["SUPABASE_URL"] ??
      configuration["NEXT_PUBLIC_SUPABASE_URL"];
    var publishableKey = configuration["Jalvoro:Supabase:PublishableKey"] ??
      configuration["SUPABASE_PUBLISHABLE_KEY"] ??
      configuration["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"] ??
      configuration["NEXT_PUBLIC_SUPABASE_ANON_KEY"];

    if (
      !TryNormalizeProjectUrl(projectUrl, out var normalizedProjectUrl) ||
      !SupabaseApiKeyPolicy.IsSafePublishableKey(publishableKey))
    {
      return new SupabaseIdentityConfigurationState(null);
    }

    var timeoutSeconds = 5;
    var configuredTimeout = configuration["Jalvoro:Supabase:RemoteCallTimeoutSeconds"];
    if (
      configuredTimeout is not null &&
      (!int.TryParse(
        configuredTimeout,
        NumberStyles.Integer,
        CultureInfo.InvariantCulture,
        out timeoutSeconds) ||
       timeoutSeconds is < 1 or > 10))
    {
      return new SupabaseIdentityConfigurationState(null);
    }

    return new SupabaseIdentityConfigurationState(
      new SupabaseIdentityConfiguration(
        normalizedProjectUrl,
        publishableKey!,
        TimeSpan.FromSeconds(timeoutSeconds)));
  }

  private static bool TryNormalizeProjectUrl(string? value, out Uri projectUrl)
  {
    if (
      !Uri.TryCreate(value, UriKind.Absolute, out var parsed) ||
      !string.Equals(parsed.Scheme, Uri.UriSchemeHttps, StringComparison.OrdinalIgnoreCase) ||
      string.IsNullOrWhiteSpace(parsed.Host) ||
      !string.IsNullOrEmpty(parsed.UserInfo) ||
      !string.IsNullOrEmpty(parsed.Query) ||
      !string.IsNullOrEmpty(parsed.Fragment) ||
      (parsed.AbsolutePath != "/" && parsed.AbsolutePath.Length != 0))
    {
      projectUrl = null!;
      return false;
    }

    projectUrl = new Uri($"{parsed.Scheme}://{parsed.Authority}/", UriKind.Absolute);
    return true;
  }
}

public static class SupabaseApiKeyPolicy
{
  private const int MaximumApiKeyLength = 2048;

  public static bool IsSafePublishableKey(string? value)
  {
    if (
      string.IsNullOrWhiteSpace(value) ||
      value.Length > MaximumApiKeyLength ||
      value.Any(char.IsWhiteSpace) ||
      value.StartsWith("sb_secret_", StringComparison.Ordinal))
    {
      return false;
    }

    if (value.StartsWith("sb_publishable_", StringComparison.Ordinal))
    {
      return true;
    }

    return IsLegacyAnonymousJwt(value);
  }

  private static bool IsLegacyAnonymousJwt(string value)
  {
    var segments = value.Split('.');
    if (segments.Length != 3 || segments.Any(string.IsNullOrEmpty))
    {
      return false;
    }

    try
    {
      var payload = DecodeBase64Url(segments[1]);
      using var document = JsonDocument.Parse(payload);
      return document.RootElement.TryGetProperty("role", out var role) &&
        string.Equals(role.GetString(), "anon", StringComparison.Ordinal);
    }
    catch (FormatException)
    {
      return false;
    }
    catch (JsonException)
    {
      return false;
    }
  }

  private static string DecodeBase64Url(string value)
  {
    var normalized = value.Replace('-', '+').Replace('_', '/');
    normalized = normalized.PadRight(normalized.Length + ((4 - normalized.Length % 4) % 4), '=');
    return Encoding.UTF8.GetString(Convert.FromBase64String(normalized));
  }
}
