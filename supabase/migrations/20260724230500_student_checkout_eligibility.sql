begin;

-- Checkout must never trust a browser-provided student flag. This current-user
-- RPC exposes only the minimal eligibility result and never verification evidence.
create or replace function private.get_my_student_verification_status()
returns text
language plpgsql
stable
security definer
set search_path = pg_catalog, auth, billing
as $$
declare
  v_user_id uuid := auth.uid();
  v_status text;
  v_expires_at timestamptz;
begin
  if v_user_id is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;

  select verification.status, verification.expires_at
  into v_status, v_expires_at
  from billing.student_verifications verification
  where verification.user_id = v_user_id;

  if v_status is null then
    return 'not_submitted';
  end if;

  if v_status = 'verified'
     and (v_expires_at is null or v_expires_at > now()) then
    return 'verified';
  end if;

  if v_status = 'verified' and v_expires_at <= now() then
    return 'expired';
  end if;

  return v_status;
end;
$$;

create or replace function public.get_my_student_verification_status()
returns text
language sql
stable
security invoker
set search_path = pg_catalog, private
as $$
  select private.get_my_student_verification_status();
$$;

revoke all on function private.get_my_student_verification_status()
  from public, anon;
grant execute on function private.get_my_student_verification_status()
  to authenticated;
revoke all on function public.get_my_student_verification_status()
  from public, anon;
grant execute on function public.get_my_student_verification_status()
  to authenticated;

comment on function public.get_my_student_verification_status() is
  'Returns only the authenticated user student eligibility status; no evidence or provider metadata is exposed.';

commit;
