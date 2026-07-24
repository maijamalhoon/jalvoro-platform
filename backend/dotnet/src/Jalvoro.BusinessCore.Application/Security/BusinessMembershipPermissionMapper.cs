using System.Collections.Frozen;
using Jalvoro.BusinessCore.Application.Tenancy;
using Jalvoro.BusinessCore.Domain.Security;

namespace Jalvoro.BusinessCore.Application.Security;

public sealed class BusinessMembershipPermissionMapper
{
  private readonly FrozenDictionary<string, PermissionKey[]> _rolePermissions;

  public BusinessMembershipPermissionMapper()
  {
    _rolePermissions = new Dictionary<string, PermissionKey[]>(StringComparer.Ordinal)
    {
      ["owner"] =
      [
        BusinessPermissions.OrganizationManage,
        BusinessPermissions.MembershipRead,
        BusinessPermissions.MembershipManage,
      ],
      ["admin"] =
      [
        BusinessPermissions.MembershipRead,
        BusinessPermissions.MembershipManage,
      ],
      ["accountant"] = [BusinessPermissions.MembershipRead],
      ["manager"] = [BusinessPermissions.MembershipRead],
      ["viewer"] = [BusinessPermissions.MembershipRead],
    }.ToFrozenDictionary(StringComparer.Ordinal);
  }

  public IReadOnlySet<PermissionKey> Map(BusinessMembershipProjection membership)
  {
    ArgumentNullException.ThrowIfNull(membership);

    var permissions = new HashSet<PermissionKey>
    {
      BusinessPermissions.OrganizationRead,
    };

    if (_rolePermissions.TryGetValue(membership.Role.Value, out var rolePermissions))
    {
      foreach (var permission in rolePermissions)
      {
        permissions.Add(permission);
      }
    }

    if (
      membership.LegacyPermissions.Contains("team.view") ||
      membership.LegacyPermissions.Contains("team.manage"))
    {
      permissions.Add(BusinessPermissions.MembershipRead);
    }

    if (membership.LegacyPermissions.Contains("team.manage"))
    {
      permissions.Add(BusinessPermissions.MembershipManage);
    }

    return permissions.ToFrozenSet();
  }
}
