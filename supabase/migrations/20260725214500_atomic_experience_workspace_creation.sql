create or replace function public.create_business_workspace_for_experience(
  p_name text,
  p_business_type text,
  p_experience text,
  p_country_code text default null,
  p_base_currency text default 'PKR',
  p_timezone text default 'UTC',
  p_session_id uuid default null
)
returns uuid
language plpgsql
security invoker
set search_path = pg_catalog, public, private
as $$
declare
  current_user_id uuid := auth.uid();
  normalized_experience text := lower(btrim(coalesce(p_experience, '')));
  workspace_mode text;
  created_business_id uuid;
begin
  if current_user_id is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

  if normalized_experience not in (
    'freelancer',
    'small-business',
    'retail-pos',
    'enterprise'
  ) then
    raise exception 'Unsupported business experience.' using errcode = '22023';
  end if;

  workspace_mode := case
    when normalized_experience = 'retail-pos' then 'simple_shop'
    else 'advanced_company'
  end;

  created_business_id := public.create_business_workspace_with_mode(
    p_name => p_name,
    p_business_type => p_business_type,
    p_workspace_mode => workspace_mode,
    p_country_code => p_country_code,
    p_base_currency => p_base_currency,
    p_timezone => p_timezone
  );

  perform public.apply_business_entry_experience(
    p_business_id => created_business_id,
    p_experience => normalized_experience,
    p_session_id => p_session_id
  );

  if p_session_id is not null and not exists (
    select 1
    from public.workspace_onboarding_sessions session
    where session.id = p_session_id
      and session.user_id = current_user_id
      and session.experience = normalized_experience
      and session.business_id = created_business_id
      and session.status = 'completed'
  ) then
    raise exception 'Onboarding session completion could not be confirmed.'
      using errcode = 'P0002';
  end if;

  return created_business_id;
end;
$$;

revoke execute on function public.create_business_workspace_for_experience(
  text,
  text,
  text,
  text,
  text,
  text,
  uuid
) from public, anon;

grant execute on function public.create_business_workspace_for_experience(
  text,
  text,
  text,
  text,
  text,
  text,
  uuid
) to authenticated, service_role;

comment on function public.create_business_workspace_for_experience(
  text,
  text,
  text,
  text,
  text,
  text,
  uuid
) is
  'Creates an organization workspace and applies its experience defaults in one transaction. Any setup or session-confirmation failure rolls the entire creation back.';
