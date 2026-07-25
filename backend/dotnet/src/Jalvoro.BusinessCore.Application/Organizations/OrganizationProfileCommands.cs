using System.Diagnostics.CodeAnalysis;
using Jalvoro.BusinessCore.Domain.Operations;
using Jalvoro.BusinessCore.Domain.Security;
using Jalvoro.BusinessCore.Domain.Tenancy;

namespace Jalvoro.BusinessCore.Application.Organizations;

public sealed record OrganizationProfileDocument(
  string Name,
  string? Description,
  string Timezone,
  short FiscalYearStartMonth)
{
  public static bool TryCreate(
    string? name,
    string? description,
    string? timezone,
    short fiscalYearStartMonth,
    [NotNullWhen(true)] out OrganizationProfileDocument? document)
  {
    document = null;

    var normalizedName = name?.Trim();
    var normalizedDescription = string.IsNullOrWhiteSpace(description)
      ? null
      : description.Trim();
    var normalizedTimezone = timezone?.Trim();

    if (
      normalizedName is null ||
      normalizedName.Length is < 2 or > 120 ||
      normalizedDescription?.Length > 1000 ||
      normalizedTimezone is null ||
      normalizedTimezone.Length is < 1 or > 80 ||
      fiscalYearStartMonth is < 1 or > 12)
    {
      return false;
    }

    document = new OrganizationProfileDocument(
      normalizedName,
      normalizedDescription,
      normalizedTimezone,
      fiscalYearStartMonth);
    return true;
  }
}

public sealed record UpdateOrganizationProfileCommand(
  BusinessTenantId TenantId,
  BusinessSubjectId SubjectId,
  IdempotencyKey IdempotencyKey,
  long ExpectedVersion,
  OrganizationProfileDocument Profile);

public enum OrganizationProfileWriteCode
{
  Updated,
  Replayed,
  IdempotencyConflict,
  VersionConflict,
  ValidationFailed,
  Forbidden,
  NotFound,
  TemporarilyUnavailable,
}

public sealed record OrganizationProfileSnapshot(
  BusinessTenantId TenantId,
  long Version,
  string Name,
  string? Description,
  string Timezone,
  short FiscalYearStartMonth);

public sealed record OrganizationProfileWriteResult(
  OrganizationProfileWriteCode Code,
  OrganizationProfileSnapshot? Profile,
  long? CurrentVersion = null)
{
  public static OrganizationProfileWriteResult Updated(OrganizationProfileSnapshot profile) =>
    new(OrganizationProfileWriteCode.Updated, profile);

  public static OrganizationProfileWriteResult Replayed(OrganizationProfileSnapshot profile) =>
    new(OrganizationProfileWriteCode.Replayed, profile);

  public static OrganizationProfileWriteResult IdempotencyConflict() =>
    new(OrganizationProfileWriteCode.IdempotencyConflict, null);

  public static OrganizationProfileWriteResult VersionConflict(long currentVersion) =>
    new(OrganizationProfileWriteCode.VersionConflict, null, currentVersion);

  public static OrganizationProfileWriteResult ValidationFailed() =>
    new(OrganizationProfileWriteCode.ValidationFailed, null);

  public static OrganizationProfileWriteResult Forbidden() =>
    new(OrganizationProfileWriteCode.Forbidden, null);

  public static OrganizationProfileWriteResult NotFound() =>
    new(OrganizationProfileWriteCode.NotFound, null);

  public static OrganizationProfileWriteResult TemporarilyUnavailable() =>
    new(OrganizationProfileWriteCode.TemporarilyUnavailable, null);
}

public interface IOrganizationProfileCommandStore
{
  ValueTask<OrganizationProfileWriteResult> UpdateAsync(
    UpdateOrganizationProfileCommand command,
    CancellationToken cancellationToken);
}
