using System.Globalization;
using System.Security.Claims;
using Jalvoro.BusinessCore.Application.Security;
using Jalvoro.BusinessCore.Application.Tenancy;
using Jalvoro.BusinessCore.Domain.Security;
using Jalvoro.BusinessCore.Domain.Tenancy;
using Microsoft.AspNetCore.Http;

namespace Jalvoro.BusinessCore.Infrastructure.Security;

public sealed class SupabaseBusinessContextResolver : IBusinessContextResolver
{
  private readonly IHttpContextAccessor _httpContextAccessor;
  private readonly IBusinessMembershipProjectionReader _membershipReader;
  private readonly BusinessMembershipPermissionMapper _permissionMapper;

  public SupabaseBusinessContextResolver(
    IHttpContextAccessor httpContextAccessor,
    IBusinessMembershipProjectionReader membershipReader,
    BusinessMembershipPermissionMapper permissionMapper)
  {
    ArgumentNullException.ThrowIfNull(httpContextAccessor);
    ArgumentNullException.ThrowIfNull(membershipReader);
    ArgumentNullException.ThrowIfNull(permissionMapper);

    _httpContextAccessor = httpContextAccessor;
    _membershipReader = membershipReader;
    _permissionMapper = permissionMapper;
  }

  public async ValueTask<BusinessContextResolution> ResolveCurrentAsync(
    CancellationToken cancellationToken)
  {
    var httpContext = _httpContextAccessor.HttpContext;
    if (
      httpContext?.User.Identity?.IsAuthenticated is not true ||
      !string.Equals(
        httpContext.User.FindFirst(SupabaseAuthenticationDefaults.IdentityProviderClaim)?.Value,
        SupabaseAuthenticationDefaults.IdentityProviderValue,
        StringComparison.Ordinal) ||
      !BusinessSubjectId.TryParse(
        httpContext.User.FindFirst(ClaimTypes.NameIdentifier)?.Value,
        out var subjectId))
    {
      return BusinessContextResolution.Unauthenticated();
    }

    var routeTenant = Convert.ToString(
      httpContext.Request.RouteValues["tenantId"],
      CultureInfo.InvariantCulture);
    if (!BusinessTenantId.TryParse(routeTenant, out var tenantId))
    {
      return BusinessContextResolution.TenantUnavailable();
    }

    var tokenResult = SupabaseBearerTokenReader.Read(
      httpContext.Request.Headers.Authorization.ToString());
    if (tokenResult.Code is not SupabaseBearerTokenReadCode.Valid || tokenResult.Token is null)
    {
      return BusinessContextResolution.Unauthenticated();
    }

    var membershipResult = await _membershipReader.ReadActiveAsync(
      tenantId,
      subjectId,
      tokenResult.Token,
      cancellationToken);
    if (membershipResult.Code is BusinessMembershipLookupCode.TemporarilyUnavailable)
    {
      return BusinessContextResolution.TemporarilyUnavailable();
    }

    if (
      membershipResult.Code is not BusinessMembershipLookupCode.Found ||
      membershipResult.Membership is null)
    {
      return BusinessContextResolution.MembershipDenied();
    }

    var accessContext = new BusinessAccessContext(
      membershipResult.Membership.TenantId,
      membershipResult.Membership.SubjectId,
      _permissionMapper.Map(membershipResult.Membership),
      "supabase-auth-server+rls-membership");

    return BusinessContextResolution.Resolved(accessContext);
  }
}

public sealed class SupabaseBusinessContextProvider : IAuthenticatedBusinessContextProvider
{
  private readonly IBusinessContextResolver _resolver;

  public SupabaseBusinessContextProvider(IBusinessContextResolver resolver)
  {
    ArgumentNullException.ThrowIfNull(resolver);
    _resolver = resolver;
  }

  public async ValueTask<BusinessAccessContext?> GetCurrentAsync(
    CancellationToken cancellationToken)
  {
    var resolution = await _resolver.ResolveCurrentAsync(cancellationToken);
    return resolution.Code is BusinessContextResolutionCode.Resolved
      ? resolution.Context
      : null;
  }
}
