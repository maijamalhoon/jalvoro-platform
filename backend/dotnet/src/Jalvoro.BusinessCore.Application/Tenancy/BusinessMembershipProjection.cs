using System.Collections.Frozen;
using Jalvoro.BusinessCore.Domain.Security;
using Jalvoro.BusinessCore.Domain.Tenancy;

namespace Jalvoro.BusinessCore.Application.Tenancy;

public sealed class BusinessMembershipProjection
{
  private readonly FrozenSet<string> _legacyPermissions;

  public BusinessMembershipProjection(
    BusinessTenantId tenantId,
    BusinessSubjectId subjectId,
    BusinessMembershipRole role,
    IEnumerable<string> legacyPermissions)
  {
    ArgumentNullException.ThrowIfNull(tenantId);
    ArgumentNullException.ThrowIfNull(subjectId);
    ArgumentNullException.ThrowIfNull(role);
    ArgumentNullException.ThrowIfNull(legacyPermissions);

    TenantId = tenantId;
    SubjectId = subjectId;
    Role = role;
    _legacyPermissions = legacyPermissions
      .Where(permission => !string.IsNullOrWhiteSpace(permission))
      .Select(permission => permission.Trim().ToLowerInvariant())
      .Where(permission => permission.Length <= 128)
      .ToFrozenSet(StringComparer.Ordinal);
  }

  public BusinessTenantId TenantId { get; }

  public BusinessSubjectId SubjectId { get; }

  public BusinessMembershipRole Role { get; }

  public IReadOnlySet<string> LegacyPermissions => _legacyPermissions;
}
