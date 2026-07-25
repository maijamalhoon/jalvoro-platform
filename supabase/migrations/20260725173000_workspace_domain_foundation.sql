alter table public.businesses
  add column if not exists entry_experience text;

do $$
begin
  if not exists (
    select 1
    from pg_catalog.pg_constraint
    where conname = 'businesses_entry_experience_check'
      and conrelid = 'public.businesses'::regclass
  ) then
    alter table public.businesses
      add constraint businesses_entry_experience_check
      check (
        entry_experience is null
        or entry_experience in (
          'freelancer',
          'small-business',
          'retail-pos',
          'enterprise'
        )
      );
  end if;
end
$$;

create table if not exists public.workspace_onboarding_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  experience text not null,
  workspace_kind text not null,
  business_id uuid references public.businesses(id) on delete cascade,
  status text not null default 'not_started',
  current_step smallint not null default 1,
  completed_steps text[] not null default '{}'::text[],
  draft_data jsonb not null default '{}'::jsonb,
  next_path text,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workspace_onboarding_sessions_experience_check
    check (
      experience in (
        'personal',
        'freelancer',
        'small-business',
        'retail-pos',
        'enterprise'
      )
    ),
  constraint workspace_onboarding_sessions_kind_check
    check (workspace_kind in ('personal', 'business')),
  constraint workspace_onboarding_sessions_kind_experience_check
    check (
      (experience = 'personal' and workspace_kind = 'personal' and business_id is null)
      or (experience <> 'personal' and workspace_kind = 'business')
    ),
  constraint workspace_onboarding_sessions_status_check
    check (status in ('not_started', 'in_progress', 'completed', 'abandoned')),
  constraint workspace_onboarding_sessions_step_check
    check (current_step between 1 and 100),
  constraint workspace_onboarding_sessions_steps_check
    check (array_position(completed_steps, null) is null),
  constraint workspace_onboarding_sessions_draft_check
    check (jsonb_typeof(draft_data) = 'object'),
  constraint workspace_onboarding_sessions_next_path_check
    check (
      next_path is null
      or (
        char_length(next_path) between 1 and 500
        and next_path like '/%'
        and next_path not like '//%'
      )
    ),
  constraint workspace_onboarding_sessions_completion_check
    check (
      (status = 'completed' and completed_at is not null)
      or status <> 'completed'
    )
);

create unique index if not exists workspace_onboarding_sessions_one_active_entry_idx
  on public.workspace_onboarding_sessions(user_id, experience)
  where business_id is null
    and status in ('not_started', 'in_progress');

create index if not exists workspace_onboarding_sessions_user_status_idx
  on public.workspace_onboarding_sessions(user_id, status, updated_at desc);

create index if not exists workspace_onboarding_sessions_business_idx
  on public.workspace_onboarding_sessions(business_id)
  where business_id is not null;

create table if not exists public.business_module_entitlements (
  business_id uuid not null references public.businesses(id) on delete cascade,
  module_key text not null,
  status text not null default 'active',
  source text not null default 'legacy_config',
  configuration jsonb not null default '{}'::jsonb,
  granted_at timestamptz not null default now(),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (business_id, module_key),
  constraint business_module_entitlements_module_check
    check (
      module_key in (
        'accounting',
        'contacts',
        'sales',
        'purchases',
        'inventory',
        'crm',
        'reports',
        'pos',
        'team',
        'payroll',
        'budgeting',
        'banking',
        'fixed_assets',
        'fx',
        'branches',
        'approvals',
        'documents',
        'projects',
        'tax',
        'notifications',
        'ecommerce'
      )
    ),
  constraint business_module_entitlements_status_check
    check (status in ('active', 'trial', 'suspended', 'expired')),
  constraint business_module_entitlements_source_check
    check (
      source in (
        'legacy_config',
        'experience_default',
        'plan',
        'upgrade',
        'admin'
      )
    ),
  constraint business_module_entitlements_configuration_check
    check (jsonb_typeof(configuration) = 'object'),
  constraint business_module_entitlements_expiry_check
    check (expires_at is null or expires_at > granted_at)
);

create index if not exists business_module_entitlements_active_idx
  on public.business_module_entitlements(business_id, module_key)
  where status in ('active', 'trial');

drop trigger if exists workspace_onboarding_sessions_set_updated_at
  on public.workspace_onboarding_sessions;
create trigger workspace_onboarding_sessions_set_updated_at
before update on public.workspace_onboarding_sessions
for each row execute function private.set_business_workspace_updated_at();

drop trigger if exists business_module_entitlements_set_updated_at
  on public.business_module_entitlements;
create trigger business_module_entitlements_set_updated_at
before update on public.business_module_entitlements
for each row execute function private.set_business_workspace_updated_at();

alter table public.workspace_onboarding_sessions enable row level security;
alter table public.business_module_entitlements enable row level security;

revoke all privileges on table
  public.workspace_onboarding_sessions,
  public.business_module_entitlements
from anon, authenticated;

grant select, insert, update, delete on table
  public.workspace_onboarding_sessions
  to authenticated;

grant select on table public.business_module_entitlements
  to authenticated;

grant select, insert, update, delete on table
  public.workspace_onboarding_sessions,
  public.business_module_entitlements
  to service_role;

drop policy if exists workspace_onboarding_sessions_select_own
  on public.workspace_onboarding_sessions;
create policy workspace_onboarding_sessions_select_own
on public.workspace_onboarding_sessions
for select
to authenticated
using (user_id = (select auth.uid()));

drop policy if exists workspace_onboarding_sessions_insert_own
  on public.workspace_onboarding_sessions;
create policy workspace_onboarding_sessions_insert_own
on public.workspace_onboarding_sessions
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and (
    business_id is null
    or exists (
      select 1
      from public.business_members membership
      where membership.business_id = workspace_onboarding_sessions.business_id
        and membership.user_id = (select auth.uid())
        and membership.status = 'active'
    )
  )
);

drop policy if exists workspace_onboarding_sessions_update_own
  on public.workspace_onboarding_sessions;
create policy workspace_onboarding_sessions_update_own
on public.workspace_onboarding_sessions
for update
to authenticated
using (user_id = (select auth.uid()))
with check (
  user_id = (select auth.uid())
  and (
    business_id is null
    or exists (
      select 1
      from public.business_members membership
      where membership.business_id = workspace_onboarding_sessions.business_id
        and membership.user_id = (select auth.uid())
        and membership.status = 'active'
    )
  )
);

drop policy if exists workspace_onboarding_sessions_delete_own
  on public.workspace_onboarding_sessions;
create policy workspace_onboarding_sessions_delete_own
on public.workspace_onboarding_sessions
for delete
to authenticated
using (user_id = (select auth.uid()));

drop policy if exists business_module_entitlements_select_member
  on public.business_module_entitlements;
create policy business_module_entitlements_select_member
on public.business_module_entitlements
for select
to authenticated
using (
  exists (
    select 1
    from public.businesses business
    where business.id = business_module_entitlements.business_id
      and business.owner_user_id = (select auth.uid())
  )
  or exists (
    select 1
    from public.business_members membership
    where membership.business_id = business_module_entitlements.business_id
      and membership.user_id = (select auth.uid())
      and membership.status = 'active'
  )
);

insert into public.business_module_entitlements (
  business_id,
  module_key,
  status,
  source
)
select
  business.id,
  module.key,
  'active',
  'legacy_config'
from public.businesses business
cross join lateral jsonb_each(coalesce(business.module_config, '{}'::jsonb)) module
where module.value = 'true'::jsonb
  and module.key in (
    'accounting',
    'contacts',
    'sales',
    'purchases',
    'inventory',
    'crm',
    'reports',
    'pos',
    'team',
    'payroll',
    'budgeting',
    'banking',
    'fixed_assets',
    'fx',
    'branches',
    'approvals',
    'documents',
    'projects',
    'tax',
    'notifications',
    'ecommerce'
  )
on conflict (business_id, module_key) do nothing;

insert into public.business_module_entitlements (
  business_id,
  module_key,
  status,
  source
)
select business.id, 'pos', 'active', 'legacy_config'
from public.businesses business
where business.workspace_mode = 'simple_shop'
on conflict (business_id, module_key) do nothing;

insert into public.business_module_entitlements (
  business_id,
  module_key,
  status,
  source
)
select business.id, 'team', 'active', 'legacy_config'
from public.businesses business
on conflict (business_id, module_key) do nothing;

create or replace function public.begin_workspace_onboarding(
  p_experience text,
  p_next_path text default null
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  current_user_id uuid := auth.uid();
  normalized_experience text := lower(btrim(coalesce(p_experience, '')));
  selected_kind text;
  normalized_next text;
  session_id uuid;
begin
  if current_user_id is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

  if normalized_experience not in (
    'personal',
    'freelancer',
    'small-business',
    'retail-pos',
    'enterprise'
  ) then
    raise exception 'Unsupported workspace experience.' using errcode = '22023';
  end if;

  selected_kind := case
    when normalized_experience = 'personal' then 'personal'
    else 'business'
  end;

  normalized_next := case
    when p_next_path like '/%'
      and p_next_path not like '//%'
      then left(p_next_path, 500)
    else null
  end;

  select onboarding.id
  into session_id
  from public.workspace_onboarding_sessions onboarding
  where onboarding.user_id = current_user_id
    and onboarding.experience = normalized_experience
    and onboarding.business_id is null
    and onboarding.status in ('not_started', 'in_progress')
  order by onboarding.updated_at desc
  limit 1
  for update;

  if session_id is not null then
    update public.workspace_onboarding_sessions
    set status = 'in_progress',
        next_path = coalesce(normalized_next, next_path),
        updated_at = now()
    where id = session_id;

    return session_id;
  end if;

  insert into public.workspace_onboarding_sessions (
    user_id,
    experience,
    workspace_kind,
    status,
    current_step,
    next_path
  )
  values (
    current_user_id,
    normalized_experience,
    selected_kind,
    'in_progress',
    1,
    normalized_next
  )
  returning id into session_id;

  return session_id;
exception
  when unique_violation then
    select onboarding.id
    into session_id
    from public.workspace_onboarding_sessions onboarding
    where onboarding.user_id = current_user_id
      and onboarding.experience = normalized_experience
      and onboarding.business_id is null
      and onboarding.status in ('not_started', 'in_progress')
    order by onboarding.updated_at desc
    limit 1;

    return session_id;
end;
$$;

revoke execute on function public.begin_workspace_onboarding(text, text)
  from public, anon;
grant execute on function public.begin_workspace_onboarding(text, text)
  to authenticated, service_role;

create or replace function public.update_workspace_onboarding_progress(
  p_session_id uuid,
  p_current_step smallint,
  p_completed_steps text[] default null,
  p_draft_data jsonb default null,
  p_status text default 'in_progress'
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  current_user_id uuid := auth.uid();
  normalized_status text := lower(btrim(coalesce(p_status, 'in_progress')));
begin
  if current_user_id is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

  if p_current_step < 1 or p_current_step > 100 then
    raise exception 'Unsupported onboarding step.' using errcode = '22023';
  end if;

  if normalized_status not in ('not_started', 'in_progress', 'completed', 'abandoned') then
    raise exception 'Unsupported onboarding status.' using errcode = '22023';
  end if;

  if p_draft_data is not null and jsonb_typeof(p_draft_data) <> 'object' then
    raise exception 'Onboarding draft data must be an object.' using errcode = '22023';
  end if;

  update public.workspace_onboarding_sessions
  set current_step = p_current_step,
      completed_steps = coalesce(p_completed_steps, completed_steps),
      draft_data = coalesce(p_draft_data, draft_data),
      status = normalized_status,
      completed_at = case
        when normalized_status = 'completed' then coalesce(completed_at, now())
        else null
      end,
      updated_at = now()
  where id = p_session_id
    and user_id = current_user_id;

  if not found then
    raise exception 'Onboarding session not found.' using errcode = 'P0002';
  end if;
end;
$$;

revoke execute on function public.update_workspace_onboarding_progress(
  uuid,
  smallint,
  text[],
  jsonb,
  text
) from public, anon;
grant execute on function public.update_workspace_onboarding_progress(
  uuid,
  smallint,
  text[],
  jsonb,
  text
) to authenticated, service_role;

create or replace function public.apply_business_entry_experience(
  p_business_id uuid,
  p_experience text,
  p_session_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  current_user_id uuid := auth.uid();
  normalized_experience text := lower(btrim(coalesce(p_experience, '')));
  default_modules text[];
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

  if not exists (
    select 1
    from public.businesses business
    where business.id = p_business_id
      and (
        business.owner_user_id = current_user_id
        or exists (
          select 1
          from public.business_members membership
          where membership.business_id = business.id
            and membership.user_id = current_user_id
            and membership.status = 'active'
            and membership.role in ('owner', 'admin')
        )
      )
  ) then
    raise exception 'Workspace administration permission required.' using errcode = '42501';
  end if;

  default_modules := case normalized_experience
    when 'freelancer' then array[
      'accounting', 'contacts', 'sales', 'crm', 'reports', 'projects', 'team'
    ]::text[]
    when 'small-business' then array[
      'accounting', 'contacts', 'sales', 'purchases', 'inventory', 'crm', 'reports', 'team'
    ]::text[]
    when 'retail-pos' then array[
      'pos', 'inventory', 'sales', 'purchases', 'accounting', 'reports', 'team'
    ]::text[]
    else array[
      'accounting', 'contacts', 'sales', 'purchases', 'inventory', 'crm',
      'reports', 'team', 'payroll', 'budgeting', 'banking', 'fixed_assets',
      'fx', 'branches', 'approvals', 'documents', 'projects', 'tax',
      'notifications'
    ]::text[]
  end;

  update public.businesses
  set entry_experience = normalized_experience,
      updated_at = now()
  where id = p_business_id;

  insert into public.business_module_entitlements (
    business_id,
    module_key,
    status,
    source
  )
  select
    p_business_id,
    module_key,
    'active',
    'experience_default'
  from unnest(default_modules) module_key
  on conflict (business_id, module_key) do update
  set status = 'active',
      source = 'experience_default',
      updated_at = now();

  if p_session_id is not null then
    update public.workspace_onboarding_sessions
    set business_id = p_business_id,
        status = 'completed',
        current_step = greatest(current_step, 2),
        completed_steps = array(
          select distinct completed_step
          from unnest(completed_steps || array['workspace_created']) completed_step
        ),
        completed_at = coalesce(completed_at, now()),
        updated_at = now()
    where id = p_session_id
      and user_id = current_user_id
      and experience = normalized_experience;
  end if;

  insert into public.business_workspace_preferences (
    user_id,
    default_workspace,
    active_business_id,
    onboarding_choice
  )
  values (
    current_user_id,
    'business',
    p_business_id,
    'business'
  )
  on conflict (user_id) do update
  set default_workspace = 'business',
      active_business_id = excluded.active_business_id,
      onboarding_choice = case
        when public.business_workspace_preferences.onboarding_choice = 'undecided'
          then 'business'
        else public.business_workspace_preferences.onboarding_choice
      end,
      updated_at = now();
end;
$$;

revoke execute on function public.apply_business_entry_experience(uuid, text, uuid)
  from public, anon;
grant execute on function public.apply_business_entry_experience(uuid, text, uuid)
  to authenticated, service_role;

comment on column public.businesses.entry_experience is
  'The product experience that initially configured this organization workspace. It is context, not authorization.';
comment on table public.workspace_onboarding_sessions is
  'Resumable, user-owned onboarding progress for Personal and organization workspace entry flows.';
comment on table public.business_module_entitlements is
  'Normalized module availability for a business workspace. Legacy module_config remains during gradual migration.';
comment on function public.begin_workspace_onboarding(text, text) is
  'Starts or resumes one active pre-workspace onboarding session for the authenticated identity.';
comment on function public.update_workspace_onboarding_progress(uuid, smallint, text[], jsonb, text) is
  'Updates resumable onboarding progress owned by the authenticated identity.';
comment on function public.apply_business_entry_experience(uuid, text, uuid) is
  'Applies experience defaults to an administered business workspace and completes its onboarding session.';
