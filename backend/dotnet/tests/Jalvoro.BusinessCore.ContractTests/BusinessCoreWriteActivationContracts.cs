internal static class BusinessCoreWriteActivationContracts
{
  private const string ApplicationRelativePath =
    "backend/dotnet/src/Jalvoro.BusinessCore.Api/BusinessCoreApiApplication.cs";

  public static void Run(Action<bool, string> check)
  {
    ArgumentNullException.ThrowIfNull(check);

    var applicationPath = FindRepositoryFile(ApplicationRelativePath);
    check(
      applicationPath is not null,
      "The Business Core API composition must remain available for write-activation truthfulness checks.");
    if (applicationPath is null)
    {
      return;
    }

    var application = File.ReadAllText(applicationPath);
    check(
      application.Contains("businessCoreWriteEndpointMapped = true", StringComparison.Ordinal) &&
      application.Contains(
        "writeEndpointsActive = supabaseConfiguration.IsConfigured",
        StringComparison.Ordinal) &&
      application.Contains("productionWriteTrafficActive = false", StringComparison.Ordinal),
      "The security contract must distinguish a mapped write endpoint, configured operational activity, and inactive production traffic.");
    check(
      application.Contains("activeWriteCommands = ActiveWriteCommands", StringComparison.Ordinal) &&
      application.Contains("\"organization.profile.update.v1\"", StringComparison.Ordinal),
      "The runtime security contract must disclose the exact mapped organization profile command.");
  }

  private static string? FindRepositoryFile(string relativePath)
  {
    foreach (var start in new[] { Directory.GetCurrentDirectory(), AppContext.BaseDirectory })
    {
      var directory = new DirectoryInfo(start);
      while (directory is not null)
      {
        var candidate = Path.Combine(
          directory.FullName,
          relativePath.Replace('/', Path.DirectorySeparatorChar));
        if (File.Exists(candidate))
        {
          return candidate;
        }

        directory = directory.Parent;
      }
    }

    return null;
  }
}
