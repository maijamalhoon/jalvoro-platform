-- Run only after all billing migrations on a disposable local/test Supabase database.
-- Every identity and billing mutation is rolled back.
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
  '44444444-4444-4444-8444-444444444444',
  'authenticated',
  'authenticated',
  'paddle-lifecycle-contract@example.invalid',
  'test-only',
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{}'::jsonb,
  now(),
  now(),
  false
);

update billing.plans
set provider = 'paddle',
    provider_price_id = 'pri_aaaaaaaaaaaaaaaaaaaaaaaaaa',
    updated_at = now()
where code = 'pro_month';

update billing.plans
set provider = 'paddle',
    provider_price_id = 'pri_bbbbbbbbbbbbbbbbbbbbbbbbbb',
    updated_at = now()
where code = 'growth_month';

do $$
declare
  account_uuid uuid;
  result jsonb;
  current_plan text;
  current_status text;
  current_customer text;
  current_subscription text;
  current_transaction text;
begin
  select account.id
  into account_uuid
  from billing.accounts account
  where account.account_kind = 'personal'
    and account.owner_user_id = '44444444-4444-4444-8444-444444444444';

  if account_uuid is null then
    raise exception 'Personal billing account initialization failed.';
  end if;

  result := public.apply_paddle_webhook_event(
    'evt_aaaaaaaaaaaaaaaaaaaaaaaaaa',
    'subscription.created',
    '2026-07-24T10:00:00Z'::timestamptz,
    repeat('a', 64),
    account_uuid,
    'ctm_aaaaaaaaaaaaaaaaaaaaaaaaaa',
    'sub_aaaaaaaaaaaaaaaaaaaaaaaaaa',
    null,
    'pri_aaaaaaaaaaaaaaaaaaaaaaaaaa',
    'active',
    '2026-07-24T10:00:00Z'::timestamptz,
    '2026-08-24T10:00:00Z'::timestamptz,
    false,
    'PK'
  );

  if result->>'result' <> 'processed'
     or result->>'planCode' <> 'pro_month'
     or result->>'status' <> 'active' then
    raise exception 'Initial subscription event was not processed correctly: %', result;
  end if;

  select subscription.plan_code,
         subscription.status,
         customer.provider_customer_id,
         subscription.provider_subscription_id,
         subscription.provider_transaction_id
  into current_plan,
       current_status,
       current_customer,
       current_subscription,
       current_transaction
  from billing.subscriptions subscription
  left join billing.customers customer on customer.account_id = subscription.account_id
  where subscription.account_id = account_uuid;

  if current_plan <> 'pro_month'
     or current_status <> 'active'
     or current_customer <> 'ctm_aaaaaaaaaaaaaaaaaaaaaaaaaa'
     or current_subscription <> 'sub_aaaaaaaaaaaaaaaaaaaaaaaaaa'
     or current_transaction is not null then
    raise exception 'Provider references or initial state were not persisted correctly.';
  end if;

  result := public.apply_paddle_webhook_event(
    'evt_aaaaaaaaaaaaaaaaaaaaaaaaaa',
    'subscription.created',
    '2026-07-24T10:00:00Z'::timestamptz,
    repeat('a', 64),
    account_uuid,
    'ctm_aaaaaaaaaaaaaaaaaaaaaaaaaa',
    'sub_aaaaaaaaaaaaaaaaaaaaaaaaaa',
    null,
    'pri_aaaaaaaaaaaaaaaaaaaaaaaaaa',
    'active',
    '2026-07-24T10:00:00Z'::timestamptz,
    '2026-08-24T10:00:00Z'::timestamptz,
    false,
    'PK'
  );

  if result->>'result' <> 'duplicate' then
    raise exception 'Webhook replay was not treated as a duplicate: %', result;
  end if;

  result := public.apply_paddle_webhook_event(
    'evt_bbbbbbbbbbbbbbbbbbbbbbbbbb',
    'subscription.paused',
    '2026-07-24T09:59:00Z'::timestamptz,
    repeat('b', 64),
    account_uuid,
    'ctm_aaaaaaaaaaaaaaaaaaaaaaaaaa',
    'sub_aaaaaaaaaaaaaaaaaaaaaaaaaa',
    null,
    'pri_aaaaaaaaaaaaaaaaaaaaaaaaaa',
    'paused',
    null,
    null,
    false,
    'PK'
  );

  if result->>'result' <> 'ignored' or result->>'reason' <> 'stale_event' then
    raise exception 'Out-of-order webhook was not ignored: %', result;
  end if;

  select status into current_status
  from billing.subscriptions
  where account_id = account_uuid;
  if current_status <> 'active' then
    raise exception 'Stale webhook changed active access.';
  end if;

  result := public.apply_paddle_webhook_event(
    'evt_cccccccccccccccccccccccccc',
    'transaction.payment_failed',
    '2026-07-25T10:00:00Z'::timestamptz,
    repeat('c', 64),
    account_uuid,
    'ctm_aaaaaaaaaaaaaaaaaaaaaaaaaa',
    'sub_aaaaaaaaaaaaaaaaaaaaaaaaaa',
    'txn_aaaaaaaaaaaaaaaaaaaaaaaaaa',
    null,
    'past_due',
    null,
    null,
    false,
    'PK'
  );

  if result->>'result' <> 'processed' or result->>'status' <> 'past_due' then
    raise exception 'Failed renewal did not enter past_due: %', result;
  end if;

  select status, provider_transaction_id
  into current_status, current_transaction
  from billing.subscriptions
  where account_id = account_uuid;
  if current_status <> 'past_due'
     or current_transaction <> 'txn_aaaaaaaaaaaaaaaaaaaaaaaaaa' then
    raise exception 'Failed renewal state was not persisted.';
  end if;

  result := public.apply_paddle_webhook_event(
    'evt_dddddddddddddddddddddddddd',
    'subscription.updated',
    '2026-07-26T10:00:00Z'::timestamptz,
    repeat('d', 64),
    account_uuid,
    'ctm_aaaaaaaaaaaaaaaaaaaaaaaaaa',
    'sub_aaaaaaaaaaaaaaaaaaaaaaaaaa',
    null,
    'pri_aaaaaaaaaaaaaaaaaaaaaaaaaa',
    'active',
    '2026-07-26T10:00:00Z'::timestamptz,
    '2026-08-26T10:00:00Z'::timestamptz,
    false,
    'PK'
  );

  if result->>'result' <> 'processed' or result->>'status' <> 'active' then
    raise exception 'Subscription recovery did not restore active state: %', result;
  end if;

  result := public.apply_paddle_webhook_event(
    'evt_eeeeeeeeeeeeeeeeeeeeeeeeee',
    'subscription.updated',
    '2026-07-27T10:00:00Z'::timestamptz,
    repeat('e', 64),
    account_uuid,
    'ctm_aaaaaaaaaaaaaaaaaaaaaaaaaa',
    'sub_aaaaaaaaaaaaaaaaaaaaaaaaaa',
    null,
    'pri_bbbbbbbbbbbbbbbbbbbbbbbbbb',
    'active',
    null,
    null,
    false,
    'PK'
  );

  if result->>'result' <> 'failed' or result->>'reason' <> 'plan_scope_mismatch' then
    raise exception 'Cross-universe plan was not rejected: %', result;
  end if;

  select plan_code, status
  into current_plan, current_status
  from billing.subscriptions
  where account_id = account_uuid;
  if current_plan <> 'pro_month' or current_status <> 'active' then
    raise exception 'Cross-universe event changed the valid subscription.';
  end if;

  result := public.apply_paddle_webhook_event(
    'evt_ffffffffffffffffffffffffff',
    'subscription.updated',
    '2026-07-28T10:00:00Z'::timestamptz,
    repeat('f', 64),
    null,
    null,
    null,
    null,
    'pri_aaaaaaaaaaaaaaaaaaaaaaaaaa',
    'active',
    null,
    null,
    false,
    'PK'
  );

  if result->>'result' <> 'failed' or result->>'reason' <> 'account_not_resolved' then
    raise exception 'Unresolved-account event did not fail safely: %', result;
  end if;

  result := public.apply_paddle_webhook_event(
    'evt_ffffffffffffffffffffffffff',
    'subscription.updated',
    '2026-07-28T10:00:00Z'::timestamptz,
    repeat('f', 64),
    account_uuid,
    'ctm_aaaaaaaaaaaaaaaaaaaaaaaaaa',
    'sub_aaaaaaaaaaaaaaaaaaaaaaaaaa',
    null,
    'pri_aaaaaaaaaaaaaaaaaaaaaaaaaa',
    'active',
    null,
    null,
    false,
    'PK'
  );

  if result->>'result' <> 'processed' then
    raise exception 'A previously failed event could not be retried: %', result;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'billing'
      and table_name = 'webhook_events'
      and column_name in ('payload', 'raw_payload', 'request_body', 'body')
  ) then
    raise exception 'Privacy failure: raw webhook payload storage exists.';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'billing'
      and table_name = 'webhook_events'
      and column_name = 'payload_sha256'
  ) then
    raise exception 'Webhook payload hash audit column is missing.';
  end if;
end;
$$;

rollback;
