using Jalvoro.BusinessCore.Domain.Operations;
using Jalvoro.BusinessCore.Domain.Tenancy;

namespace Jalvoro.BusinessCore.Application.Operations;

public sealed record IdempotencyScope(
  BusinessTenantId TenantId,
  IdempotencyKey Key,
  string OperationName);

public enum IdempotencyDecisionCode
{
  Reserved,
  Duplicate,
  Unavailable,
}

public sealed record IdempotencyDecision(IdempotencyDecisionCode Code)
{
  public bool MayExecute => Code == IdempotencyDecisionCode.Reserved;
}

public interface IIdempotencyCoordinator
{
  ValueTask<IdempotencyDecision> ReserveAsync(
    IdempotencyScope scope,
    CancellationToken cancellationToken);
}
