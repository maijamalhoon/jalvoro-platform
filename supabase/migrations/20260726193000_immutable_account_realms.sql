-- Establish one server-authoritative account realm per authentication identity.
-- New identities may be Individual or Business. Existing identities that already
-- contain both personal records and an active Business membership are quarantined
-- as legacy_dual so the migration cannot silently orphan data. No new caller may
-- claim legacy_dual; those identities require an explicit future split workflow.

create schema if not exists private;

create table if not exists private.account_realms (
  user_id uuid primary key references auth.users(id) on delete cascade,
  realm text not null,
  source text not null,
  created_at timestamptz not null default now(),
  locked_at timestamptz not null default now(),
  constraint account_realms_realm_check
    check (realm in ('individual','business','legacy_dual')),
  constraint account_realms_source_check
    check (char_length(btrim(source)) between 2 and 120)
);

create table if not exists private.account_realm_audit (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  previous_realm text,
  new_realm text not null,
  reason text not null,
  actor_user_id uuid,
  occurred_at timestamptz not null default now(),
  constraint account_realm_audit_previous_check
    check (previous_realm is null or previous_realm in ('individual','business','legacy_dual')),
  constraint account_realm_audit_new_check
    check (new_realm in ('individual','business','legacy_dual')),
  constraint account_realm_audit_reason_check
    check (char_length(btrim(reason)) between 2 and 120)
);

create index if not exists account_realm_audit_user_occurred_idx
  on private.account_realm_audit(user_id, occurred_at desc);

revoke all on table private.account_realms from public, anon, authenticated;
revoke all on table private.account_realm_audit from public, anon, authenticated;
grant select on table private.account_realms to service_role;
grant select on table private.account_realm_audit to service_role;

create or replace function private.account_realm_allows(
  p_user_id uuid,
  p_required_realm text
)
returns boolean
language sql
stable
security definer
set search_path='pg_catalog','private'
as $$
  select exists (
    select 1
    from private.account_realms ar
    where ar.user_id = p_user_id
      and (
        ar.realm = lower(btrim(coalesce(p_required_realm,'')))
        or ar.realm = 'legacy_dual'
      )
  );
$$;

create or replace function private.current_account_allows(
  p_required_realm text
)
returns boolean
language sql
stable
security definer
set search_path='pg_catalog','private','auth'
as $$
  select private.account_realm_allows(auth.uid(), p_required_realm);
$$;

create or replace function private.get_account_realm(
  p_user_id uuid
)
returns text
language sql
stable
security definer
set search_path='pg_catalog','private'
as $$
  select ar.realm
  from private.account_realms ar
  where ar.user_id = p_user_id;
$$;

create or replace function private.claim_account_realm_internal(
  p_realm text,
  p_reason text default 'account_signup'
)
returns text
language plpgsql
security definer
set search_path='pg_catalog','private','auth'
as $$
declare
  current_user_id uuid := auth.uid();
  normalized_realm text := lower(btrim(coalesce(p_realm,'')));
  normalized_reason text := btrim(coalesce(p_reason,'account_signup'));
  existing_realm text;
begin
  if current_user_id is null then
    raise exception 'Authentication required.' using errcode='42501';
  end if;

  if normalized_realm not in ('individual','business') then
    raise exception 'Unsupported account realm.' using errcode='22023';
  end if;

  if char_length(normalized_reason) not between 2 and 120 then
    raise exception 'Invalid realm claim reason.' using errcode='22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(current_user_id::text, 0));

  select ar.realm
  into existing_realm
  from private.account_realms ar
  where ar.user_id = current_user_id
  for update;

  if existing_realm is null then
    insert into private.account_realms(user_id, realm, source)
    values(current_user_id, normalized_realm, normalized_reason);

    insert into private.account_realm_audit(
      user_id, previous_realm, new_realm, reason, actor_user_id
    )
    values(current_user_id, null, normalized_realm, normalized_reason, current_user_id);

    return normalized_realm;
  end if;

  if existing_realm = normalized_realm or existing_realm = 'legacy_dual' then
    return existing_realm;
  end if;

  raise exception 'This identity belongs to the % account realm.', existing_realm
    using errcode='42501';
end;
$$;

create or replace function private.require_current_account_realm(
  p_required_realm text
)
returns text
language plpgsql
stable
security definer
set search_path='pg_catalog','private','auth'
as $$
declare
  current_user_id uuid := auth.uid();
  current_realm text;
begin
  if current_user_id is null then
    raise exception 'Authentication required.' using errcode='42501';
  end if;

  select private.get_account_realm(current_user_id) into current_realm;

  if current_realm is null then
    raise exception 'Account realm setup is required.' using errcode='42501';
  end if;

  if not private.account_realm_allows(current_user_id, p_required_realm) then
    raise exception 'This identity cannot access the requested account realm.' using errcode='42501';
  end if;

  return current_realm;
end;
$$;

revoke all on function private.account_realm_allows(uuid,text) from public, anon, authenticated;
revoke all on function private.current_account_allows(text) from public, anon;
revoke all on function private.get_account_realm(uuid) from public, anon, authenticated;
revoke all on function private.claim_account_realm_internal(text,text) from public, anon, authenticated;
revoke all on function private.require_current_account_realm(text) from public, anon, authenticated;
grant execute on function private.account_realm_allows(uuid,text) to service_role;
grant execute on function private.current_account_allows(text) to authenticated, service_role;
grant execute on function private.get_account_realm(uuid) to service_role;
grant execute on function private.claim_account_realm_internal(text,text) to service_role;
grant execute on function private.require_current_account_realm(text) to service_role;

create or replace function public.claim_account_realm(
  p_realm text
)
returns text
language sql
security definer
set search_path='pg_catalog','private'
as $$
  select private.claim_account_realm_internal(p_realm, 'account_signup');
$$;

create or replace function public.get_my_account_realm()
returns text
language sql
stable
security definer
set search_path='pg_catalog','private','auth'
as $$
  select private.get_account_realm(auth.uid());
$$;

revoke all on function public.claim_account_realm(text) from public, anon;
revoke all on function public.get_my_account_realm() from public, anon;
grant execute on function public.claim_account_realm(text) to authenticated, service_role;
grant execute on function public.get_my_account_realm() to authenticated, service_role;

-- Classify every historical identity without reading editable Auth user metadata.
-- Actual records and active membership win over the legacy workspace preference.
with personal_users as (
  select user_id from public.accounts
  union select user_id from public.transactions
  union select user_id from public.goals
  union select user_id from public.goal_contributions
  union select user_id from public.investments
  union select user_id from public.investment_withdrawals
  union select user_id from public.liabilities
  union select user_id from public.liability_payments
  union select user_id from public.account_transfers
  union select user_id from public.ai_insight_snapshots
  union select user_id from public.ai_preferences
  union select user_id from public.ai_saved_insights
  union select user_id from public.categories
  union select user_id from public.category_mutation_requests
  union select user_id from public.notification_preferences
  union select user_id from public.notification_states
),
business_users as (
  select distinct user_id
  from public.business_members
  where status = 'active'
),
classified as (
  select
    users.id as user_id,
    case
      when personal.user_id is not null and business.user_id is not null then 'legacy_dual'
      when business.user_id is not null then 'business'
      when personal.user_id is not null then 'individual'
      when preferences.onboarding_choice = 'business' then 'business'
      else 'individual'
    end as realm,
    case
      when personal.user_id is not null and business.user_id is not null then 'backfill_legacy_dual'
      when business.user_id is not null then 'backfill_business_membership'
      when personal.user_id is not null then 'backfill_personal_activity'
      when preferences.onboarding_choice = 'business' then 'backfill_business_preference'
      else 'backfill_individual_default'
    end as source
  from auth.users users
  left join personal_users personal on personal.user_id = users.id
  left join business_users business on business.user_id = users.id
  left join public.business_workspace_preferences preferences
    on preferences.user_id = users.id
)
insert into private.account_realms(user_id, realm, source)
select classified.user_id, classified.realm, classified.source
from classified
on conflict(user_id) do nothing;

insert into private.account_realm_audit(
  user_id, previous_realm, new_realm, reason, actor_user_id
)
select ar.user_id, null, ar.realm, ar.source, null
from private.account_realms ar
where not exists (
  select 1
  from private.account_realm_audit audit
  where audit.user_id = ar.user_id
);
