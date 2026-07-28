begin;

-- One identity may own personal finance, many businesses, and enterprise groups.
-- Billing therefore belongs to a scoped account rather than directly to one user.

alter table billing.plans
  add column if not exists product_universe text,
  add column if not exists included_seats integer,
  add column if not exists included_branches integer,
  add column if not exists self_serve boolean not null default true;

update billing.plans
set product_universe = 'personal'
where product_universe is null;

alter table billing.plans alter column product_universe set not null;

alter table billing.plans
  drop constraint if exists billing_plans_family_check;
alter table billing.plans
  add constraint billing_plans_family_check check (
    plan_family in (
      'free', 'go', 'student', 'plus', 'pro',
      'business_free', 'solo', 'starter', 'growth', 'scale', 'enterprise'
    )
  );

alter table billing.plans
  add constraint billing_plans_universe_check check (
    product_universe in ('personal', 'business', 'enterprise')
  );

alter table billing.plans
  add constraint billing_plans_seats_check check (
    included_seats is null or included_seats >= 0
  );
alter table billing.plans
  add constraint billing_plans_branches_check check (
    included_branches is null or included_branches >= 0
  );

create table billing.business_systems (
  code text primary key,
  name text not null,
  category text not null,
  description text not null,
  self_serve boolean not null default true,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint billing_business_systems_code_check
    check (code ~ '^[a-z][a-z0-9_]{1,79}$'),
  constraint billing_business_systems_name_check
    check (char_length(name) between 2 and 100),
  constraint billing_business_systems_category_check
    check (category ~ '^[a-z][a-z0-9_]{1,79}$')
);

insert into billing.business_systems (code, name, category, description)
values
  ('simple_shop', 'Simple Shop', 'small_business', 'Fast sales, purchases, stock, cash, returns, expenses, and daily profit.'),
  ('retail_pos', 'Retail & POS', 'retail', 'Dedicated cashier, shift, receipt, stock, return, and retail accounting workflows.'),
  ('restaurant', 'Restaurant', 'hospitality', 'Tables, orders, kitchen flow, recipes, wastage, shifts, and restaurant accounting.'),
  ('dealership', 'Dealership', 'dealership', 'Units, deals, commissions, financing records, inventory, and dealership controls.'),
  ('wholesale_distribution', 'Wholesale & Distribution', 'wholesale', 'Bulk sales, price levels, warehouses, purchasing, dispatch, and receivables.'),
  ('ecommerce', 'E-commerce', 'commerce', 'Orders, channels, fulfilment, returns, inventory, settlements, and profitability.'),
  ('service_business', 'Service Business', 'services', 'Clients, jobs, appointments, quotations, invoices, staff, and service delivery.'),
  ('professional_services', 'Professional Services', 'services', 'Projects, retainers, time, expenses, billing, approvals, and client reporting.'),
  ('construction', 'Construction', 'construction', 'Projects, sites, contractors, budgets, materials, billing, and progress tracking.'),
  ('manufacturing', 'Manufacturing', 'manufacturing', 'Materials, production, work orders, costing, quality, warehouses, and sales.'),
  ('general_company', 'General Company', 'company', 'Company foundation with departments, roles, accounting, CRM, and reporting.'),
  ('enterprise_group', 'Enterprise Group', 'enterprise', 'Multiple companies, central administration, consolidated billing, and group reporting.'),
  ('custom_business', 'Custom Business', 'custom', 'Controlled foundation for a nature-specific system requiring custom configuration.')
on conflict (code) do update
set name = excluded.name,
    category = excluded.category,
    description = excluded.description,
    is_active = true,
    updated_at = now();

create table billing.enterprise_groups (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete restrict,
  name text not null,
  country_code char(2),
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint billing_enterprise_groups_name_check
    check (char_length(btrim(name)) between 2 and 140),
  constraint billing_enterprise_groups_country_check
    check (country_code is null or country_code ~ '^[A-Z]{2}$'),
  constraint billing_enterprise_groups_status_check
    check (status in ('active', 'suspended', 'archived'))
);

create table billing.enterprise_group_businesses (
  enterprise_group_id uuid not null references billing.enterprise_groups(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  added_at timestamptz not null default now(),
  primary key (enterprise_group_id, business_id),
  unique (business_id)
);

create table billing.accounts (
  id uuid primary key default gen_random_uuid(),
  account_kind text not null,
  owner_user_id uuid not null references auth.users(id) on delete restrict,
  business_id uuid references public.businesses(id) on delete cascade,
  enterprise_group_id uuid references billing.enterprise_groups(id) on delete cascade,
  business_system_code text references billing.business_systems(code) on update cascade,
  display_name text not null,
  billing_country char(2),
  pricing_tier char(1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint billing_accounts_kind_check
    check (account_kind in ('personal', 'business', 'enterprise_group')),
  constraint billing_accounts_display_name_check
    check (char_length(btrim(display_name)) between 1 and 140),
  constraint billing_accounts_country_check
    check (billing_country is null or billing_country ~ '^[A-Z]{2}$'),
  constraint billing_accounts_tier_check
    check (pricing_tier is null or pricing_tier in ('A', 'B', 'C', 'D', 'E')),
  constraint billing_accounts_scope_check check (
    (account_kind = 'personal' and business_id is null and enterprise_group_id is null and business_system_code is null)
    or
    (account_kind = 'business' and business_id is not null and enterprise_group_id is null and business_system_code is not null)
    or
    (account_kind = 'enterprise_group' and business_id is null and enterprise_group_id is not null and business_system_code = 'enterprise_group')
  )
);

create unique index billing_accounts_personal_owner_key
  on billing.accounts(owner_user_id)
  where account_kind = 'personal';
create unique index billing_accounts_business_key
  on billing.accounts(business_id)
  where business_id is not null;
create unique index billing_accounts_enterprise_group_key
  on billing.accounts(enterprise_group_id)
  where enterprise_group_id is not null;
create index billing_accounts_owner_kind_idx
  on billing.accounts(owner_user_id, account_kind);

insert into billing.accounts (account_kind, owner_user_id, display_name)
select 'personal', users.id, 'Personal'
from auth.users users
where coalesce(users.is_anonymous, false) = false
on conflict (owner_user_id) where account_kind = 'personal' do nothing;

alter table billing.customers
  add column if not exists id uuid default gen_random_uuid(),
  add column if not exists account_id uuid references billing.accounts(id) on delete cascade;

update billing.customers customer
set account_id = account.id
from billing.accounts account
where account.account_kind = 'personal'
  and account.owner_user_id = customer.user_id
  and customer.account_id is null;

do $$
declare
  primary_key_name text;
begin
  select constraint_name.conname
  into primary_key_name
  from pg_catalog.pg_constraint constraint_name
  where constraint_name.conrelid = 'billing.customers'::regclass
    and constraint_name.contype = 'p';

  if primary_key_name is not null then
    execute format('alter table billing.customers drop constraint %I', primary_key_name);
  end if;
end;
$$;

alter table billing.customers alter column user_id drop not null;
alter table billing.customers alter column id set not null;
alter table billing.customers alter column account_id set not null;
alter table billing.customers add primary key (id);
alter table billing.customers add constraint billing_customers_account_key unique (account_id);
create unique index billing_customers_personal_user_key
  on billing.customers(user_id)
  where user_id is not null;

alter table billing.subscriptions
  add column if not exists account_id uuid references billing.accounts(id) on delete cascade,
  add column if not exists seat_quantity integer not null default 1,
  add column if not exists branch_quantity integer not null default 1;

update billing.subscriptions subscription
set account_id = account.id
from billing.accounts account
where account.account_kind = 'personal'
  and account.owner_user_id = subscription.user_id
  and subscription.account_id is null;

alter table billing.subscriptions
  drop constraint if exists subscriptions_user_id_key;
alter table billing.subscriptions
  drop constraint if exists billing_subscriptions_user_id_key;
alter table billing.subscriptions alter column user_id drop not null;
alter table billing.subscriptions alter column account_id set not null;
alter table billing.subscriptions
  add constraint billing_subscriptions_account_key unique (account_id);
alter table billing.subscriptions
  add constraint billing_subscriptions_seat_quantity_check check (seat_quantity >= 0);
alter table billing.subscriptions
  add constraint billing_subscriptions_branch_quantity_check check (branch_quantity >= 0);
create index billing_subscriptions_user_idx
  on billing.subscriptions(user_id)
  where user_id is not null;

insert into billing.accounts (
  account_kind,
  owner_user_id,
  business_id,
  business_system_code,
  display_name,
  billing_country
)
select
  'business',
  business.owner_user_id,
  business.id,
  case
    when business.workspace_mode = 'simple_shop' then 'simple_shop'
    when business.business_type = 'retail' then 'retail_pos'
    when business.business_type = 'wholesale' then 'wholesale_distribution'
    when business.business_type = 'services' then 'service_business'
    when business.business_type = 'professional_services' then 'professional_services'
    when business.business_type = 'restaurant' then 'restaurant'
    when business.business_type = 'ecommerce' then 'ecommerce'
    when business.business_type = 'construction' then 'construction'
    when business.business_type = 'manufacturing' then 'manufacturing'
    else 'general_company'
  end,
  business.name,
  business.country_code
from public.businesses business
on conflict (business_id) where business_id is not null do nothing;

insert into billing.plans (
  code,
  name,
  plan_kind,
  billing_interval,
  price_minor,
  currency,
  plan_family,
  product_universe,
  provider,
  included_seats,
  included_branches,
  self_serve
)
values
  ('business_free', 'Business Free', 'free', 'free', 0, null, 'business_free', 'business', 'none', 1, 1, true),
  ('solo_month', 'Solo Monthly', 'paid', 'month', 799, 'USD', 'solo', 'business', 'none', 2, 1, true),
  ('solo_year', 'Solo Annual', 'paid', 'year', 7200, 'USD', 'solo', 'business', 'none', 2, 1, true),
  ('starter_month', 'Starter Monthly', 'paid', 'month', 1999, 'USD', 'starter', 'business', 'none', 5, 1, true),
  ('starter_year', 'Starter Annual', 'paid', 'year', 18000, 'USD', 'starter', 'business', 'none', 5, 1, true),
  ('growth_month', 'Growth Monthly', 'paid', 'month', 5900, 'USD', 'growth', 'business', 'none', 15, 3, true),
  ('growth_year', 'Growth Annual', 'paid', 'year', 54000, 'USD', 'growth', 'business', 'none', 15, 3, true),
  ('scale_month', 'Scale Monthly', 'paid', 'month', 14900, 'USD', 'scale', 'business', 'none', 50, 10, true),
  ('scale_year', 'Scale Annual', 'paid', 'year', 138000, 'USD', 'scale', 'business', 'none', 50, 10, true),
  ('enterprise_contract', 'Enterprise Contract', 'paid', 'one_time', null, 'USD', 'enterprise', 'enterprise', 'manual', null, null, false)
on conflict (code) do update
set name = excluded.name,
    plan_kind = excluded.plan_kind,
    billing_interval = excluded.billing_interval,
    price_minor = excluded.price_minor,
    currency = excluded.currency,
    plan_family = excluded.plan_family,
    product_universe = excluded.product_universe,
    included_seats = excluded.included_seats,
    included_branches = excluded.included_branches,
    self_serve = excluded.self_serve,
    is_active = true,
    updated_at = now();

update billing.plans
set product_universe = 'personal'
where plan_family in ('free', 'go', 'student', 'plus', 'pro');

insert into billing.regional_prices (plan_code, pricing_tier, price_minor, currency)
values
  ('solo_month', 'A', 799, 'USD'), ('solo_year', 'A', 7200, 'USD'),
  ('starter_month', 'A', 1999, 'USD'), ('starter_year', 'A', 18000, 'USD'),
  ('growth_month', 'A', 5900, 'USD'), ('growth_year', 'A', 54000, 'USD'),
  ('scale_month', 'A', 14900, 'USD'), ('scale_year', 'A', 138000, 'USD'),
  ('solo_month', 'B', 699, 'USD'), ('solo_year', 'B', 6000, 'USD'),
  ('starter_month', 'B', 1699, 'USD'), ('starter_year', 'B', 14400, 'USD'),
  ('growth_month', 'B', 4900, 'USD'), ('growth_year', 'B', 42000, 'USD'),
  ('scale_month', 'B', 11900, 'USD'), ('scale_year', 'B', 108000, 'USD'),
  ('solo_month', 'C', 499, 'USD'), ('solo_year', 'C', 4500, 'USD'),
  ('starter_month', 'C', 1299, 'USD'), ('starter_year', 'C', 10800, 'USD'),
  ('growth_month', 'C', 3900, 'USD'), ('growth_year', 'C', 33600, 'USD'),
  ('scale_month', 'C', 9900, 'USD'), ('scale_year', 'C', 90000, 'USD'),
  ('solo_month', 'D', 399, 'USD'), ('solo_year', 'D', 3600, 'USD'),
  ('starter_month', 'D', 999, 'USD'), ('starter_year', 'D', 8400, 'USD'),
  ('growth_month', 'D', 2900, 'USD'), ('growth_year', 'D', 25200, 'USD'),
  ('scale_month', 'D', 7900, 'USD'), ('scale_year', 'D', 72000, 'USD'),
  ('solo_month', 'E', 299, 'USD'), ('solo_year', 'E', 2700, 'USD'),
  ('starter_month', 'E', 799, 'USD'), ('starter_year', 'E', 6600, 'USD'),
  ('growth_month', 'E', 2200, 'USD'), ('growth_year', 'E', 19200, 'USD'),
  ('scale_month', 'E', 5900, 'USD'), ('scale_year', 'E', 54000, 'USD')
on conflict (plan_code, pricing_tier) do update
set price_minor = excluded.price_minor,
    currency = excluded.currency,
    updated_at = now();

alter table billing.plan_features
  drop constraint if exists billing_plan_features_family_check;
alter table billing.plan_features
  drop constraint if exists billing_plan_features_key_check;
alter table billing.plan_features
  add constraint billing_plan_features_family_check check (
    plan_family in (
      'free', 'go', 'student', 'plus', 'pro',
      'business_free', 'solo', 'starter', 'growth', 'scale', 'enterprise'
    )
  );
alter table billing.plan_features
  add constraint billing_plan_features_key_check check (
    feature_key in (
      'core_tracking', 'unlimited_accounts', 'recurring_transactions',
      'csv_export', 'advanced_reports', 'advanced_analytics', 'ai_insights',
      'forecasting', 'priority_support', 'business_core', 'invoicing',
      'expenses', 'contacts', 'basic_reports', 'inventory_ready', 'crm_ready',
      'branch_management', 'department_controls', 'approval_workflows',
      'audit_log', 'api_access', 'consolidated_reporting'
    )
  );

-- Business feature policies deliberately contain no AI feature.
insert into billing.plan_features (plan_family, feature_key, enabled, monthly_allowance)
values
  ('business_free', 'business_core', true, null),
  ('business_free', 'invoicing', true, null),
  ('business_free', 'expenses', true, null),
  ('business_free', 'contacts', true, null),
  ('business_free', 'basic_reports', true, null),
  ('solo', 'business_core', true, null),
  ('solo', 'invoicing', true, null),
  ('solo', 'expenses', true, null),
  ('solo', 'contacts', true, null),
  ('solo', 'basic_reports', true, null),
  ('solo', 'inventory_ready', true, null),
  ('solo', 'crm_ready', true, null),
  ('starter', 'business_core', true, null),
  ('starter', 'invoicing', true, null),
  ('starter', 'expenses', true, null),
  ('starter', 'contacts', true, null),
  ('starter', 'basic_reports', true, null),
  ('starter', 'advanced_reports', true, null),
  ('starter', 'inventory_ready', true, null),
  ('starter', 'crm_ready', true, null),
  ('starter', 'approval_workflows', true, null),
  ('growth', 'business_core', true, null),
  ('growth', 'invoicing', true, null),
  ('growth', 'expenses', true, null),
  ('growth', 'contacts', true, null),
  ('growth', 'basic_reports', true, null),
  ('growth', 'advanced_reports', true, null),
  ('growth', 'inventory_ready', true, null),
  ('growth', 'crm_ready', true, null),
  ('growth', 'branch_management', true, null),
  ('growth', 'department_controls', true, null),
  ('growth', 'approval_workflows', true, null),
  ('growth', 'audit_log', true, null),
  ('scale', 'business_core', true, null),
  ('scale', 'advanced_reports', true, null),
  ('scale', 'branch_management', true, null),
  ('scale', 'department_controls', true, null),
  ('scale', 'approval_workflows', true, null),
  ('scale', 'audit_log', true, null),
  ('scale', 'api_access', true, null),
  ('scale', 'priority_support', true, null),
  ('enterprise', 'business_core', true, null),
  ('enterprise', 'advanced_reports', true, null),
  ('enterprise', 'branch_management', true, null),
  ('enterprise', 'department_controls', true, null),
  ('enterprise', 'approval_workflows', true, null),
  ('enterprise', 'audit_log', true, null),
  ('enterprise', 'api_access', true, null),
  ('enterprise', 'consolidated_reporting', true, null),
  ('enterprise', 'priority_support', true, null)
on conflict (plan_family, feature_key) do update
set enabled = excluded.enabled,
    monthly_allowance = excluded.monthly_allowance,
    updated_at = now();

delete from billing.plan_features
where plan_family in ('business_free', 'solo', 'starter', 'growth', 'scale', 'enterprise')
  and feature_key = 'ai_insights';

insert into billing.subscriptions (
  account_id,
  user_id,
  plan_code,
  status,
  provider,
  seat_quantity,
  branch_quantity
)
select account.id, null, 'business_free', 'free', 'none', 1, 1
from billing.accounts account
where account.account_kind = 'business'
on conflict (account_id) do nothing;

create or replace function private.create_default_billing_subscription()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, billing
as $$
declare
  personal_account_id uuid;
begin
  if coalesce(new.is_anonymous, false) = false then
    insert into billing.accounts (account_kind, owner_user_id, display_name)
    values ('personal', new.id, 'Personal')
    on conflict (owner_user_id) where account_kind = 'personal' do update
      set updated_at = now()
    returning id into personal_account_id;

    insert into billing.subscriptions (
      account_id, user_id, plan_code, status, provider, seat_quantity, branch_quantity
    )
    values (personal_account_id, new.id, 'free', 'free', 'none', 1, 1)
    on conflict (account_id) do nothing;
  end if;

  return new;
exception
  when others then
    -- Billing initialization must never block account creation.
    return new;
end;
$$;

create or replace function private.create_business_billing_account()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, billing
as $$
declare
  system_code text;
  created_account_id uuid;
begin
  system_code := case
    when new.workspace_mode = 'simple_shop' then 'simple_shop'
    when new.business_type = 'retail' then 'retail_pos'
    when new.business_type = 'wholesale' then 'wholesale_distribution'
    when new.business_type = 'services' then 'service_business'
    when new.business_type = 'professional_services' then 'professional_services'
    when new.business_type = 'restaurant' then 'restaurant'
    when new.business_type = 'ecommerce' then 'ecommerce'
    when new.business_type = 'construction' then 'construction'
    when new.business_type = 'manufacturing' then 'manufacturing'
    else 'general_company'
  end;

  insert into billing.accounts (
    account_kind, owner_user_id, business_id, business_system_code,
    display_name, billing_country
  ) values (
    'business', new.owner_user_id, new.id, system_code,
    new.name, new.country_code
  )
  on conflict (business_id) where business_id is not null do update
    set display_name = excluded.display_name,
        billing_country = excluded.billing_country,
        business_system_code = excluded.business_system_code,
        updated_at = now()
  returning id into created_account_id;

  insert into billing.subscriptions (
    account_id, user_id, plan_code, status, provider, seat_quantity, branch_quantity
  ) values (
    created_account_id, null, 'business_free', 'free', 'none', 1, 1
  )
  on conflict (account_id) do nothing;

  return new;
end;
$$;

revoke all on function private.create_business_billing_account()
  from public, anon, authenticated;

drop trigger if exists create_business_billing_account on public.businesses;
create trigger create_business_billing_account
after insert on public.businesses
for each row execute function private.create_business_billing_account();

create or replace function private.get_my_billing_snapshot()
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

  select jsonb_build_object(
    'accountId', account.id,
    'accountKind', account.account_kind,
    'productUniverse', plan.product_universe,
    'planCode', plan.code,
    'planName', plan.name,
    'planKind', plan.plan_kind,
    'billingInterval', plan.billing_interval,
    'status', subscription.status,
    'trialEndsAt', subscription.trial_ends_at,
    'currentPeriodEnd', subscription.current_period_end,
    'gracePeriodEnd', subscription.grace_period_end,
    'cancelAtPeriodEnd', subscription.cancel_at_period_end,
    'featurePolicy', 'plan_entitlements'
  )
  into v_snapshot
  from billing.accounts account
  join billing.subscriptions subscription on subscription.account_id = account.id
  join billing.plans plan on plan.code = subscription.plan_code
  where account.account_kind = 'personal'
    and account.owner_user_id = v_user_id;

  return coalesce(
    v_snapshot,
    jsonb_build_object(
      'accountId', null,
      'accountKind', 'personal',
      'productUniverse', 'personal',
      'planCode', 'free',
      'planName', 'Free',
      'planKind', 'free',
      'billingInterval', 'free',
      'status', 'free',
      'trialEndsAt', null,
      'currentPeriodEnd', null,
      'gracePeriodEnd', null,
      'cancelAtPeriodEnd', false,
      'featurePolicy', 'plan_entitlements'
    )
  );
end;
$$;

create or replace function private.get_business_billing_snapshot(target_business_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, auth, billing, public
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
    from public.businesses business
    where business.id = target_business_id
      and (
        business.owner_user_id = v_user_id
        or exists (
          select 1
          from public.business_members membership
          where membership.business_id = business.id
            and membership.user_id = v_user_id
            and membership.status = 'active'
        )
      )
  ) then
    raise exception 'business_access_required' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'accountId', account.id,
    'accountKind', account.account_kind,
    'productUniverse', plan.product_universe,
    'businessId', account.business_id,
    'businessSystemCode', account.business_system_code,
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
  where account.account_kind = 'business'
    and account.business_id = target_business_id;

  return v_snapshot;
end;
$$;

create or replace function public.get_business_billing_snapshot(target_business_id uuid)
returns jsonb
language sql
stable
security invoker
set search_path = pg_catalog, private
as $$
  select private.get_business_billing_snapshot(target_business_id);
$$;

revoke all on function private.get_business_billing_snapshot(uuid) from public, anon;
grant execute on function private.get_business_billing_snapshot(uuid) to authenticated;
revoke all on function public.get_business_billing_snapshot(uuid) from public, anon;
grant execute on function public.get_business_billing_snapshot(uuid) to authenticated;

create or replace function private.claim_my_pro_trial()
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, auth, billing
as $$
declare
  v_user_id uuid := auth.uid();
  v_account_id uuid;
  v_now timestamptz := now();
  v_trial_end timestamptz := v_now + interval '14 days';
  v_result jsonb;
begin
  if v_user_id is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;

  select id into v_account_id
  from billing.accounts
  where account_kind = 'personal' and owner_user_id = v_user_id;

  if v_account_id is null then
    raise exception 'billing_account_missing' using errcode = 'P0001';
  end if;

  if exists (
    select 1 from billing.subscriptions
    where account_id = v_account_id
      and (status <> 'free' or plan_code <> 'free')
  ) then
    raise exception 'subscription_already_active' using errcode = 'P0001';
  end if;

  insert into billing.customers as customer (
    account_id, user_id, provider, provider_customer_id, trial_started_at
  ) values (
    v_account_id, v_user_id, 'none', null, v_now
  )
  on conflict (account_id) do update
    set trial_started_at = excluded.trial_started_at,
        updated_at = v_now
    where customer.trial_started_at is null;

  if not found then
    raise exception 'trial_already_used' using errcode = 'P0001';
  end if;

  insert into billing.subscriptions as subscription (
    account_id, user_id, plan_code, status, provider,
    trial_ends_at, current_period_start, current_period_end,
    cancel_at_period_end, pricing_tier, seat_quantity, branch_quantity
  ) values (
    v_account_id, v_user_id, 'pro_month', 'trialing', 'none',
    v_trial_end, v_now, v_trial_end, false, 'C', 1, 1
  )
  on conflict (account_id) do update
    set plan_code = excluded.plan_code,
        status = excluded.status,
        provider = excluded.provider,
        trial_ends_at = excluded.trial_ends_at,
        current_period_start = excluded.current_period_start,
        current_period_end = excluded.current_period_end,
        cancel_at_period_end = excluded.cancel_at_period_end,
        pricing_tier = coalesce(subscription.pricing_tier, excluded.pricing_tier),
        updated_at = v_now
  returning jsonb_build_object(
    'accountId', account_id,
    'planCode', plan_code,
    'planKey', 'pro',
    'status', status,
    'trialEndsAt', trial_ends_at,
    'currentPeriodEnd', current_period_end
  ) into v_result;

  return v_result;
end;
$$;

create or replace function private.claim_my_business_growth_trial(target_business_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, auth, billing, public
as $$
declare
  v_user_id uuid := auth.uid();
  v_account_id uuid;
  v_now timestamptz := now();
  v_trial_end timestamptz := v_now + interval '14 days';
  v_result jsonb;
begin
  if v_user_id is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;

  select account.id into v_account_id
  from billing.accounts account
  join public.businesses business on business.id = account.business_id
  where account.account_kind = 'business'
    and account.business_id = target_business_id
    and business.owner_user_id = v_user_id;

  if v_account_id is null then
    raise exception 'business_owner_required' using errcode = '42501';
  end if;

  if exists (
    select 1 from billing.subscriptions
    where account_id = v_account_id
      and (status <> 'free' or plan_code <> 'business_free')
  ) then
    raise exception 'subscription_already_active' using errcode = 'P0001';
  end if;

  insert into billing.customers as customer (
    account_id, user_id, provider, provider_customer_id, trial_started_at
  ) values (
    v_account_id, null, 'none', null, v_now
  )
  on conflict (account_id) do update
    set trial_started_at = excluded.trial_started_at,
        updated_at = v_now
    where customer.trial_started_at is null;

  if not found then
    raise exception 'trial_already_used' using errcode = 'P0001';
  end if;

  insert into billing.subscriptions as subscription (
    account_id, user_id, plan_code, status, provider,
    trial_ends_at, current_period_start, current_period_end,
    cancel_at_period_end, pricing_tier, seat_quantity, branch_quantity
  ) values (
    v_account_id, null, 'growth_month', 'trialing', 'none',
    v_trial_end, v_now, v_trial_end, false, 'C', 15, 3
  )
  on conflict (account_id) do update
    set plan_code = excluded.plan_code,
        status = excluded.status,
        provider = excluded.provider,
        trial_ends_at = excluded.trial_ends_at,
        current_period_start = excluded.current_period_start,
        current_period_end = excluded.current_period_end,
        cancel_at_period_end = excluded.cancel_at_period_end,
        seat_quantity = excluded.seat_quantity,
        branch_quantity = excluded.branch_quantity,
        pricing_tier = coalesce(subscription.pricing_tier, excluded.pricing_tier),
        updated_at = v_now
  returning jsonb_build_object(
    'accountId', account_id,
    'businessId', target_business_id,
    'planCode', plan_code,
    'planKey', 'growth',
    'status', status,
    'trialEndsAt', trial_ends_at,
    'currentPeriodEnd', current_period_end,
    'aiEnabled', false
  ) into v_result;

  return v_result;
end;
$$;

create or replace function public.claim_my_business_growth_trial(target_business_id uuid)
returns jsonb
language sql
security invoker
set search_path = pg_catalog, private
as $$
  select private.claim_my_business_growth_trial(target_business_id);
$$;

revoke all on function private.claim_my_business_growth_trial(uuid) from public, anon;
grant execute on function private.claim_my_business_growth_trial(uuid) to authenticated;
revoke all on function public.claim_my_business_growth_trial(uuid) from public, anon;
grant execute on function public.claim_my_business_growth_trial(uuid) to authenticated;

alter table billing.business_systems enable row level security;
alter table billing.enterprise_groups enable row level security;
alter table billing.enterprise_group_businesses enable row level security;
alter table billing.accounts enable row level security;

revoke all on billing.business_systems, billing.enterprise_groups,
  billing.enterprise_group_businesses, billing.accounts
  from public, anon, authenticated;
grant select, insert, update, delete on billing.business_systems,
  billing.enterprise_groups, billing.enterprise_group_businesses, billing.accounts
  to service_role;

create policy billing_business_systems_deny_direct
  on billing.business_systems for all to anon, authenticated
  using (false) with check (false);
create policy billing_enterprise_groups_deny_direct
  on billing.enterprise_groups for all to anon, authenticated
  using (false) with check (false);
create policy billing_enterprise_group_businesses_deny_direct
  on billing.enterprise_group_businesses for all to anon, authenticated
  using (false) with check (false);
create policy billing_accounts_deny_direct
  on billing.accounts for all to anon, authenticated
  using (false) with check (false);

create trigger billing_business_systems_touch_updated_at
before update on billing.business_systems
for each row execute function public.touch_updated_at();
create trigger billing_enterprise_groups_touch_updated_at
before update on billing.enterprise_groups
for each row execute function public.touch_updated_at();
create trigger billing_accounts_touch_updated_at
before update on billing.accounts
for each row execute function public.touch_updated_at();

comment on table billing.accounts is
  'Scoped billing owner for one personal identity, business workspace, or enterprise group.';
comment on table billing.business_systems is
  'Nature-specific operating systems. Business systems may share verified primitives but remain distinct products.';
comment on function public.get_business_billing_snapshot(uuid) is
  'Returns billing state for an authorized member without exposing private billing tables.';
comment on function public.claim_my_business_growth_trial(uuid) is
  'Owner-only one-time Growth trial for one business billing account; business AI remains disabled.';

commit;
