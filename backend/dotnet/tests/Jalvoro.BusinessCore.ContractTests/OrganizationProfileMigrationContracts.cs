internal static class OrganizationProfileMigrationContracts
{
  private const string MigrationRelativePath =
    "supabase/migrations/20260725060000_create_idempotent_business_profile_command.sql";

  public static void Run(Action<bool, string> check)
  {
    ArgumentNullException.ThrowIfNull(check);

    var migrationPath = FindRepositoryFile(MigrationRelativePath);
    check(migrationPath is not null, "The idempotent organization profile migration must remain present.");
    if (migrationPath is null)
    {
      return;
    }

    var migration = File.ReadAllText(migrationPath);
    check(
      migration.Contains("profile_version bigint not null default 1", StringComparison.Ordinal) &&
      migration.Contains("new.profile_version = old.profile_version", StringComparison.Ordinal),
      "Organization profile concurrency must cover both the new command and preserved legacy updates.");
    check(
      migration.Contains("pg_advisory_xact_lock", StringComparison.Ordinal) &&
      migration.Contains("business_command_idempotency", StringComparison.Ordinal) &&
      migration.Contains("idempotency_conflict", StringComparison.Ordinal),
      "Duplicate organization profile commands must serialize and reject key reuse with another payload.");
    check(
      migration.Contains("profile_version <> p_expected_version", StringComparison.Ordinal) &&
      migration.Contains("version_conflict", StringComparison.Ordinal),
      "The database command must enforce optimistic concurrency before mutation.");
    check(
      migration.Contains("business_profile_command_audit", StringComparison.Ordinal) &&
      migration.Contains("previous_profile", StringComparison.Ordinal) &&
      migration.Contains("next_profile", StringComparison.Ordinal),
      "Every successful organization profile command must append private before/after audit evidence.");
    check(
      migration.Contains("security definer", StringComparison.OrdinalIgnoreCase) &&
      migration.Contains("current_user_id uuid := auth.uid()", StringComparison.Ordinal) &&
      migration.Contains("membership.role = 'owner'", StringComparison.Ordinal) &&
      migration.Contains("membership.status = 'active'", StringComparison.Ordinal),
      "The privileged RPC must bind authorization to the authenticated active owner inside the function body.");
    check(
      migration.Contains("grant execute on function public.update_business_profile_v1", StringComparison.Ordinal) &&
      migration.Contains(") to authenticated;", StringComparison.Ordinal) &&
      migration.Contains("from public, anon, service_role", StringComparison.Ordinal),
      "Only authenticated user sessions may execute the first Business Core write RPC.");
    check(
      migration.Contains("business_command_idempotency_deny_exposed_roles", StringComparison.Ordinal) &&
      migration.Contains("business_profile_command_audit_deny_exposed_roles", StringComparison.Ordinal) &&
      migration.Contains("using (false)", StringComparison.Ordinal) &&
      migration.Contains("with check (false)", StringComparison.Ordinal),
      "Private idempotency and audit records must remain denied to exposed Data API roles.");
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
