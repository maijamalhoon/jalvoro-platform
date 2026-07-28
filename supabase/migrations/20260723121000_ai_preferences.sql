create table if not exists public.ai_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  response_length text not null default 'short'
    check (response_length in ('short', 'balanced', 'detailed')),
  tone text not null default 'simple'
    check (tone in ('simple', 'professional', 'friendly')),
  risk_style text not null default 'balanced'
    check (risk_style in ('conservative', 'balanced', 'growth')),
  custom_instructions text not null default ''
    check (char_length(custom_instructions) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.ai_preferences enable row level security;

drop policy if exists ai_preferences_owner_select on public.ai_preferences;
drop policy if exists ai_preferences_owner_insert on public.ai_preferences;
drop policy if exists ai_preferences_owner_update on public.ai_preferences;
drop policy if exists ai_preferences_owner_delete on public.ai_preferences;

create policy ai_preferences_owner_select
  on public.ai_preferences
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy ai_preferences_owner_insert
  on public.ai_preferences
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy ai_preferences_owner_update
  on public.ai_preferences
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy ai_preferences_owner_delete
  on public.ai_preferences
  for delete
  to authenticated
  using (auth.uid() = user_id);

grant select, insert, update, delete on public.ai_preferences to authenticated;

drop trigger if exists touch_ai_preferences_updated_at on public.ai_preferences;

create trigger touch_ai_preferences_updated_at
before update on public.ai_preferences
for each row
execute function public.touch_updated_at();

comment on table public.ai_preferences is
  'Account-level response presentation preferences for Jamals Finance AI. Language remains device-local.';
