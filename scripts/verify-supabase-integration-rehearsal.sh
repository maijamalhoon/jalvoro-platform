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

exec > >(tee -a "$LOG_FILE") 2>&1

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

LATEST_EXPECTED_MIGRATION="20260727070000"
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
supabase db lint --local --schema public,private --level error --fail-on error

mapfile -d '' SQL_TESTS < <(
  find supabase/tests -maxdepth 1 -type f -name '*.sql' -print0 | sort -z
)

if (( ${#SQL_TESTS[@]} == 0 )); then
  echo "No Supabase SQL regression tests were found." >&2
  exit 1
fi

echo "Running ${#SQL_TESTS[@]} SQL regression files against the disposable database..."
for test_file in "${SQL_TESTS[@]}"; do
  echo "--- ${test_file}"
  psql "$LOCAL_DB_URL" -X -v ON_ERROR_STOP=1 -f "$test_file"
done

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

  if to_regprocedure('public.execute_business_pos_operation(text,text,uuid,jsonb,uuid)') is null then
    raise exception 'POS operations bridge RPC is missing.';
  end if;

  if to_regprocedure('public.execute_business_pos_sale(text,uuid,jsonb,uuid)') is null then
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
