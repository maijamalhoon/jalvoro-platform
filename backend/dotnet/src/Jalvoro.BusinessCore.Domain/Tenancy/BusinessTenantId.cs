using System.Diagnostics.CodeAnalysis;

namespace Jalvoro.BusinessCore.Domain.Tenancy;

public sealed record BusinessTenantId
{
    public Guid Value { get; }

    private BusinessTenantId(Guid value)
    {
        Value = value;
    }

    public static BusinessTenantId Create(Guid value)
    {
        if (value == Guid.Empty)
        {
            throw new ArgumentException("A business tenant ID cannot be empty.", nameof(value));
        }

        return new BusinessTenantId(value);
    }

    public static bool TryParse(
        string? value,
        [NotNullWhen(true)] out BusinessTenantId? tenantId)
    {
        if (!Guid.TryParse(value, out var parsed) || parsed == Guid.Empty)
        {
            tenantId = null;
            return false;
        }

        tenantId = new BusinessTenantId(parsed);
        return true;
    }

    public override string ToString() => Value.ToString("D");
}
