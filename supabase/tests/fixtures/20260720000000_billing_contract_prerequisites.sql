-- CI-only prerequisite contract for replaying the payment migration slice.
-- This file is copied into a temporary local Supabase workdir by the billing
-- database workflow. It is never pushed to a hosted database as a migration.
begin;

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated, service_role;

create schema if not exists billing;
revoke all on schema billing from public, anon, authenticated;
grant usage on schema billing to service_role;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete restrict,
  name text not null,
  slug text not null unique,
  business_type text not null,
  workspace_mode text not null default 'advanced_company',
  country_code text,
  base_currency text not null default 'PKR',
  timezone text not null default 'UTC',
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint billing_fixture_business_name_check
    check (char_length(btrim(name)) between 2 and 120),
  constraint billing_fixture_business_country_check
    check (country_code is null or country_code ~ '^[A-Z]{2}$'),
  constraint billing_fixture_business_status_check
    check (status in ('active', 'suspended', 'archived')),
  constraint billing_fixture_workspace_mode_check
    check (workspace_mode in ('simple_shop', 'advanced_company'))
);

create table public.business_members (
  business_id uuid not null references public.businesses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (business_id, user_id),
  constraint billing_fixture_member_status_check
    check (status in ('invited', 'active', 'suspended', 'revoked'))
);

alter table public.businesses enable row level security;
alter table public.business_members enable row level security;
revoke all on public.businesses, public.business_members from anon, authenticated;
grant select, insert, update, delete on public.businesses, public.business_members to service_role;

create or replace function public.create_business_workspace_with_mode(
  p_name text,
  p_business_type text,
  p_workspace_mode text default 'advanced_company',
  p_country_code text default null,
  p_base_currency text default 'PKR',
  p_timezone text default 'UTC'
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  current_user_id uuid := auth.uid();
  created_business_id uuid;
  clean_name text := btrim(coalesce(p_name, ''));
  clean_type text := lower(btrim(coalesce(p_business_type, '')));
  clean_mode text := lower(btrim(coalesce(p_workspace_mode, 'advanced_company')));
  clean_country text := nullif(upper(btrim(coalesce(p_country_code, ''))), '');
  generated_slug text;
begin
  if current_user_id is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;
  if char_length(clean_name) not between 2 and 120 then
    raise exception 'invalid_business_name' using errcode = '22023';
  end if;
  if clean_mode not in ('simple_shop', 'advanced_company') then
    raise exception 'invalid_workspace_mode' using errcode = '22023';
  end if;
  if clean_country is not null and clean_country !~ '^[A-Z]{2}$' then
    raise exception 'invalid_country_code' using errcode = '22023';
  end if;

  generated_slug := coalesce(
    nullif(btrim(regexp_replace(lower(clean_name), '[^a-z0-9]+', '-', 'g'), '-'), ''),
    'business'
  ) || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);

  insert into public.businesses (
    owner_user_id,
    name,
    slug,
    business_type,
    workspace_mode,
    country_code,
    base_currency,
    timezone
  ) values (
    current_user_id,
    clean_name,
    generated_slug,
    clean_type,
    clean_mode,
    clean_country,
    upper(btrim(coalesce(p_base_currency, 'PKR'))),
    btrim(coalesce(p_timezone, 'UTC'))
  )
  returning id into created_business_id;

  insert into public.business_members (business_id, user_id, role, status)
  values (created_business_id, current_user_id, 'owner', 'active');

  return created_business_id;
end;
$$;

revoke all on function public.create_business_workspace_with_mode(
  text, text, text, text, text, text
) from public, anon;
grant execute on function public.create_business_workspace_with_mode(
  text, text, text, text, text, text
) to authenticated, service_role;

create table billing.plans (
  code text primary key,
  name text not null,
  plan_kind text not null,
  billing_interval text not null,
  price_minor bigint,
  currency text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint billing_plans_code_check
    check (code ~ '^[a-z0-9][a-z0-9_-]{1,39}$'),
  constraint billing_plans_name_check
    check (char_length(name) between 1 and 80),
  constraint billing_plans_kind_check
    check (plan_kind in ('free', 'paid')),
  constraint billing_plans_interval_check
    check (billing_interval in ('free', 'month', 'year', 'one_time')),
  constraint billing_plans_price_check
    check (price_minor is null or price_minor >= 0),
  constraint billing_plans_currency_check
    check (currency is null or currency ~ '^[A-Z]{3}$'),
  constraint billing_plans_paid_price_check check (
    (plan_kind = 'free' and billing_interval = 'free' and coalesce(price_minor, 0) = 0)
    or (plan_kind = 'paid' and billing_interval in ('month', 'year', 'one_time'))
  )
);

create table billing.customers (
  user_id uuid primary key references auth.users(id) on delete cascade,
  provider text not null,
  provider_customer_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint billing_customers_provider_check
    check (provider in ('none', 'stripe', 'paddle', 'manual')),
  constraint billing_customers_reference_check
    check (provider_customer_id is null or char_length(provider_customer_id) between 1 and 160),
  constraint billing_customers_provider_reference_check check (
    (provider = 'none' and provider_customer_id is null) or provider <> 'none'
  )
);

create unique index billing_customers_provider_reference_key
  on billing.customers (provider, provider_customer_id)
  where provider_customer_id is not null;

create table billing.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  plan_code text not null references billing.plans(code) on update cascade,
  status text not null default 'free',
  provider text not null default 'none',
  provider_subscription_id text,
  trial_ends_at timestamptz,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint billing_subscriptions_status_check check (
    status in ('free', 'trialing', 'active', 'past_due', 'paused', 'cancelled', 'expired', 'incomplete')
  ),
  constraint billing_subscriptions_provider_check
    check (provider in ('none', 'stripe', 'paddle', 'manual')),
  constraint billing_subscriptions_reference_check
    check (provider_subscription_id is null or char_length(provider_subscription_id) between 1 and 180),
  constraint billing_subscriptions_provider_reference_check check (
    (provider = 'none' and provider_subscription_id is null) or provider <> 'none'
  ),
  constraint billing_subscriptions_period_check check (
    current_period_end is null or current_period_start is null or current_period_end >= current_period_start
  )
);

create unique index billing_subscriptions_provider_reference_key
  on billing.subscriptions (provider, provider_subscription_id)
  where provider_subscription_id is not null;

create table billing.webhook_events (
  id bigint generated by default as identity primary key,
  provider text not null,
  provider_event_id text not null,
  event_type text not null,
  processing_status text not null default 'received',
  payload_sha256 text not null,
  error_code text,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  expires_at timestamptz not null default (now() + interval '90 days'),
  constraint billing_webhook_provider_check
    check (provider in ('stripe', 'paddle', 'manual')),
  constraint billing_webhook_event_id_check
    check (char_length(provider_event_id) between 1 and 180),
  constraint billing_webhook_event_type_check
    check (char_length(event_type) between 1 and 120 and event_type !~ '[[:cntrl:]]'),
  constraint billing_webhook_status_check
    check (processing_status in ('received', 'processed', 'ignored', 'failed')),
  constraint billing_webhook_payload_hash_check
    check (payload_sha256 ~ '^[a-f0-9]{64}$'),
  constraint billing_webhook_error_code_check
    check (error_code is null or error_code ~ '^[A-Z0-9_]{1,80}$')
);

create unique index billing_webhook_provider_event_key
  on billing.webhook_events (provider, provider_event_id);

alter table billing.plans enable row level security;
alter table billing.customers enable row level security;
alter table billing.subscriptions enable row level security;
alter table billing.webhook_events enable row level security;
revoke all on billing.plans, billing.customers, billing.subscriptions, billing.webhook_events
  from public, anon, authenticated;
grant select, insert, update, delete
  on billing.plans, billing.customers, billing.subscriptions, billing.webhook_events
  to service_role;
grant usage, select on sequence billing.webhook_events_id_seq to service_role;

insert into billing.plans (code, name, plan_kind, billing_interval, price_minor, currency)
values ('free', 'Free', 'free', 'free', 0, null);

create or replace function private.create_default_billing_subscription()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, billing
as $$
begin
  if coalesce(new.is_anonymous, false) = false then
    insert into billing.subscriptions (user_id, plan_code, status, provider)
    values (new.id, 'free', 'free', 'none')
    on conflict (user_id) do nothing;
  end if;
  return new;
exception when others then
  return new;
end;
$$;

revoke all on function private.create_default_billing_subscription()
  from public, anon, authenticated;
drop trigger if exists create_default_billing_subscription on auth.users;
create trigger create_default_billing_subscription
after insert on auth.users
for each row execute function private.create_default_billing_subscription();

create or replace function private.get_my_billing_snapshot()
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, auth, billing
as $$
declare
  current_user_id uuid := auth.uid();
  result jsonb;
begin
  if current_user_id is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;
  select jsonb_build_object(
    'planCode', plan.code,
    'planName', plan.name,
    'planKind', plan.plan_kind,
    'billingInterval', plan.billing_interval,
    'status', subscription.status,
    'trialEndsAt', subscription.trial_ends_at,
    'currentPeriodEnd', subscription.current_period_end,
    'cancelAtPeriodEnd', subscription.cancel_at_period_end,
    'featurePolicy', 'unlimited'
  )
  into result
  from billing.subscriptions subscription
  join billing.plans plan on plan.code = subscription.plan_code
  where subscription.user_id = current_user_id;
  return result;
end;
$$;

create or replace function public.get_my_billing_snapshot()
returns jsonb
language sql
stable
security invoker
set search_path = pg_catalog, private
as $$
  select private.get_my_billing_snapshot();
$$;

revoke all on function private.get_my_billing_snapshot() from public, anon;
grant execute on function private.get_my_billing_snapshot() to authenticated;
revoke all on function public.get_my_billing_snapshot() from public, anon;
grant execute on function public.get_my_billing_snapshot() to authenticated;

commit;
