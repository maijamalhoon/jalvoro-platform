-- Run only after all billing migrations on a disposable local/test database.
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
  '55555555-5555-4555-8555-555555555555',
  'authenticated',
  'authenticated',
  'paddle-adjustment-contract@example.invalid',
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
    provider_price_id = 'pri_cccccccccccccccccccccccccc',
    updated_at = now()
where code = 'pro_month';

do $$
declare
  account_uuid uuid;
  result jsonb;
  subscription_status text;
  adjustment_status text;
  adjustment_action text;
  adjustment_amount bigint;
  adjustment_currency text;
  review_required boolean;
begin
  select account.id
  into account_uuid
  from billing.accounts account
  where account.account_kind = 'personal'
    and account.owner_user_id = '55555555-5555-4555-8555-555555555555';

  if account_uuid is null then
    raise exception 'Adjustment contract account initialization failed.';
  end if;

  result := public.apply_paddle_webhook_event(
    'evt_11111111111111111111111111',
    'subscription.created',
    '2026-07-24T12:00:00Z'::timestamptz,
    repeat('1', 64),
    account_uuid,
    'ctm_cccccccccccccccccccccccccc',
    'sub_cccccccccccccccccccccccccc',
    'txn_cccccccccccccccccccccccccc',
    'pri_cccccccccccccccccccccccccc',
    'active',
    '2026-07-24T12:00:00Z'::timestamptz,
    '2026-08-24T12:00:00Z'::timestamptz,
    false,
    'PK'
  );

  if result->>'result' <> 'processed' then
    raise exception 'Adjustment prerequisite subscription activation failed: %', result;
  end if;

  result := public.apply_paddle_adjustment_event(
    'evt_22222222222222222222222222',
    'adjustment.created',
    '2026-07-25T12:00:00Z'::timestamptz,
    repeat('2', 64),
    'adj_aaaaaaaaaaaaaaaaaaaaaaaaaa',
    'txn_cccccccccccccccccccccccccc',
    'refund',
    'pending_approval',
    599,
    'USD',
    null,
    'ctm_cccccccccccccccccccccccccc',
    'sub_cccccccccccccccccccccccccc'
  );

  if result->>'result' <> 'processed'
     or result->>'status' <> 'pending_approval'
     or (result->>'requiresReview')::boolean <> true then
    raise exception 'Refund creation was not recorded safely: %', result;
  end if;

  select adjustment.status,
         adjustment.action,
         adjustment.amount_minor,
         adjustment.currency,
         adjustment.requires_review
  into adjustment_status,
       adjustment_action,
       adjustment_amount,
       adjustment_currency,
       review_required
  from billing.adjustments adjustment
  where adjustment.provider = 'paddle'
    and adjustment.provider_adjustment_id = 'adj_aaaaaaaaaaaaaaaaaaaaaaaaaa';

  if adjustment_status <> 'pending_approval'
     or adjustment_action <> 'refund'
     or adjustment_amount <> 599
     or adjustment_currency <> 'USD'
     or review_required <> true then
    raise exception 'Refund record fields are incorrect.';
  end if;

  select status into subscription_status
  from billing.subscriptions
  where account_id = account_uuid;
  if subscription_status <> 'active' then
    raise exception 'Refund event changed subscription access without a subscription event.';
  end if;

  result := public.apply_paddle_adjustment_event(
    'evt_22222222222222222222222222',
    'adjustment.created',
    '2026-07-25T12:00:00Z'::timestamptz,
    repeat('2', 64),
    'adj_aaaaaaaaaaaaaaaaaaaaaaaaaa',
    'txn_cccccccccccccccccccccccccc',
    'refund',
    'pending_approval',
    599,
    'USD',
    null,
    'ctm_cccccccccccccccccccccccccc',
    'sub_cccccccccccccccccccccccccc'
  );

  if result->>'result' <> 'duplicate' then
    raise exception 'Adjustment replay was not treated as a duplicate: %', result;
  end if;

  result := public.apply_paddle_adjustment_event(
    'evt_33333333333333333333333333',
    'adjustment.updated',
    '2026-07-26T12:00:00Z'::timestamptz,
    repeat('3', 64),
    'adj_aaaaaaaaaaaaaaaaaaaaaaaaaa',
    'txn_cccccccccccccccccccccccccc',
    'refund',
    'approved',
    599,
    'USD',
    null,
    'ctm_cccccccccccccccccccccccccc',
    'sub_cccccccccccccccccccccccccc'
  );

  if result->>'result' <> 'processed' or result->>'status' <> 'approved' then
    raise exception 'Approved refund update failed: %', result;
  end if;

  select status into adjustment_status
  from billing.adjustments
  where provider = 'paddle'
    and provider_adjustment_id = 'adj_aaaaaaaaaaaaaaaaaaaaaaaaaa';
  if adjustment_status <> 'approved' then
    raise exception 'Approved refund status was not persisted.';
  end if;

  result := public.apply_paddle_adjustment_event(
    'evt_44444444444444444444444444',
    'adjustment.updated',
    '2026-07-25T11:59:00Z'::timestamptz,
    repeat('4', 64),
    'adj_aaaaaaaaaaaaaaaaaaaaaaaaaa',
    'txn_cccccccccccccccccccccccccc',
    'refund',
    'rejected',
    599,
    'USD',
    null,
    'ctm_cccccccccccccccccccccccccc',
    'sub_cccccccccccccccccccccccccc'
  );

  if result->>'result' <> 'ignored' or result->>'reason' <> 'stale_event' then
    raise exception 'Stale adjustment event was not ignored: %', result;
  end if;

  result := public.apply_paddle_adjustment_event(
    'evt_55555555555555555555555555',
    'adjustment.created',
    '2026-07-27T12:00:00Z'::timestamptz,
    repeat('5', 64),
    'adj_bbbbbbbbbbbbbbbbbbbbbbbbbb',
    'txn_cccccccccccccccccccccccccc',
    'chargeback',
    'approved',
    1199,
    'USD',
    null,
    'ctm_cccccccccccccccccccccccccc',
    'sub_cccccccccccccccccccccccccc'
  );

  if result->>'result' <> 'processed'
     or result->>'action' <> 'chargeback'
     or (result->>'requiresReview')::boolean <> true then
    raise exception 'Chargeback was not recorded for review: %', result;
  end if;

  select status into subscription_status
  from billing.subscriptions
  where account_id = account_uuid;
  if subscription_status <> 'active' then
    raise exception 'Chargeback record changed access without a verified subscription lifecycle event.';
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'billing'
      and table_name = 'adjustments'
      and column_name in (
        'payload', 'raw_payload', 'request_body', 'body', 'reason', 'free_text_reason'
      )
  ) then
    raise exception 'Privacy failure: raw adjustment payload or free-text reason storage exists.';
  end if;
end;
$$;

rollback;
