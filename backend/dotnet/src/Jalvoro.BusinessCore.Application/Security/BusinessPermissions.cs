using Jalvoro.BusinessCore.Domain.Security;

namespace Jalvoro.BusinessCore.Application.Security;

public static class BusinessPermissions
{
  public static readonly PermissionKey OrganizationRead = PermissionKey.Create("organization.read");

  public static readonly PermissionKey OrganizationManage = PermissionKey.Create("organization.manage");

  public static readonly PermissionKey MembershipRead = PermissionKey.Create("membership.read");

  public static readonly PermissionKey MembershipManage = PermissionKey.Create("membership.manage");
}
