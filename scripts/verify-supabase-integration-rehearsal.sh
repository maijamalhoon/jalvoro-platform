#!/usr/bin/env bash
set -Eeuo pipefail

LOG_FILE="${REHEARSAL_LOG_FILE:-integration-rehearsal.log}"
GENERATED_CONFIG=0
LOCAL_DB_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres"

cleanup() {
  local exit_code=$?
  supabase stop --no-backup >/dev/null 2>&1 || true
  if [[ "$GENERATED_CONFIG" == "1" ]]; then
    rm -f supabase/config.toml
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
  supabase init
  GENERATED_CONFIG=1
fi

if [[ -f supabase/.temp/project-ref ]]; then
  echo "Supabase initialization unexpectedly created a remote project link." >&2
  exit 1
fi

echo "Starting disposable local Postgres and applying migrations..."
supabase db start
supabase db reset --local --no-seed

for _ in $(seq 1 30); do
  if pg_isready -d "$LOCAL_DB_URL" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done
pg_isready -d "$LOCAL_DB_URL"

LATEST_EXPECTED_MIGRATION="20260727071100"
MIGRATION_COUNT="$(psql "$LOCAL_DB_URL" -X -A -t -v ON_ERROR_STOP=1 -c \
  "select count(*) from supabase_migrations.schema_migrations;")"
LATEST_APPLIED_MIGRATION="$(psql "$LOCAL_DB_URL" -X -A -t -v ON_ERROR_STOP=1 -c \
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
supabase db lint --local --schema public,private --level error >"$LINT_OUTPUT_FILE"
LINT_COMMAND_STATUS=$?
set -e
cat "$LINT_OUTPUT_FILE"

python3 - "$LINT_OUTPUT_FILE" <<'PY'
from __future__ import annotations

import json
import sys
from pathlib import Path

raw = Path(sys.argv[1]).read_text(encoding="utf-8", errors="replace")
start = raw.find("[")
end = raw.rfind("]")
if start < 0 or end < start:
    if raw.strip():
        raise SystemExit("Supabase lint did not return a JSON issue list.")
    issues = []
else:
    issues = json.loads(raw[start : end + 1])

remaining = []
allowlisted_count = 0
for function_issue in issues:
    function_name = function_issue.get("function")
    blocked = []
    for issue in function_issue.get("issues", []):
        message = str(issue.get("message", ""))
        is_known_temp_table_check = (
            function_name == "private.import_finance_backup_internal"
            and issue.get("sqlState") == "42P01"
            and 'relation "pg_temp.finance_import_account_state" does not exist' in message
        )
        if is_known_temp_table_check:
            allowlisted_count += 1
        else:
            blocked.append(issue)
    if blocked:
        remaining.append({**function_issue, "issues": blocked})

if remaining:
    print("Non-allowlisted database lint errors remain:", file=sys.stderr)
    print(json.dumps(remaining, indent=2), file=sys.stderr)
    raise SystemExit(1)

print(
    "Database lint passed"
    + (f" with {allowlisted_count} documented temporary-table checker limitation(s)." if allowlisted_count else ".")
)
PY

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
psql "$LOCAL_DB_URL" -X -v ON_ERROR_STOP=1 <<'SQL'
alter default privileges for role authenticated
  grant select,insert,update,delete on tables to service_role;
SQL

echo "Running ${#SQL_TESTS[@]} SQL regression files against the disposable database..."
for test_file in "${SQL_TESTS[@]}"; do
  echo "--- ${test_file}"
  psql "$LOCAL_DB_URL" -X -v ON_ERROR_STOP=1 -f "$test_file"
done

psql "$LOCAL_DB_URL" -X -v ON_ERROR_STOP=1 <<'SQL'
alter default privileges for role authenticated
  revoke select,insert,update,delete on tables from service_role;
SQL

echo "Running post-rehearsal schema integrity probes..."
psql "$LOCAL_DB_URL" -X -v ON_ERROR_STOP=1 <<'SQL'
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
end
$$;
SQL

echo "Supabase integration rehearsal passed."
