using System.Collections.Frozen;
using Jalvoro.BusinessCore.Application.Tenancy;
using Jalvoro.BusinessCore.Domain.Security;

namespace Jalvoro.BusinessCore.Application.Security;

public sealed class BusinessMembershipPermissionMapper
{
  public IReadOnlySet<PermissionKey> Map(BusinessMembershipProjection membership)
  {
    ArgumentNullException.ThrowIfNull(membership);

    var permissions = new HashSet<PermissionKey>
    {
      BusinessPermissions.OrganizationRead,
    };

    if (membership.Role.Is("owner"))
    {
      permissions.Add(BusinessPermissions.OrganizationManage);
      permissions.Add(BusinessPermissions.MembershipRead);
      permissions.Add(BusinessPermissions.MembershipManage);
    }
    else if (membership.Role.Is("admin"))
    {
      permissions.Add(BusinessPermissions.MembershipRead);
      permissions.Add(BusinessPermissions.MembershipManage);
    }
    else if (
      membership.Role.Is("accountant") ||
      membership.Role.Is("manager") ||
      membership.Role.Is("viewer"))
    {
      permissions.Add(BusinessPermissions.MembershipRead);
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
