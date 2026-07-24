using System.Diagnostics.CodeAnalysis;

namespace Jalvoro.BusinessCore.Domain.Security;

public sealed record BusinessSubjectId
{
  public Guid Value { get; }

  private BusinessSubjectId(Guid value)
  {
    Value = value;
  }

  public static BusinessSubjectId Create(Guid value)
  {
    if (value == Guid.Empty)
    {
      throw new ArgumentException("A business subject ID cannot be empty.", nameof(value));
    }

    return new BusinessSubjectId(value);
  }

  public static bool TryParse(
    string? value,
    [NotNullWhen(true)] out BusinessSubjectId? subjectId)
  {
    if (!Guid.TryParse(value, out var parsed) || parsed == Guid.Empty)
    {
      subjectId = null;
      return false;
    }

    subjectId = new BusinessSubjectId(parsed);
    return true;
  }

  public override string ToString() => Value.ToString("D");
}
