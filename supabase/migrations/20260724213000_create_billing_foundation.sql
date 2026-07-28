begin;

-- Extend the existing private billing schema created by the platform admin
-- foundation. Do not create a second public billing source of truth.
alter table billing.plans
  add column if not exists plan_family text,
  add column if not exists provider text not null default 'none',
  add column if not exists provider_price_id text;

update billing.plans
set plan_family = case
  when code = 'free' then 'free'
  when code like 'go_%' then 'go'
  when code like 'student_%' then 'student'
  when code like 'plus_%' then 'plus'
  when code like 'pro_%' then 'pro'
  else plan_family
end
where plan_family is null;

alter table billing.plans alter column plan_family set not null;

do $$
begin
  alter table billing.plans
    add constraint billing_plans_family_check
    check (plan_family in ('free', 'go', 'student', 'plus', 'pro'));
exception when duplicate_object then null;
end;
$$;

do $$
begin
  alter table billing.plans
    add constraint billing_plans_provider_check
    check (provider in ('none', 'stripe', 'paddle', 'manual'));
exception when duplicate_object then null;
end;
$$;

do $$
begin
  alter table billing.plans
    add constraint billing_plans_provider_price_check
    check (
      provider_price_id is null
      or char_length(provider_price_id) between 1 and 180
    );
exception when duplicate_object then null;
end;
$$;

alter table billing.customers
  add column if not exists billing_country char(2),
  add column if not exists trial_started_at timestamptz;

alter table billing.subscriptions
  add column if not exists billing_country char(2),
  add column if not exists pricing_tier char(1),
  add column if not exists grace_period_end timestamptz;

do $$
begin
  alter table billing.customers
    add constraint billing_customers_country_check
    check (billing_country is null or billing_country ~ '^[A-Z]{2}$');
exception when duplicate_object then null;
end;
$$;

do $$
begin
  alter table billing.subscriptions
    add constraint billing_subscriptions_country_check
    check (billing_country is null or billing_country ~ '^[A-Z]{2}$');
exception when duplicate_object then null;
end;
$$;

do $$
begin
  alter table billing.subscriptions
    add constraint billing_subscriptions_pricing_tier_check
    check (pricing_tier is null or pricing_tier in ('A', 'B', 'C', 'D', 'E'));
exception when duplicate_object then null;
end;
$$;

create table if not exists billing.regional_prices (
  plan_code text not null references billing.plans(code) on update cascade on delete cascade,
  pricing_tier char(1) not null,
  price_minor bigint not null,
  currency text not null default 'USD',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (plan_code, pricing_tier),
  constraint billing_regional_prices_tier_check
    check (pricing_tier in ('A', 'B', 'C', 'D', 'E')),
  constraint billing_regional_prices_amount_check check (price_minor >= 0),
  constraint billing_regional_prices_currency_check check (currency ~ '^[A-Z]{3}$')
);

create table if not exists billing.plan_features (
  plan_family text not null,
  feature_key text not null,
  enabled boolean not null default true,
  monthly_allowance integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (plan_family, feature_key),
  constraint billing_plan_features_family_check
    check (plan_family in ('free', 'go', 'student', 'plus', 'pro')),
  constraint billing_plan_features_key_check
    check (feature_key in (
      'core_tracking',
      'unlimited_accounts',
      'recurring_transactions',
      'csv_export',
      'advanced_reports',
      'advanced_analytics',
      'ai_insights',
      'forecasting',
      'priority_support'
    )),
  constraint billing_plan_features_allowance_check
    check (monthly_allowance is null or monthly_allowance >= 0)
);

create table if not exists billing.usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  feature_key text not null,
  period_start timestamptz not null,
  period_end timestamptz not null,
  used_quantity integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, feature_key, period_start),
  constraint billing_usage_feature_key_check
    check (char_length(feature_key) between 1 and 80),
  constraint billing_usage_quantity_check check (used_quantity >= 0),
  constraint billing_usage_period_check check (period_end > period_start)
);

create table if not exists billing.student_verifications (
  user_id uuid primary key references auth.users(id) on delete cascade,
  status text not null default 'pending',
  verification_provider text,
  verified_at timestamptz,
  expires_at timestamptz,
  evidence_deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint billing_student_verifications_status_check
    check (status in ('pending', 'verified', 'rejected', 'expired')),
  constraint billing_student_verifications_provider_check
    check (
      verification_provider is null
      or char_length(verification_provider) between 1 and 80
    ),
  constraint billing_student_verifications_expiry_check
    check (expires_at is null or verified_at is null or expires_at > verified_at)
);

alter table billing.regional_prices enable row level security;
alter table billing.plan_features enable row level security;
alter table billing.usage enable row level security;
alter table billing.student_verifications enable row level security;

revoke all on billing.regional_prices, billing.plan_features,
  billing.usage, billing.student_verifications
  from public, anon, authenticated;

grant select, insert, update, delete on billing.regional_prices,
  billing.plan_features, billing.usage, billing.student_verifications
  to service_role;

create policy billing_regional_prices_deny_direct
  on billing.regional_prices for all to anon, authenticated
  using (false) with check (false);
create policy billing_plan_features_deny_direct
  on billing.plan_features for all to anon, authenticated
  using (false) with check (false);
create policy billing_usage_deny_direct
  on billing.usage for all to anon, authenticated
  using (false) with check (false);
create policy billing_student_verifications_deny_direct
  on billing.student_verifications for all to anon, authenticated
  using (false) with check (false);

insert into billing.plans (
  code, name, plan_kind, billing_interval, price_minor, currency,
  plan_family, provider
)
values
  ('go_month', 'Go Monthly', 'paid', 'month', 199, 'USD', 'go', 'none'),
  ('go_year', 'Go Annual', 'paid', 'year', 1800, 'USD', 'go', 'none'),
  ('student_month', 'Student Monthly', 'paid', 'month', 299, 'USD', 'student', 'none'),
  ('student_year', 'Student Annual', 'paid', 'year', 2400, 'USD', 'student', 'none'),
  ('plus_month', 'Plus Monthly', 'paid', 'month', 599, 'USD', 'plus', 'none'),
  ('plus_year', 'Plus Annual', 'paid', 'year', 6000, 'USD', 'plus', 'none'),
  ('pro_month', 'Pro Monthly', 'paid', 'month', 1199, 'USD', 'pro', 'none'),
  ('pro_year', 'Pro Annual', 'paid', 'year', 12000, 'USD', 'pro', 'none')
on conflict (code) do update
set name = excluded.name,
    plan_kind = excluded.plan_kind,
    billing_interval = excluded.billing_interval,
    price_minor = excluded.price_minor,
    currency = excluded.currency,
    plan_family = excluded.plan_family,
    is_active = true,
    updated_at = now();

update billing.plans
set plan_family = 'free', provider = 'none', updated_at = now()
where code = 'free';

insert into billing.regional_prices (
  plan_code, pricing_tier, price_minor, currency
)
values
  ('go_month', 'A', 199, 'USD'),
  ('go_year', 'A', 1800, 'USD'),
  ('student_month', 'A', 299, 'USD'),
  ('student_year', 'A', 2400, 'USD'),
  ('plus_month', 'A', 599, 'USD'),
  ('plus_year', 'A', 6000, 'USD'),
  ('pro_month', 'A', 1199, 'USD'),
  ('pro_year', 'A', 12000, 'USD'),
  ('go_month', 'B', 199, 'USD'),
  ('go_year', 'B', 1800, 'USD'),
  ('student_month', 'B', 249, 'USD'),
  ('student_year', 'B', 2100, 'USD'),
  ('plus_month', 'B', 499, 'USD'),
  ('plus_year', 'B', 4800, 'USD'),
  ('pro_month', 'B', 999, 'USD'),
  ('pro_year', 'B', 9600, 'USD'),
  ('go_month', 'C', 149, 'USD'),
  ('go_year', 'C', 1400, 'USD'),
  ('student_month', 'C', 199, 'USD'),
  ('student_year', 'C', 1800, 'USD'),
  ('plus_month', 'C', 399, 'USD'),
  ('plus_year', 'C', 3600, 'USD'),
  ('pro_month', 'C', 799, 'USD'),
  ('pro_year', 'C', 7200, 'USD'),
  ('go_month', 'D', 149, 'USD'),
  ('go_year', 'D', 1200, 'USD'),
  ('student_month', 'D', 179, 'USD'),
  ('student_year', 'D', 1500, 'USD'),
  ('plus_month', 'D', 299, 'USD'),
  ('plus_year', 'D', 2400, 'USD'),
  ('pro_month', 'D', 599, 'USD'),
  ('pro_year', 'D', 4800, 'USD'),
  ('go_month', 'E', 149, 'USD'),
  ('go_year', 'E', 1200, 'USD'),
  ('student_month', 'E', 179, 'USD'),
  ('student_year', 'E', 1500, 'USD'),
  ('plus_month', 'E', 249, 'USD'),
  ('plus_year', 'E', 2400, 'USD'),
  ('pro_month', 'E', 399, 'USD'),
  ('pro_year', 'E', 3900, 'USD')
on conflict (plan_code, pricing_tier) do update
set price_minor = excluded.price_minor,
    currency = excluded.currency,
    updated_at = now();

insert into billing.plan_features (
  plan_family, feature_key, enabled, monthly_allowance
)
values
  ('free', 'core_tracking', true, null),
  ('go', 'core_tracking', true, null),
  ('go', 'unlimited_accounts', true, null),
  ('go', 'recurring_transactions', true, null),
  ('go', 'csv_export', true, null),
  ('student', 'core_tracking', true, null),
  ('student', 'unlimited_accounts', true, null),
  ('student', 'recurring_transactions', true, null),
  ('student', 'csv_export', true, null),
  ('student', 'advanced_reports', true, null),
  ('student', 'advanced_analytics', true, null),
  ('student', 'ai_insights', true, 25),
  ('plus', 'core_tracking', true, null),
  ('plus', 'unlimited_accounts', true, null),
  ('plus', 'recurring_transactions', true, null),
  ('plus', 'csv_export', true, null),
  ('plus', 'advanced_reports', true, null),
  ('plus', 'advanced_analytics', true, null),
  ('plus', 'ai_insights', true, 60),
  ('pro', 'core_tracking', true, null),
  ('pro', 'unlimited_accounts', true, null),
  ('pro', 'recurring_transactions', true, null),
  ('pro', 'csv_export', true, null),
  ('pro', 'advanced_reports', true, null),
  ('pro', 'advanced_analytics', true, null),
  ('pro', 'ai_insights', true, 200),
  ('pro', 'forecasting', true, null),
  ('pro', 'priority_support', true, null)
on conflict (plan_family, feature_key) do update
set enabled = excluded.enabled,
    monthly_allowance = excluded.monthly_allowance,
    updated_at = now();

create unique index if not exists billing_plans_provider_price_key
  on billing.plans (provider, provider_price_id)
  where provider_price_id is not null;

create index if not exists billing_regional_prices_tier_idx
  on billing.regional_prices (pricing_tier, plan_code);
create index if not exists billing_usage_current_period_idx
  on billing.usage (user_id, feature_key, period_end desc);
create index if not exists billing_student_verifications_status_expiry_idx
  on billing.student_verifications (status, expires_at);

-- Existing shared trigger function only mutates NEW.updated_at.
drop trigger if exists billing_plans_touch_updated_at on billing.plans;
create trigger billing_plans_touch_updated_at
before update on billing.plans
for each row execute function public.touch_updated_at();

drop trigger if exists billing_customers_touch_updated_at on billing.customers;
create trigger billing_customers_touch_updated_at
before update on billing.customers
for each row execute function public.touch_updated_at();

drop trigger if exists billing_subscriptions_touch_updated_at on billing.subscriptions;
create trigger billing_subscriptions_touch_updated_at
before update on billing.subscriptions
for each row execute function public.touch_updated_at();

drop trigger if exists billing_regional_prices_touch_updated_at on billing.regional_prices;
create trigger billing_regional_prices_touch_updated_at
before update on billing.regional_prices
for each row execute function public.touch_updated_at();

drop trigger if exists billing_plan_features_touch_updated_at on billing.plan_features;
create trigger billing_plan_features_touch_updated_at
before update on billing.plan_features
for each row execute function public.touch_updated_at();

drop trigger if exists billing_usage_touch_updated_at on billing.usage;
create trigger billing_usage_touch_updated_at
before update on billing.usage
for each row execute function public.touch_updated_at();

drop trigger if exists billing_student_verifications_touch_updated_at
  on billing.student_verifications;
create trigger billing_student_verifications_touch_updated_at
before update on billing.student_verifications
for each row execute function public.touch_updated_at();

create or replace function public.claim_pro_trial(target_user_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, billing
as $$
declare
  v_now timestamptz := now();
  v_trial_end timestamptz := v_now + interval '14 days';
  v_result jsonb;
begin
  if target_user_id is null then
    raise exception 'missing_user_id' using errcode = '22023';
  end if;

  if exists (
    select 1
    from billing.subscriptions
    where user_id = target_user_id
      and (status <> 'free' or plan_code <> 'free')
  ) then
    raise exception 'subscription_already_active' using errcode = 'P0001';
  end if;

  insert into billing.customers as customer (
    user_id,
    provider,
    provider_customer_id,
    trial_started_at
  ) values (
    target_user_id,
    'none',
    null,
    v_now
  )
  on conflict (user_id) do update
    set trial_started_at = excluded.trial_started_at,
        updated_at = v_now
    where customer.trial_started_at is null;

  if not found then
    raise exception 'trial_already_used' using errcode = 'P0001';
  end if;

  insert into billing.subscriptions as subscription (
    user_id,
    plan_code,
    status,
    provider,
    provider_subscription_id,
    trial_ends_at,
    current_period_start,
    current_period_end,
    cancel_at_period_end,
    pricing_tier
  ) values (
    target_user_id,
    'pro_month',
    'trialing',
    'none',
    null,
    v_trial_end,
    v_now,
    v_trial_end,
    false,
    'C'
  )
  on conflict (user_id) do update
    set plan_code = excluded.plan_code,
        status = excluded.status,
        provider = excluded.provider,
        provider_subscription_id = excluded.provider_subscription_id,
        trial_ends_at = excluded.trial_ends_at,
        current_period_start = excluded.current_period_start,
        current_period_end = excluded.current_period_end,
        cancel_at_period_end = excluded.cancel_at_period_end,
        pricing_tier = coalesce(subscription.pricing_tier, excluded.pricing_tier),
        updated_at = v_now
  returning jsonb_build_object(
    'planCode', plan_code,
    'planKey', 'pro',
    'status', status,
    'trialEndsAt', trial_ends_at,
    'currentPeriodEnd', current_period_end
  ) into v_result;

  return v_result;
end;
$$;

revoke all on function public.claim_pro_trial(uuid)
  from public, anon, authenticated;
grant execute on function public.claim_pro_trial(uuid) to service_role;

comment on table billing.regional_prices is
  'USD-equivalent regional price policy. Provider country overrides remain checkout source of truth.';
comment on table billing.plan_features is
  'Provider-neutral feature entitlement policy by product family.';
comment on table billing.usage is
  'Server-maintained metered feature usage by billing period.';
comment on table billing.student_verifications is
  'Minimal student eligibility result. Verification evidence must be deleted after review.';
comment on function public.claim_pro_trial(uuid) is
  'Service-role-only atomic claim for the one-time 14-day Pro trial.';

commit;
