using System.Diagnostics.CodeAnalysis;

namespace Jalvoro.BusinessCore.Domain.Security;

public sealed record PermissionKey
{
  private const int MaximumLength = 96;

  public string Value { get; }

  private PermissionKey(string value)
  {
    Value = value;
  }

  public static PermissionKey Create(string value)
  {
    if (!TryParse(value, out var permission))
    {
      throw new ArgumentException(
        "Permission keys must use lowercase dot-separated segments containing letters, numbers, hyphens, or underscores.",
        nameof(value));
    }

    return permission;
  }

  public static bool TryParse(
    string? value,
    [NotNullWhen(true)] out PermissionKey? permission)
  {
    permission = null;
    if (string.IsNullOrWhiteSpace(value) || value.Length > MaximumLength)
    {
      return false;
    }

    var segments = value.Split('.', StringSplitOptions.None);
    if (segments.Length < 2 || segments.Any(segment => segment.Length == 0))
    {
      return false;
    }

    foreach (var character in value)
    {
      var allowed = character is >= 'a' and <= 'z' or >= '0' and <= '9' or '.' or '-' or '_';
      if (!allowed)
      {
        return false;
      }
    }

    permission = new PermissionKey(value);
    return true;
  }

  public override string ToString() => Value;
}
