using System.Collections.Frozen;
using Jalvoro.BusinessCore.Domain.Security;
using Jalvoro.BusinessCore.Domain.Tenancy;

namespace Jalvoro.BusinessCore.Application.Security;

public sealed class BusinessAccessContext
{
  private readonly FrozenSet<PermissionKey> _permissions;

  public BusinessAccessContext(
    BusinessTenantId tenantId,
    BusinessSubjectId subjectId,
    IEnumerable<PermissionKey> permissions,
    string authenticationMethod)
  {
    ArgumentNullException.ThrowIfNull(tenantId);
    ArgumentNullException.ThrowIfNull(subjectId);
    ArgumentNullException.ThrowIfNull(permissions);

    if (string.IsNullOrWhiteSpace(authenticationMethod) || authenticationMethod.Length > 64)
    {
      throw new ArgumentException("Authentication method is required and must not exceed 64 characters.", nameof(authenticationMethod));
    }

    TenantId = tenantId;
    SubjectId = subjectId;
    AuthenticationMethod = authenticationMethod;
    _permissions = permissions.ToFrozenSet();
  }

  public BusinessTenantId TenantId { get; }

  public BusinessSubjectId SubjectId { get; }

  public string AuthenticationMethod { get; }

  public IReadOnlySet<PermissionKey> Permissions => _permissions;
}
