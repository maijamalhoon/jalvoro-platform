begin;

create table billing.enterprise_group_members (
  enterprise_group_id uuid not null references billing.enterprise_groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null,
  status text not null default 'active',
  invited_by uuid references auth.users(id) on delete set null,
  joined_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (enterprise_group_id, user_id),
  constraint billing_enterprise_group_members_role_check
    check (role in ('owner', 'admin', 'finance', 'it_admin', 'viewer')),
  constraint billing_enterprise_group_members_status_check
    check (status in ('invited', 'active', 'suspended', 'revoked'))
);

create index billing_enterprise_group_members_user_active_idx
  on billing.enterprise_group_members(user_id, enterprise_group_id)
  where status = 'active';

create trigger billing_enterprise_group_members_touch_updated_at
before update on billing.enterprise_group_members
for each row execute function public.touch_updated_at();

alter table billing.enterprise_group_members enable row level security;
revoke all on billing.enterprise_group_members from public, anon, authenticated;
grant select, insert, update, delete on billing.enterprise_group_members to service_role;
create policy billing_enterprise_group_members_deny_direct
  on billing.enterprise_group_members for all to anon, authenticated
  using (false) with check (false);

insert into billing.enterprise_group_members (
  enterprise_group_id,
  user_id,
  role,
  status,
  invited_by,
  joined_at
)
select group_record.id, group_record.owner_user_id, 'owner', 'active',
  group_record.owner_user_id, group_record.created_at
from billing.enterprise_groups group_record
on conflict (enterprise_group_id, user_id) do nothing;

create or replace function private.create_my_enterprise_billing_group(
  p_name text,
  p_country_code text default null
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, auth, billing
as $$
declare
  v_user_id uuid := auth.uid();
  v_name text := btrim(coalesce(p_name, ''));
  v_country_code text := nullif(upper(btrim(coalesce(p_country_code, ''))), '');
  v_group_id uuid;
  v_account_id uuid;
begin
  if v_user_id is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;

  if char_length(v_name) < 2 or char_length(v_name) > 140 then
    raise exception 'enterprise_name_invalid' using errcode = '22023';
  end if;

  if v_country_code is not null and v_country_code !~ '^[A-Z]{2}$' then
    raise exception 'country_code_invalid' using errcode = '22023';
  end if;

  insert into billing.enterprise_groups (owner_user_id, name, country_code)
  values (v_user_id, v_name, v_country_code)
  returning id into v_group_id;

  insert into billing.enterprise_group_members (
    enterprise_group_id, user_id, role, status, invited_by, joined_at
  ) values (
    v_group_id, v_user_id, 'owner', 'active', v_user_id, now()
  );

  insert into billing.accounts (
    account_kind,
    owner_user_id,
    enterprise_group_id,
    business_system_code,
    display_name,
    billing_country
  ) values (
    'enterprise_group',
    v_user_id,
    v_group_id,
    'enterprise_group',
    v_name,
    v_country_code
  )
  returning id into v_account_id;

  insert into billing.subscriptions (
    account_id,
    user_id,
    plan_code,
    status,
    provider,
    seat_quantity,
    branch_quantity
  ) values (
    v_account_id,
    null,
    'business_free',
    'free',
    'none',
    0,
    0
  );

  return v_group_id;
end;
$$;

create or replace function public.create_my_enterprise_billing_group(
  p_name text,
  p_country_code text default null
)
returns uuid
language sql
security invoker
set search_path = pg_catalog, private
as $$
  select private.create_my_enterprise_billing_group(p_name, p_country_code);
$$;

revoke all on function private.create_my_enterprise_billing_group(text, text)
  from public, anon;
grant execute on function private.create_my_enterprise_billing_group(text, text)
  to authenticated;
revoke all on function public.create_my_enterprise_billing_group(text, text)
  from public, anon;
grant execute on function public.create_my_enterprise_billing_group(text, text)
  to authenticated;

create or replace function private.get_enterprise_group_billing_snapshot(
  target_group_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, auth, billing
as $$
declare
  v_user_id uuid := auth.uid();
  v_snapshot jsonb;
begin
  if v_user_id is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from billing.enterprise_group_members membership
    where membership.enterprise_group_id = target_group_id
      and membership.user_id = v_user_id
      and membership.status = 'active'
  ) then
    raise exception 'enterprise_access_required' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'accountId', account.id,
    'accountKind', account.account_kind,
    'productUniverse', 'enterprise',
    'enterpriseGroupId', account.enterprise_group_id,
    'displayName', account.display_name,
    'planCode', plan.code,
    'planName', plan.name,
    'status', subscription.status,
    'trialEndsAt', subscription.trial_ends_at,
    'currentPeriodEnd', subscription.current_period_end,
    'gracePeriodEnd', subscription.grace_period_end,
    'seatQuantity', subscription.seat_quantity,
    'branchQuantity', subscription.branch_quantity,
    'featurePolicy', 'plan_entitlements',
    'aiEnabled', false
  )
  into v_snapshot
  from billing.accounts account
  join billing.subscriptions subscription on subscription.account_id = account.id
  join billing.plans plan on plan.code = subscription.plan_code
  where account.account_kind = 'enterprise_group'
    and account.enterprise_group_id = target_group_id;

  return v_snapshot;
end;
$$;

create or replace function public.get_enterprise_group_billing_snapshot(
  target_group_id uuid
)
returns jsonb
language sql
stable
security invoker
set search_path = pg_catalog, private
as $$
  select private.get_enterprise_group_billing_snapshot(target_group_id);
$$;

revoke all on function private.get_enterprise_group_billing_snapshot(uuid)
  from public, anon;
grant execute on function private.get_enterprise_group_billing_snapshot(uuid)
  to authenticated;
revoke all on function public.get_enterprise_group_billing_snapshot(uuid)
  from public, anon;
grant execute on function public.get_enterprise_group_billing_snapshot(uuid)
  to authenticated;

comment on table billing.enterprise_group_members is
  'Enterprise billing administration roles, including owner, admin, finance, IT admin, and viewer.';
comment on function public.create_my_enterprise_billing_group(text, text) is
  'Creates an enterprise billing group, owner membership, scoped billing account, and Free pre-contract state.';
comment on function public.get_enterprise_group_billing_snapshot(uuid) is
  'Returns enterprise billing state to an active enterprise group member without exposing private tables.';

commit;
