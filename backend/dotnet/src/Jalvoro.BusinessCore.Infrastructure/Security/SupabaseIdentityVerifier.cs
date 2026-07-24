using System.Net;
using System.Net.Http.Headers;
using System.Text.Json;
using Jalvoro.BusinessCore.Domain.Security;

namespace Jalvoro.BusinessCore.Infrastructure.Security;

public enum SupabaseBearerTokenReadCode
{
  Missing,
  Valid,
  Invalid,
}

public sealed record SupabaseBearerTokenReadResult(
  SupabaseBearerTokenReadCode Code,
  string? Token);

public static class SupabaseBearerTokenReader
{
  private const int MinimumTokenLength = 64;
  private const int MaximumTokenLength = 16_384;

  public static SupabaseBearerTokenReadResult Read(string? authorizationHeader)
  {
    if (string.IsNullOrWhiteSpace(authorizationHeader))
    {
      return new SupabaseBearerTokenReadResult(SupabaseBearerTokenReadCode.Missing, null);
    }

    if (
      authorizationHeader.Contains(',') ||
      !authorizationHeader.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
    {
      return new SupabaseBearerTokenReadResult(SupabaseBearerTokenReadCode.Invalid, null);
    }

    var token = authorizationHeader["Bearer ".Length..];
    if (
      token.Length is < MinimumTokenLength or > MaximumTokenLength ||
      token.Any(char.IsWhiteSpace) ||
      token.Any(char.IsControl) ||
      token.StartsWith("sb_", StringComparison.Ordinal))
    {
      return new SupabaseBearerTokenReadResult(SupabaseBearerTokenReadCode.Invalid, null);
    }

    var segments = token.Split('.');
    if (
      segments.Length != 3 ||
      segments.Any(segment =>
        segment.Length == 0 ||
        segment.Any(character =>
          !char.IsAsciiLetterOrDigit(character) && character is not '-' and not '_')))
    {
      return new SupabaseBearerTokenReadResult(SupabaseBearerTokenReadCode.Invalid, null);
    }

    return new SupabaseBearerTokenReadResult(SupabaseBearerTokenReadCode.Valid, token);
  }
}

public enum SupabaseIdentityVerificationCode
{
  Verified,
  Invalid,
  TemporarilyUnavailable,
  NotConfigured,
}

public sealed record SupabaseVerifiedIdentity(
  BusinessSubjectId SubjectId,
  string Audience,
  string AuthenticationMethod);

public sealed record SupabaseIdentityVerificationResult(
  SupabaseIdentityVerificationCode Code,
  SupabaseVerifiedIdentity? Identity)
{
  public static SupabaseIdentityVerificationResult Verified(SupabaseVerifiedIdentity identity)
  {
    ArgumentNullException.ThrowIfNull(identity);
    return new SupabaseIdentityVerificationResult(SupabaseIdentityVerificationCode.Verified, identity);
  }

  public static SupabaseIdentityVerificationResult Invalid() =>
    new(SupabaseIdentityVerificationCode.Invalid, null);

  public static SupabaseIdentityVerificationResult TemporarilyUnavailable() =>
    new(SupabaseIdentityVerificationCode.TemporarilyUnavailable, null);

  public static SupabaseIdentityVerificationResult NotConfigured() =>
    new(SupabaseIdentityVerificationCode.NotConfigured, null);
}

public interface ISupabaseIdentityVerifier
{
  ValueTask<SupabaseIdentityVerificationResult> VerifyAsync(
    string bearerToken,
    CancellationToken cancellationToken);
}

public sealed class SupabaseRemoteIdentityVerifier : ISupabaseIdentityVerifier
{
  private readonly HttpClient _httpClient;
  private readonly SupabaseIdentityConfigurationState _configurationState;

  public SupabaseRemoteIdentityVerifier(
    HttpClient httpClient,
    SupabaseIdentityConfigurationState configurationState)
  {
    ArgumentNullException.ThrowIfNull(httpClient);
    ArgumentNullException.ThrowIfNull(configurationState);

    _httpClient = httpClient;
    _configurationState = configurationState;
  }

  public async ValueTask<SupabaseIdentityVerificationResult> VerifyAsync(
    string bearerToken,
    CancellationToken cancellationToken)
  {
    ArgumentException.ThrowIfNullOrWhiteSpace(bearerToken);

    var configuration = _configurationState.Current;
    if (configuration is null)
    {
      return SupabaseIdentityVerificationResult.NotConfigured();
    }

    using var request = new HttpRequestMessage(HttpMethod.Get, configuration.AuthUserEndpoint);
    request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", bearerToken);
    request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
    request.Headers.TryAddWithoutValidation("apikey", configuration.PublishableKey);

    using var timeout = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
    timeout.CancelAfter(configuration.RemoteCallTimeout);

    HttpResponseMessage response;
    try
    {
      response = await _httpClient.SendAsync(
        request,
        HttpCompletionOption.ResponseHeadersRead,
        timeout.Token);
    }
    catch (OperationCanceledException) when (!cancellationToken.IsCancellationRequested)
    {
      return SupabaseIdentityVerificationResult.TemporarilyUnavailable();
    }
    catch (HttpRequestException)
    {
      return SupabaseIdentityVerificationResult.TemporarilyUnavailable();
    }

    using (response)
    {
      if (response.StatusCode is HttpStatusCode.BadRequest or HttpStatusCode.Unauthorized or HttpStatusCode.Forbidden or HttpStatusCode.UnprocessableEntity)
      {
        return SupabaseIdentityVerificationResult.Invalid();
      }

      if (!response.IsSuccessStatusCode)
      {
        return SupabaseIdentityVerificationResult.TemporarilyUnavailable();
      }

      try
      {
        await using var body = await response.Content.ReadAsStreamAsync(timeout.Token);
        using var document = await JsonDocument.ParseAsync(
          body,
          new JsonDocumentOptions { MaxDepth = 16 },
          timeout.Token);

        var root = document.RootElement;
        if (
          !root.TryGetProperty("id", out var idProperty) ||
          !BusinessSubjectId.TryParse(idProperty.GetString(), out var subjectId) ||
          !root.TryGetProperty("aud", out var audienceProperty) ||
          !string.Equals(
            audienceProperty.GetString(),
            SupabaseIdentityConfiguration.ExpectedAudience,
            StringComparison.Ordinal) ||
          IsAnonymous(root) ||
          IsDeleted(root) ||
          IsCurrentlyBanned(root))
        {
          return SupabaseIdentityVerificationResult.Invalid();
        }

        return SupabaseIdentityVerificationResult.Verified(
          new SupabaseVerifiedIdentity(
            subjectId,
            SupabaseIdentityConfiguration.ExpectedAudience,
            "supabase-auth-server"));
      }
      catch (JsonException)
      {
        return SupabaseIdentityVerificationResult.TemporarilyUnavailable();
      }
      catch (OperationCanceledException) when (!cancellationToken.IsCancellationRequested)
      {
        return SupabaseIdentityVerificationResult.TemporarilyUnavailable();
      }
    }
  }

  private static bool IsAnonymous(JsonElement root) =>
    root.TryGetProperty("is_anonymous", out var property) &&
    property.ValueKind is JsonValueKind.True;

  private static bool IsDeleted(JsonElement root) =>
    root.TryGetProperty("deleted_at", out var property) &&
    property.ValueKind is not JsonValueKind.Null &&
    !string.IsNullOrWhiteSpace(property.GetString());

  private static bool IsCurrentlyBanned(JsonElement root)
  {
    if (
      !root.TryGetProperty("banned_until", out var property) ||
      property.ValueKind is JsonValueKind.Null)
    {
      return false;
    }

    var value = property.GetString();
    return string.IsNullOrWhiteSpace(value) ||
      !DateTimeOffset.TryParse(value, out var bannedUntil) ||
      bannedUntil > DateTimeOffset.UtcNow;
  }
}
