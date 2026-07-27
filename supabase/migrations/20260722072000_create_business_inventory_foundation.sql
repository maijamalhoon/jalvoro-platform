create table if not exists public.business_inventory_settings (
  business_id uuid primary key references public.businesses(id) on delete cascade,
  valuation_method text not null default 'weighted_average',
  allow_negative_stock boolean not null default false,
  default_warehouse_id uuid,
  next_movement_number bigint not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (valuation_method = 'weighted_average'),
  check (next_movement_number > 0)
);

create table if not exists public.business_warehouses (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  code text not null,
  name text not null,
  status text not null default 'active',
  is_default boolean not null default false,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (code ~ '^[A-Z0-9][A-Z0-9_-]{0,19}$'),
  check (char_length(btrim(name)) between 2 and 120),
  check (status in ('active','inactive')),
  unique (business_id,id),
  unique (business_id,code)
);

create unique index if not exists business_warehouses_one_default_idx
  on public.business_warehouses(business_id)
  where is_default and status='active';

alter table public.business_inventory_settings
  drop constraint if exists business_inventory_settings_default_warehouse_fkey;
alter table public.business_inventory_settings
  add constraint business_inventory_settings_default_warehouse_fkey
  foreign key (business_id,default_warehouse_id)
  references public.business_warehouses(business_id,id) on delete restrict;

create table if not exists public.business_products (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  sku text not null,
  name text not null,
  product_type text not null default 'inventory',
  unit_of_measure text not null default 'unit',
  sales_price numeric(24,6) not null default 0,
  purchase_cost_hint numeric(24,6) not null default 0,
  reorder_level numeric(24,6) not null default 0,
  revenue_account_id uuid not null,
  inventory_account_id uuid not null,
  cogs_account_id uuid not null,
  status text not null default 'active',
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (sku ~ '^[A-Z0-9][A-Z0-9._-]{0,39}$'),
  check (char_length(btrim(name)) between 2 and 160),
  check (product_type='inventory'),
  check (char_length(btrim(unit_of_measure)) between 1 and 30),
  check (sales_price>=0 and purchase_cost_hint>=0 and reorder_level>=0),
  check (status in ('active','inactive')),
  unique (business_id,id),
  unique (business_id,sku),
  foreign key (business_id,revenue_account_id)
    references public.business_chart_of_accounts(business_id,id) on delete restrict,
  foreign key (business_id,inventory_account_id)
    references public.business_chart_of_accounts(business_id,id) on delete restrict,
  foreign key (business_id,cogs_account_id)
    references public.business_chart_of_accounts(business_id,id) on delete restrict
);

create index if not exists business_products_business_status_idx
  on public.business_products(business_id,status,name);

create table if not exists public.business_inventory_balances (
  business_id uuid not null references public.businesses(id) on delete cascade,
  product_id uuid not null,
  warehouse_id uuid not null,
  quantity_on_hand numeric(24,6) not null default 0,
  inventory_value_base numeric(24,6) not null default 0,
  average_cost_base numeric(24,6) not null default 0,
  updated_at timestamptz not null default now(),
  primary key (business_id,product_id,warehouse_id),
  foreign key (business_id,product_id)
    references public.business_products(business_id,id) on delete restrict,
  foreign key (business_id,warehouse_id)
    references public.business_warehouses(business_id,id) on delete restrict,
  check (
    quantity_on_hand>=0 and inventory_value_base>=0 and average_cost_base>=0
    and (quantity_on_hand>0 or (inventory_value_base=0 and average_cost_base=0))
  )
);

create index if not exists business_inventory_balances_warehouse_idx
  on public.business_inventory_balances(business_id,warehouse_id,product_id);

create table if not exists public.business_stock_movements (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  movement_number bigint not null,
  movement_type text not null,
  movement_date date not null,
  product_id uuid not null,
  warehouse_id uuid not null,
  quantity numeric(24,6) not null,
  unit_cost_base numeric(24,6) not null,
  total_value_base numeric(24,6) not null,
  source_type text not null,
  source_id uuid,
  source_line_id uuid,
  journal_entry_id uuid,
  status text not null default 'draft',
  notes text,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  posted_at timestamptz,
  unique (business_id,id),
  unique (business_id,movement_number),
  foreign key (business_id,product_id)
    references public.business_products(business_id,id) on delete restrict,
  foreign key (business_id,warehouse_id)
    references public.business_warehouses(business_id,id) on delete restrict,
  foreign key (business_id,journal_entry_id)
    references public.business_journal_entries(business_id,id) on delete restrict,
  check (movement_type in ('receipt','issue')),
  check (source_type in ('supplier_bill','sales_invoice')),
  check (status in ('draft','posted')),
  check (quantity>0 and unit_cost_base>=0 and total_value_base>=0),
  check ((status='draft' and posted_at is null) or (status='posted' and posted_at is not null))
);

create unique index if not exists business_stock_movements_source_line_idx
  on public.business_stock_movements(business_id,source_type,source_line_id,movement_type)
  where source_line_id is not null;
create index if not exists business_stock_movements_product_date_idx
  on public.business_stock_movements(
    business_id,product_id,warehouse_id,movement_date desc,movement_number desc
  );

alter table public.business_supplier_bill_lines
  add column if not exists product_id uuid,
  add column if not exists warehouse_id uuid,
  add column if not exists inventory_movement_id uuid;
alter table public.business_sales_invoice_lines
  add column if not exists product_id uuid,
  add column if not exists warehouse_id uuid,
  add column if not exists inventory_movement_id uuid,
  add column if not exists cogs_base numeric(24,6) not null default 0;
alter table public.business_sales_invoices
  add column if not exists cogs_journal_entry_id uuid;

do $$
begin
  if not exists (select 1 from pg_constraint where conname='business_supplier_bill_lines_product_fkey') then
    alter table public.business_supplier_bill_lines
      add constraint business_supplier_bill_lines_product_fkey
      foreign key (business_id,product_id)
      references public.business_products(business_id,id) on delete restrict;
  end if;
  if not exists (select 1 from pg_constraint where conname='business_supplier_bill_lines_warehouse_fkey') then
    alter table public.business_supplier_bill_lines
      add constraint business_supplier_bill_lines_warehouse_fkey
      foreign key (business_id,warehouse_id)
      references public.business_warehouses(business_id,id) on delete restrict;
  end if;
  if not exists (select 1 from pg_constraint where conname='business_supplier_bill_lines_movement_fkey') then
    alter table public.business_supplier_bill_lines
      add constraint business_supplier_bill_lines_movement_fkey
      foreign key (business_id,inventory_movement_id)
      references public.business_stock_movements(business_id,id) on delete restrict;
  end if;
  if not exists (select 1 from pg_constraint where conname='business_supplier_bill_lines_inventory_pair_check') then
    alter table public.business_supplier_bill_lines
      add constraint business_supplier_bill_lines_inventory_pair_check
      check (
        (product_id is null and warehouse_id is null and inventory_movement_id is null)
        or (product_id is not null and warehouse_id is not null)
      );
  end if;
  if not exists (select 1 from pg_constraint where conname='business_sales_invoice_lines_product_fkey') then
    alter table public.business_sales_invoice_lines
      add constraint business_sales_invoice_lines_product_fkey
      foreign key (business_id,product_id)
      references public.business_products(business_id,id) on delete restrict;
  end if;
  if not exists (select 1 from pg_constraint where conname='business_sales_invoice_lines_warehouse_fkey') then
    alter table public.business_sales_invoice_lines
      add constraint business_sales_invoice_lines_warehouse_fkey
      foreign key (business_id,warehouse_id)
      references public.business_warehouses(business_id,id) on delete restrict;
  end if;
  if not exists (select 1 from pg_constraint where conname='business_sales_invoice_lines_movement_fkey') then
    alter table public.business_sales_invoice_lines
      add constraint business_sales_invoice_lines_movement_fkey
      foreign key (business_id,inventory_movement_id)
      references public.business_stock_movements(business_id,id) on delete restrict;
  end if;
  if not exists (select 1 from pg_constraint where conname='business_sales_invoice_lines_inventory_pair_check') then
    alter table public.business_sales_invoice_lines
      add constraint business_sales_invoice_lines_inventory_pair_check
      check (
        (product_id is null and warehouse_id is null and inventory_movement_id is null and cogs_base=0)
        or (product_id is not null and warehouse_id is not null and cogs_base>=0)
      );
  end if;
  if not exists (select 1 from pg_constraint where conname='business_sales_invoices_cogs_journal_fkey') then
    alter table public.business_sales_invoices
      add constraint business_sales_invoices_cogs_journal_fkey
      foreign key (business_id,cogs_journal_entry_id)
      references public.business_journal_entries(business_id,id) on delete restrict;
  end if;
end;
$$;

alter table public.business_inventory_settings enable row level security;
alter table public.business_warehouses enable row level security;
alter table public.business_products enable row level security;
alter table public.business_inventory_balances enable row level security;
alter table public.business_stock_movements enable row level security;

drop policy if exists business_inventory_settings_select_member on public.business_inventory_settings;
create policy business_inventory_settings_select_member
  on public.business_inventory_settings for select to authenticated
  using (exists (
    select 1 from public.business_members membership
    where membership.business_id=business_inventory_settings.business_id
      and membership.user_id=(select auth.uid()) and membership.status='active'
  ));
drop policy if exists business_warehouses_select_member on public.business_warehouses;
create policy business_warehouses_select_member
  on public.business_warehouses for select to authenticated
  using (exists (
    select 1 from public.business_members membership
    where membership.business_id=business_warehouses.business_id
      and membership.user_id=(select auth.uid()) and membership.status='active'
  ));
drop policy if exists business_products_select_member on public.business_products;
create policy business_products_select_member
  on public.business_products for select to authenticated
  using (exists (
    select 1 from public.business_members membership
    where membership.business_id=business_products.business_id
      and membership.user_id=(select auth.uid()) and membership.status='active'
  ));
drop policy if exists business_inventory_balances_select_member on public.business_inventory_balances;
create policy business_inventory_balances_select_member
  on public.business_inventory_balances for select to authenticated
  using (exists (
    select 1 from public.business_members membership
    where membership.business_id=business_inventory_balances.business_id
      and membership.user_id=(select auth.uid()) and membership.status='active'
  ));
drop policy if exists business_stock_movements_select_member on public.business_stock_movements;
create policy business_stock_movements_select_member
  on public.business_stock_movements for select to authenticated
  using (exists (
    select 1 from public.business_members membership
    where membership.business_id=business_stock_movements.business_id
      and membership.user_id=(select auth.uid()) and membership.status='active'
  ));

revoke all on public.business_inventory_settings from anon,authenticated;
revoke all on public.business_warehouses from anon,authenticated;
revoke all on public.business_products from anon,authenticated;
revoke all on public.business_inventory_balances from anon,authenticated;
revoke all on public.business_stock_movements from anon,authenticated;
grant select on public.business_inventory_settings to authenticated;
grant select on public.business_warehouses to authenticated;
grant select on public.business_products to authenticated;
grant select on public.business_inventory_balances to authenticated;
grant select on public.business_stock_movements to authenticated;
