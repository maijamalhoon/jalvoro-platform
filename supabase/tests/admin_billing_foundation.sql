-- Run only against a disposable local/test Supabase database.
-- The transaction always rolls back and persists no test identities or billing data.
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
values
  (
    '11111111-1111-4111-8111-111111111111',
    'authenticated',
    'authenticated',
    'admin-contract@example.invalid',
    'test-only',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now(),
    false
  ),
  (
    '22222222-2222-4222-8222-222222222222',
    'authenticated',
    'authenticated',
    'member-contract@example.invalid',
    'test-only',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now(),
    false
  );

insert into private.platform_admins (user_id, role)
values ('11111111-1111-4111-8111-111111111111', 'owner');

set local role service_role;
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', '00000000-0000-4000-8000-000000000000',
    'role', 'service_role'
  )::text,
  true
);

do $$
declare
  snapshot jsonb := public.execute_command_center_operation(
    '11111111-1111-4111-8111-111111111111',
    'get_platform_admin_snapshot',
    '{}'::jsonb
  );
begin
  if snapshot->>'adminRole' <> 'owner' then
    raise exception 'Admin contract failure: owner role was not returned.';
  end if;

  if snapshot->>'featurePolicy' <> 'unlimited' then
    raise exception 'Billing contract failure: features were not unlimited.';
  end if;

  if (snapshot->'billing'->>'freeUsers')::bigint < 2 then
    raise exception 'Billing contract failure: existing users were not initialized as free.';
  end if;
end;
$$;

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', '11111111-1111-4111-8111-111111111111',
    'role', 'authenticated'
  )::text,
  true
);

do $$
begin
  begin
    perform 1 from billing.subscriptions;
    raise exception 'Security failure: authenticated role read billing table directly.';
  exception
    when insufficient_privilege then
      null;
  end;
end;
$$;

select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', '22222222-2222-4222-8222-222222222222',
    'role', 'authenticated'
  )::text,
  true
);

do $$
declare
  snapshot jsonb;
begin
  snapshot := public.get_my_billing_snapshot();
  if snapshot->>'status' <> 'free'
     or snapshot->>'featurePolicy' <> 'unlimited' then
    raise exception 'Member billing snapshot contract failed.';
  end if;

  begin
    perform public.get_platform_admin_snapshot();
    raise exception 'Security failure: non-admin opened the platform snapshot.';
  exception
    when insufficient_privilege then
      null;
  end;
end;
$$;

reset role;
rollback;
