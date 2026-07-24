using Jalvoro.BusinessCore.StagingSmoke;

// The smoke executable reads only runtime-injected staging values and never loads a committed credential file.
// Command-line arguments are intentionally ignored so callers cannot redirect the hard-coded staging allowlist.
// Its process result is a sanitized contract exit code; credentials and response bodies are never echoed here.
var result = await StagingSupabaseSmokeRunner.RunAsync(
  Environment.GetEnvironmentVariable,
  Console.Out,
  Console.Error,
  CancellationToken.None);

return result.ExitCode;
