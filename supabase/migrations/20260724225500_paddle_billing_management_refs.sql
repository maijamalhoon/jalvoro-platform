begin;

create or replace function private.get_my_billing_management_refs()
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, auth, billing
as $$
declare
  v_user_id uuid := auth.uid();
  v_result jsonb;
begin
  if v_user_id is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'accountId', account.id,
    'provider', subscription.provider,
    'providerCustomerId', customer.provider_customer_id,
    'providerSubscriptionId', subscription.provider_subscription_id
  ) into v_result
  from billing.accounts account
  join billing.subscriptions subscription on subscription.account_id = account.id
  left join billing.customers customer on customer.account_id = account.id
  where account.account_kind = 'personal'
    and account.owner_user_id = v_user_id;

  return coalesce(v_result, '{}'::jsonb);
end;
$$;

create or replace function public.get_my_billing_management_refs()
returns jsonb
language sql
stable
security invoker
set search_path = pg_catalog, private
as $$
  select private.get_my_billing_management_refs();
$$;

create or replace function private.get_business_billing_management_refs(
  target_business_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, auth, billing, public
as $$
declare
  v_user_id uuid := auth.uid();
  v_result jsonb;
begin
  if v_user_id is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;

  if target_business_id is null or not exists (
    select 1
    from public.businesses business
    where business.id = target_business_id
      and business.owner_user_id = v_user_id
  ) then
    raise exception 'business_owner_required' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'accountId', account.id,
    'provider', subscription.provider,
    'providerCustomerId', customer.provider_customer_id,
    'providerSubscriptionId', subscription.provider_subscription_id
  ) into v_result
  from billing.accounts account
  join billing.subscriptions subscription on subscription.account_id = account.id
  left join billing.customers customer on customer.account_id = account.id
  where account.account_kind = 'business'
    and account.business_id = target_business_id;

  return coalesce(v_result, '{}'::jsonb);
end;
$$;

create or replace function public.get_business_billing_management_refs(
  target_business_id uuid
)
returns jsonb
language sql
stable
security invoker
set search_path = pg_catalog, private
as $$
  select private.get_business_billing_management_refs(target_business_id);
$$;

revoke all on function private.get_my_billing_management_refs()
  from public, anon;
grant execute on function private.get_my_billing_management_refs()
  to authenticated, service_role;
revoke all on function public.get_my_billing_management_refs()
  from public, anon;
grant execute on function public.get_my_billing_management_refs()
  to authenticated, service_role;

revoke all on function private.get_business_billing_management_refs(uuid)
  from public, anon;
grant execute on function private.get_business_billing_management_refs(uuid)
  to authenticated, service_role;
revoke all on function public.get_business_billing_management_refs(uuid)
  from public, anon;
grant execute on function public.get_business_billing_management_refs(uuid)
  to authenticated, service_role;

comment on function public.get_my_billing_management_refs() is
  'Returns the signed-in personal account provider references for server-side hosted portal creation.';
comment on function public.get_business_billing_management_refs(uuid) is
  'Returns owner-scoped business provider references for server-side hosted portal creation.';

commit;
