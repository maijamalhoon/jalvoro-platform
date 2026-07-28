-- Reconstructs the personal-finance schema that existed before this repository's
-- timestamped migration history began. This migration is schema-only: it does
-- not copy production rows, credentials, or secrets.

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  full_name text,
  age integer,
  provider text default 'email',
  onboarding_completed boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type text not null,
  balance numeric default 0,
  created_at timestamptz default now(),
  account_number text,
  iban text,
  account_kind text not null default 'savings'
    constraint accounts_account_kind_check check (account_kind in ('current','savings')),
  icon_key text not null default 'bank',
  accent_color text not null default 'blue',
  constraint accounts_type_check check (
    type in ('bank','cash','jazzcash','easypaisa','sadapay','nayapay','wallet','freelance','investment','other')
  )
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type text not null constraint categories_type_check check (type in ('income','expense')),
  color text default '#6366f1',
  created_at timestamptz default now()
);

create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  target_amount numeric not null,
  current_amount numeric default 0,
  deadline date,
  created_at timestamptz default now(),
  icon text default 'target',
  status text
);

create table public.investments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type text not null,
  quantity numeric default 1,
  purchase_price numeric not null,
  current_price numeric default 0,
  purchased_at date default current_date,
  created_at timestamptz default now()
);

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid references public.accounts(id) on delete set null,
  category_id uuid references public.categories(id) on delete set null,
  type text not null constraint transactions_type_check
    check (type in ('income','expense','investment')),
  amount numeric not null,
  note text,
  date date not null default current_date,
  created_at timestamptz default now()
);

create table public.exchange_rates (
  id uuid primary key default gen_random_uuid(),
  pkr_to_usd numeric not null,
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;
alter table public.accounts enable row level security;
alter table public.categories enable row level security;
alter table public.goals enable row level security;
alter table public.investments enable row level security;
alter table public.transactions enable row level security;
alter table public.exchange_rates enable row level security;

create policy profiles_select_own on public.profiles for select to authenticated
  using ((select auth.uid()) = id);
create policy profiles_insert_own on public.profiles for insert to authenticated
  with check ((select auth.uid()) = id);
create policy profiles_update_own on public.profiles for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create policy owner_only on public.accounts for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy owner_only on public.categories for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy owner_only on public.goals for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy owner_only on public.investments for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy owner_only on public.transactions for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy exchange_rates_read_authenticated on public.exchange_rates for select to authenticated
  using (true);

grant select, insert, update on public.profiles to authenticated;
grant select, insert, update, delete on public.accounts to authenticated;
grant select, insert, update, delete on public.categories to authenticated;
grant select, insert, update, delete on public.goals to authenticated;
grant select, insert, update, delete on public.investments to authenticated;
grant select, insert, update, delete on public.transactions to authenticated;
grant select on public.exchange_rates to authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id, email, full_name, age, provider, onboarding_completed
  ) values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    nullif(new.raw_user_meta_data ->> 'age', '')::integer,
    coalesce(new.raw_app_meta_data ->> 'provider', 'email'),
    case
      when new.raw_user_meta_data ? 'full_name'
       and new.raw_user_meta_data ? 'age'
      then true
      else false
    end
  )
  on conflict (id) do update
  set email = excluded.email,
      full_name = coalesce(excluded.full_name, public.profiles.full_name),
      age = coalesce(excluded.age, public.profiles.age),
      provider = coalesce(excluded.provider, public.profiles.provider),
      updated_at = now();
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;
grant execute on function public.handle_new_user() to service_role;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();
