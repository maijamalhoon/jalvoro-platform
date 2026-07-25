using Jalvoro.BusinessCore.StagingSmoke;

// The smoke executable reads only runtime-injected staging values and never loads a committed credential file.
// Command-line arguments are intentionally ignored so callers cannot redirect the hard-coded staging allowlist.
// Its process result is a sanitized contract exit code; credentials and response bodies are never echoed here.
Func<string, string?> readVariable = Environment.GetEnvironmentVariable;
var result = string.Equals(
  readVariable("JALVORO_SMOKE_MODE"),
  StagingOrganizationProfileWriteSafetyContract.RequiredMode,
  StringComparison.Ordinal)
  ? await StagingOrganizationProfileWriteSmokeRunner.RunAsync(
    readVariable,
    Console.Out,
    Console.Error,
    CancellationToken.None)
  : await StagingSupabaseSmokeRunner.RunAsync(
    readVariable,
    Console.Out,
    Console.Error,
    CancellationToken.None);

return result.ExitCode;
