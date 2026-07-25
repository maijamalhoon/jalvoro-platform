using Jalvoro.BusinessCore.Application.Security;
using Jalvoro.BusinessCore.Domain.Operations;
using Jalvoro.BusinessCore.Domain.Tenancy;

namespace Jalvoro.BusinessCore.Application.Organizations;

public sealed class OrganizationProfileCommandHandler
{
  private readonly IBusinessContextResolver _contextResolver;
  private readonly IBusinessAuthorizationService _authorizationService;
  private readonly IOrganizationProfileCommandStore _commandStore;

  public OrganizationProfileCommandHandler(
    IBusinessContextResolver contextResolver,
    IBusinessAuthorizationService authorizationService,
    IOrganizationProfileCommandStore commandStore)
  {
    ArgumentNullException.ThrowIfNull(contextResolver);
    ArgumentNullException.ThrowIfNull(authorizationService);
    ArgumentNullException.ThrowIfNull(commandStore);

    _contextResolver = contextResolver;
    _authorizationService = authorizationService;
    _commandStore = commandStore;
  }

  public async ValueTask<OrganizationProfileWriteResult> ExecuteAsync(
    BusinessTenantId tenantId,
    IdempotencyKey idempotencyKey,
    long expectedVersion,
    OrganizationProfileDocument profile,
    CancellationToken cancellationToken)
  {
    ArgumentNullException.ThrowIfNull(tenantId);
    ArgumentNullException.ThrowIfNull(idempotencyKey);
    ArgumentNullException.ThrowIfNull(profile);

    if (expectedVersion < 1)
    {
      return OrganizationProfileWriteResult.ValidationFailed();
    }

    var resolution = await _contextResolver.ResolveCurrentAsync(cancellationToken);
    if (resolution.Code is BusinessContextResolutionCode.TemporarilyUnavailable)
    {
      return OrganizationProfileWriteResult.TemporarilyUnavailable();
    }

    if (resolution.Code is BusinessContextResolutionCode.TenantUnavailable)
    {
      return OrganizationProfileWriteResult.ValidationFailed();
    }

    if (resolution.Code is not BusinessContextResolutionCode.Resolved || resolution.Context is null)
    {
      return OrganizationProfileWriteResult.Forbidden();
    }

    var context = resolution.Context;
    var authorization = _authorizationService.Evaluate(
      context,
      tenantId,
      BusinessPermissions.OrganizationManage);
    if (!authorization.Allowed)
    {
      return OrganizationProfileWriteResult.Forbidden();
    }

    return await _commandStore.UpdateAsync(
      new UpdateOrganizationProfileCommand(
        tenantId,
        context.SubjectId,
        idempotencyKey,
        expectedVersion,
        profile),
      cancellationToken);
  }
}
