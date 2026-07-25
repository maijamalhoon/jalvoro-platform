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
      workflow.Contains("id-token: write", StringComparison.Ordinal) &&
      workflow.Contains("audience=jalvoro-staging-smoke", StringComparison.Ordinal),
      "The workflow must request a narrowly scoped GitHub OIDC token.");
    check(
      workflow.Contains(
        "/functions/v1/jalvoro-github-staging-smoke-session",
        StringComparison.Ordinal),
      "The workflow must exchange GitHub OIDC through the dedicated staging session broker.");
    check(
      !workflow.Contains("secrets.JALVORO_SUPABASE_STAGING", StringComparison.Ordinal) &&
      !workflow.Contains("vars.JALVORO_SUPABASE_STAGING", StringComparison.Ordinal) &&
      !workflow.Contains("/auth/v1/token?grant_type=password", StringComparison.Ordinal),
      "The workflow must not store or directly use staging email, password, JWT, user, or tenant values in GitHub.");
    check(
      workflow.Contains("::add-mask::$github_oidc_token", StringComparison.Ordinal) &&
      workflow.Contains("::add-mask::$access_token", StringComparison.Ordinal) &&
      workflow.Contains("::add-mask::$user_id", StringComparison.Ordinal) &&
      workflow.Contains("::add-mask::$tenant_id", StringComparison.Ordinal),
      "OIDC, access-token, subject, and tenant values must be masked before entering the process environment.");
    check(
      !workflow.Contains("cat \"$oidc_response_file\"", StringComparison.Ordinal) &&
      !workflow.Contains("cat \"$broker_response_file\"", StringComparison.Ordinal),
      "OIDC and broker response bodies must never be printed into workflow logs.");
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
