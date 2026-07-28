-- Run only against a disposable local/test Supabase database after migrations.
-- The transaction rolls back every test identity, business, and billing mutation.
begin;

insert into auth.users (
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  is_anonymous
)
values (
  '33333333-3333-4333-8333-333333333333',
  'authenticated',
  'authenticated',
  'regional-billing-contract@example.invalid',
  'test-only',
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{}'::jsonb,
  now(),
  now(),
  false
);

do $$
begin
  if (select count(*) from billing.plans where is_active) < 19 then
    raise exception 'Plan seed failure: expected personal, business, and enterprise plans.';
  end if;

  if (select count(*) from billing.regional_prices) <> 80 then
    raise exception 'Regional price seed failure: expected 80 personal and business tier rows.';
  end if;

  if (select count(*) from billing.business_systems where is_active) < 13 then
    raise exception 'Business system seed failure.';
  end if;

  if not exists (
    select 1
    from billing.plan_features
    where plan_family = 'student'
      and feature_key = 'ai_insights'
      and enabled
      and monthly_allowance = 25
  ) then
    raise exception 'Student entitlement seed failure.';
  end if;

  if exists (
    select 1
    from billing.plan_features
    where plan_family in (
      'business_free', 'solo', 'starter', 'growth', 'scale', 'enterprise'
    )
      and feature_key = 'ai_insights'
  ) then
    raise exception 'Privacy failure: a business plan received an AI entitlement.';
  end if;

  if not exists (
    select 1
    from billing.accounts
    where account_kind = 'personal'
      and owner_user_id = '33333333-3333-4333-8333-333333333333'
  ) then
    raise exception 'Personal billing account was not initialized.';
  end if;
end;
$$;

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '33333333-3333-4333-8333-333333333333',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

do $$
declare
  personal_result jsonb;
  personal_snapshot jsonb;
  business_result jsonb;
  business_snapshot jsonb;
  enterprise_snapshot jsonb;
  created_business_id uuid;
  created_enterprise_group_id uuid;
  personal_duplicate_rejected boolean := false;
  business_duplicate_rejected boolean := false;
begin
  personal_result := public.claim_my_pro_trial();

  if personal_result->>'planKey' <> 'pro'
     or personal_result->>'status' <> 'trialing'
     or personal_result->>'planCode' <> 'pro_month' then
    raise exception 'Personal trial claim contract failure.';
  end if;

  begin
    perform public.claim_my_pro_trial();
  exception when others then
    personal_duplicate_rejected := true;
  end;

  if not personal_duplicate_rejected then
    raise exception 'Personal trial replay failure.';
  end if;

  personal_snapshot := public.get_my_billing_snapshot();
  if personal_snapshot->>'status' <> 'trialing'
     or personal_snapshot->>'planCode' <> 'pro_month'
     or personal_snapshot->>'accountKind' <> 'personal'
     or personal_snapshot->>'productUniverse' <> 'personal' then
    raise exception 'Personal billing snapshot did not reflect the scoped trial.';
  end if;

  created_business_id := public.create_business_workspace_with_mode(
    'Regional Billing Test Company',
    'services',
    'advanced_company',
    'PK',
    'PKR',
    'UTC'
  );

  business_snapshot := public.get_business_billing_snapshot(created_business_id);
  if business_snapshot->>'planCode' <> 'business_free'
     or business_snapshot->>'status' <> 'free'
     or business_snapshot->>'accountKind' <> 'business'
     or business_snapshot->>'productUniverse' <> 'business'
     or business_snapshot->>'businessSystemCode' <> 'service_business'
     or (business_snapshot->>'aiEnabled')::boolean <> false then
    raise exception 'Business Free scoped billing initialization failed.';
  end if;

  business_result := public.claim_my_business_growth_trial(created_business_id);
  if business_result->>'planKey' <> 'growth'
     or business_result->>'status' <> 'trialing'
     or business_result->>'planCode' <> 'growth_month'
     or (business_result->>'aiEnabled')::boolean <> false then
    raise exception 'Business Growth trial contract failure.';
  end if;

  begin
    perform public.claim_my_business_growth_trial(created_business_id);
  exception when others then
    business_duplicate_rejected := true;
  end;

  if not business_duplicate_rejected then
    raise exception 'Business trial replay failure.';
  end if;

  business_snapshot := public.get_business_billing_snapshot(created_business_id);
  if business_snapshot->>'status' <> 'trialing'
     or business_snapshot->>'planCode' <> 'growth_month'
     or business_snapshot->>'seatQuantity' <> '15'
     or business_snapshot->>'branchQuantity' <> '3' then
    raise exception 'Business billing snapshot did not reflect the Growth trial.';
  end if;

  created_enterprise_group_id := public.create_my_enterprise_billing_group(
    'Regional Billing Enterprise Group',
    'PK'
  );

  enterprise_snapshot := public.get_enterprise_group_billing_snapshot(
    created_enterprise_group_id
  );

  if enterprise_snapshot->>'accountKind' <> 'enterprise_group'
     or enterprise_snapshot->>'productUniverse' <> 'enterprise'
     or enterprise_snapshot->>'planCode' <> 'business_free'
     or enterprise_snapshot->>'status' <> 'free'
     or (enterprise_snapshot->>'aiEnabled')::boolean <> false then
    raise exception 'Enterprise scoped billing initialization failed.';
  end if;

  begin
    perform 1 from billing.accounts;
    raise exception 'Security failure: authenticated role read private billing accounts.';
  exception
    when insufficient_privilege then
      null;
  end;
end;
$$;

reset role;

do $$
begin
  if (
    select count(*)
    from billing.accounts
    where owner_user_id = '33333333-3333-4333-8333-333333333333'
  ) <> 3 then
    raise exception 'Multiverse isolation failure: expected personal, business, and enterprise accounts.';
  end if;
end;
$$;

rollback;
