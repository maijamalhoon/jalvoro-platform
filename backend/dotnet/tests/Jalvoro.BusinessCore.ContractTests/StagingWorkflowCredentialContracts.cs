internal static class StagingWorkflowCredentialContracts
{
  private const string WorkflowRelativePath = ".github/workflows/dotnet-staging-supabase-smoke.yml";

  public static void Run(Action<bool, string> check)
  {
    ArgumentNullException.ThrowIfNull(check);

    var workflowPath = FindRepositoryFile(WorkflowRelativePath);
    check(workflowPath is not null, "The protected staging smoke workflow must remain present.");
    if (workflowPath is null)
    {
      return;
    }

    var workflow = File.ReadAllText(workflowPath);
    check(
      workflow.Contains("environment: staging", StringComparison.Ordinal),
      "The live smoke workflow must use the protected GitHub staging environment.");
    check(
      workflow.Contains("workflow_dispatch:", StringComparison.Ordinal) &&
      !workflow.Contains("pull_request:", StringComparison.Ordinal) &&
      !workflow.Contains("schedule:", StringComparison.Ordinal) &&
      !workflow.Contains("\n  push:", StringComparison.Ordinal),
      "The live staging smoke workflow must remain manual-only.");
    check(
      workflow.Contains(
        "JALVORO_SUPABASE_STAGING_TEST_EMAIL: ${{ secrets.JALVORO_SUPABASE_STAGING_TEST_EMAIL }}",
        StringComparison.Ordinal) &&
      workflow.Contains(
        "JALVORO_SUPABASE_STAGING_TEST_PASSWORD: ${{ secrets.JALVORO_SUPABASE_STAGING_TEST_PASSWORD }}",
        StringComparison.Ordinal),
      "The workflow must obtain the dedicated staging identity from protected email/password secrets.");
    check(
      !workflow.Contains("secrets.JALVORO_SUPABASE_STAGING_TEST_JWT", StringComparison.Ordinal),
      "A static expiring staging JWT must never be stored as a GitHub secret.");
    check(
      workflow.Contains("/auth/v1/token?grant_type=password", StringComparison.Ordinal),
      "The workflow must acquire a fresh short-lived Supabase session at runtime.");
    check(
      workflow.Contains(
        "returned_user_id\" != \"$JALVORO_SUPABASE_STAGING_TEST_USER_ID",
        StringComparison.Ordinal),
      "The fresh session subject must match the approved staging identity before the smoke test runs.");
    check(
      workflow.Contains("::add-mask::$access_token", StringComparison.Ordinal),
      "The short-lived staging access token must be masked before entering the process environment.");
    check(
      !workflow.Contains("cat \"$response_file\"", StringComparison.Ordinal),
      "The staging Auth response body must never be printed into workflow logs.");
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
