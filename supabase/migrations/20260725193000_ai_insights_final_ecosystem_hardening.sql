create table if not exists public.ai_consents (
  user_id uuid primary key references auth.users(id) on delete cascade,
  version text not null check (char_length(version) between 8 and 80),
  accepted_at timestamptz not null default now(),
  revoked_at timestamptz,
  migrated_from text check (migrated_from is null or char_length(migrated_from) <= 80),
  updated_at timestamptz not null default now(),
  check (revoked_at is null or revoked_at >= accepted_at)
);

alter table public.ai_consents enable row level security;

drop policy if exists ai_consents_owner_select on public.ai_consents;
drop policy if exists ai_consents_owner_insert on public.ai_consents;
drop policy if exists ai_consents_owner_update on public.ai_consents;

create policy ai_consents_owner_select
  on public.ai_consents
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy ai_consents_owner_insert
  on public.ai_consents
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy ai_consents_owner_update
  on public.ai_consents
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

grant select, insert, update on public.ai_consents to authenticated;

comment on table public.ai_consents is
  'Versioned server-side consent ledger for the authenticated AI Insights experience and provider-backed requests.';

alter table public.ai_insight_snapshots
  drop constraint if exists ai_insight_snapshots_insights_count_check;

alter table public.ai_insight_snapshots
  add constraint ai_insight_snapshots_insights_count_check
  check (
    jsonb_typeof(insights) = 'array'
    and jsonb_array_length(insights) between 0 and 8
  );

alter table public.ai_insight_snapshots
  drop constraint if exists ai_insight_snapshots_insights_size_check;

alter table public.ai_insight_snapshots
  add constraint ai_insight_snapshots_insights_size_check
  check (octet_length(insights::text) <= 32768);

create index if not exists ai_consents_active_user_idx
  on public.ai_consents (user_id, version)
  where revoked_at is null;
