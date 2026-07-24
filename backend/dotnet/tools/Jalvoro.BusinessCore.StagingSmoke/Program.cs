using Jalvoro.BusinessCore.StagingSmoke;

var result = await StagingSupabaseSmokeRunner.RunAsync(
  Environment.GetEnvironmentVariable,
  Console.Out,
  Console.Error,
  CancellationToken.None);

return result.ExitCode;
