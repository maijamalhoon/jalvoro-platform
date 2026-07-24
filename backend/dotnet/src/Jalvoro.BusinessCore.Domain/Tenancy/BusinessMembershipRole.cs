using System.Diagnostics.CodeAnalysis;

namespace Jalvoro.BusinessCore.Domain.Tenancy;

public sealed record BusinessMembershipRole
{
  private static readonly HashSet<string> Supported = new(StringComparer.Ordinal)
  {
    "owner",
    "admin",
    "accountant",
    "manager",
    "sales",
    "cashier",
    "inventory",
    "viewer",
  };

  private BusinessMembershipRole(string value)
  {
    Value = value;
  }

  public string Value { get; }

  public static BusinessMembershipRole Create(string value)
  {
    if (!TryParse(value, out var role))
    {
      throw new ArgumentException("The business membership role is unsupported.", nameof(value));
    }

    return role;
  }

  public static bool TryParse(
    string? value,
    [NotNullWhen(true)] out BusinessMembershipRole? role)
  {
    var normalized = value?.Trim().ToLowerInvariant();
    if (normalized is null || !Supported.Contains(normalized))
    {
      role = null;
      return false;
    }

    role = new BusinessMembershipRole(normalized);
    return true;
  }

  public bool Is(string value) => string.Equals(Value, value, StringComparison.Ordinal);

  public override string ToString() => Value;
}
