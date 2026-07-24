using Jalvoro.BusinessCore.StagingSmoke;

// The smoke executable reads only runtime-injected staging values and never loads a committed credential file.
var result = await StagingSupabaseSmokeRunner.RunAsync(
  Environment.GetEnvironmentVariable,
  Console.Out,
  Console.Error,
  CancellationToken.None);

return result.ExitCode;
