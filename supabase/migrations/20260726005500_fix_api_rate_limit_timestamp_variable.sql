-- PostgreSQL resolves the unqualified identifier current_time as the SQL
-- CURRENT_TIME value (timetz), not the PL/pgSQL timestamptz variable. That
-- caused every protected AI POST request to fail before reaching the route.

create or replace function private.consume_api_rate_limit_impl(
  p_scope text,
  p_limit integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  current_user_id uuid := auth.uid();
  normalized_scope text := lower(btrim(coalesce(p_scope, '')));
  current_row private.api_rate_limits%rowtype;
  v_now timestamptz := clock_timestamp();
begin
  if current_user_id is null then
    return false;
  end if;
  if normalized_scope !~ '^[a-z0-9_:/.-]{1,120}$' then
    return false;
  end if;
  if p_limit is null or p_limit < 1 or p_limit > 1000 then
    return false;
  end if;
  if p_window_seconds is null or p_window_seconds < 1 or p_window_seconds > 86400 then
    return false;
  end if;

  select * into current_row
  from private.api_rate_limits
  where user_id = current_user_id and scope = normalized_scope
  for update;

  if not found then
    insert into private.api_rate_limits(
      user_id,
      scope,
      window_started_at,
      request_count,
      updated_at
    )
    values (current_user_id, normalized_scope, v_now, 1, v_now);
    return true;
  end if;

  if v_now >= current_row.window_started_at + make_interval(secs => p_window_seconds) then
    update private.api_rate_limits
      set window_started_at = v_now,
          request_count = 1,
          updated_at = v_now
      where user_id = current_user_id and scope = normalized_scope;
    return true;
  end if;

  if current_row.request_count >= p_limit then
    update private.api_rate_limits
      set updated_at = v_now
      where user_id = current_user_id and scope = normalized_scope;
    return false;
  end if;

  update private.api_rate_limits
    set request_count = request_count + 1,
        updated_at = v_now
    where user_id = current_user_id and scope = normalized_scope;
  return true;
end;
$$;

revoke execute on function private.consume_api_rate_limit_impl(text, integer, integer)
  from public, anon;
grant execute on function private.consume_api_rate_limit_impl(text, integer, integer)
  to authenticated, service_role;
