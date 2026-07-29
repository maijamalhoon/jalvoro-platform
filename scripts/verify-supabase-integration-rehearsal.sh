#!/usr/bin/env bash
set -Eeuo pipefail

LOG_FILE="${REHEARSAL_LOG_FILE:-integration-rehearsal.log}"
GENERATED_CONFIG=0
INIT_ROOT=""
REHEARSAL_DB_PORT="${REHEARSAL_DB_PORT:-55322}"
LOCAL_DB_URL="postgresql://postgres:postgres@127.0.0.1:${REHEARSAL_DB_PORT}/postgres"

if command -v supabase >/dev/null 2>&1; then
  SUPABASE_CLI=(supabase)
elif [[ -f node_modules/supabase/dist/supabase.js ]]; then
  SUPABASE_CLI=(node node_modules/supabase/dist/supabase.js)
else
  echo "Supabase CLI is required. Install project dependencies before running this rehearsal." >&2
  exit 1
fi

cleanup() {
  local exit_code=$?
  "${SUPABASE_CLI[@]}" stop --no-backup >/dev/null 2>&1 || true
  if [[ "$GENERATED_CONFIG" == "1" ]]; then
    rm -f supabase/config.toml
  fi
  if [[ -n "$INIT_ROOT" && -d "$INIT_ROOT" ]]; then
    rm -rf "$INIT_ROOT"
  fi
  rm -rf supabase/.temp
  exit "$exit_code"
}
trap cleanup EXIT

# CI wraps this script with a synchronous tee. Using /dev/null disables the
# nested process-substitution logger while preserving local log-file behavior.
if [[ "$LOG_FILE" != "/dev/null" ]]; then
  exec > >(tee -a "$LOG_FILE") 2>&1
fi

echo "== Jalvoro Supabase integration rehearsal =="
echo "This gate is local-only. Remote Supabase operations are forbidden."

unset SUPABASE_ACCESS_TOKEN
unset SUPABASE_DB_PASSWORD
unset SUPABASE_PROJECT_ID
unset SUPABASE_PROJECT_REF
unset PROJECT_ID

if [[ -f supabase/.temp/project-ref ]]; then
  echo "Refusing to run with a linked Supabase project." >&2
  exit 1
fi

if [[ ! -f supabase/config.toml ]]; then
  INIT_ROOT="$(mktemp -d)"
  "${SUPABASE_CLI[@]}" init --workdir "$INIT_ROOT"
  cp "$INIT_ROOT/supabase/config.toml" supabase/config.toml
  REHEARSAL_SHADOW_PORT="$((REHEARSAL_DB_PORT - 2))"
  sed -i -E \
    -e '0,/^project_id = ".*"$/s//project_id = "jalvoro-integration-rehearsal"/' \
    -e "0,/^port = 54322$/s//port = ${REHEARSAL_DB_PORT}/" \
    -e "0,/^shadow_port = 54320$/s//shadow_port = ${REHEARSAL_SHADOW_PORT}/" \
    supabase/config.toml
  rm -rf "$INIT_ROOT"
  INIT_ROOT=""
  GENERATED_CONFIG=1
fi

if [[ -f supabase/.temp/project-ref ]]; then
  echo "Supabase initialization unexpectedly created a remote project link." >&2
  exit 1
fi

echo "Starting disposable local Postgres and applying migrations..."
"${SUPABASE_CLI[@]}" db start
if [[ "$GENERATED_CONFIG" != "1" ]]; then
  "${SUPABASE_CLI[@]}" db reset --local --no-seed
fi

if command -v psql >/dev/null 2>&1 && command -v pg_isready >/dev/null 2>&1; then
  psql_local() {
    psql "$LOCAL_DB_URL" "$@"
  }
  pg_isready_local() {
    pg_isready -d "$LOCAL_DB_URL"
  }
else
  DB_CONTAINER="$(docker ps --filter "publish=${REHEARSAL_DB_PORT}" --format '{{.Names}}' | head -n 1)"
  if [[ -z "$DB_CONTAINER" ]]; then
    echo "Local Supabase database container was not found on port ${REHEARSAL_DB_PORT}." >&2
    exit 1
  fi
  psql_local() {
    docker exec -i "$DB_CONTAINER" psql -U postgres -d postgres "$@"
  }
  pg_isready_local() {
    docker exec "$DB_CONTAINER" pg_isready -U postgres -d postgres
  }
fi

for _ in $(seq 1 30); do
  if pg_isready_local >/dev/null 2>&1; then
    break
  fi
  sleep 1
done
pg_isready_local

LATEST_EXPECTED_MIGRATION="20260728123100"
MIGRATION_COUNT="$(psql_local -X -A -t -v ON_ERROR_STOP=1 -c \
  "select count(*) from supabase_migrations.schema_migrations;")"
LATEST_APPLIED_MIGRATION="$(psql_local -X -A -t -v ON_ERROR_STOP=1 -c \
  "select max(version) from supabase_migrations.schema_migrations;")"

echo "Applied migration count: ${MIGRATION_COUNT}"
echo "Latest applied migration: ${LATEST_APPLIED_MIGRATION}"

if [[ "$LATEST_APPLIED_MIGRATION" != "$LATEST_EXPECTED_MIGRATION" ]]; then
  echo "Expected latest migration ${LATEST_EXPECTED_MIGRATION}, got ${LATEST_APPLIED_MIGRATION}." >&2
  exit 1
fi

echo "Linting public and private database functions for runtime errors..."
LINT_OUTPUT_FILE="$(mktemp)"
set +e
"${SUPABASE_CLI[@]}" db lint --local --schema public,private --level error >"$LINT_OUTPUT_FILE"
LINT_COMMAND_STATUS=$?
set -e
cat "$LINT_OUTPUT_FILE"

node - "$LINT_OUTPUT_FILE" <<'JS'
const fs = require("node:fs");

const raw = fs.readFileSync(process.argv[2], "utf8");
const start = raw.indexOf("[");
const end = raw.lastIndexOf("]");
let issues = [];
if (start < 0 || end < start) {
  if (raw.trim()) {
    throw new Error("Supabase lint did not return a JSON issue list.");
  }
} else {
  issues = JSON.parse(raw.slice(start, end + 1));
}

const remaining = [];
let allowlistedCount = 0;
for (const functionIssue of issues) {
  const functionName = functionIssue.function;
  const blocked = [];
  for (const issue of functionIssue.issues ?? []) {
    const message = String(issue.message ?? "");
    const isKnownTempTableCheck =
      functionName === "private.import_finance_backup_internal" &&
      issue.sqlState === "42P01" &&
      message.includes(
        'relation "pg_temp.finance_import_account_state" does not exist',
      );
    if (isKnownTempTableCheck) {
      allowlistedCount += 1;
    } else {
      blocked.push(issue);
    }
  }
  if (blocked.length > 0) {
    remaining.push({ ...functionIssue, issues: blocked });
  }
}

if (remaining.length > 0) {
  process.stderr.write(
    `Non-allowlisted database lint errors remain:\n${JSON.stringify(remaining, null, 2)}\n`,
  );
  process.exit(1);
}

process.stdout.write(
  "Database lint passed" +
    (allowlistedCount
      ? ` with ${allowlistedCount} documented temporary-table checker limitation(s).\n`
      : ".\n"),
);
JS

if [[ "$LINT_COMMAND_STATUS" -ne 0 ]]; then
  echo "Supabase lint command failed independently of classified lint findings." >&2
  exit "$LINT_COMMAND_STATUS"
fi
rm -f "$LINT_OUTPUT_FILE"

mapfile -d '' SQL_TESTS < <(
  find supabase/tests -maxdepth 1 -type f -name '*.sql' -print0 | sort -z
)

if (( ${#SQL_TESTS[@]} == 0 )); then
  echo "No Supabase SQL regression tests were found." >&2
  exit 1
fi

# Several rollback-only regression fixtures create temporary state tables as
# the authenticated role, then switch to service_role solely to seed private
# role templates. These default privileges exist only inside this disposable
# database and never become migration or hosted-project grants.
psql_local -X -v ON_ERROR_STOP=1 <<'SQL'
alter default privileges for role authenticated
  grant select,insert,update,delete on tables to service_role;
SQL

echo "Running ${#SQL_TESTS[@]} SQL regression files against the disposable database..."
for test_file in "${SQL_TESTS[@]}"; do
  echo "--- ${test_file}"
  psql_local -X -v ON_ERROR_STOP=1 < "$test_file"
done

psql_local -X -v ON_ERROR_STOP=1 <<'SQL'
alter default privileges for role authenticated
  revoke select,insert,update,delete on tables from service_role;
SQL

echo "Running post-rehearsal schema integrity probes..."
psql_local -X -v ON_ERROR_STOP=1 <<'SQL'
do $$
begin
  if exists(
    select 1
    from pg_index
    where not indisvalid or not indisready
  ) then
    raise exception 'Invalid or unready indexes remain after migration replay.';
  end if;

  if to_regprocedure('public.post_business_pos_operation(text,text,jsonb,uuid,uuid)') is null then
    raise exception 'POS operations bridge RPC is missing.';
  end if;

  if to_regprocedure('public.post_business_pos_sale(text,date,uuid,jsonb,boolean,text,uuid,uuid)') is null then
    raise exception 'POS sale bridge RPC is missing.';
  end if;

  if to_regprocedure('public.get_my_account_realm()') is null then
    raise exception 'Immutable account realm RPC is missing.';
  end if;

  if to_regprocedure('public.get_business_pos_security_snapshot(uuid)') is null then
    raise exception 'POS security snapshot RPC is missing.';
  end if;

  if exists(
    select 1
    from pg_class relation
    join pg_namespace namespace on namespace.oid=relation.relnamespace
    where namespace.nspname='public'
      and relation.relkind in ('r','p','v','m')
      and not has_table_privilege('service_role',relation.oid,'select')
  ) then
    raise exception 'Service role is missing SELECT on one or more public relations.';
  end if;

  if exists(
    select 1
    from pg_class relation
    join pg_namespace namespace on namespace.oid=relation.relnamespace
    where namespace.nspname='public'
      and relation.relkind in ('r','p')
      and (
        not has_table_privilege('service_role',relation.oid,'insert')
        or not has_table_privilege('service_role',relation.oid,'update')
        or not has_table_privilege('service_role',relation.oid,'delete')
      )
  ) then
    raise exception 'Service role is missing CRUD on one or more public tables.';
  end if;
end
$$;
SQL

echo "Supabase integration rehearsal passed."
