begin;

-- Refunds, credits, and chargebacks are immutable provider financial records.
-- Store only normalized references and totals; never retain the raw webhook or
-- Paddle's free-text adjustment reason.
create table billing.adjustments (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references billing.accounts(id) on delete cascade,
  provider text not null default 'paddle',
  provider_adjustment_id text not null,
  provider_transaction_id text not null,
  provider_subscription_id text,
  action text not null,
  status text not null,
  amount_minor bigint not null,
  currency char(3) not null,
  requires_review boolean not null default false,
  provider_event_occurred_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint billing_adjustments_provider_check check (provider = 'paddle'),
  constraint billing_adjustments_reference_check check (
    provider_adjustment_id ~ '^adj_[a-z0-9]{26}$'
    and provider_transaction_id ~ '^txn_[a-z0-9]{26}$'
    and (
      provider_subscription_id is null
      or provider_subscription_id ~ '^sub_[a-z0-9]{26}$'
    )
  ),
  constraint billing_adjustments_action_check check (
    action ~ '^[a-z][a-z_]{1,39}$'
  ),
  constraint billing_adjustments_status_check check (
    status ~ '^[a-z][a-z_]{1,39}$'
  ),
  constraint billing_adjustments_amount_check check (amount_minor >= 0),
  constraint billing_adjustments_currency_check check (currency ~ '^[A-Z]{3}$'),
  unique (provider, provider_adjustment_id)
);

create index billing_adjustments_account_occurred_idx
  on billing.adjustments(account_id, provider_event_occurred_at desc);
create index billing_adjustments_transaction_idx
  on billing.adjustments(provider, provider_transaction_id);
create index billing_adjustments_review_idx
  on billing.adjustments(requires_review, status, provider_event_occurred_at desc)
  where requires_review;

alter table billing.adjustments enable row level security;
revoke all on billing.adjustments from public, anon, authenticated;
grant select, insert, update, delete on billing.adjustments to service_role;

create policy billing_adjustments_deny_direct
  on billing.adjustments for all to anon, authenticated
  using (false) with check (false);

create trigger billing_adjustments_touch_updated_at
before update on billing.adjustments
for each row execute function public.touch_updated_at();

create or replace function private.apply_paddle_adjustment_event(
  p_event_id text,
  p_event_type text,
  p_occurred_at timestamptz,
  p_payload_sha256 text,
  p_provider_adjustment_id text,
  p_provider_transaction_id text,
  p_action text,
  p_status text,
  p_amount_minor bigint,
  p_currency char(3),
  p_account_id uuid default null,
  p_provider_customer_id text default null,
  p_provider_subscription_id text default null
)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, billing
as $$
declare
  v_account billing.accounts%rowtype;
  v_existing_adjustment billing.adjustments%rowtype;
  v_existing_event_status text;
  v_requires_review boolean;
begin
  if p_event_id is null or p_event_id !~ '^evt_[a-z0-9]{26}$' then
    raise exception 'invalid_event_id' using errcode = '22023';
  end if;
  if p_event_type not in ('adjustment.created', 'adjustment.updated') then
    raise exception 'unsupported_adjustment_event' using errcode = '22023';
  end if;
  if p_occurred_at is null then
    raise exception 'missing_occurred_at' using errcode = '22023';
  end if;
  if p_payload_sha256 is null or p_payload_sha256 !~ '^[a-f0-9]{64}$' then
    raise exception 'invalid_payload_hash' using errcode = '22023';
  end if;
  if p_provider_adjustment_id is null
     or p_provider_adjustment_id !~ '^adj_[a-z0-9]{26}$' then
    raise exception 'invalid_adjustment_reference' using errcode = '22023';
  end if;
  if p_provider_transaction_id is null
     or p_provider_transaction_id !~ '^txn_[a-z0-9]{26}$' then
    raise exception 'invalid_transaction_reference' using errcode = '22023';
  end if;
  if p_provider_customer_id is not null
     and p_provider_customer_id !~ '^ctm_[a-z0-9]{26}$' then
    raise exception 'invalid_customer_reference' using errcode = '22023';
  end if;
  if p_provider_subscription_id is not null
     and p_provider_subscription_id !~ '^sub_[a-z0-9]{26}$' then
    raise exception 'invalid_subscription_reference' using errcode = '22023';
  end if;
  if p_action is null or p_action !~ '^[a-z][a-z_]{1,39}$' then
    raise exception 'invalid_adjustment_action' using errcode = '22023';
  end if;
  if p_status is null or p_status !~ '^[a-z][a-z_]{1,39}$' then
    raise exception 'invalid_adjustment_status' using errcode = '22023';
  end if;
  if p_amount_minor is null or p_amount_minor < 0 then
    raise exception 'invalid_adjustment_amount' using errcode = '22023';
  end if;
  if p_currency is null or p_currency !~ '^[A-Z]{3}$' then
    raise exception 'invalid_adjustment_currency' using errcode = '22023';
  end if;

  insert into billing.webhook_events (
    provider,
    provider_event_id,
    event_type,
    processing_status,
    payload_sha256
  ) values (
    'paddle',
    p_event_id,
    p_event_type,
    'received',
    p_payload_sha256
  )
  on conflict (provider, provider_event_id) do nothing;

  if not found then
    select processing_status into v_existing_event_status
    from billing.webhook_events
    where provider = 'paddle' and provider_event_id = p_event_id
    for update;

    if v_existing_event_status <> 'failed' then
      return jsonb_build_object('result', 'duplicate', 'eventId', p_event_id);
    end if;

    update billing.webhook_events
    set processing_status = 'received',
        error_code = null,
        processed_at = null,
        received_at = now(),
        payload_sha256 = p_payload_sha256
    where provider = 'paddle' and provider_event_id = p_event_id;
  end if;

  if p_account_id is not null then
    select * into v_account
    from billing.accounts
    where id = p_account_id;
  elsif p_provider_subscription_id is not null then
    select account.* into v_account
    from billing.subscriptions subscription
    join billing.accounts account on account.id = subscription.account_id
    where subscription.provider = 'paddle'
      and subscription.provider_subscription_id = p_provider_subscription_id;
  elsif p_provider_customer_id is not null then
    select account.* into v_account
    from billing.customers customer
    join billing.accounts account on account.id = customer.account_id
    where customer.provider = 'paddle'
      and customer.provider_customer_id = p_provider_customer_id;
  else
    select account.* into v_account
    from billing.subscriptions subscription
    join billing.accounts account on account.id = subscription.account_id
    where subscription.provider = 'paddle'
      and subscription.provider_transaction_id = p_provider_transaction_id;
  end if;

  if v_account.id is null then
    update billing.webhook_events
    set processing_status = 'failed',
        error_code = 'ACCOUNT_NOT_RESOLVED',
        processed_at = now()
    where provider = 'paddle' and provider_event_id = p_event_id;
    return jsonb_build_object('result', 'failed', 'reason', 'account_not_resolved');
  end if;

  select * into v_existing_adjustment
  from billing.adjustments
  where provider = 'paddle'
    and provider_adjustment_id = p_provider_adjustment_id
  for update;

  if v_existing_adjustment.id is not null
     and v_existing_adjustment.provider_event_occurred_at > p_occurred_at then
    update billing.webhook_events
    set processing_status = 'ignored',
        error_code = 'STALE_EVENT',
        processed_at = now()
    where provider = 'paddle' and provider_event_id = p_event_id;
    return jsonb_build_object('result', 'ignored', 'reason', 'stale_event');
  end if;

  v_requires_review := p_action in (
    'refund',
    'chargeback',
    'chargeback_warning'
  ) and p_status not in ('rejected', 'reversed');

  insert into billing.adjustments as adjustment (
    account_id,
    provider,
    provider_adjustment_id,
    provider_transaction_id,
    provider_subscription_id,
    action,
    status,
    amount_minor,
    currency,
    requires_review,
    provider_event_occurred_at
  ) values (
    v_account.id,
    'paddle',
    p_provider_adjustment_id,
    p_provider_transaction_id,
    p_provider_subscription_id,
    p_action,
    p_status,
    p_amount_minor,
    p_currency,
    v_requires_review,
    p_occurred_at
  )
  on conflict (provider, provider_adjustment_id) do update
  set account_id = excluded.account_id,
      provider_transaction_id = excluded.provider_transaction_id,
      provider_subscription_id = excluded.provider_subscription_id,
      action = excluded.action,
      status = excluded.status,
      amount_minor = excluded.amount_minor,
      currency = excluded.currency,
      requires_review = excluded.requires_review,
      provider_event_occurred_at = excluded.provider_event_occurred_at,
      updated_at = now()
  where adjustment.provider_event_occurred_at <= excluded.provider_event_occurred_at;

  update billing.webhook_events
  set processing_status = 'processed',
      processed_at = now(),
      error_code = null
  where provider = 'paddle' and provider_event_id = p_event_id;

  return jsonb_build_object(
    'result', 'processed',
    'eventId', p_event_id,
    'accountId', v_account.id,
    'adjustmentId', p_provider_adjustment_id,
    'action', p_action,
    'status', p_status,
    'requiresReview', v_requires_review
  );
exception
  when others then
    update billing.webhook_events
    set processing_status = 'failed',
        error_code = coalesce(error_code, 'PROCESSING_ERROR'),
        processed_at = now()
    where provider = 'paddle' and provider_event_id = p_event_id;
    return jsonb_build_object('result', 'failed', 'reason', 'processing_error');
end;
$$;

create or replace function public.apply_paddle_adjustment_event(
  p_event_id text,
  p_event_type text,
  p_occurred_at timestamptz,
  p_payload_sha256 text,
  p_provider_adjustment_id text,
  p_provider_transaction_id text,
  p_action text,
  p_status text,
  p_amount_minor bigint,
  p_currency char(3),
  p_account_id uuid default null,
  p_provider_customer_id text default null,
  p_provider_subscription_id text default null
)
returns jsonb
language sql
security invoker
set search_path = pg_catalog, private
as $$
  select private.apply_paddle_adjustment_event(
    p_event_id,
    p_event_type,
    p_occurred_at,
    p_payload_sha256,
    p_provider_adjustment_id,
    p_provider_transaction_id,
    p_action,
    p_status,
    p_amount_minor,
    p_currency,
    p_account_id,
    p_provider_customer_id,
    p_provider_subscription_id
  );
$$;

revoke all on function private.apply_paddle_adjustment_event(
  text, text, timestamptz, text, text, text, text, text, bigint, char,
  uuid, text, text
) from public, anon, authenticated;
grant execute on function private.apply_paddle_adjustment_event(
  text, text, timestamptz, text, text, text, text, text, bigint, char,
  uuid, text, text
) to service_role;

revoke all on function public.apply_paddle_adjustment_event(
  text, text, timestamptz, text, text, text, text, text, bigint, char,
  uuid, text, text
) from public, anon, authenticated;
grant execute on function public.apply_paddle_adjustment_event(
  text, text, timestamptz, text, text, text, text, text, bigint, char,
  uuid, text, text
) to service_role;

comment on table billing.adjustments is
  'Private normalized Paddle refunds, credits, and chargebacks. Raw payloads and free-text reasons are never stored.';
comment on function public.apply_paddle_adjustment_event(
  text, text, timestamptz, text, text, text, text, text, bigint, char,
  uuid, text, text
) is 'Service-role-only idempotent adjustment processing that never changes subscription access directly.';

commit;
