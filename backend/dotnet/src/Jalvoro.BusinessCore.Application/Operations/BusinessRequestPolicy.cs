namespace Jalvoro.BusinessCore.Application.Operations;

public static class BusinessRequestPolicy
{
  public static readonly TimeSpan MaximumExecutionTime = TimeSpan.FromSeconds(15);

  public const bool RequireIdempotencyForWrites = true;

  public const bool TrustClientIdentityHeaders = false;
}
