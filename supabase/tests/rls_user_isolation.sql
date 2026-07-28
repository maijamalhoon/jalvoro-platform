-- Run only against a disposable local/test Supabase database.
-- The transaction always rolls back and persists no test identity or finance data.
begin;

insert into auth.users (
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at
)
values
  (
    '11111111-1111-4111-8111-111111111111',
    'authenticated',
    'authenticated',
    'security-user-a@example.invalid',
    'test-only',
    now(),
    now(),
    now()
  ),
  (
    '22222222-2222-4222-8222-222222222222',
    'authenticated',
    'authenticated',
    'security-user-b@example.invalid',
    'test-only',
    now(),
    now(),
    now()
  );

insert into public.accounts (
  id,
  user_id,
  name,
  type,
  balance,
  opening_balance_original,
  opening_currency,
  opening_exchange_rate_to_pkr
)
values
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    '11111111-1111-4111-8111-111111111111',
    'User A security account',
    'cash',
    100,
    100,
    'PKR',
    1
  ),
  (
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    '22222222-2222-4222-8222-222222222222',
    'User B security account',
    'cash',
    200,
    200,
    'PKR',
    1
  );

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);

-- Realm restrictions are intentionally restrictive and are ANDed with the
-- ownership policies. Claim a valid Individual realm for both fixture users so
-- this test exercises row ownership instead of failing because the caller or
-- reassignment target has no product realm.
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated","email":"security-user-a@example.invalid"}',
  true
);
select public.claim_account_realm('individual');

select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated","email":"security-user-b@example.invalid"}',
  true
);
select public.claim_account_realm('individual');

select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated","email":"security-user-a@example.invalid"}',
  true
);

do $$
begin
  if exists (
    select 1
    from public.accounts
    where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
  ) then
    raise exception 'RLS failure: User A could read User B account.';
  end if;
end;
$$;

do $$
declare
  changed_rows integer;
begin
  update public.accounts
  set name = 'unauthorized update'
  where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  get diagnostics changed_rows = row_count;
  if changed_rows <> 0 then
    raise exception 'RLS failure: User A could update User B account.';
  end if;

  delete from public.accounts
  where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  get diagnostics changed_rows = row_count;
  if changed_rows <> 0 then
    raise exception 'RLS failure: User A could delete User B account.';
  end if;
end;
$$;

do $$
begin
  begin
    insert into public.accounts (
      user_id,
      name,
      type,
      balance,
      opening_balance_original,
      opening_currency,
      opening_exchange_rate_to_pkr
    )
    values (
      '22222222-2222-4222-8222-222222222222',
      'forged owner',
      'cash',
      1,
      1,
      'PKR',
      1
    );
    raise exception 'RLS failure: forged ownership insert succeeded.';
  exception
    when insufficient_privilege or check_violation then
      null;
  end;
end;
$$;

do $$
begin
  begin
    update public.accounts
    set user_id = '22222222-2222-4222-8222-222222222222'
    where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    raise exception 'Ownership failure: owner reassignment succeeded.';
  exception
    when insufficient_privilege or check_violation then
      null;
  end;
end;
$$;

do $$
begin
  begin
    insert into public.transactions (
      user_id,
      account_id,
      type,
      amount,
      amount_original,
      currency,
      exchange_rate_to_pkr,
      date
    )
    values (
      '11111111-1111-4111-8111-111111111111',
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      'expense',
      10,
      10,
      'PKR',
      1,
      current_date
    );
    raise exception 'Integrity failure: User A linked a transaction to User B account.';
  exception
    when foreign_key_violation or insufficient_privilege or check_violation then
      null;
    when raise_exception then
      if sqlerrm <> 'Choose an active account.' then
        raise;
      end if;
  end;
end;
$$;

rollback;
