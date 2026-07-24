using Jalvoro.BusinessCore.Application.Security;

namespace Jalvoro.BusinessCore.Infrastructure.Security;

public sealed class UnavailableBusinessContextProvider : IAuthenticatedBusinessContextProvider
{
  public ValueTask<BusinessAccessContext?> GetCurrentAsync(CancellationToken cancellationToken)
  {
    cancellationToken.ThrowIfCancellationRequested();
    return ValueTask.FromResult<BusinessAccessContext?>(null);
  }
}
