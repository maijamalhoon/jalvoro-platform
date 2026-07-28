begin;

-- Provider events are applied in occurred_at order because Paddle does not
-- guarantee delivery order. Raw provider payloads are never stored.
alter table billing.subscriptions
  add column if not exists provider_event_occurred_at timestamptz,
  add column if not exists provider_transaction_id text;

alter table billing.subscriptions
  add constraint billing_subscriptions_transaction_reference_check
  check (
    provider_transaction_id is null
    or provider_transaction_id ~ '^txn_[a-z0-9]{26}$'
  );

create index if not exists billing_subscriptions_provider_transaction_idx
  on billing.subscriptions(provider, provider_transaction_id)
  where provider_transaction_id is not null;

create or replace function private.apply_paddle_webhook_event(
  p_event_id text,
  p_event_type text,
  p_occurred_at timestamptz,
  p_payload_sha256 text,
  p_account_id uuid default null,
  p_provider_customer_id text default null,
  p_provider_subscription_id text default null,
  p_provider_transaction_id text default null,
  p_provider_price_id text default null,
  p_status text default null,
  p_period_start timestamptz default null,
  p_period_end timestamptz default null,
  p_cancel_at_period_end boolean default false,
  p_billing_country char(2) default null
)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, billing
as $$
declare
  v_account billing.accounts%rowtype;
  v_plan billing.plans%rowtype;
  v_subscription billing.subscriptions%rowtype;
  v_status text;
  v_existing_event_status text;
  v_event_supported boolean;
begin
  if p_event_id is null or p_event_id !~ '^evt_[a-z0-9]{26}$' then
    raise exception 'invalid_event_id' using errcode = '22023';
  end if;
  if p_event_type is null or char_length(p_event_type) > 120 then
    raise exception 'invalid_event_type' using errcode = '22023';
  end if;
  if p_occurred_at is null then
    raise exception 'missing_occurred_at' using errcode = '22023';
  end if;
  if p_payload_sha256 is null or p_payload_sha256 !~ '^[a-f0-9]{64}$' then
    raise exception 'invalid_payload_hash' using errcode = '22023';
  end if;
  if p_provider_customer_id is not null
     and p_provider_customer_id !~ '^ctm_[a-z0-9]{26}$' then
    raise exception 'invalid_customer_reference' using errcode = '22023';
  end if;
  if p_provider_subscription_id is not null
     and p_provider_subscription_id !~ '^sub_[a-z0-9]{26}$' then
    raise exception 'invalid_subscription_reference' using errcode = '22023';
  end if;
  if p_provider_transaction_id is not null
     and p_provider_transaction_id !~ '^txn_[a-z0-9]{26}$' then
    raise exception 'invalid_transaction_reference' using errcode = '22023';
  end if;
  if p_provider_price_id is not null
     and p_provider_price_id !~ '^pri_[a-z0-9]{26}$' then
    raise exception 'invalid_price_reference' using errcode = '22023';
  end if;
  if p_billing_country is not null and p_billing_country !~ '^[A-Z]{2}$' then
    raise exception 'invalid_billing_country' using errcode = '22023';
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

  v_event_supported := p_event_type in (
    'subscription.created',
    'subscription.updated',
    'subscription.activated',
    'subscription.trialing',
    'subscription.past_due',
    'subscription.paused',
    'subscription.resumed',
    'subscription.canceled',
    'transaction.completed',
    'transaction.past_due',
    'transaction.payment_failed'
  );

  if not v_event_supported then
    update billing.webhook_events
    set processing_status = 'ignored',
        error_code = 'UNSUPPORTED_EVENT',
        processed_at = now()
    where provider = 'paddle' and provider_event_id = p_event_id;
    return jsonb_build_object('result', 'ignored', 'reason', 'unsupported_event');
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
  end if;

  if v_account.id is null then
    update billing.webhook_events
    set processing_status = 'failed',
        error_code = 'ACCOUNT_NOT_RESOLVED',
        processed_at = now()
    where provider = 'paddle' and provider_event_id = p_event_id;
    return jsonb_build_object('result', 'failed', 'reason', 'account_not_resolved');
  end if;

  if p_provider_price_id is not null then
    select * into v_plan
    from billing.plans
    where provider = 'paddle'
      and provider_price_id = p_provider_price_id
      and is_active;
  end if;

  select * into v_subscription
  from billing.subscriptions
  where account_id = v_account.id
  for update;

  if v_subscription.id is null then
    update billing.webhook_events
    set processing_status = 'failed',
        error_code = 'SUBSCRIPTION_NOT_INITIALIZED',
        processed_at = now()
    where provider = 'paddle' and provider_event_id = p_event_id;
    return jsonb_build_object('result', 'failed', 'reason', 'subscription_not_initialized');
  end if;

  if v_subscription.provider_event_occurred_at is not null
     and v_subscription.provider_event_occurred_at > p_occurred_at then
    update billing.webhook_events
    set processing_status = 'ignored',
        error_code = 'STALE_EVENT',
        processed_at = now()
    where provider = 'paddle' and provider_event_id = p_event_id;
    return jsonb_build_object('result', 'ignored', 'reason', 'stale_event');
  end if;

  if p_provider_price_id is not null and v_plan.code is null then
    update billing.webhook_events
    set processing_status = 'failed',
        error_code = 'UNKNOWN_PRICE',
        processed_at = now()
    where provider = 'paddle' and provider_event_id = p_event_id;
    return jsonb_build_object('result', 'failed', 'reason', 'unknown_provider_price');
  end if;

  if v_plan.code is not null and (
    (v_account.account_kind = 'personal' and v_plan.product_universe <> 'personal')
    or (v_account.account_kind = 'business' and v_plan.product_universe <> 'business')
    or (v_account.account_kind = 'enterprise_group' and v_plan.product_universe <> 'enterprise')
  ) then
    update billing.webhook_events
    set processing_status = 'failed',
        error_code = 'PLAN_SCOPE_MISMATCH',
        processed_at = now()
    where provider = 'paddle' and provider_event_id = p_event_id;
    return jsonb_build_object('result', 'failed', 'reason', 'plan_scope_mismatch');
  end if;

  v_status := case p_status
    when 'active' then 'active'
    when 'trialing' then 'trialing'
    when 'past_due' then 'past_due'
    when 'paused' then 'paused'
    when 'canceled' then 'cancelled'
    when 'cancelled' then 'cancelled'
    else null
  end;

  if p_provider_customer_id is not null then
    insert into billing.customers as customer (
      account_id,
      user_id,
      provider,
      provider_customer_id,
      billing_country
    ) values (
      v_account.id,
      case when v_account.account_kind = 'personal' then v_account.owner_user_id else null end,
      'paddle',
      p_provider_customer_id,
      coalesce(p_billing_country, v_account.billing_country)
    )
    on conflict (account_id) do update
    set provider = 'paddle',
        provider_customer_id = excluded.provider_customer_id,
        billing_country = coalesce(excluded.billing_country, customer.billing_country),
        updated_at = now();
  end if;

  update billing.subscriptions
  set plan_code = coalesce(v_plan.code, plan_code),
      status = coalesce(v_status, status),
      provider = 'paddle',
      provider_subscription_id = coalesce(
        p_provider_subscription_id,
        provider_subscription_id
      ),
      provider_transaction_id = coalesce(
        p_provider_transaction_id,
        provider_transaction_id
      ),
      current_period_start = coalesce(p_period_start, current_period_start),
      current_period_end = coalesce(p_period_end, current_period_end),
      cancel_at_period_end = case
        when p_event_type like 'subscription.%' then p_cancel_at_period_end
        else cancel_at_period_end
      end,
      billing_country = coalesce(p_billing_country, billing_country),
      provider_event_occurred_at = p_occurred_at,
      seat_quantity = coalesce(v_plan.included_seats, seat_quantity),
      branch_quantity = coalesce(v_plan.included_branches, branch_quantity),
      updated_at = now()
  where account_id = v_account.id;

  update billing.accounts
  set billing_country = coalesce(p_billing_country, billing_country),
      updated_at = now()
  where id = v_account.id;

  update billing.webhook_events
  set processing_status = 'processed',
      processed_at = now(),
      error_code = null
  where provider = 'paddle' and provider_event_id = p_event_id;

  return jsonb_build_object(
    'result', 'processed',
    'eventId', p_event_id,
    'accountId', v_account.id,
    'planCode', coalesce(v_plan.code, v_subscription.plan_code),
    'status', coalesce(v_status, v_subscription.status)
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

create or replace function public.apply_paddle_webhook_event(
  p_event_id text,
  p_event_type text,
  p_occurred_at timestamptz,
  p_payload_sha256 text,
  p_account_id uuid default null,
  p_provider_customer_id text default null,
  p_provider_subscription_id text default null,
  p_provider_transaction_id text default null,
  p_provider_price_id text default null,
  p_status text default null,
  p_period_start timestamptz default null,
  p_period_end timestamptz default null,
  p_cancel_at_period_end boolean default false,
  p_billing_country char(2) default null
)
returns jsonb
language sql
security invoker
set search_path = pg_catalog, private
as $$
  select private.apply_paddle_webhook_event(
    p_event_id,
    p_event_type,
    p_occurred_at,
    p_payload_sha256,
    p_account_id,
    p_provider_customer_id,
    p_provider_subscription_id,
    p_provider_transaction_id,
    p_provider_price_id,
    p_status,
    p_period_start,
    p_period_end,
    p_cancel_at_period_end,
    p_billing_country
  );
$$;

revoke all on function private.apply_paddle_webhook_event(
  text, text, timestamptz, text, uuid, text, text, text, text, text,
  timestamptz, timestamptz, boolean, char
) from public, anon, authenticated;
grant execute on function private.apply_paddle_webhook_event(
  text, text, timestamptz, text, uuid, text, text, text, text, text,
  timestamptz, timestamptz, boolean, char
) to service_role;

revoke all on function public.apply_paddle_webhook_event(
  text, text, timestamptz, text, uuid, text, text, text, text, text,
  timestamptz, timestamptz, boolean, char
) from public, anon, authenticated;
grant execute on function public.apply_paddle_webhook_event(
  text, text, timestamptz, text, uuid, text, text, text, text, text,
  timestamptz, timestamptz, boolean, char
) to service_role;

comment on function public.apply_paddle_webhook_event(
  text, text, timestamptz, text, uuid, text, text, text, text, text,
  timestamptz, timestamptz, boolean, char
) is 'Service-role-only idempotent Paddle event application using normalized fields. Raw payloads are never stored.';

commit;
