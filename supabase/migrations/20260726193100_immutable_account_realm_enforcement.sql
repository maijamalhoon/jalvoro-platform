-- Enforce the immutable account realm across direct data access, writes,
-- Business invitations, and all currently installed tenant tables.

create or replace function private.enforce_record_account_realm()
returns trigger
language plpgsql
security definer
set search_path='pg_catalog','private','auth'
as $$
declare
  required_realm text := lower(btrim(coalesce(tg_argv[0],'')));
  user_column text := btrim(coalesce(tg_argv[1],''));
  record_data jsonb;
  target_user_id uuid;
begin
  if auth.uid() is null then
    return case when tg_op = 'DELETE' then old else new end;
  end if;

  if required_realm not in ('individual','business') then
    raise exception 'Invalid trigger realm configuration.' using errcode='22023';
  end if;

  if user_column = '' then
    raise exception 'Invalid trigger identity column.' using errcode='22023';
  end if;

  record_data := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  target_user_id := nullif(record_data ->> user_column, '')::uuid;

  if target_user_id is null then
    raise exception 'Account identity is required.' using errcode='23502';
  end if;

  if not private.account_realm_allows(target_user_id, required_realm) then
    raise exception 'Account realm does not permit this record.' using errcode='42501';
  end if;

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

revoke all on function private.enforce_record_account_realm() from public, anon, authenticated;
grant execute on function private.enforce_record_account_realm() to service_role;

-- Restrictive policies are ANDed with existing ownership policies. They prevent
-- a valid authenticated session from crossing products even when the caller
-- guesses a route, REST endpoint, table, or record identifier.
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'account_transfers',
    'accounts',
    'ai_insight_snapshots',
    'ai_preferences',
    'ai_saved_insights',
    'categories',
    'category_mutation_requests',
    'goal_contributions',
    'goals',
    'investment_withdrawals',
    'investments',
    'liabilities',
    'liability_payments',
    'notification_preferences',
    'notification_states',
    'transactions'
  ]
  loop
    execute format(
      'drop policy if exists account_realm_individual_restriction on public.%I',
      table_name
    );
    execute format(
      'create policy account_realm_individual_restriction on public.%I as restrictive for all to authenticated using (private.current_account_allows(''individual'')) with check (private.current_account_allows(''individual''))',
      table_name
    );

    execute format(
      'drop trigger if exists enforce_individual_account_realm on public.%I',
      table_name
    );
    execute format(
      'create trigger enforce_individual_account_realm before insert or update or delete on public.%I for each row execute function private.enforce_record_account_realm(''individual'',''user_id'')',
      table_name
    );
  end loop;
end;
$$;

-- Apply the Business realm restriction to every tenant table carrying a
-- business_id, including future tables already present when this migration runs.
do $$
declare
  table_name text;
begin
  for table_name in
    select distinct columns.table_name
    from information_schema.columns columns
    join information_schema.tables tables
      on tables.table_schema=columns.table_schema
     and tables.table_name=columns.table_name
    where columns.table_schema='public'
      and columns.column_name='business_id'
      and tables.table_type='BASE TABLE'
  loop
    execute format(
      'alter table public.%I enable row level security',
      table_name
    );
    execute format(
      'drop policy if exists account_realm_business_restriction on public.%I',
      table_name
    );
    execute format(
      'create policy account_realm_business_restriction on public.%I as restrictive for all to authenticated using (private.current_account_allows(''business'')) with check (private.current_account_allows(''business''))',
      table_name
    );
  end loop;
end;
$$;

alter table public.businesses enable row level security;
drop policy if exists account_realm_business_restriction on public.businesses;
create policy account_realm_business_restriction
  on public.businesses
  as restrictive
  for all
  to authenticated
  using (private.current_account_allows('business'))
  with check (private.current_account_allows('business'));

drop trigger if exists enforce_business_owner_account_realm on public.businesses;
create trigger enforce_business_owner_account_realm
  before insert or update or delete on public.businesses
  for each row execute function private.enforce_record_account_realm('business','owner_user_id');

drop trigger if exists enforce_business_member_account_realm on public.business_members;
create trigger enforce_business_member_account_realm
  before insert or update or delete on public.business_members
  for each row execute function private.enforce_record_account_realm('business','user_id');

-- Invitation acceptance is the only supported way for a new staff identity to
-- claim Business realm without first owning an organization. The token, email,
-- expiry, and pending state are validated before the immutable realm claim.
create or replace function private.accept_business_invitation_internal(
  p_token text
)
returns jsonb
language plpgsql
security definer
set search_path='pg_catalog','public','private'
as $$
declare
  current_user_id uuid := auth.uid();
  current_email text := lower(coalesce(auth.jwt()->>'email',''));
  token_digest text := encode(extensions.digest(coalesce(p_token,''),'sha256'),'hex');
  invite record;
  business_slug text;
begin
  if current_user_id is null or current_email = '' then
    raise exception 'Authenticated email is required.' using errcode='42501';
  end if;

  select * into invite
  from public.business_invitations
  where token_hash = token_digest
  for update;

  if not found then
    raise exception 'Invitation token is invalid.' using errcode='P0002';
  end if;

  if invite.status <> 'pending' then
    raise exception 'Invitation is no longer pending.' using errcode='55000';
  end if;

  if invite.expires_at <= now() then
    update public.business_invitations
    set status='expired', updated_at=now()
    where id=invite.id;
    raise exception 'Invitation has expired.' using errcode='22008';
  end if;

  if current_email <> invite.email then
    raise exception 'Sign in with the invited email address.' using errcode='42501';
  end if;

  perform private.claim_account_realm_internal(
    'business',
    'business_invitation_acceptance'
  );

  insert into public.business_members(
    business_id,user_id,role,status,permissions,invited_by,joined_at
  )
  values(
    invite.business_id,current_user_id,invite.role,'active',invite.permissions,
    invite.invited_by,now()
  )
  on conflict(business_id,user_id) do update set
    role=excluded.role,
    status='active',
    permissions=excluded.permissions,
    invited_by=excluded.invited_by,
    joined_at=coalesce(public.business_members.joined_at,now()),
    updated_at=now();

  update public.business_invitations
  set status='accepted',accepted_by=current_user_id,accepted_at=now(),updated_at=now()
  where id=invite.id;

  insert into public.business_workspace_preferences(
    user_id,default_workspace,active_business_id,onboarding_choice
  )
  values(current_user_id,'business',invite.business_id,'business')
  on conflict(user_id) do update set
    default_workspace='business',
    active_business_id=excluded.active_business_id,
    onboarding_choice='business',
    updated_at=now();

  select slug into business_slug
  from public.businesses
  where id=invite.business_id;

  perform private.write_business_team_audit(
    invite.business_id,
    'invitation_accepted',
    current_user_id,
    invite.id,
    jsonb_build_object('status','pending'),
    jsonb_build_object(
      'status','accepted',
      'role',invite.role,
      'permissions',invite.permissions,
      'account_realm',private.get_account_realm(current_user_id)
    ),
    '{}'::jsonb
  );

  return jsonb_build_object(
    'business_id',invite.business_id,
    'business_slug',business_slug,
    'role',invite.role
  );
end;
$$;

-- Stop an administrator from inviting an email that already belongs to a hard
-- Individual identity. That person must use a separate Business identity.
create or replace function private.create_business_invitation_internal(
  p_business_id uuid,
  p_email text,
  p_role text,
  p_permissions text[],
  p_expires_days integer
)
returns jsonb
language plpgsql
security definer
set search_path='pg_catalog','public','private'
as $$
declare
  current_user_id uuid := auth.uid();
  normalized_email text := lower(btrim(coalesce(p_email,'')));
  normalized_role text := lower(btrim(coalesce(p_role,'')));
  normalized_permissions text[];
  raw_token text;
  invitation_uuid uuid;
  expiry timestamptz;
  owner_id uuid;
  inviter_role text;
  inviter_permissions text[];
  existing_user uuid;
  existing_realm text;
begin
  if current_user_id is null then
    raise exception 'Authentication required.' using errcode='42501';
  end if;

  perform private.require_current_account_realm('business');

  if not private.can_manage_business_team(p_business_id) then
    raise exception 'Team management permission required.' using errcode='42501';
  end if;

  if normalized_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'A valid email address is required.' using errcode='22023';
  end if;

  if normalized_role not in('admin','accountant','manager','sales','cashier','inventory','viewer') then
    raise exception 'Unsupported team role.' using errcode='22023';
  end if;

  if coalesce(p_expires_days,7) not between 1 and 30 then
    raise exception 'Invitation expiry must be 1 to 30 days.' using errcode='22023';
  end if;

  normalized_permissions := private.normalize_business_team_permissions(p_permissions);

  select b.owner_user_id,m.role,m.permissions
  into owner_id,inviter_role,inviter_permissions
  from public.businesses b
  join public.business_members m
    on m.business_id=b.id
   and m.user_id=current_user_id
   and m.status='active'
  where b.id=p_business_id
    and b.status='active';

  if owner_id is null then
    raise exception 'Active business not found.' using errcode='P0002';
  end if;

  if current_user_id<>owner_id
     and (normalized_role='admin' or 'team.manage'=any(normalized_permissions)) then
    raise exception 'Only the primary owner can grant administrative team access.'
      using errcode='42501';
  end if;

  select users.id
  into existing_user
  from auth.users users
  where lower(users.email)=normalized_email
  limit 1;

  if existing_user is not null then
    select private.get_account_realm(existing_user) into existing_realm;

    if existing_realm = 'individual' then
      raise exception 'This email belongs to an Individual account. Use a separate Business identity.'
        using errcode='42501';
    end if;

    if exists(
      select 1
      from public.business_members members
      where members.business_id=p_business_id
        and members.user_id=existing_user
        and members.status='active'
    ) then
      raise exception 'This user is already an active team member.' using errcode='23505';
    end if;
  end if;

  update public.business_invitations
  set status='expired',updated_at=now()
  where business_id=p_business_id
    and email=normalized_email
    and status='pending'
    and expires_at<=now();

  if exists(
    select 1
    from public.business_invitations
    where business_id=p_business_id
      and email=normalized_email
      and status='pending'
  ) then
    raise exception 'A pending invitation already exists for this email.' using errcode='23505';
  end if;

  raw_token:=replace(gen_random_uuid()::text,'-','')||replace(gen_random_uuid()::text,'-','');
  expiry:=now()+make_interval(days=>coalesce(p_expires_days,7));

  insert into public.business_invitations(
    business_id,email,role,permissions,token_hash,expires_at,invited_by
  )
  values(
    p_business_id,normalized_email,normalized_role,normalized_permissions,
    encode(extensions.digest(raw_token,'sha256'),'hex'),expiry,current_user_id
  )
  returning id into invitation_uuid;

  perform private.write_business_team_audit(
    p_business_id,
    'invitation_created',
    existing_user,
    invitation_uuid,
    null,
    jsonb_build_object(
      'email',normalized_email,
      'role',normalized_role,
      'permissions',normalized_permissions,
      'expires_at',expiry
    ),
    '{}'::jsonb
  );

  return jsonb_build_object(
    'id',invitation_uuid,
    'email',normalized_email,
    'token',raw_token,
    'expires_at',expiry,
    'role',normalized_role
  );
end;
$$;

-- Fail the migration instead of silently leaving a tenant table outside the
-- new realm boundary. Future schema migrations must install the same
-- restrictive policy on every newly introduced business_id table.
do $$
declare
  missing_business_tables text;
  missing_personal_tables text;
begin
  select string_agg(format('%I.%I', tables.schemaname, tables.tablename), ', ')
  into missing_business_tables
  from pg_catalog.pg_tables tables
  join information_schema.columns columns
    on columns.table_schema=tables.schemaname
   and columns.table_name=tables.tablename
   and columns.column_name='business_id'
  where tables.schemaname='public'
    and (
      not tables.rowsecurity
      or not exists (
        select 1
        from pg_catalog.pg_policies policies
        where policies.schemaname=tables.schemaname
          and policies.tablename=tables.tablename
          and policies.policyname='account_realm_business_restriction'
          and policies.permissive='RESTRICTIVE'
      )
    );

  if missing_business_tables is not null then
    raise exception 'Business realm policy verification failed for: %', missing_business_tables;
  end if;

  with required(table_name) as (
    values
      ('account_transfers'),('accounts'),('ai_insight_snapshots'),
      ('ai_preferences'),('ai_saved_insights'),('categories'),
      ('category_mutation_requests'),('goal_contributions'),('goals'),
      ('investment_withdrawals'),('investments'),('liabilities'),
      ('liability_payments'),('notification_preferences'),
      ('notification_states'),('transactions')
  )
  select string_agg(required.table_name, ', ')
  into missing_personal_tables
  from required
  where not exists (
    select 1
    from pg_catalog.pg_policies policies
    where policies.schemaname='public'
      and policies.tablename=required.table_name
      and policies.policyname='account_realm_individual_restriction'
      and policies.permissive='RESTRICTIVE'
  );

  if missing_personal_tables is not null then
    raise exception 'Individual realm policy verification failed for: %', missing_personal_tables;
  end if;
end;
$$;

notify pgrst, 'reload schema';
