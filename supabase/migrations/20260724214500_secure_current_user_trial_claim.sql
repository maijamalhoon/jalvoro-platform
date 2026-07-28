begin;

create or replace function private.claim_my_pro_trial()
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, auth, billing
as $$
declare
  v_user_id uuid := auth.uid();
  v_now timestamptz := now();
  v_trial_end timestamptz := v_now + interval '14 days';
  v_result jsonb;
begin
  if v_user_id is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;

  if exists (
    select 1
    from billing.subscriptions
    where user_id = v_user_id
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
    v_user_id,
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
    v_user_id,
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

create or replace function public.claim_my_pro_trial()
returns jsonb
language sql
security invoker
set search_path = pg_catalog, private
as $$
  select private.claim_my_pro_trial();
$$;

revoke all on function private.claim_my_pro_trial()
  from public, anon;
grant execute on function private.claim_my_pro_trial() to authenticated;
revoke all on function public.claim_my_pro_trial()
  from public, anon;
grant execute on function public.claim_my_pro_trial() to authenticated;

-- Superseded by the current-user-only RPC above. Removing this signature also
-- prevents future server code from accepting an arbitrary user ID.
drop function if exists public.claim_pro_trial(uuid);

comment on function public.claim_my_pro_trial() is
  'Authenticated current-user wrapper for the one-time 14-day Pro trial.';

commit;
