using Jalvoro.BusinessCore.Domain.Security;
using Jalvoro.BusinessCore.Domain.Tenancy;

namespace Jalvoro.BusinessCore.Application.Tenancy;

public enum BusinessMembershipLookupCode
{
  Found,
  NotFound,
  TemporarilyUnavailable,
}

public sealed record BusinessMembershipLookupResult(
  BusinessMembershipLookupCode Code,
  BusinessMembershipProjection? Membership)
{
  public static BusinessMembershipLookupResult Found(BusinessMembershipProjection membership)
  {
    ArgumentNullException.ThrowIfNull(membership);
    return new BusinessMembershipLookupResult(BusinessMembershipLookupCode.Found, membership);
  }

  public static BusinessMembershipLookupResult NotFound() =>
    new(BusinessMembershipLookupCode.NotFound, null);

  public static BusinessMembershipLookupResult TemporarilyUnavailable() =>
    new(BusinessMembershipLookupCode.TemporarilyUnavailable, null);
}

public interface IBusinessMembershipProjectionReader
{
  ValueTask<BusinessMembershipLookupResult> ReadActiveAsync(
    BusinessTenantId tenantId,
    BusinessSubjectId subjectId,
    string bearerToken,
    CancellationToken cancellationToken);
}
