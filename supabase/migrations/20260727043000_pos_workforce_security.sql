-- Retail & POS workforce security foundation.
--
-- Secrets never persist in plaintext:
--   * device secrets and opaque session tokens are SHA-256 hashes;
--   * staff PINs use pgcrypto bcrypt;
--   * approvals are bound to a SHA-256 payload digest and are single-use.
--
-- The browser never receives direct table access. Authenticated management reads
-- use constrained RPCs; all credential/session mutations are service-role-only
-- RPCs called by the Business POS Security Edge Function.

create or replace function private.business_team_permission_catalog()
returns text[]
language sql
immutable
set search_path='pg_catalog'
as $$
  select array[
    'team.view','team.manage','notifications.view','notifications.manage',
    'accounting.view','accounting.manage','banking.view','banking.manage',
    'tax.view','tax.manage','budget.view','budget.manage','budget.approve',
    'documents.view','documents.manage','branches.view','branches.manage',
    'approvals.view','approvals.request','approvals.decide','approvals.manage',
    'payroll.view','payroll.manage','payroll.process','payroll.pay',
    'assets.view','assets.manage','assets.depreciate','assets.dispose',
    'fx.view','fx.manage','fx.revalue','projects.view','projects.manage',
    'projects.time','projects.recognize','contacts.view','contacts.manage',
    'sales.view','sales.manage','sales.collect','sales.return',
    'purchases.view','purchases.manage','purchases.pay','purchases.return',
    'inventory.view','inventory.manage','inventory.transfer','inventory.adjust',
    'crm.view','crm.manage','reports.view','shop.view','shop.sell',
    'shop.purchase','shop.expense','pos.view','pos.manage','pos.operate',
    'pos.approve','pos.cash.adjust','pos.discount.override'
  ]::text[];
$$;

create or replace function private.business_team_sensitive_permissions()
returns text[]
language sql
immutable
set search_path='pg_catalog'
as $$
  select array[
    'team.manage','notifications.manage','banking.manage','tax.manage',
    'budget.approve','approvals.decide','approvals.manage','payroll.manage',
    'payroll.process','payroll.pay','assets.dispose','fx.revalue',
    'branches.manage','projects.recognize','pos.manage','pos.approve',
    'pos.cash.adjust','pos.discount.override'
  ]::text[];
$$;

create table if not exists public.business_pos_devices (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  branch_id uuid not null references public.business_branches(id) on delete restrict,
  device_code text not null,
  device_name text not null,
  secret_hash text not null,
  status text not null default 'active' check (status in ('active','revoked')),
  enrolled_by uuid references auth.users(id) on delete set null,
  last_seen_at timestamptz,
  revoked_at timestamptz,
  revoked_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, device_code),
  unique (business_id, id),
  check (device_code ~ '^[A-Z0-9][A-Z0-9-]{3,31}$'),
  check (char_length(btrim(device_name)) between 2 and 80),
  check (secret_hash ~ '^[0-9a-f]{64}$')
);

create table if not exists public.business_pos_staff_credentials (
  business_id uuid not null references public.businesses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  staff_code text not null,
  pin_hash text not null,
  status text not null default 'active' check (status in ('active','revoked')),
  must_change_pin boolean not null default true,
  failed_attempts smallint not null default 0 check (failed_attempts between 0 and 20),
  locked_until timestamptz,
  set_by uuid references auth.users(id) on delete set null,
  changed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (business_id, user_id),
  unique (business_id, staff_code),
  check (staff_code ~ '^[A-Z0-9][A-Z0-9-]{2,31}$'),
  check (char_length(pin_hash) between 40 and 100)
);

create table if not exists public.business_pos_sessions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  branch_id uuid not null references public.business_branches(id) on delete restrict,
  device_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  token_hash text not null unique,
  token_prefix text not null,
  must_change_pin boolean not null default false,
  expires_at timestamptz not null,
  last_activity_at timestamptz not null default now(),
  revoked_at timestamptz,
  revoked_by uuid references auth.users(id) on delete set null,
  revoke_reason text,
  user_agent_hash text,
  ip_hash text,
  created_at timestamptz not null default now(),
  foreign key (business_id, device_id)
    references public.business_pos_devices(business_id, id) on delete cascade,
  check (token_hash ~ '^[0-9a-f]{64}$'),
  check (token_prefix ~ '^[A-Za-z0-9_-]{6,16}$'),
  check (expires_at > created_at),
  check (user_agent_hash is null or user_agent_hash ~ '^[0-9a-f]{64}$'),
  check (ip_hash is null or ip_hash ~ '^[0-9a-f]{64}$'),
  check (revoke_reason is null or char_length(revoke_reason) <= 240)
);

create table if not exists public.business_pos_approval_requests (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  branch_id uuid not null references public.business_branches(id) on delete restrict,
  device_id uuid not null,
  session_id uuid not null references public.business_pos_sessions(id) on delete cascade,
  requested_by uuid not null references auth.users(id) on delete restrict,
  operation_type text not null check (
    operation_type in ('refund','void','high_discount','cash_adjustment')
  ),
  payload_hash text not null,
  reason text not null,
  amount numeric,
  discount_percent numeric,
  status text not null default 'pending' check (
    status in ('pending','approved','denied','expired','consumed')
  ),
  decided_by uuid references auth.users(id) on delete set null,
  decision_reason text,
  decided_at timestamptz,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now(),
  foreign key (business_id, device_id)
    references public.business_pos_devices(business_id, id) on delete cascade,
  check (payload_hash ~ '^[0-9a-f]{64}$'),
  check (char_length(btrim(reason)) between 5 and 300),
  check (decision_reason is null or char_length(btrim(decision_reason)) between 3 and 300),
  check (amount is null or amount >= 0),
  check (discount_percent is null or discount_percent between 0 and 100),
  check (expires_at > created_at)
);

create table if not exists public.business_pos_security_events (
  id bigint generated always as identity primary key,
  business_id uuid not null references public.businesses(id) on delete cascade,
  branch_id uuid references public.business_branches(id) on delete set null,
  device_id uuid references public.business_pos_devices(id) on delete set null,
  session_id uuid references public.business_pos_sessions(id) on delete set null,
  actor_user_id uuid references auth.users(id) on delete set null,
  target_user_id uuid references auth.users(id) on delete set null,
  approval_id uuid references public.business_pos_approval_requests(id) on delete set null,
  event_type text not null check (event_type in (
    'device_enrolled','device_revoked','temporary_pin_issued','pin_changed',
    'pin_revoked','login_succeeded','login_failed','session_revoked',
    'approval_requested','approval_approved','approval_denied',
    'approval_expired','approval_consumed'
  )),
  outcome text not null check (outcome in ('success','failure','blocked')),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata)='object'),
  created_at timestamptz not null default now()
);

create index if not exists business_pos_devices_business_status_idx
  on public.business_pos_devices(business_id,status,branch_id);
create index if not exists business_pos_staff_code_idx
  on public.business_pos_staff_credentials(business_id,staff_code);
create index if not exists business_pos_sessions_active_idx
  on public.business_pos_sessions(business_id,device_id,user_id,expires_at)
  where revoked_at is null;
create index if not exists business_pos_approvals_pending_idx
  on public.business_pos_approval_requests(business_id,status,expires_at);
create index if not exists business_pos_events_business_created_idx
  on public.business_pos_security_events(business_id,created_at desc);

alter table public.business_pos_devices enable row level security;
alter table public.business_pos_staff_credentials enable row level security;
alter table public.business_pos_sessions enable row level security;
alter table public.business_pos_approval_requests enable row level security;
alter table public.business_pos_security_events enable row level security;

revoke all on table public.business_pos_devices from public,anon,authenticated;
revoke all on table public.business_pos_staff_credentials from public,anon,authenticated;
revoke all on table public.business_pos_sessions from public,anon,authenticated;
revoke all on table public.business_pos_approval_requests from public,anon,authenticated;
revoke all on table public.business_pos_security_events from public,anon,authenticated;
grant all on table public.business_pos_devices to service_role;
grant all on table public.business_pos_staff_credentials to service_role;
grant all on table public.business_pos_sessions to service_role;
grant all on table public.business_pos_approval_requests to service_role;
grant all on table public.business_pos_security_events to service_role;
grant usage,select on sequence public.business_pos_security_events_id_seq to service_role;

create or replace function private.business_pos_actor_can(
  p_actor_user_id uuid,
  p_business_id uuid,
  p_capability text
)
returns boolean
language sql
stable
security definer
set search_path='pg_catalog','public'
as $$
  select exists(
    select 1
    from public.businesses business
    join public.business_members member
      on member.business_id=business.id
     and member.user_id=p_actor_user_id
     and member.status='active'
    where business.id=p_business_id
      and business.status='active'
      and business.workspace_mode='simple_shop'
      and (
        business.owner_user_id=p_actor_user_id
        or '*'=any(member.permissions)
        or case lower(btrim(coalesce(p_capability,'')))
          when 'view' then
            member.role in ('admin','it_admin','operations_manager','manager','auditor')
            or 'pos.view'=any(member.permissions)
            or 'pos.manage'=any(member.permissions)
            or 'pos.approve'=any(member.permissions)
          when 'manage' then
            member.role in ('admin','it_admin')
            or 'pos.manage'=any(member.permissions)
          when 'operate' then
            member.role in ('admin','operations_manager','manager','sales','cashier','branch_staff')
            or 'pos.operate'=any(member.permissions)
          when 'approve' then
            member.role in ('admin','operations_manager','manager')
            or 'pos.approve'=any(member.permissions)
          when 'cash_adjust' then
            member.role='admin'
            or 'pos.cash.adjust'=any(member.permissions)
          when 'discount_override' then
            member.role in ('admin','operations_manager')
            or 'pos.discount.override'=any(member.permissions)
          else false
        end
      )
  );
$$;

create or replace function private.business_pos_member_has_branch_access(
  p_business_id uuid,
  p_user_id uuid,
  p_branch_id uuid
)
returns boolean
language sql
stable
security definer
set search_path='pg_catalog','public'
as $$
  select exists(
    select 1
    from public.business_members member
    where member.business_id=p_business_id
      and member.user_id=p_user_id
      and member.status='active'
      and (
        member.branch_access_mode='all'
        or exists(
          select 1 from public.business_member_branch_access access
          where access.business_id=p_business_id
            and access.user_id=p_user_id
            and access.branch_id=p_branch_id
        )
      )
  );
$$;

create or replace function private.business_pos_pin_is_acceptable(p_pin text)
returns boolean
language sql
immutable
set search_path='pg_catalog'
as $$
  select coalesce(p_pin,'') ~ '^[0-9]{6}$'
    and p_pin not in (
      '000000','111111','222222','333333','444444','555555',
      '666666','777777','888888','999999','123456','654321',
      '121212','112233','123123'
    );
$$;

create or replace function private.write_business_pos_event(
  p_business_id uuid,
  p_branch_id uuid,
  p_device_id uuid,
  p_session_id uuid,
  p_actor_user_id uuid,
  p_target_user_id uuid,
  p_approval_id uuid,
  p_event_type text,
  p_outcome text,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path='pg_catalog','public'
as $$
begin
  insert into public.business_pos_security_events(
    business_id,branch_id,device_id,session_id,actor_user_id,target_user_id,
    approval_id,event_type,outcome,metadata
  ) values (
    p_business_id,p_branch_id,p_device_id,p_session_id,p_actor_user_id,
    p_target_user_id,p_approval_id,p_event_type,p_outcome,coalesce(p_metadata,'{}'::jsonb)
  );
end;
$$;

create or replace function private.revoke_business_pos_access_on_membership_change()
returns trigger
language plpgsql
security definer
set search_path='pg_catalog','public','private'
as $$
declare revoked_session record;
begin
  if old.status='active' and new.status<>'active' then
    update public.business_pos_staff_credentials
    set status='revoked',must_change_pin=true,locked_until=null,updated_at=now()
    where business_id=new.business_id and user_id=new.user_id and status='active';
    if found then
      perform private.write_business_pos_event(
        new.business_id,null,null,null,auth.uid(),new.user_id,null,
        'pin_revoked','success',jsonb_build_object('membership_status',new.status)
      );
    end if;

    for revoked_session in
      update public.business_pos_sessions
      set revoked_at=coalesce(revoked_at,now()),revoked_by=auth.uid(),
          revoke_reason='membership_'||new.status
      where business_id=new.business_id and user_id=new.user_id and revoked_at is null
      returning id,branch_id,device_id
    loop
      perform private.write_business_pos_event(
        new.business_id,revoked_session.branch_id,revoked_session.device_id,
        revoked_session.id,auth.uid(),new.user_id,null,
        'session_revoked','success',jsonb_build_object('membership_status',new.status)
      );
    end loop;
  end if;
  return new;
end;
$$;

drop trigger if exists revoke_business_pos_access_on_membership_change
  on public.business_members;
create trigger revoke_business_pos_access_on_membership_change
after update of status on public.business_members
for each row execute function private.revoke_business_pos_access_on_membership_change();

create or replace function private.expire_business_pos_state(p_business_id uuid)
returns void
language plpgsql
security definer
set search_path='pg_catalog','public','private'
as $$
declare expired_record record;
begin
  update public.business_pos_sessions
  set revoked_at=coalesce(revoked_at,now()),
      revoke_reason=coalesce(revoke_reason,'expired')
  where business_id=p_business_id
    and revoked_at is null
    and (expires_at<=now() or last_activity_at<=now()-interval '30 minutes');

  for expired_record in
    update public.business_pos_approval_requests
    set status='expired',decided_at=coalesce(decided_at,now())
    where business_id=p_business_id and status='pending' and expires_at<=now()
    returning id,branch_id,device_id,session_id,requested_by
  loop
    perform private.write_business_pos_event(
      p_business_id,expired_record.branch_id,expired_record.device_id,
      expired_record.session_id,null,expired_record.requested_by,
      expired_record.id,'approval_expired','blocked','{}'::jsonb
    );
  end loop;
end;
$$;

create or replace function private.get_business_pos_security_snapshot_internal(p_business_id uuid)
returns jsonb
language plpgsql
security definer
set search_path='pg_catalog','public','private'
as $$
declare
  actor_id uuid:=auth.uid();
  actor_role text;
  can_view_approval_details boolean:=false;
  result jsonb;
begin
  if actor_id is null then
    raise exception 'Authentication required.' using errcode='42501';
  end if;
  perform private.require_current_account_realm('business');
  if not private.business_pos_actor_can(actor_id,p_business_id,'view') then
    raise exception 'POS security access required.' using errcode='42501';
  end if;
  perform private.expire_business_pos_state(p_business_id);
  select member.role into actor_role
  from public.business_members member
  where member.business_id=p_business_id and member.user_id=actor_id and member.status='active';
  can_view_approval_details :=
    private.business_pos_actor_can(actor_id,p_business_id,'approve')
    or actor_role='auditor';

  select jsonb_build_object(
    'capabilities',jsonb_build_object(
      'view',private.business_pos_actor_can(actor_id,p_business_id,'view'),
      'manage',private.business_pos_actor_can(actor_id,p_business_id,'manage'),
      'approve',private.business_pos_actor_can(actor_id,p_business_id,'approve'),
      'cash_adjust',private.business_pos_actor_can(actor_id,p_business_id,'cash_adjust'),
      'discount_override',private.business_pos_actor_can(actor_id,p_business_id,'discount_override')
    ),
    'branches',coalesce((select jsonb_agg(jsonb_build_object(
      'id',branch.id,'code',branch.code,'name',branch.name,'status',branch.status,
      'is_primary',branch.is_primary,'timezone',branch.timezone
    ) order by branch.is_primary desc,branch.name)
      from public.business_branches branch
      where branch.business_id=p_business_id and branch.status='active'),'[]'::jsonb),
    'members',coalesce((select jsonb_agg(jsonb_build_object(
      'user_id',member.user_id,
      'name',coalesce(nullif(profile.full_name,''),split_part(coalesce(profile.email,''),'@',1),'Team member'),
      'email',profile.email,'role',member.role,'status',member.status,
      'staff_code',credential.staff_code,
      'credential_status',credential.status,
      'must_change_pin',credential.must_change_pin,
      'failed_attempts',credential.failed_attempts,
      'locked_until',credential.locked_until,
      'changed_at',credential.changed_at
    ) order by coalesce(profile.full_name,profile.email))
      from public.business_members member
      left join public.profiles profile on profile.id=member.user_id
      left join public.business_pos_staff_credentials credential
        on credential.business_id=member.business_id and credential.user_id=member.user_id
      where member.business_id=p_business_id and member.status in ('active','suspended')
        and private.business_pos_actor_can(member.user_id,p_business_id,'operate')),'[]'::jsonb),
    'devices',coalesce((select jsonb_agg(jsonb_build_object(
      'id',device.id,'branch_id',device.branch_id,'device_code',device.device_code,
      'device_name',device.device_name,'status',device.status,
      'last_seen_at',device.last_seen_at,'revoked_at',device.revoked_at,
      'created_at',device.created_at
    ) order by device.status,device.device_name)
      from public.business_pos_devices device where device.business_id=p_business_id),'[]'::jsonb),
    'sessions',coalesce((select jsonb_agg(jsonb_build_object(
      'id',session.id,'branch_id',session.branch_id,'device_id',session.device_id,
      'user_id',session.user_id,'token_prefix',session.token_prefix,
      'must_change_pin',session.must_change_pin,'expires_at',session.expires_at,
      'last_activity_at',session.last_activity_at,'revoked_at',session.revoked_at,
      'revoke_reason',session.revoke_reason,'created_at',session.created_at
    ) order by session.created_at desc)
      from public.business_pos_sessions session
      where session.business_id=p_business_id and session.created_at>now()-interval '7 days'),'[]'::jsonb),
    'approvals',case when can_view_approval_details then coalesce((select jsonb_agg(jsonb_build_object(
      'id',approval.id,'branch_id',approval.branch_id,'device_id',approval.device_id,
      'session_id',approval.session_id,'requested_by',approval.requested_by,
      'operation_type',approval.operation_type,'reason',approval.reason,
      'amount',approval.amount,'discount_percent',approval.discount_percent,
      'status',approval.status,'decided_by',approval.decided_by,
      'decision_reason',approval.decision_reason,'expires_at',approval.expires_at,
      'created_at',approval.created_at
    ) order by approval.created_at desc)
      from public.business_pos_approval_requests approval
      where approval.business_id=p_business_id and approval.created_at>now()-interval '7 days'),'[]'::jsonb) else '[]'::jsonb end,
    'events',coalesce((select jsonb_agg(event_row order by event_row->>'created_at' desc)
      from (select jsonb_build_object(
        'id',event.id,'branch_id',event.branch_id,'device_id',event.device_id,
        'session_id',event.session_id,'actor_user_id',event.actor_user_id,
        'target_user_id',event.target_user_id,'approval_id',event.approval_id,
        'event_type',event.event_type,'outcome',event.outcome,
        'metadata',event.metadata,'created_at',event.created_at
      ) event_row from public.business_pos_security_events event
      where event.business_id=p_business_id order by event.created_at desc limit 100) recent),'[]'::jsonb)
  ) into result;
  return result;
end;
$$;

create or replace function public.get_business_pos_security_snapshot(p_business_id uuid)
returns jsonb
language sql
security definer
set search_path='pg_catalog','public','private'
as $$ select private.get_business_pos_security_snapshot_internal(p_business_id); $$;

create or replace function public.register_business_pos_device(
  p_actor_user_id uuid,p_business_id uuid,p_branch_id uuid,p_device_name text,
  p_device_code text,p_secret_hash text
)
returns uuid
language plpgsql
security definer
set search_path='pg_catalog','public','private'
as $$
declare device_id uuid; normalized_code text:=upper(btrim(coalesce(p_device_code,'')));
begin
  if not private.business_pos_actor_can(p_actor_user_id,p_business_id,'manage') then
    raise exception 'POS device management permission required.' using errcode='42501';
  end if;
  if not exists(select 1 from public.business_branches branch where branch.id=p_branch_id and branch.business_id=p_business_id and branch.status='active') then
    raise exception 'Active branch not found.' using errcode='P0002';
  end if;
  if normalized_code !~ '^[A-Z0-9][A-Z0-9-]{3,31}$' or p_secret_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'Invalid POS device credentials.' using errcode='22023';
  end if;
  insert into public.business_pos_devices(
    business_id,branch_id,device_code,device_name,secret_hash,enrolled_by
  ) values (
    p_business_id,p_branch_id,normalized_code,btrim(p_device_name),p_secret_hash,p_actor_user_id
  ) returning id into device_id;
  perform private.write_business_pos_event(
    p_business_id,p_branch_id,device_id,null,p_actor_user_id,null,null,
    'device_enrolled','success',jsonb_build_object('device_code',normalized_code)
  );
  return device_id;
end;
$$;

create or replace function public.revoke_business_pos_device(
  p_actor_user_id uuid,p_business_id uuid,p_device_id uuid,p_reason text
)
returns void
language plpgsql
security definer
set search_path='pg_catalog','public','private'
as $$
declare target_branch uuid;
begin
  if not private.business_pos_actor_can(p_actor_user_id,p_business_id,'manage') then
    raise exception 'POS device management permission required.' using errcode='42501';
  end if;
  update public.business_pos_devices
  set status='revoked',revoked_at=now(),revoked_by=p_actor_user_id,updated_at=now()
  where id=p_device_id and business_id=p_business_id and status='active'
  returning branch_id into target_branch;
  if target_branch is null then raise exception 'Active POS device not found.' using errcode='P0002'; end if;
  update public.business_pos_sessions
  set revoked_at=coalesce(revoked_at,now()),revoked_by=p_actor_user_id,
      revoke_reason=left(coalesce(nullif(btrim(p_reason),''),'device_revoked'),240)
  where business_id=p_business_id and device_id=p_device_id and revoked_at is null;
  perform private.write_business_pos_event(
    p_business_id,target_branch,p_device_id,null,p_actor_user_id,null,null,
    'device_revoked','success',jsonb_build_object('reason',left(coalesce(p_reason,''),120))
  );
end;
$$;

create or replace function public.issue_business_pos_temporary_pin(
  p_actor_user_id uuid,p_business_id uuid,p_target_user_id uuid,
  p_staff_code text,p_pin text
)
returns void
language plpgsql
security definer
set search_path='pg_catalog','public','private','extensions'
as $$
declare normalized_staff_code text:=upper(btrim(coalesce(p_staff_code,'')));
begin
  if not private.business_pos_actor_can(p_actor_user_id,p_business_id,'manage') then
    raise exception 'POS credential management permission required.' using errcode='42501';
  end if;
  if not private.business_pos_actor_can(p_target_user_id,p_business_id,'operate') then
    raise exception 'Target member is not eligible for POS operation.' using errcode='42501';
  end if;
  if normalized_staff_code !~ '^[A-Z0-9][A-Z0-9-]{2,31}$' then
    raise exception 'Invalid staff code.' using errcode='22023';
  end if;
  if not private.business_pos_pin_is_acceptable(p_pin) then
    raise exception 'Temporary PIN does not meet policy.' using errcode='22023';
  end if;
  insert into public.business_pos_staff_credentials(
    business_id,user_id,staff_code,pin_hash,status,must_change_pin,
    failed_attempts,locked_until,set_by,changed_at,updated_at
  ) values (
    p_business_id,p_target_user_id,normalized_staff_code,
    extensions.crypt(p_pin,extensions.gen_salt('bf',12)),'active',true,
    0,null,p_actor_user_id,now(),now()
  ) on conflict (business_id,user_id) do update set
    staff_code=excluded.staff_code,pin_hash=excluded.pin_hash,status='active',
    must_change_pin=true,failed_attempts=0,locked_until=null,
    set_by=p_actor_user_id,changed_at=now(),updated_at=now();
  update public.business_pos_sessions
  set revoked_at=coalesce(revoked_at,now()),revoked_by=p_actor_user_id,
      revoke_reason='temporary_pin_reissued'
  where business_id=p_business_id and user_id=p_target_user_id and revoked_at is null;
  perform private.write_business_pos_event(
    p_business_id,null,null,null,p_actor_user_id,p_target_user_id,null,
    'temporary_pin_issued','success',jsonb_build_object('staff_code',normalized_staff_code)
  );
end;
$$;

create or replace function public.revoke_business_pos_credential(
  p_actor_user_id uuid,p_business_id uuid,p_target_user_id uuid,p_reason text
)
returns void
language plpgsql
security definer
set search_path='pg_catalog','public','private'
as $$
begin
  if not private.business_pos_actor_can(p_actor_user_id,p_business_id,'manage') then
    raise exception 'POS credential management permission required.' using errcode='42501';
  end if;
  update public.business_pos_staff_credentials
  set status='revoked',updated_at=now(),locked_until=null
  where business_id=p_business_id and user_id=p_target_user_id and status='active';
  if not found then raise exception 'Active POS credential not found.' using errcode='P0002'; end if;
  update public.business_pos_sessions
  set revoked_at=coalesce(revoked_at,now()),revoked_by=p_actor_user_id,
      revoke_reason=left(coalesce(nullif(btrim(p_reason),''),'credential_revoked'),240)
  where business_id=p_business_id and user_id=p_target_user_id and revoked_at is null;
  perform private.write_business_pos_event(
    p_business_id,null,null,null,p_actor_user_id,p_target_user_id,null,
    'pin_revoked','success',jsonb_build_object('reason',left(coalesce(p_reason,''),120))
  );
end;
$$;

create or replace function public.start_business_pos_session(
  p_business_slug text,p_device_code text,p_device_secret_hash text,
  p_staff_code text,p_pin text,p_session_token_hash text,p_token_prefix text,
  p_user_agent_hash text default null,p_ip_hash text default null
)
returns jsonb
language plpgsql
security definer
set search_path='pg_catalog','public','private','extensions'
as $$
declare
  target_business record; target_device record; target_credential record;
  session_id uuid; expiry timestamptz:=now()+interval '8 hours';
  normalized_code text:=upper(btrim(coalesce(p_device_code,'')));
  normalized_staff text:=upper(btrim(coalesce(p_staff_code,'')));
begin
  if p_device_secret_hash !~ '^[0-9a-f]{64}$' or p_session_token_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'POS authentication failed.' using errcode='POS01';
  end if;
  select business.id,business.slug into target_business
  from public.businesses business
  where business.slug=lower(btrim(coalesce(p_business_slug,'')))
    and business.status='active' and business.workspace_mode='simple_shop';
  if not found then raise exception 'POS authentication failed.' using errcode='POS01'; end if;

  select device.* into target_device
  from public.business_pos_devices device
  where device.business_id=target_business.id and device.device_code=normalized_code
  for update;
  if not found or target_device.status<>'active'
     or target_device.secret_hash<>p_device_secret_hash then
    raise exception 'POS authentication failed.' using errcode='POS01';
  end if;

  select credential.* into target_credential
  from public.business_pos_staff_credentials credential
  where credential.business_id=target_business.id and credential.staff_code=normalized_staff
  for update;
  if not found or target_credential.status<>'active'
     or not private.business_pos_actor_can(target_credential.user_id,target_business.id,'operate')
     or not private.business_pos_member_has_branch_access(target_business.id,target_credential.user_id,target_device.branch_id)
     or (target_credential.locked_until is not null and target_credential.locked_until>now()) then
    perform private.write_business_pos_event(
      target_business.id,target_device.branch_id,target_device.id,null,null,
      case when found then target_credential.user_id else null end,null,
      'login_failed','blocked',jsonb_build_object('reason','credential_unavailable')
    );
    return jsonb_build_object('ok',false,'error','authentication_failed');
  end if;

  if target_credential.pin_hash<>extensions.crypt(p_pin,target_credential.pin_hash) then
    update public.business_pos_staff_credentials
    set failed_attempts=least(failed_attempts+1,20),
        locked_until=case when failed_attempts+1>=5 then now()+interval '15 minutes' else locked_until end,
        updated_at=now()
    where business_id=target_business.id and user_id=target_credential.user_id;
    perform private.write_business_pos_event(
      target_business.id,target_device.branch_id,target_device.id,null,null,
      target_credential.user_id,null,'login_failed','failure',
      jsonb_build_object('locked',target_credential.failed_attempts+1>=5)
    );
    return jsonb_build_object('ok',false,'error','authentication_failed');
  end if;

  update public.business_pos_staff_credentials
  set failed_attempts=0,locked_until=null,updated_at=now()
  where business_id=target_business.id and user_id=target_credential.user_id;
  update public.business_pos_sessions
  set revoked_at=coalesce(revoked_at,now()),revoke_reason='superseded_login'
  where business_id=target_business.id and device_id=target_device.id
    and user_id=target_credential.user_id and revoked_at is null;
  insert into public.business_pos_sessions(
    business_id,branch_id,device_id,user_id,token_hash,token_prefix,
    must_change_pin,expires_at,user_agent_hash,ip_hash
  ) values (
    target_business.id,target_device.branch_id,target_device.id,target_credential.user_id,
    p_session_token_hash,p_token_prefix,target_credential.must_change_pin,expiry,
    p_user_agent_hash,p_ip_hash
  ) returning id into session_id;
  update public.business_pos_devices set last_seen_at=now(),updated_at=now()
  where id=target_device.id;
  perform private.write_business_pos_event(
    target_business.id,target_device.branch_id,target_device.id,session_id,null,
    target_credential.user_id,null,'login_succeeded','success',
    jsonb_build_object('must_change_pin',target_credential.must_change_pin)
  );
  return jsonb_build_object(
    'ok',true,'session_id',session_id,'business_id',target_business.id,
    'branch_id',target_device.branch_id,'device_id',target_device.id,
    'user_id',target_credential.user_id,'staff_code',target_credential.staff_code,
    'must_change_pin',target_credential.must_change_pin,'expires_at',expiry
  );
end;
$$;

create or replace function private.get_business_pos_session_internal(
  p_session_token_hash text,p_require_operational boolean default true
)
returns public.business_pos_sessions
language plpgsql
security definer
set search_path='pg_catalog','public','private'
as $$
declare target_session public.business_pos_sessions;
begin
  select session.* into target_session
  from public.business_pos_sessions session
  join public.business_pos_devices device on device.id=session.device_id and device.business_id=session.business_id
  join public.business_branches branch on branch.id=session.branch_id and branch.business_id=session.business_id and branch.status='active'
  join public.business_pos_staff_credentials credential on credential.business_id=session.business_id and credential.user_id=session.user_id
  where session.token_hash=p_session_token_hash
    and session.revoked_at is null and session.expires_at>now()
    and session.last_activity_at>now()-interval '30 minutes'
    and device.status='active' and credential.status='active'
    and private.business_pos_actor_can(session.user_id,session.business_id,'operate')
    and private.business_pos_member_has_branch_access(session.business_id,session.user_id,session.branch_id)
  for update of session;
  if not found or (p_require_operational and target_session.must_change_pin) then
    raise exception 'POS session is unavailable.' using errcode='POS02';
  end if;
  update public.business_pos_sessions set last_activity_at=now()
  where id=target_session.id;
  target_session.last_activity_at:=now();
  return target_session;
end;
$$;

create or replace function public.change_business_pos_pin(
  p_session_token_hash text,p_current_pin text,p_new_pin text
)
returns void
language plpgsql
security definer
set search_path='pg_catalog','public','private','extensions'
as $$
declare target_session public.business_pos_sessions; credential record;
begin
  target_session:=private.get_business_pos_session_internal(p_session_token_hash,false);
  select * into credential from public.business_pos_staff_credentials
  where business_id=target_session.business_id and user_id=target_session.user_id for update;
  if credential.pin_hash<>extensions.crypt(p_current_pin,credential.pin_hash) then
    raise exception 'Current PIN is incorrect.' using errcode='POS03';
  end if;
  if not private.business_pos_pin_is_acceptable(p_new_pin) or p_new_pin=p_current_pin then
    raise exception 'New PIN does not meet policy.' using errcode='22023';
  end if;
  update public.business_pos_staff_credentials
  set pin_hash=extensions.crypt(p_new_pin,extensions.gen_salt('bf',12)),
      must_change_pin=false,failed_attempts=0,locked_until=null,
      changed_at=now(),updated_at=now()
  where business_id=target_session.business_id and user_id=target_session.user_id;
  update public.business_pos_sessions
  set revoked_at=case when id=target_session.id then null else coalesce(revoked_at,now()) end,
      revoke_reason=case when id=target_session.id then revoke_reason else 'pin_changed' end,
      must_change_pin=false
  where business_id=target_session.business_id and user_id=target_session.user_id;
  perform private.write_business_pos_event(
    target_session.business_id,target_session.branch_id,target_session.device_id,
    target_session.id,target_session.user_id,target_session.user_id,null,
    'pin_changed','success','{}'::jsonb
  );
end;
$$;

create or replace function public.revoke_business_pos_session(
  p_actor_user_id uuid,p_business_id uuid,p_session_id uuid,p_reason text
)
returns void
language plpgsql
security definer
set search_path='pg_catalog','public','private'
as $$
declare target_session record;
begin
  if not private.business_pos_actor_can(p_actor_user_id,p_business_id,'manage') then
    raise exception 'POS session management permission required.' using errcode='42501';
  end if;
  update public.business_pos_sessions
  set revoked_at=coalesce(revoked_at,now()),revoked_by=p_actor_user_id,
      revoke_reason=left(coalesce(nullif(btrim(p_reason),''),'manager_revoked'),240)
  where id=p_session_id and business_id=p_business_id and revoked_at is null
  returning branch_id,device_id,user_id into target_session;
  if not found then raise exception 'Active POS session not found.' using errcode='P0002'; end if;
  perform private.write_business_pos_event(
    p_business_id,target_session.branch_id,target_session.device_id,p_session_id,
    p_actor_user_id,target_session.user_id,null,'session_revoked','success',
    jsonb_build_object('reason',left(coalesce(p_reason,''),120))
  );
end;
$$;

create or replace function public.create_business_pos_approval_request(
  p_session_token_hash text,p_operation_type text,p_payload_hash text,
  p_reason text,p_amount numeric default null,p_discount_percent numeric default null
)
returns jsonb
language plpgsql
security definer
set search_path='pg_catalog','public','private'
as $$
declare target_session public.business_pos_sessions; approval_id uuid; expiry timestamptz:=now()+interval '5 minutes'; normalized_operation text:=lower(btrim(coalesce(p_operation_type,'')));
begin
  target_session:=private.get_business_pos_session_internal(p_session_token_hash,true);
  if normalized_operation not in ('refund','void','high_discount','cash_adjustment')
     or p_payload_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'Invalid POS approval request.' using errcode='22023';
  end if;
  insert into public.business_pos_approval_requests(
    business_id,branch_id,device_id,session_id,requested_by,operation_type,
    payload_hash,reason,amount,discount_percent,expires_at
  ) values (
    target_session.business_id,target_session.branch_id,target_session.device_id,
    target_session.id,target_session.user_id,normalized_operation,p_payload_hash,
    btrim(p_reason),p_amount,p_discount_percent,expiry
  ) returning id into approval_id;
  perform private.write_business_pos_event(
    target_session.business_id,target_session.branch_id,target_session.device_id,
    target_session.id,target_session.user_id,target_session.user_id,approval_id,
    'approval_requested','success',jsonb_build_object('operation_type',normalized_operation)
  );
  return jsonb_build_object('approval_id',approval_id,'status','pending','expires_at',expiry);
end;
$$;

create or replace function public.decide_business_pos_approval(
  p_actor_user_id uuid,p_business_id uuid,p_approval_id uuid,
  p_decision text,p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path='pg_catalog','public','private'
as $$
declare approval record; normalized_decision text:=lower(btrim(coalesce(p_decision,'')));
begin
  if not private.business_pos_actor_can(p_actor_user_id,p_business_id,'approve') then
    raise exception 'POS approval permission required.' using errcode='42501';
  end if;
  select * into approval from public.business_pos_approval_requests
  where id=p_approval_id and business_id=p_business_id for update;
  if not found or approval.status<>'pending' or approval.expires_at<=now() then
    raise exception 'Pending POS approval not found.' using errcode='P0002';
  end if;
  if approval.requested_by=p_actor_user_id then
    raise exception 'Requester cannot approve their own operation.' using errcode='42501';
  end if;
  if normalized_decision not in ('approved','denied') then
    raise exception 'Unsupported approval decision.' using errcode='22023';
  end if;
  if approval.operation_type='cash_adjustment'
     and normalized_decision='approved'
     and not private.business_pos_actor_can(p_actor_user_id,p_business_id,'cash_adjust') then
    raise exception 'Cash adjustment permission required.' using errcode='42501';
  end if;
  if approval.operation_type='high_discount'
     and normalized_decision='approved'
     and not private.business_pos_actor_can(p_actor_user_id,p_business_id,'discount_override') then
    raise exception 'Discount override permission required.' using errcode='42501';
  end if;
  update public.business_pos_approval_requests
  set status=normalized_decision,decided_by=p_actor_user_id,
      decision_reason=btrim(p_reason),decided_at=now()
  where id=p_approval_id;
  perform private.write_business_pos_event(
    p_business_id,approval.branch_id,approval.device_id,approval.session_id,
    p_actor_user_id,approval.requested_by,p_approval_id,
    case when normalized_decision='approved' then 'approval_approved' else 'approval_denied' end,
    'success',jsonb_build_object('operation_type',approval.operation_type)
  );
  return jsonb_build_object('approval_id',p_approval_id,'status',normalized_decision);
end;
$$;

create or replace function public.consume_business_pos_approval(
  p_session_token_hash text,p_approval_id uuid,p_operation_type text,p_payload_hash text
)
returns jsonb
language plpgsql
security definer
set search_path='pg_catalog','public','private'
as $$
declare target_session public.business_pos_sessions; approval record;
begin
  target_session:=private.get_business_pos_session_internal(p_session_token_hash,true);
  select * into approval from public.business_pos_approval_requests
  where id=p_approval_id for update;
  if not found or approval.business_id<>target_session.business_id
     or approval.session_id<>target_session.id or approval.requested_by<>target_session.user_id
     or approval.status<>'approved' or approval.expires_at<=now()
     or approval.operation_type<>lower(btrim(coalesce(p_operation_type,'')))
     or approval.payload_hash<>p_payload_hash then
    raise exception 'Approved POS operation not found.' using errcode='POS04';
  end if;
  update public.business_pos_approval_requests set status='consumed',consumed_at=now()
  where id=p_approval_id;
  perform private.write_business_pos_event(
    target_session.business_id,target_session.branch_id,target_session.device_id,
    target_session.id,target_session.user_id,target_session.user_id,p_approval_id,
    'approval_consumed','success',jsonb_build_object('operation_type',approval.operation_type)
  );
  return jsonb_build_object(
    'approval_id',p_approval_id,'business_id',target_session.business_id,
    'branch_id',target_session.branch_id,'device_id',target_session.device_id,
    'user_id',target_session.user_id,'operation_type',approval.operation_type
  );
end;
$$;

revoke all on function private.business_pos_actor_can(uuid,uuid,text) from public,anon,authenticated;
revoke all on function private.business_pos_member_has_branch_access(uuid,uuid,uuid) from public,anon,authenticated;
revoke all on function private.business_pos_pin_is_acceptable(text) from public,anon,authenticated;
revoke all on function private.write_business_pos_event(uuid,uuid,uuid,uuid,uuid,uuid,uuid,text,text,jsonb) from public,anon,authenticated;
revoke all on function private.revoke_business_pos_access_on_membership_change() from public,anon,authenticated;
revoke all on function private.expire_business_pos_state(uuid) from public,anon,authenticated;
revoke all on function private.get_business_pos_security_snapshot_internal(uuid) from public,anon,authenticated;
revoke all on function private.get_business_pos_session_internal(text,boolean) from public,anon,authenticated;

grant execute on function private.business_pos_actor_can(uuid,uuid,text) to service_role;
grant execute on function private.business_pos_member_has_branch_access(uuid,uuid,uuid) to service_role;
grant execute on function private.business_pos_pin_is_acceptable(text) to service_role;
grant execute on function private.write_business_pos_event(uuid,uuid,uuid,uuid,uuid,uuid,uuid,text,text,jsonb) to service_role;
grant execute on function private.revoke_business_pos_access_on_membership_change() to service_role;
grant execute on function private.expire_business_pos_state(uuid) to service_role;
grant execute on function private.get_business_pos_security_snapshot_internal(uuid) to service_role;
grant execute on function private.get_business_pos_session_internal(text,boolean) to service_role;

revoke all on function public.get_business_pos_security_snapshot(uuid) from public,anon;
grant execute on function public.get_business_pos_security_snapshot(uuid) to authenticated,service_role;

revoke all on function public.register_business_pos_device(uuid,uuid,uuid,text,text,text) from public,anon,authenticated;
revoke all on function public.revoke_business_pos_device(uuid,uuid,uuid,text) from public,anon,authenticated;
revoke all on function public.issue_business_pos_temporary_pin(uuid,uuid,uuid,text,text) from public,anon,authenticated;
revoke all on function public.revoke_business_pos_credential(uuid,uuid,uuid,text) from public,anon,authenticated;
revoke all on function public.start_business_pos_session(text,text,text,text,text,text,text,text,text) from public,anon,authenticated;
revoke all on function public.change_business_pos_pin(text,text,text) from public,anon,authenticated;
revoke all on function public.revoke_business_pos_session(uuid,uuid,uuid,text) from public,anon,authenticated;
revoke all on function public.create_business_pos_approval_request(text,text,text,text,numeric,numeric) from public,anon,authenticated;
revoke all on function public.decide_business_pos_approval(uuid,uuid,uuid,text,text) from public,anon,authenticated;
revoke all on function public.consume_business_pos_approval(text,uuid,text,text) from public,anon,authenticated;

grant execute on function public.register_business_pos_device(uuid,uuid,uuid,text,text,text) to service_role;
grant execute on function public.revoke_business_pos_device(uuid,uuid,uuid,text) to service_role;
grant execute on function public.issue_business_pos_temporary_pin(uuid,uuid,uuid,text,text) to service_role;
grant execute on function public.revoke_business_pos_credential(uuid,uuid,uuid,text) to service_role;
grant execute on function public.start_business_pos_session(text,text,text,text,text,text,text,text,text) to service_role;
grant execute on function public.change_business_pos_pin(text,text,text) to service_role;
grant execute on function public.revoke_business_pos_session(uuid,uuid,uuid,text) to service_role;
grant execute on function public.create_business_pos_approval_request(text,text,text,text,numeric,numeric) to service_role;
grant execute on function public.decide_business_pos_approval(uuid,uuid,uuid,text,text) to service_role;
grant execute on function public.consume_business_pos_approval(text,uuid,text,text) to service_role;

notify pgrst, 'reload schema';
