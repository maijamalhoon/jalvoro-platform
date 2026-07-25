internal static class StagingOrganizationProfileWriteWorkflowContracts
{
  private const string WorkflowRelativePath =
    ".github/workflows/dotnet-staging-organization-profile-write-smoke.yml";
  private const string BrokerRelativePath =
    "supabase/functions/jalvoro-github-staging-profile-write-session/index.ts";
  private const string BrokerImportMapRelativePath =
    "supabase/functions/jalvoro-github-staging-profile-write-session/deno.json";
  private const string RunnerRelativePath =
    "backend/dotnet/tools/Jalvoro.BusinessCore.StagingSmoke/StagingOrganizationProfileWriteSmoke.cs";

  public static void Run(Action<bool, string> check)
  {
    ArgumentNullException.ThrowIfNull(check);

    var workflow = ReadRepositoryFile(WorkflowRelativePath);
    check(workflow is not null, "The protected staging organization profile write workflow must remain present.");
    if (workflow is not null)
    {
      check(
        workflow.Contains("workflow_dispatch:", StringComparison.Ordinal) &&
        !workflow.Contains("\n  push:", StringComparison.Ordinal) &&
        !workflow.Contains("pull_request:", StringComparison.Ordinal) &&
        !workflow.Contains("schedule:", StringComparison.Ordinal),
        "The staging organization profile write workflow must remain manual-only.");
      check(
        workflow.Contains("environment: staging", StringComparison.Ordinal) &&
        workflow.Contains("id-token: write", StringComparison.Ordinal) &&
        workflow.Contains(
          "STAGING_ORGANIZATION_PROFILE_WRITE_RESTORE",
          StringComparison.Ordinal),
        "The live write workflow must require the protected staging environment and exact restore confirmation.");
      check(
        workflow.Contains(
          "audience=jalvoro-staging-profile-write-smoke",
          StringComparison.Ordinal) &&
        workflow.Contains(
          "/functions/v1/jalvoro-github-staging-profile-write-session",
          StringComparison.Ordinal),
        "The workflow must use the dedicated profile-write OIDC audience and broker.");
      check(
        !workflow.Contains("secrets.JALVORO_SUPABASE_STAGING", StringComparison.Ordinal) &&
        !workflow.Contains("vars.JALVORO_SUPABASE_STAGING", StringComparison.Ordinal) &&
        !workflow.Contains("grant_type=password", StringComparison.Ordinal),
        "GitHub must not store or directly use the staging identity, password, JWT, user, or tenant values.");
      check(
        workflow.Contains("::add-mask::$github_oidc_token", StringComparison.Ordinal) &&
        workflow.Contains("::add-mask::$access_token", StringComparison.Ordinal) &&
        workflow.Contains("::add-mask::$user_id", StringComparison.Ordinal) &&
        workflow.Contains("::add-mask::$tenant_id", StringComparison.Ordinal) &&
        !workflow.Contains("cat \"$oidc_response_file\"", StringComparison.Ordinal) &&
        !workflow.Contains("cat \"$broker_response_file\"", StringComparison.Ordinal),
        "OIDC, access-token, subject, tenant, and response bodies must remain protected from logs.");
      check(
        workflow.Contains("JALVORO_SMOKE_MODE: organization-profile-write", StringComparison.Ordinal) &&
        workflow.Contains("Run reversible organization profile write smoke", StringComparison.Ordinal),
        "The workflow must execute only the explicit reversible organization profile write mode.");
    }

    var broker = ReadRepositoryFile(BrokerRelativePath);
    check(broker is not null, "The staging profile-write OIDC broker source must remain versioned.");
    if (broker is not null)
    {
      check(
        broker.Contains(
          "EXPECTED_AUDIENCE = \"jalvoro-staging-profile-write-smoke\"",
          StringComparison.Ordinal) &&
        broker.Contains(
          "EXPECTED_EVENT = \"workflow_dispatch\"",
          StringComparison.Ordinal) &&
        broker.Contains(
          "refs/heads/agent/idempotent-organization-profile-command",
          StringComparison.Ordinal) &&
        broker.Contains(
          ".github/workflows/dotnet-staging-organization-profile-write-smoke.yml",
          StringComparison.Ordinal),
        "The broker must remain bound to the exact manual workflow, audience, and command branch.");
      check(
        broker.Contains("createRemoteJWKSet", StringComparison.Ordinal) &&
        broker.Contains("https://token.actions.githubusercontent.com", StringComparison.Ordinal) &&
        broker.Contains("github_oidc_staging_smoke_replays", StringComparison.Ordinal) &&
        broker.Contains("on conflict (jti) do nothing", StringComparison.Ordinal),
        "The broker must verify GitHub signatures and consume every OIDC token exactly once.");
      check(
        broker.Contains("vault.decrypted_secrets", StringComparison.Ordinal) &&
        broker.Contains("bm.role = 'owner'", StringComparison.Ordinal) &&
        broker.Contains("bm.status = 'active'", StringComparison.Ordinal) &&
        !broker.Contains("service_role", StringComparison.Ordinal) &&
        !broker.Contains("refresh_token", StringComparison.Ordinal),
        "The broker must read the Vault-backed owner identity without returning privileged or refresh credentials.");
    }

    var importMap = ReadRepositoryFile(BrokerImportMapRelativePath);
    check(
      importMap is not null &&
      importMap.Contains("npm:jose@6.1.0", StringComparison.Ordinal) &&
      importMap.Contains("npm:postgres@3.4.7", StringComparison.Ordinal),
      "The staging profile-write broker dependencies must remain exactly pinned.");

    var runner = ReadRepositoryFile(RunnerRelativePath);
    check(runner is not null, "The reversible staging organization profile write runner must remain present.");
    if (runner is not null)
    {
      check(
        runner.Contains("TryRestoreAsync", StringComparison.Ordinal) &&
        runner.Contains("original_profile_restored", StringComparison.Ordinal) &&
        runner.Contains("final_profile_verified", StringComparison.Ordinal),
        "The staging write runner must restore and re-read the original profile before passing.");
      check(
        runner.Contains("idempotency_conflict_passed", StringComparison.Ordinal) &&
        runner.Contains("version_conflict_passed", StringComparison.Ordinal) &&
        runner.Contains("cross_tenant_denial_passed", StringComparison.Ordinal) &&
        runner.Contains("exact_replay_passed", StringComparison.Ordinal),
        "The live write proof must cover replay, idempotency conflict, version conflict, and cross-tenant denial.");
    }
  }

  private static string? ReadRepositoryFile(string relativePath)
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
          return File.ReadAllText(candidate);
        }

        directory = directory.Parent;
      }
    }

    return null;
  }
}
