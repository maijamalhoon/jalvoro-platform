namespace Jalvoro.BusinessCore.Api;

public sealed record UpdateOrganizationProfileRequest(
  string? Name,
  string? Description,
  string? Timezone,
  short FiscalYearStartMonth,
  long ExpectedVersion);
