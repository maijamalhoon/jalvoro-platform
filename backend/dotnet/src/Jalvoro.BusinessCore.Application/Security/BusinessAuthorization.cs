using Jalvoro.BusinessCore.Domain.Security;
using Jalvoro.BusinessCore.Domain.Tenancy;

namespace Jalvoro.BusinessCore.Application.Security;

public enum AuthorizationDecisionCode
{
  Allowed,
  Unauthenticated,
  TenantMismatch,
  MissingPermission,
}

public sealed record AuthorizationDecision(bool Allowed, AuthorizationDecisionCode Code)
{
  public static AuthorizationDecision Allow() => new(true, AuthorizationDecisionCode.Allowed);

  public static AuthorizationDecision Deny(AuthorizationDecisionCode code) => new(false, code);
}

public interface IBusinessAuthorizationService
{
  AuthorizationDecision Evaluate(
    BusinessAccessContext? context,
    BusinessTenantId requiredTenantId,
    PermissionKey requiredPermission);
}

public sealed class FailClosedBusinessAuthorizationService : IBusinessAuthorizationService
{
  public AuthorizationDecision Evaluate(
    BusinessAccessContext? context,
    BusinessTenantId requiredTenantId,
    PermissionKey requiredPermission)
  {
    ArgumentNullException.ThrowIfNull(requiredTenantId);
    ArgumentNullException.ThrowIfNull(requiredPermission);

    if (context is null)
    {
      return AuthorizationDecision.Deny(AuthorizationDecisionCode.Unauthenticated);
    }

    if (context.TenantId != requiredTenantId)
    {
      return AuthorizationDecision.Deny(AuthorizationDecisionCode.TenantMismatch);
    }

    return context.Permissions.Contains(requiredPermission)
      ? AuthorizationDecision.Allow()
      : AuthorizationDecision.Deny(AuthorizationDecisionCode.MissingPermission);
  }
}
