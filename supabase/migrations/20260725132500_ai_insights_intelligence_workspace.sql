create table if not exists public.ai_insight_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  snapshot_key text not null check (char_length(snapshot_key) between 8 and 120),
  generated_at timestamptz not null,
  data_through date,
  quality_score integer not null default 0 check (quality_score between 0 and 100),
  insights jsonb not null default '[]'::jsonb
    check (jsonb_typeof(insights) = 'array'),
  created_at timestamptz not null default now(),
  unique (user_id, snapshot_key)
);

create index if not exists ai_insight_snapshots_user_created_idx
  on public.ai_insight_snapshots (user_id, created_at desc);

alter table public.ai_insight_snapshots enable row level security;

drop policy if exists ai_insight_snapshots_owner_select on public.ai_insight_snapshots;
drop policy if exists ai_insight_snapshots_owner_insert on public.ai_insight_snapshots;
drop policy if exists ai_insight_snapshots_owner_delete on public.ai_insight_snapshots;

create policy ai_insight_snapshots_owner_select
  on public.ai_insight_snapshots
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy ai_insight_snapshots_owner_insert
  on public.ai_insight_snapshots
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy ai_insight_snapshots_owner_delete
  on public.ai_insight_snapshots
  for delete
  to authenticated
  using (auth.uid() = user_id);

grant select, insert, delete on public.ai_insight_snapshots to authenticated;

comment on table public.ai_insight_snapshots is
  'Private account-level snapshots used to compare deterministic AI Insights workspace changes. Raw transaction rows are not stored.';

create table if not exists public.ai_saved_insights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  insight_key text not null check (char_length(insight_key) between 8 and 120),
  topic text not null
    check (topic in ('cash-flow', 'spending', 'goals', 'payables', 'overview')),
  title text not null check (char_length(title) between 1 and 160),
  message text not null check (char_length(message) between 1 and 600),
  status text not null default 'saved'
    check (status in ('saved', 'resolved')),
  source_generated_at timestamptz,
  data_through date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, insight_key)
);

create index if not exists ai_saved_insights_user_status_idx
  on public.ai_saved_insights (user_id, status, updated_at desc);

alter table public.ai_saved_insights enable row level security;

drop policy if exists ai_saved_insights_owner_select on public.ai_saved_insights;
drop policy if exists ai_saved_insights_owner_insert on public.ai_saved_insights;
drop policy if exists ai_saved_insights_owner_update on public.ai_saved_insights;
drop policy if exists ai_saved_insights_owner_delete on public.ai_saved_insights;

create policy ai_saved_insights_owner_select
  on public.ai_saved_insights
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy ai_saved_insights_owner_insert
  on public.ai_saved_insights
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy ai_saved_insights_owner_update
  on public.ai_saved_insights
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy ai_saved_insights_owner_delete
  on public.ai_saved_insights
  for delete
  to authenticated
  using (auth.uid() = user_id);

grant select, insert, update, delete on public.ai_saved_insights to authenticated;

drop trigger if exists touch_ai_saved_insights_updated_at on public.ai_saved_insights;

create trigger touch_ai_saved_insights_updated_at
before update on public.ai_saved_insights
for each row
execute function public.touch_updated_at();

comment on table public.ai_saved_insights is
  'Private saved or resolved deterministic finance insights for the authenticated account.';
