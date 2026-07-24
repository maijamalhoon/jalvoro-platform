namespace Jalvoro.BusinessCore.Domain.Operations;

public sealed record IdempotencyKey
{
  private const int MinimumLength = 16;
  private const int MaximumLength = 128;

  public string Value { get; }

  private IdempotencyKey(string value)
  {
    Value = value;
  }

  public static IdempotencyKey Create(string value)
  {
    if (!TryParse(value, out var key))
    {
      throw new ArgumentException(
        "Idempotency keys must be 16 to 128 ASCII characters and may contain letters, numbers, hyphens, underscores, periods, or colons.",
        nameof(value));
    }

    return key;
  }

  public static bool TryParse(string? value, out IdempotencyKey? key)
  {
    key = null;
    if (string.IsNullOrWhiteSpace(value) || value.Length is < MinimumLength or > MaximumLength)
    {
      return false;
    }

    foreach (var character in value)
    {
      var allowed = character is >= 'a' and <= 'z'
        or >= 'A' and <= 'Z'
        or >= '0' and <= '9'
        or '-'
        or '_'
        or '.'
        or ':';
      if (!allowed)
      {
        return false;
      }
    }

    key = new IdempotencyKey(value);
    return true;
  }

  public override string ToString() => Value;
}
