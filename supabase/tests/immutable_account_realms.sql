-- Run only against a disposable local/test Supabase database after all migrations.
-- The transaction always rolls back and persists no test identities or tenant data.
begin;

insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at, is_anonymous
)
values
  (
    '31111111-1111-4111-8111-111111111111',
    'authenticated','authenticated','realm-individual@example.invalid','test-only',now(),
    '{"provider":"email","providers":["email"]}'::jsonb,'{}'::jsonb,now(),now(),false
  ),
  (
    '32222222-2222-4222-8222-222222222222',
    'authenticated','authenticated','realm-owner@example.invalid','test-only',now(),
    '{"provider":"email","providers":["email"]}'::jsonb,'{}'::jsonb,now(),now(),false
  ),
  (
    '33333333-3333-4333-8333-333333333333',
    'authenticated','authenticated','realm-employee@example.invalid','test-only',now(),
    '{"provider":"email","providers":["email"]}'::jsonb,'{}'::jsonb,now(),now(),false
  );

set local role authenticated;
select set_config('request.jwt.claim.sub', '31111111-1111-4111-8111-111111111111', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"31111111-1111-4111-8111-111111111111","role":"authenticated","email":"realm-individual@example.invalid"}',
  true
);

select public.claim_account_realm('individual');

do $$
begin
  if public.get_my_account_realm() <> 'individual' then
    raise exception 'Realm contract failure: Individual claim was not persisted.';
  end if;
end;
$$;

insert into public.accounts (
  user_id, name, type, balance, opening_balance_original,
  opening_currency, opening_exchange_rate_to_pkr
)
values (
  '31111111-1111-4111-8111-111111111111',
  'Realm test cash','cash',100,100,'PKR',1
);

do $$
begin
  begin
    perform public.create_business_organization(
      'Forbidden Individual Organization',
      'services',
      'advanced_company',
      'PK',
      'PKR',
      'UTC',
      'solo_business'
    );
    raise exception 'Realm contract failure: Individual identity created a Business organization.';
  exception
    when insufficient_privilege or check_violation then
      null;
  end;
end;
$$;

select set_config('request.jwt.claim.sub', '32222222-2222-4222-8222-222222222222', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"32222222-2222-4222-8222-222222222222","role":"authenticated","email":"realm-owner@example.invalid"}',
  true
);

select public.claim_account_realm('business');

do $$
begin
  begin
    insert into public.accounts (
      user_id, name, type, balance, opening_balance_original,
      opening_currency, opening_exchange_rate_to_pkr
    )
    values (
      '32222222-2222-4222-8222-222222222222',
      'Forbidden Business personal cash','cash',1,1,'PKR',1
    );
    raise exception 'Realm contract failure: Business identity created a personal account.';
  exception
    when insufficient_privilege or check_violation then
      null;
  end;
end;
$$;

do $$
begin
  begin
    perform public.claim_account_realm('individual');
    raise exception 'Realm contract failure: immutable realm was changed.';
  exception
    when insufficient_privilege then
      null;
  end;
end;
$$;

create temporary table realm_test_state (
  business_id uuid,
  invitation_token text
) on commit drop;

insert into realm_test_state(business_id)
select public.create_business_organization(
  'Realm Contract Organization',
  'services',
  'advanced_company',
  'PK',
  'PKR',
  'UTC',
  'growing_business'
);

update realm_test_state
set invitation_token = (
  public.create_business_invitation(
    business_id,
    'realm-employee@example.invalid',
    'viewer',
    '{}'::text[],
    7
  )->>'token'
);

select set_config('request.jwt.claim.sub', '33333333-3333-4333-8333-333333333333', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"33333333-3333-4333-8333-333333333333","role":"authenticated","email":"realm-employee@example.invalid"}',
  true
);

select public.accept_business_invitation(invitation_token)
from realm_test_state;

do $$
declare
  expected_business_id uuid;
begin
  select business_id into expected_business_id from realm_test_state;

  if public.get_my_account_realm() <> 'business' then
    raise exception 'Invitation contract failure: employee realm was not Business.';
  end if;

  if not exists (
    select 1
    from public.business_members membership
    where membership.business_id=expected_business_id
      and membership.user_id='33333333-3333-4333-8333-333333333333'
      and membership.status='active'
      and membership.role='viewer'
  ) then
    raise exception 'Invitation contract failure: active membership was not created.';
  end if;
end;
$$;

rollback;
