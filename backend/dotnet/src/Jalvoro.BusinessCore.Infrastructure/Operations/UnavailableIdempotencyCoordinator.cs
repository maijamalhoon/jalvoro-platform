using Jalvoro.BusinessCore.Application.Operations;

namespace Jalvoro.BusinessCore.Infrastructure.Operations;

public sealed class UnavailableIdempotencyCoordinator : IIdempotencyCoordinator
{
  public ValueTask<IdempotencyDecision> ReserveAsync(
    IdempotencyScope scope,
    CancellationToken cancellationToken)
  {
    ArgumentNullException.ThrowIfNull(scope);
    cancellationToken.ThrowIfCancellationRequested();
    return ValueTask.FromResult(new IdempotencyDecision(IdempotencyDecisionCode.Unavailable));
  }
}
