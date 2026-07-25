create table if not exists public.workspace_creation_requests (
  user_id uuid not null references auth.users(id) on delete cascade,
  request_id uuid not null,
  experience text not null check (
    experience in ('freelancer', 'small-business', 'retail-pos', 'enterprise')
  ),
  business_id uuid references public.businesses(id) on delete cascade,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  primary key (user_id, request_id),
  check (
    (business_id is null and completed_at is null)
    or (business_id is not null and completed_at is not null)
  )
);

create index if not exists workspace_creation_requests_business_idx
  on public.workspace_creation_requests (business_id)
  where business_id is not null;

alter table public.workspace_creation_requests enable row level security;

revoke all on public.workspace_creation_requests from public, anon, authenticated;
grant all on public.workspace_creation_requests to postgres, service_role;

create or replace function public.create_business_workspace_for_experience(
  p_name text,
  p_business_type text,
  p_experience text,
  p_creation_request_id uuid,
  p_country_code text default null,
  p_base_currency text default 'PKR',
  p_timezone text default 'UTC',
  p_session_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  current_user_id uuid := auth.uid();
  normalized_experience text := lower(btrim(coalesce(p_experience, '')));
  workspace_mode text;
  created_business_id uuid;
  existing_business_id uuid;
  existing_experience text;
  request_found boolean := false;
begin
  if current_user_id is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

  if p_creation_request_id is null then
    raise exception 'Creation request identifier required.' using errcode = '22023';
  end if;

  if normalized_experience not in (
    'freelancer',
    'small-business',
    'retail-pos',
    'enterprise'
  ) then
    raise exception 'Unsupported business experience.' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(current_user_id::text || ':' || p_creation_request_id::text, 0)
  );

  select request.business_id, request.experience
  into existing_business_id, existing_experience
  from public.workspace_creation_requests request
  where request.user_id = current_user_id
    and request.request_id = p_creation_request_id;
  request_found := found;

  if request_found and existing_experience <> normalized_experience then
    raise exception 'Creation request belongs to another experience.' using errcode = '22023';
  end if;

  if request_found and existing_business_id is not null then
    if not exists (
      select 1
      from public.businesses business
      where business.id = existing_business_id
        and business.owner_user_id = current_user_id
        and business.status = 'active'
    ) then
      raise exception 'Existing creation request is not accessible.' using errcode = '42501';
    end if;

    if p_session_id is not null then
      if not exists (
        select 1
        from public.workspace_onboarding_sessions session
        where session.id = p_session_id
          and session.user_id = current_user_id
          and session.experience = normalized_experience
          and session.workspace_kind = 'business'
          and (
            (
              session.business_id is null
              and session.status in ('not_started', 'in_progress')
            )
            or (
              session.business_id = existing_business_id
              and session.status = 'completed'
            )
          )
      ) then
        raise exception 'Active onboarding session not found.' using errcode = 'P0002';
      end if;

      perform public.apply_business_entry_experience(
        p_business_id => existing_business_id,
        p_experience => normalized_experience,
        p_session_id => p_session_id
      );

      if not exists (
        select 1
        from public.workspace_onboarding_sessions session
        where session.id = p_session_id
          and session.user_id = current_user_id
          and session.experience = normalized_experience
          and session.business_id = existing_business_id
          and session.status = 'completed'
      ) then
        raise exception 'Onboarding session completion could not be confirmed.'
          using errcode = 'P0002';
      end if;
    end if;

    return existing_business_id;
  end if;

  if request_found then
    delete from public.workspace_creation_requests request
    where request.user_id = current_user_id
      and request.request_id = p_creation_request_id;
  end if;

  if p_session_id is not null and not exists (
    select 1
    from public.workspace_onboarding_sessions session
    where session.id = p_session_id
      and session.user_id = current_user_id
      and session.experience = normalized_experience
      and session.workspace_kind = 'business'
      and session.business_id is null
      and session.status in ('not_started', 'in_progress')
  ) then
    raise exception 'Active onboarding session not found.' using errcode = 'P0002';
  end if;

  insert into public.workspace_creation_requests (
    user_id,
    request_id,
    experience
  )
  values (
    current_user_id,
    p_creation_request_id,
    normalized_experience
  );

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

  update public.workspace_creation_requests request
  set business_id = created_business_id,
      completed_at = now()
  where request.user_id = current_user_id
    and request.request_id = p_creation_request_id;

  return created_business_id;
end;
$$;

revoke execute on function public.create_business_workspace_for_experience(
  text,
  text,
  text,
  uuid,
  text,
  text,
  text,
  uuid
) from public, anon;

grant execute on function public.create_business_workspace_for_experience(
  text,
  text,
  text,
  uuid,
  text,
  text,
  text,
  uuid
) to authenticated, service_role;

create or replace function public.complete_personal_workspace_onboarding(
  p_session_id uuid
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.workspace_onboarding_sessions session
    where session.id = p_session_id
      and session.user_id = current_user_id
      and session.experience = 'personal'
      and session.workspace_kind = 'personal'
      and session.business_id is null
      and session.status in ('not_started', 'in_progress', 'completed')
  ) then
    raise exception 'Personal onboarding session not found.' using errcode = 'P0002';
  end if;

  perform public.update_workspace_onboarding_progress(
    p_session_id => p_session_id,
    p_current_step => 3::smallint,
    p_completed_steps => array[
      'identity_verified',
      'profile_ready',
      'personal_workspace_ready'
    ]::text[],
    p_draft_data => '{}'::jsonb,
    p_status => 'completed'
  );

  insert into public.business_workspace_preferences (
    user_id,
    default_workspace,
    active_business_id,
    onboarding_choice
  )
  values (
    current_user_id,
    'personal',
    null,
    'personal'
  )
  on conflict (user_id) do update
  set default_workspace = 'personal',
      onboarding_choice = 'personal',
      updated_at = now();
end;
$$;

revoke execute on function public.complete_personal_workspace_onboarding(uuid)
  from public, anon;
grant execute on function public.complete_personal_workspace_onboarding(uuid)
  to authenticated, service_role;

comment on table public.workspace_creation_requests is
  'Private idempotency ledger for atomic organization workspace creation requests.';
comment on function public.create_business_workspace_for_experience(
  text,
  text,
  text,
  uuid,
  text,
  text,
  text,
  uuid
) is
  'Idempotently creates an organization workspace and applies its experience defaults in one transaction. Any setup or session-confirmation failure rolls the entire creation back.';
comment on function public.complete_personal_workspace_onboarding(uuid) is
  'Atomically completes an authenticated user-owned Personal onboarding session and selects Personal Finance without clearing the remembered organization.';
