internal static class OrganizationProfileMigrationContracts
{
  private const string MigrationRelativePath =
    "supabase/migrations/20260725060000_create_idempotent_business_profile_command.sql";
  private const string ReplayAuthorizationHardeningMigrationRelativePath =
    "supabase/migrations/20260725072000_harden_business_profile_replay_authorization.sql";

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
      migration.Contains(
        "command_operation_name constant text := 'organization.profile.update.v1'",
        StringComparison.Ordinal) &&
      migration.Contains("stored.operation_name = command_operation_name", StringComparison.Ordinal) &&
      !migration.Contains("operation_name = operation_name", StringComparison.Ordinal),
      "Idempotency queries must use an unambiguous scoped operation name and qualified table aliases.");
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

    var hardeningMigrationPath = FindRepositoryFile(ReplayAuthorizationHardeningMigrationRelativePath);
    check(
      hardeningMigrationPath is not null,
      "The direct-RPC replay authorization hardening migration must remain present.");
    if (hardeningMigrationPath is null)
    {
      return;
    }

    var hardeningMigration = File.ReadAllText(hardeningMigrationPath);
    var businessLockIndex = hardeningMigration.IndexOf("for update;", StringComparison.Ordinal);
    var membershipLockIndex = hardeningMigration.IndexOf("for key share;", StringComparison.Ordinal);
    var replayStoreIndex = hardeningMigration.IndexOf(
      "delete from private.business_command_idempotency as stored",
      StringComparison.Ordinal);

    check(
      businessLockIndex >= 0 &&
      membershipLockIndex > businessLockIndex &&
      replayStoreIndex > membershipLockIndex,
      "The SECURITY DEFINER RPC must lock and authorize the exact active owner before reading or deleting replay state.");
    check(
      hardeningMigration.Contains("'actorUserId', current_user_id", StringComparison.Ordinal) &&
      hardeningMigration.Contains("stored.actor_user_id", StringComparison.Ordinal) &&
      hardeningMigration.Contains("existing_actor_user_id <> current_user_id", StringComparison.Ordinal),
      "Idempotency fingerprints and stored replay responses must remain bound to the authenticated actor.");
    check(
      hardeningMigration.Contains("current_business.owner_user_id <> current_user_id", StringComparison.Ordinal) &&
      hardeningMigration.Contains("authorized_member_user_id <> current_user_id", StringComparison.Ordinal),
      "Direct RPC execution must fail closed unless both ownership and active owner membership are current.");
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
