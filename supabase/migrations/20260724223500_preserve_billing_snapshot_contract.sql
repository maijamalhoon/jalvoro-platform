begin;

-- Preserve the admin/member snapshot field introduced by the earlier billing
-- foundation while exposing the new scoped entitlement model separately.
create or replace function private.get_my_billing_snapshot()
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, auth, billing
as $$
declare
  v_user_id uuid := auth.uid();
  v_snapshot jsonb;
begin
  if v_user_id is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'accountId', account.id,
    'accountKind', account.account_kind,
    'productUniverse', plan.product_universe,
    'planCode', plan.code,
    'planName', plan.name,
    'planKind', plan.plan_kind,
    'billingInterval', plan.billing_interval,
    'status', subscription.status,
    'trialEndsAt', subscription.trial_ends_at,
    'currentPeriodEnd', subscription.current_period_end,
    'gracePeriodEnd', subscription.grace_period_end,
    'cancelAtPeriodEnd', subscription.cancel_at_period_end,
    'featurePolicy', 'unlimited',
    'entitlementPolicy', 'plan_entitlements'
  )
  into v_snapshot
  from billing.accounts account
  join billing.subscriptions subscription on subscription.account_id = account.id
  join billing.plans plan on plan.code = subscription.plan_code
  where account.account_kind = 'personal'
    and account.owner_user_id = v_user_id;

  return coalesce(
    v_snapshot,
    jsonb_build_object(
      'accountId', null,
      'accountKind', 'personal',
      'productUniverse', 'personal',
      'planCode', 'free',
      'planName', 'Free',
      'planKind', 'free',
      'billingInterval', 'free',
      'status', 'free',
      'trialEndsAt', null,
      'currentPeriodEnd', null,
      'gracePeriodEnd', null,
      'cancelAtPeriodEnd', false,
      'featurePolicy', 'unlimited',
      'entitlementPolicy', 'plan_entitlements'
    )
  );
end;
$$;

comment on function private.get_my_billing_snapshot() is
  'Personal scoped billing snapshot preserving the original featurePolicy contract and exposing plan entitlements separately.';

commit;
