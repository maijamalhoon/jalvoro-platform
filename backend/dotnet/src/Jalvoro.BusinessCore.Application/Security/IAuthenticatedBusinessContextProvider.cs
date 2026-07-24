namespace Jalvoro.BusinessCore.Application.Security;

public interface IAuthenticatedBusinessContextProvider
{
  ValueTask<BusinessAccessContext?> GetCurrentAsync(CancellationToken cancellationToken);
}
