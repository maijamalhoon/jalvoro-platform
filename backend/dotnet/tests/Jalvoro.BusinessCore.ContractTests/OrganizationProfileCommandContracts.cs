using Jalvoro.BusinessCore.Application.Organizations;
using Jalvoro.BusinessCore.Application.Security;
using Jalvoro.BusinessCore.Domain.Operations;
using Jalvoro.BusinessCore.Domain.Security;
using Jalvoro.BusinessCore.Domain.Tenancy;

internal static class OrganizationProfileCommandContracts
{
  public static async Task RunAsync(Action<bool, string> check)
  {
    ArgumentNullException.ThrowIfNull(check);

    CheckProfileValidation(check);
    await CheckOwnerCommandAsync(check);
    await CheckMissingPermissionAsync(check);
    await CheckDependencyFailureAsync(check);
    await CheckInvalidVersionAsync(check);
  }

  private static void CheckProfileValidation(Action<bool, string> check)
  {
    check(
      OrganizationProfileDocument.TryCreate(
        "  JALVORO Services  ",
        "  Staging profile  ",
        "  Asia/Karachi  ",
        7,
        out var profile) &&
      profile.Name == "JALVORO Services" &&
      profile.Description == "Staging profile" &&
      profile.Timezone == "Asia/Karachi" &&
      profile.FiscalYearStartMonth == 7,
      "A valid organization profile must normalize bounded text fields.");
    check(
      !OrganizationProfileDocument.TryCreate(
        "x",
        null,
        "Asia/Karachi",
        1,
        out _),
      "An organization name shorter than two characters must be rejected.");
    check(
      !OrganizationProfileDocument.TryCreate(
        "Valid Business",
        new string('d', 1001),
        "Asia/Karachi",
        1,
        out _),
      "An oversized organization description must be rejected.");
    check(
      !OrganizationProfileDocument.TryCreate(
        "Valid Business",
        null,
        "Asia/Karachi",
        13,
        out _),
      "An invalid fiscal year start month must be rejected.");
  }

  private static async Task CheckOwnerCommandAsync(Action<bool, string> check)
  {
    var tenantId = BusinessTenantId.Create(Guid.NewGuid());
    var subjectId = BusinessSubjectId.Create(Guid.NewGuid());
    var profile = CreateProfile();
    var expectedSnapshot = new OrganizationProfileSnapshot(
      tenantId,
      2,
      profile.Name,
      profile.Description,
      profile.Timezone,
      profile.FiscalYearStartMonth);
    var store = new RecordingCommandStore(
      OrganizationProfileWriteResult.Updated(expectedSnapshot));
    var handler = CreateHandler(
      BusinessContextResolution.Resolved(new BusinessAccessContext(
        tenantId,
        subjectId,
        [BusinessPermissions.OrganizationRead, BusinessPermissions.OrganizationManage],
        "contract-test")),
      store);
    var key = IdempotencyKey.Create("01JALVORO-PROFILE-0001");

    var result = await handler.ExecuteAsync(
      tenantId,
      key,
      1,
      profile,
      CancellationToken.None);

    check(
      result.Code is OrganizationProfileWriteCode.Updated &&
      result.Profile == expectedSnapshot,
      "An owner with the exact manage permission must reach the profile store.");
    check(
      store.InvocationCount == 1 &&
      store.LastCommand is { } command &&
      command.TenantId == tenantId &&
      command.SubjectId == subjectId &&
      command.IdempotencyKey == key &&
      command.ExpectedVersion == 1 &&
      command.Profile == profile,
      "The profile command must bind the verified subject, tenant, idempotency key, version, and normalized document.");
  }

  private static async Task CheckMissingPermissionAsync(Action<bool, string> check)
  {
    var tenantId = BusinessTenantId.Create(Guid.NewGuid());
    var store = new RecordingCommandStore(OrganizationProfileWriteResult.TemporarilyUnavailable());
    var handler = CreateHandler(
      BusinessContextResolution.Resolved(new BusinessAccessContext(
        tenantId,
        BusinessSubjectId.Create(Guid.NewGuid()),
        [BusinessPermissions.OrganizationRead],
        "contract-test")),
      store);

    var result = await handler.ExecuteAsync(
      tenantId,
      IdempotencyKey.Create("01JALVORO-PROFILE-0002"),
      1,
      CreateProfile(),
      CancellationToken.None);

    check(
      result.Code is OrganizationProfileWriteCode.Forbidden && store.InvocationCount == 0,
      "A viewer or non-owner must be denied before any profile write dependency runs.");
  }

  private static async Task CheckDependencyFailureAsync(Action<bool, string> check)
  {
    var store = new RecordingCommandStore(OrganizationProfileWriteResult.Updated(
      new OrganizationProfileSnapshot(
        BusinessTenantId.Create(Guid.NewGuid()),
        2,
        "Unused",
        null,
        "UTC",
        1)));
    var handler = CreateHandler(BusinessContextResolution.TemporarilyUnavailable(), store);

    var result = await handler.ExecuteAsync(
      BusinessTenantId.Create(Guid.NewGuid()),
      IdempotencyKey.Create("01JALVORO-PROFILE-0003"),
      1,
      CreateProfile(),
      CancellationToken.None);

    check(
      result.Code is OrganizationProfileWriteCode.TemporarilyUnavailable && store.InvocationCount == 0,
      "Identity or membership dependency failure must block the write fail-closed.");
  }

  private static async Task CheckInvalidVersionAsync(Action<bool, string> check)
  {
    var tenantId = BusinessTenantId.Create(Guid.NewGuid());
    var store = new RecordingCommandStore(OrganizationProfileWriteResult.TemporarilyUnavailable());
    var handler = CreateHandler(
      BusinessContextResolution.Resolved(new BusinessAccessContext(
        tenantId,
        BusinessSubjectId.Create(Guid.NewGuid()),
        [BusinessPermissions.OrganizationManage],
        "contract-test")),
      store);

    var result = await handler.ExecuteAsync(
      tenantId,
      IdempotencyKey.Create("01JALVORO-PROFILE-0004"),
      0,
      CreateProfile(),
      CancellationToken.None);

    check(
      result.Code is OrganizationProfileWriteCode.ValidationFailed && store.InvocationCount == 0,
      "A non-positive expected version must be rejected before the write store runs.");
  }

  private static OrganizationProfileCommandHandler CreateHandler(
    BusinessContextResolution resolution,
    IOrganizationProfileCommandStore store) =>
    new(
      new StubContextResolver(resolution),
      new FailClosedBusinessAuthorizationService(),
      store);

  private static OrganizationProfileDocument CreateProfile() =>
    new("JALVORO Services", "Command contract", "Asia/Karachi", 1);

  private sealed class StubContextResolver(BusinessContextResolution resolution)
    : IBusinessContextResolver
  {
    public ValueTask<BusinessContextResolution> ResolveCurrentAsync(
      CancellationToken cancellationToken)
    {
      cancellationToken.ThrowIfCancellationRequested();
      return ValueTask.FromResult(resolution);
    }
  }

  private sealed class RecordingCommandStore(OrganizationProfileWriteResult result)
    : IOrganizationProfileCommandStore
  {
    public int InvocationCount { get; private set; }

    public UpdateOrganizationProfileCommand? LastCommand { get; private set; }

    public ValueTask<OrganizationProfileWriteResult> UpdateAsync(
      UpdateOrganizationProfileCommand command,
      CancellationToken cancellationToken)
    {
      cancellationToken.ThrowIfCancellationRequested();
      InvocationCount++;
      LastCommand = command;
      return ValueTask.FromResult(result);
    }
  }
}
