using System.Security.Claims;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Microsoft.Net.Http.Headers;

namespace Jalvoro.BusinessCore.Infrastructure.Security;

public static class SupabaseAuthenticationDefaults
{
  public const string Scheme = "JalvoroSupabase";

  public const string IdentityProviderClaim = "jalvoro.identity_provider";

  public const string IdentityProviderValue = "supabase-auth-server";

  internal const string DependencyUnavailableItem = "Jalvoro.SupabaseIdentityUnavailable";
}

public sealed class SupabaseAuthenticationHandler : AuthenticationHandler<AuthenticationSchemeOptions>
{
  private readonly ISupabaseIdentityVerifier _identityVerifier;

  public SupabaseAuthenticationHandler(
    IOptionsMonitor<AuthenticationSchemeOptions> options,
    ILoggerFactory logger,
    UrlEncoder encoder,
    ISupabaseIdentityVerifier identityVerifier)
    : base(options, logger, encoder)
  {
    ArgumentNullException.ThrowIfNull(identityVerifier);
    _identityVerifier = identityVerifier;
  }

  protected override async Task<AuthenticateResult> HandleAuthenticateAsync()
  {
    var tokenResult = SupabaseBearerTokenReader.Read(Request.Headers.Authorization.ToString());
    if (tokenResult.Code is SupabaseBearerTokenReadCode.Missing)
    {
      return AuthenticateResult.NoResult();
    }

    if (tokenResult.Code is SupabaseBearerTokenReadCode.Invalid || tokenResult.Token is null)
    {
      return AuthenticateResult.Fail("The bearer credential is malformed.");
    }

    var verification = await _identityVerifier.VerifyAsync(tokenResult.Token, Context.RequestAborted);
    if (verification.Code is SupabaseIdentityVerificationCode.NotConfigured or SupabaseIdentityVerificationCode.TemporarilyUnavailable)
    {
      Context.Items[SupabaseAuthenticationDefaults.DependencyUnavailableItem] = true;
      return AuthenticateResult.Fail("The identity provider is unavailable.");
    }

    if (
      verification.Code is not SupabaseIdentityVerificationCode.Verified ||
      verification.Identity is null)
    {
      return AuthenticateResult.Fail("The bearer credential is invalid.");
    }

    var identity = verification.Identity;
    var claims = new[]
    {
      new Claim(ClaimTypes.NameIdentifier, identity.SubjectId.ToString()),
      new Claim("sub", identity.SubjectId.ToString()),
      new Claim("aud", identity.Audience),
      new Claim(
        SupabaseAuthenticationDefaults.IdentityProviderClaim,
        SupabaseAuthenticationDefaults.IdentityProviderValue),
    };
    var principal = new ClaimsPrincipal(
      new ClaimsIdentity(claims, SupabaseAuthenticationDefaults.Scheme));
    var ticket = new AuthenticationTicket(principal, SupabaseAuthenticationDefaults.Scheme);

    return AuthenticateResult.Success(ticket);
  }

  protected override Task HandleChallengeAsync(AuthenticationProperties properties)
  {
    Response.Headers.CacheControl = "no-store";
    if (Context.Items.ContainsKey(SupabaseAuthenticationDefaults.DependencyUnavailableItem))
    {
      Response.StatusCode = StatusCodes.Status503ServiceUnavailable;
      Response.Headers.RetryAfter = "5";
      return Task.CompletedTask;
    }

    Response.StatusCode = StatusCodes.Status401Unauthorized;
    Response.Headers.WWWAuthenticate = "Bearer";
    return Task.CompletedTask;
  }

  protected override Task HandleForbiddenAsync(AuthenticationProperties properties)
  {
    Response.Headers.CacheControl = "no-store";
    Response.StatusCode = StatusCodes.Status403Forbidden;
    return Task.CompletedTask;
  }
}
