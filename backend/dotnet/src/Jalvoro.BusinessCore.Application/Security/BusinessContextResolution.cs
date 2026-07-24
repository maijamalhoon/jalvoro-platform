namespace Jalvoro.BusinessCore.Application.Security;

public enum BusinessContextResolutionCode
{
  Resolved,
  Unauthenticated,
  TenantUnavailable,
  MembershipDenied,
  TemporarilyUnavailable,
}

public sealed record BusinessContextResolution(
  BusinessContextResolutionCode Code,
  BusinessAccessContext? Context)
{
  public static BusinessContextResolution Resolved(BusinessAccessContext context)
  {
    ArgumentNullException.ThrowIfNull(context);
    return new BusinessContextResolution(BusinessContextResolutionCode.Resolved, context);
  }

  public static BusinessContextResolution Unauthenticated() =>
    new(BusinessContextResolutionCode.Unauthenticated, null);

  public static BusinessContextResolution TenantUnavailable() =>
    new(BusinessContextResolutionCode.TenantUnavailable, null);

  public static BusinessContextResolution MembershipDenied() =>
    new(BusinessContextResolutionCode.MembershipDenied, null);

  public static BusinessContextResolution TemporarilyUnavailable() =>
    new(BusinessContextResolutionCode.TemporarilyUnavailable, null);
}

public interface IBusinessContextResolver
{
  ValueTask<BusinessContextResolution> ResolveCurrentAsync(CancellationToken cancellationToken);
}
