alter table public.businesses
  add column if not exists workspace_mode text not null default 'advanced_company';

do $$
begin
  if not exists (
    select 1
    from pg_catalog.pg_constraint
    where conname = 'businesses_workspace_mode_check'
      and conrelid = 'public.businesses'::regclass
  ) then
    alter table public.businesses
      add constraint businesses_workspace_mode_check
      check (workspace_mode in ('advanced_company', 'simple_shop'));
  end if;
end;
$$;

create table if not exists public.business_sales_settings (
  business_id uuid primary key references public.businesses(id) on delete cascade,
  invoice_prefix text not null default 'INV',
  next_invoice_number bigint not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_sales_settings_prefix_check
    check (invoice_prefix ~ '^[A-Z0-9][A-Z0-9-]{0,9}$'),
  constraint business_sales_settings_sequence_check
    check (next_invoice_number > 0)
);

create table if not exists public.business_contacts (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  contact_type text not null,
  display_name text not null,
  legal_name text,
  email text,
  phone text,
  tax_id text,
  currency text not null,
  credit_limit numeric(24, 6) not null default 0,
  payment_terms_days integer not null default 0,
  billing_address jsonb not null default '{}'::jsonb,
  shipping_address jsonb not null default '{}'::jsonb,
  notes text,
  status text not null default 'active',
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_contacts_type_check
    check (contact_type in ('customer', 'supplier', 'both')),
  constraint business_contacts_name_check
    check (char_length(btrim(display_name)) between 2 and 160),
  constraint business_contacts_email_check
    check (email is null or char_length(btrim(email)) between 3 and 320),
  constraint business_contacts_phone_check
    check (phone is null or char_length(btrim(phone)) between 3 and 40),
  constraint business_contacts_currency_check
    check (public.is_supported_financial_currency(currency)),
  constraint business_contacts_credit_limit_check
    check (credit_limit >= 0),
  constraint business_contacts_terms_check
    check (payment_terms_days between 0 and 3650),
  constraint business_contacts_addresses_check
    check (jsonb_typeof(billing_address) = 'object' and jsonb_typeof(shipping_address) = 'object'),
  constraint business_contacts_status_check
    check (status in ('active', 'inactive', 'archived')),
  unique (business_id, id)
);

create table if not exists public.business_sales_invoices (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  customer_id uuid not null,
  invoice_number bigint not null,
  invoice_code text not null,
  invoice_date date not null,
  due_date date not null,
  status text not null default 'draft',
  currency text not null,
  exchange_rate numeric(24, 10) not null default 1,
  subtotal_transaction numeric(24, 6) not null default 0,
  discount_transaction numeric(24, 6) not null default 0,
  tax_transaction numeric(24, 6) not null default 0,
  total_transaction numeric(24, 6) not null default 0,
  paid_transaction numeric(24, 6) not null default 0,
  subtotal_base numeric(24, 6) not null default 0,
  discount_base numeric(24, 6) not null default 0,
  tax_base numeric(24, 6) not null default 0,
  total_base numeric(24, 6) not null default 0,
  paid_base numeric(24, 6) not null default 0,
  journal_entry_id uuid,
  notes text,
  idempotency_key text,
  created_by uuid not null references auth.users(id) on delete restrict,
  issued_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_sales_invoices_number_check check (invoice_number > 0),
  constraint business_sales_invoices_code_check
    check (char_length(btrim(invoice_code)) between 3 and 40),
  constraint business_sales_invoices_dates_check check (due_date >= invoice_date),
  constraint business_sales_invoices_status_check
    check (status in ('draft', 'issued', 'partially_paid', 'paid')),
  constraint business_sales_invoices_currency_check
    check (public.is_supported_financial_currency(currency)),
  constraint business_sales_invoices_exchange_rate_check check (exchange_rate > 0),
  constraint business_sales_invoices_amounts_check check (
    subtotal_transaction >= 0
    and discount_transaction >= 0
    and discount_transaction <= subtotal_transaction
    and tax_transaction >= 0
    and total_transaction = subtotal_transaction - discount_transaction + tax_transaction
    and total_transaction > 0
    and paid_transaction >= 0
    and paid_transaction <= total_transaction
    and subtotal_base >= 0
    and discount_base >= 0
    and discount_base <= subtotal_base
    and tax_base >= 0
    and total_base = subtotal_base - discount_base + tax_base
    and total_base > 0
    and paid_base >= 0
    and paid_base <= total_base
  ),
  constraint business_sales_invoices_state_check check (
    (status = 'draft' and issued_at is null and journal_entry_id is null and paid_transaction = 0 and paid_base = 0)
    or (status = 'issued' and issued_at is not null and journal_entry_id is not null and paid_transaction = 0 and paid_base = 0)
    or (status = 'partially_paid' and issued_at is not null and journal_entry_id is not null and paid_transaction > 0 and paid_transaction < total_transaction)
    or (status = 'paid' and issued_at is not null and journal_entry_id is not null and paid_transaction = total_transaction)
  ),
  unique (business_id, invoice_number),
  unique (business_id, invoice_code),
  unique (business_id, id),
  unique (business_id, idempotency_key),
  foreign key (business_id, customer_id)
    references public.business_contacts(business_id, id)
    on delete restrict,
  foreign key (business_id, journal_entry_id)
    references public.business_journal_entries(business_id, id)
    on delete restrict
);

create table if not exists public.business_sales_invoice_lines (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  invoice_id uuid not null,
  line_number smallint not null,
  description text not null,
  quantity numeric(24, 6) not null,
  unit_price numeric(24, 6) not null,
  discount_percent numeric(9, 6) not null default 0,
  gross_transaction numeric(24, 6) not null,
  discount_transaction numeric(24, 6) not null,
  net_transaction numeric(24, 6) not null,
  tax_rate numeric(9, 6) not null default 0,
  tax_transaction numeric(24, 6) not null,
  line_total_transaction numeric(24, 6) not null,
  net_base numeric(24, 6) not null,
  tax_base numeric(24, 6) not null,
  line_total_base numeric(24, 6) not null,
  revenue_account_id uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_sales_invoice_lines_number_check check (line_number > 0),
  constraint business_sales_invoice_lines_description_check
    check (char_length(btrim(description)) between 2 and 300),
  constraint business_sales_invoice_lines_quantity_check check (quantity > 0),
  constraint business_sales_invoice_lines_price_check check (unit_price >= 0),
  constraint business_sales_invoice_lines_discount_rate_check
    check (discount_percent between 0 and 100),
  constraint business_sales_invoice_lines_tax_rate_check
    check (tax_rate between 0 and 100),
  constraint business_sales_invoice_lines_amounts_check check (
    gross_transaction >= 0
    and discount_transaction >= 0
    and discount_transaction <= gross_transaction
    and net_transaction = gross_transaction - discount_transaction
    and tax_transaction >= 0
    and line_total_transaction = net_transaction + tax_transaction
    and line_total_transaction > 0
    and net_base >= 0
    and tax_base >= 0
    and line_total_base = net_base + tax_base
    and line_total_base > 0
  ),
  unique (business_id, invoice_id, line_number),
  foreign key (business_id, invoice_id)
    references public.business_sales_invoices(business_id, id)
    on delete cascade,
  foreign key (business_id, revenue_account_id)
    references public.business_chart_of_accounts(business_id, id)
    on delete restrict
);

create table if not exists public.business_sales_payments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  invoice_id uuid not null,
  payment_date date not null,
  amount_transaction numeric(24, 6) not null,
  amount_base numeric(24, 6) not null,
  payment_account_id uuid not null,
  journal_entry_id uuid,
  reference text,
  idempotency_key text,
  status text not null default 'draft',
  created_by uuid not null references auth.users(id) on delete restrict,
  posted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_sales_payments_amount_check
    check (amount_transaction > 0 and amount_base > 0),
  constraint business_sales_payments_status_check
    check (status in ('draft', 'posted')),
  constraint business_sales_payments_state_check check (
    (status = 'draft' and journal_entry_id is null and posted_at is null)
    or (status = 'posted' and journal_entry_id is not null and posted_at is not null)
  ),
  unique (business_id, id),
  unique (business_id, idempotency_key),
  foreign key (business_id, invoice_id)
    references public.business_sales_invoices(business_id, id)
    on delete restrict,
  foreign key (business_id, payment_account_id)
    references public.business_chart_of_accounts(business_id, id)
    on delete restrict,
  foreign key (business_id, journal_entry_id)
    references public.business_journal_entries(business_id, id)
    on delete restrict
);

create index if not exists business_contacts_business_type_status_name_idx
  on public.business_contacts(business_id, contact_type, status, display_name);
create index if not exists business_contacts_created_by_idx
  on public.business_contacts(created_by);
create index if not exists business_sales_invoices_business_date_status_idx
  on public.business_sales_invoices(business_id, invoice_date desc, status, invoice_number desc);
create index if not exists business_sales_invoices_customer_status_idx
  on public.business_sales_invoices(business_id, customer_id, status, due_date);
create index if not exists business_sales_invoices_journal_idx
  on public.business_sales_invoices(business_id, journal_entry_id)
  where journal_entry_id is not null;
create index if not exists business_sales_invoice_lines_invoice_idx
  on public.business_sales_invoice_lines(business_id, invoice_id, line_number);
create index if not exists business_sales_invoice_lines_revenue_idx
  on public.business_sales_invoice_lines(business_id, revenue_account_id, invoice_id);
create index if not exists business_sales_payments_invoice_date_idx
  on public.business_sales_payments(business_id, invoice_id, payment_date desc);
create index if not exists business_sales_payments_account_date_idx
  on public.business_sales_payments(business_id, payment_account_id, payment_date desc);
create index if not exists business_sales_payments_journal_idx
  on public.business_sales_payments(business_id, journal_entry_id)
  where journal_entry_id is not null;
create index if not exists business_sales_invoices_created_by_idx
  on public.business_sales_invoices(created_by);
create index if not exists business_sales_payments_created_by_idx
  on public.business_sales_payments(created_by);

create trigger business_sales_settings_set_updated_at
before update on public.business_sales_settings
for each row execute function private.set_business_workspace_updated_at();

create trigger business_contacts_set_updated_at
before update on public.business_contacts
for each row execute function private.set_business_workspace_updated_at();

create trigger business_sales_invoices_set_updated_at
before update on public.business_sales_invoices
for each row execute function private.set_business_workspace_updated_at();

create trigger business_sales_invoice_lines_set_updated_at
before update on public.business_sales_invoice_lines
for each row execute function private.set_business_workspace_updated_at();

create trigger business_sales_payments_set_updated_at
before update on public.business_sales_payments
for each row execute function private.set_business_workspace_updated_at();

create or replace function private.initialize_business_sales(
  p_business_id uuid,
  p_owner_id uuid
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if not exists (
    select 1
    from public.businesses business
    where business.id = p_business_id
      and business.owner_user_id = p_owner_id
      and business.status = 'active'
  ) then
    raise exception 'Business owner verification failed.' using errcode = '42501';
  end if;

  insert into public.business_sales_settings (business_id)
  values (p_business_id)
  on conflict (business_id) do nothing;
end;
$$;

revoke execute on function private.initialize_business_sales(uuid, uuid)
  from public, anon, authenticated;

create or replace function private.initialize_business_sales_on_owner()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if new.role = 'owner' and new.status = 'active' then
    perform private.initialize_business_sales(new.business_id, new.user_id);
  end if;
  return new;
end;
$$;

revoke execute on function private.initialize_business_sales_on_owner()
  from public, anon, authenticated;

drop trigger if exists business_members_initialize_sales on public.business_members;
create trigger business_members_initialize_sales
after insert on public.business_members
for each row execute function private.initialize_business_sales_on_owner();

create or replace function private.prepare_business_journal_line()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  target_entry_id uuid;
  entry_business_id uuid;
  entry_status text;
  entry_source_type text;
  entry_exchange_rate numeric(24, 10);
  rounding_scale smallint;
  account_valid boolean;
begin
  target_entry_id := case
    when tg_op = 'DELETE' then old.journal_entry_id
    else new.journal_entry_id
  end;

  select entry.business_id, entry.status, entry.source_type, entry.exchange_rate
  into entry_business_id, entry_status, entry_source_type, entry_exchange_rate
  from public.business_journal_entries entry
  where entry.id = target_entry_id
  for update;

  if not found then
    raise exception 'Journal entry does not exist.' using errcode = '23503';
  end if;

  if entry_status <> 'draft' then
    raise exception 'Posted journal lines are immutable.' using errcode = '55000';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  if new.business_id <> entry_business_id then
    raise exception 'Journal line tenant does not match its entry.' using errcode = '23514';
  end if;

  select exists (
    select 1
    from public.business_chart_of_accounts account
    where account.id = new.account_id
      and account.business_id = new.business_id
      and account.is_active
      and (
        (entry_source_type = 'manual' and account.allow_manual_posting)
        or (
          entry_source_type = 'sales_invoice'
          and account.system_key in (
            'accounts_receivable',
            'sales_revenue',
            'service_revenue',
            'taxes_payable'
          )
        )
        or (
          entry_source_type = 'sales_payment'
          and account.system_key in ('cash', 'bank', 'accounts_receivable')
        )
      )
  ) into account_valid;

  if not account_valid then
    raise exception 'Account is inactive, restricted, or invalid for this journal source.'
      using errcode = '23514';
  end if;

  select settings.rounding_scale
  into rounding_scale
  from public.business_accounting_settings settings
  where settings.business_id = new.business_id;

  if rounding_scale is null then
    raise exception 'Accounting settings are missing.' using errcode = '23503';
  end if;

  new.debit_base := round(new.debit_transaction * entry_exchange_rate, rounding_scale);
  new.credit_base := round(new.credit_transaction * entry_exchange_rate, rounding_scale);
  return new;
end;
$$;

revoke execute on function private.prepare_business_journal_line()
  from public, anon, authenticated;

revoke insert, update, delete on table
  public.business_journal_entries,
  public.business_journal_lines
from authenticated;

create or replace function public.post_business_journal_entry(
  p_business_id uuid,
  p_entry_date date,
  p_description text,
  p_reference text default null,
  p_source_type text default 'manual',
  p_source_id uuid default null,
  p_transaction_currency text default null,
  p_exchange_rate numeric default 1,
  p_lines jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  current_user_id uuid := auth.uid();
  business_base_currency text;
  normalized_currency text;
  normalized_source_type text := lower(btrim(coalesce(p_source_type, 'manual')));
  selected_period_id uuid;
  created_entry_id uuid;
  effective_lines jsonb := p_lines;
  line_item jsonb;
  account_uuid uuid;
  debit_amount numeric(24, 6);
  credit_amount numeric(24, 6);
  line_description text;
  line_number smallint := 0;
  ar_account_id uuid;
  tax_account_id uuid;
  payment_account_id uuid;
  invoice_total numeric(24, 6);
  invoice_tax numeric(24, 6);
  payment_amount numeric(24, 6);
  accounting_basis text;
begin
  if current_user_id is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

  if normalized_source_type = 'manual' then
    if not exists (
      select 1
      from public.business_members membership
      where membership.business_id = p_business_id
        and membership.user_id = current_user_id
        and membership.status = 'active'
        and (
          membership.role in ('owner', 'admin', 'accountant')
          or '*' = any(membership.permissions)
          or 'accounting.manage' = any(membership.permissions)
        )
    ) then
      raise exception 'Accounting permission required.' using errcode = '42501';
    end if;
  elsif normalized_source_type in ('sales_invoice', 'sales_payment') then
    if not exists (
      select 1
      from public.business_members membership
      where membership.business_id = p_business_id
        and membership.user_id = current_user_id
        and membership.status = 'active'
        and (
          membership.role in ('owner', 'admin', 'accountant', 'manager', 'sales')
          or '*' = any(membership.permissions)
          or 'sales.manage' = any(membership.permissions)
        )
    ) then
      raise exception 'Sales permission required.' using errcode = '42501';
    end if;
  else
    raise exception 'Unsupported journal source.' using errcode = '22023';
  end if;

  select business.base_currency
  into business_base_currency
  from public.businesses business
  where business.id = p_business_id
    and business.status = 'active';

  if business_base_currency is null then
    raise exception 'Active business not found.' using errcode = 'P0002';
  end if;

  if p_entry_date is null then
    raise exception 'Entry date is required.' using errcode = '22004';
  end if;

  if char_length(btrim(coalesce(p_description, ''))) < 2 then
    raise exception 'Journal description is required.' using errcode = '22023';
  end if;

  normalized_currency := upper(btrim(coalesce(p_transaction_currency, business_base_currency)));
  if not public.is_supported_financial_currency(normalized_currency) then
    raise exception 'Unsupported transaction currency.' using errcode = '22023';
  end if;

  if p_exchange_rate is null or p_exchange_rate <= 0 then
    raise exception 'Exchange rate must be greater than zero.' using errcode = '22023';
  end if;

  if normalized_currency = business_base_currency and p_exchange_rate <> 1 then
    raise exception 'Base-currency journal entries must use an exchange rate of 1.'
      using errcode = '22023';
  end if;

  select settings.accounting_basis
  into accounting_basis
  from public.business_accounting_settings settings
  where settings.business_id = p_business_id;

  if accounting_basis is null then
    raise exception 'Accounting settings are missing.' using errcode = '23503';
  end if;

  if normalized_source_type = 'sales_invoice' then
    if accounting_basis <> 'accrual' then
      raise exception 'Sales invoice posting currently requires accrual accounting.'
        using errcode = '0A000';
    end if;

    select invoice.total_transaction, invoice.tax_transaction
    into invoice_total, invoice_tax
    from public.business_sales_invoices invoice
    where invoice.id = p_source_id
      and invoice.business_id = p_business_id
      and invoice.status = 'draft'
      and invoice.journal_entry_id is null
      and invoice.currency = normalized_currency
      and invoice.exchange_rate = p_exchange_rate
    for update;

    if not found then
      raise exception 'Draft sales invoice is unavailable for posting.' using errcode = 'P0002';
    end if;

    select account.id
    into ar_account_id
    from public.business_chart_of_accounts account
    where account.business_id = p_business_id
      and account.system_key = 'accounts_receivable'
      and account.is_active;

    if ar_account_id is null then
      raise exception 'Accounts receivable account is missing.' using errcode = '23503';
    end if;

    effective_lines := jsonb_build_array(
      jsonb_build_object(
        'account_id', ar_account_id,
        'debit', invoice_total,
        'credit', 0,
        'description', 'Accounts receivable'
      )
    );

    select effective_lines || coalesce(jsonb_agg(
      jsonb_build_object(
        'account_id', grouped.revenue_account_id,
        'debit', 0,
        'credit', grouped.revenue_amount,
        'description', 'Invoice revenue'
      ) order by grouped.revenue_account_id
    ), '[]'::jsonb)
    into effective_lines
    from (
      select line.revenue_account_id, sum(line.net_transaction)::numeric(24, 6) as revenue_amount
      from public.business_sales_invoice_lines line
      where line.business_id = p_business_id
        and line.invoice_id = p_source_id
      group by line.revenue_account_id
    ) grouped;

    if invoice_tax > 0 then
      select account.id
      into tax_account_id
      from public.business_chart_of_accounts account
      where account.business_id = p_business_id
        and account.system_key = 'taxes_payable'
        and account.is_active;

      if tax_account_id is null then
        raise exception 'Taxes payable account is missing.' using errcode = '23503';
      end if;

      effective_lines := effective_lines || jsonb_build_array(
        jsonb_build_object(
          'account_id', tax_account_id,
          'debit', 0,
          'credit', invoice_tax,
          'description', 'Invoice tax payable'
        )
      );
    end if;
  elsif normalized_source_type = 'sales_payment' then
    if accounting_basis <> 'accrual' then
      raise exception 'Sales payment posting currently requires accrual accounting.'
        using errcode = '0A000';
    end if;

    select payment.amount_transaction, payment.payment_account_id
    into payment_amount, payment_account_id
    from public.business_sales_payments payment
    join public.business_sales_invoices invoice
      on invoice.business_id = payment.business_id
      and invoice.id = payment.invoice_id
    where payment.id = p_source_id
      and payment.business_id = p_business_id
      and payment.status = 'draft'
      and payment.journal_entry_id is null
      and invoice.currency = normalized_currency
      and invoice.exchange_rate = p_exchange_rate
    for update of payment;

    if not found then
      raise exception 'Draft sales payment is unavailable for posting.' using errcode = 'P0002';
    end if;

    if not exists (
      select 1
      from public.business_chart_of_accounts account
      where account.business_id = p_business_id
        and account.id = payment_account_id
        and account.is_active
        and account.system_key in ('cash', 'bank')
    ) then
      raise exception 'Payment account must be an active cash or bank account.'
        using errcode = '23514';
    end if;

    select account.id
    into ar_account_id
    from public.business_chart_of_accounts account
    where account.business_id = p_business_id
      and account.system_key = 'accounts_receivable'
      and account.is_active;

    if ar_account_id is null then
      raise exception 'Accounts receivable account is missing.' using errcode = '23503';
    end if;

    effective_lines := jsonb_build_array(
      jsonb_build_object(
        'account_id', payment_account_id,
        'debit', payment_amount,
        'credit', 0,
        'description', 'Cash or bank receipt'
      ),
      jsonb_build_object(
        'account_id', ar_account_id,
        'debit', 0,
        'credit', payment_amount,
        'description', 'Accounts receivable settlement'
      )
    );
  end if;

  if jsonb_typeof(effective_lines) <> 'array'
    or jsonb_array_length(effective_lines) < 2
    or jsonb_array_length(effective_lines) > 200
  then
    raise exception 'Journal entries require 2 to 200 lines.' using errcode = '22023';
  end if;

  select period.id
  into selected_period_id
  from public.business_fiscal_periods period
  where period.business_id = p_business_id
    and period.status = 'open'
    and p_entry_date between period.starts_on and period.ends_on
  order by period.starts_on desc
  limit 1;

  if selected_period_id is null then
    raise exception 'No open fiscal period contains the entry date.' using errcode = '22008';
  end if;

  insert into public.business_journal_entries (
    business_id,
    entry_date,
    fiscal_period_id,
    source_type,
    source_id,
    reference,
    description,
    status,
    transaction_currency,
    exchange_rate,
    created_by
  )
  values (
    p_business_id,
    p_entry_date,
    selected_period_id,
    normalized_source_type,
    p_source_id,
    nullif(btrim(coalesce(p_reference, '')), ''),
    btrim(p_description),
    'draft',
    normalized_currency,
    p_exchange_rate,
    current_user_id
  )
  returning id into created_entry_id;

  for line_item in select value from jsonb_array_elements(effective_lines)
  loop
    line_number := line_number + 1;

    begin
      account_uuid := (line_item ->> 'account_id')::uuid;
      debit_amount := coalesce(nullif(line_item ->> 'debit', '')::numeric, 0);
      credit_amount := coalesce(nullif(line_item ->> 'credit', '')::numeric, 0);
    exception
      when invalid_text_representation then
        raise exception 'Every journal line requires a valid account and numeric amount.'
          using errcode = '22023';
    end;

    line_description := nullif(btrim(coalesce(line_item ->> 'description', '')), '');

    insert into public.business_journal_lines (
      business_id,
      journal_entry_id,
      line_number,
      account_id,
      description,
      debit_transaction,
      credit_transaction
    )
    values (
      p_business_id,
      created_entry_id,
      line_number,
      account_uuid,
      line_description,
      debit_amount,
      credit_amount
    );
  end loop;

  update public.business_journal_entries
  set status = 'posted'
  where id = created_entry_id
    and business_id = p_business_id;

  return created_entry_id;
end;
$$;

revoke execute on function public.post_business_journal_entry(
  uuid, date, text, text, text, uuid, text, numeric, jsonb
) from public, anon;
grant execute on function public.post_business_journal_entry(
  uuid, date, text, text, text, uuid, text, numeric, jsonb
) to authenticated, service_role;

create or replace function public.upsert_business_contact(
  p_business_id uuid,
  p_contact_type text,
  p_display_name text,
  p_legal_name text default null,
  p_email text default null,
  p_phone text default null,
  p_tax_id text default null,
  p_currency text default null,
  p_credit_limit numeric default 0,
  p_payment_terms_days integer default 0,
  p_billing_address jsonb default '{}'::jsonb,
  p_shipping_address jsonb default '{}'::jsonb,
  p_notes text default null,
  p_contact_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  current_user_id uuid := auth.uid();
  business_currency text;
  normalized_type text := lower(btrim(coalesce(p_contact_type, '')));
  normalized_currency text;
  saved_contact_id uuid;
begin
  if current_user_id is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.business_members membership
    where membership.business_id = p_business_id
      and membership.user_id = current_user_id
      and membership.status = 'active'
      and (
        membership.role in ('owner', 'admin', 'accountant', 'manager', 'sales')
        or '*' = any(membership.permissions)
        or 'contacts.manage' = any(membership.permissions)
        or 'sales.manage' = any(membership.permissions)
      )
  ) then
    raise exception 'Contact management permission required.' using errcode = '42501';
  end if;

  select business.base_currency
  into business_currency
  from public.businesses business
  where business.id = p_business_id
    and business.status = 'active';

  if business_currency is null then
    raise exception 'Active business not found.' using errcode = 'P0002';
  end if;

  if normalized_type not in ('customer', 'supplier', 'both') then
    raise exception 'Unsupported contact type.' using errcode = '22023';
  end if;

  if char_length(btrim(coalesce(p_display_name, ''))) < 2 then
    raise exception 'Contact name is required.' using errcode = '22023';
  end if;

  normalized_currency := upper(btrim(coalesce(p_currency, business_currency)));
  if not public.is_supported_financial_currency(normalized_currency) then
    raise exception 'Unsupported contact currency.' using errcode = '22023';
  end if;

  if coalesce(p_credit_limit, 0) < 0 then
    raise exception 'Credit limit cannot be negative.' using errcode = '22023';
  end if;

  if coalesce(p_payment_terms_days, 0) not between 0 and 3650 then
    raise exception 'Payment terms are outside the supported range.' using errcode = '22023';
  end if;

  if jsonb_typeof(coalesce(p_billing_address, '{}'::jsonb)) <> 'object'
    or jsonb_typeof(coalesce(p_shipping_address, '{}'::jsonb)) <> 'object'
  then
    raise exception 'Addresses must be JSON objects.' using errcode = '22023';
  end if;

  if p_contact_id is null then
    insert into public.business_contacts (
      business_id,
      contact_type,
      display_name,
      legal_name,
      email,
      phone,
      tax_id,
      currency,
      credit_limit,
      payment_terms_days,
      billing_address,
      shipping_address,
      notes,
      created_by
    ) values (
      p_business_id,
      normalized_type,
      btrim(p_display_name),
      nullif(btrim(coalesce(p_legal_name, '')), ''),
      nullif(lower(btrim(coalesce(p_email, ''))), ''),
      nullif(btrim(coalesce(p_phone, '')), ''),
      nullif(btrim(coalesce(p_tax_id, '')), ''),
      normalized_currency,
      coalesce(p_credit_limit, 0),
      coalesce(p_payment_terms_days, 0),
      coalesce(p_billing_address, '{}'::jsonb),
      coalesce(p_shipping_address, '{}'::jsonb),
      nullif(btrim(coalesce(p_notes, '')), ''),
      current_user_id
    ) returning id into saved_contact_id;
  else
    update public.business_contacts contact
    set contact_type = normalized_type,
        display_name = btrim(p_display_name),
        legal_name = nullif(btrim(coalesce(p_legal_name, '')), ''),
        email = nullif(lower(btrim(coalesce(p_email, ''))), ''),
        phone = nullif(btrim(coalesce(p_phone, '')), ''),
        tax_id = nullif(btrim(coalesce(p_tax_id, '')), ''),
        currency = normalized_currency,
        credit_limit = coalesce(p_credit_limit, 0),
        payment_terms_days = coalesce(p_payment_terms_days, 0),
        billing_address = coalesce(p_billing_address, '{}'::jsonb),
        shipping_address = coalesce(p_shipping_address, '{}'::jsonb),
        notes = nullif(btrim(coalesce(p_notes, '')), '')
    where contact.id = p_contact_id
      and contact.business_id = p_business_id
      and contact.status <> 'archived'
    returning id into saved_contact_id;

    if saved_contact_id is null then
      raise exception 'Contact not found or cannot be edited.' using errcode = 'P0002';
    end if;
  end if;

  return saved_contact_id;
end;
$$;

create or replace function public.create_business_sales_invoice(
  p_business_id uuid,
  p_customer_id uuid,
  p_invoice_date date,
  p_due_date date,
  p_currency text default null,
  p_exchange_rate numeric default 1,
  p_notes text default null,
  p_lines jsonb default '[]'::jsonb,
  p_idempotency_key text default null
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  current_user_id uuid := auth.uid();
  business_currency text;
  business_type text;
  normalized_currency text;
  selected_prefix text;
  assigned_invoice_number bigint;
  created_invoice_id uuid;
  created_journal_id uuid;
  existing_invoice_id uuid;
  rounding_scale smallint;
  accounting_basis text;
  line_item jsonb;
  line_number smallint := 0;
  line_description text;
  line_quantity numeric(24, 6);
  line_unit_price numeric(24, 6);
  line_discount_percent numeric(9, 6);
  line_tax_rate numeric(9, 6);
  line_gross numeric(24, 6);
  line_discount numeric(24, 6);
  line_net numeric(24, 6);
  line_tax numeric(24, 6);
  line_total numeric(24, 6);
  revenue_account_id uuid;
  default_revenue_account_id uuid;
  subtotal_total numeric(24, 6) := 0;
  discount_total numeric(24, 6) := 0;
  tax_total numeric(24, 6) := 0;
  invoice_total numeric(24, 6) := 0;
begin
  if current_user_id is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.business_members membership
    where membership.business_id = p_business_id
      and membership.user_id = current_user_id
      and membership.status = 'active'
      and (
        membership.role in ('owner', 'admin', 'accountant', 'manager', 'sales')
        or '*' = any(membership.permissions)
        or 'sales.manage' = any(membership.permissions)
      )
  ) then
    raise exception 'Sales permission required.' using errcode = '42501';
  end if;

  if p_idempotency_key is not null then
    select invoice.id
    into existing_invoice_id
    from public.business_sales_invoices invoice
    where invoice.business_id = p_business_id
      and invoice.idempotency_key = nullif(btrim(p_idempotency_key), '');

    if existing_invoice_id is not null then
      return existing_invoice_id;
    end if;
  end if;

  select business.base_currency, business.business_type
  into business_currency, business_type
  from public.businesses business
  where business.id = p_business_id
    and business.status = 'active';

  if business_currency is null then
    raise exception 'Active business not found.' using errcode = 'P0002';
  end if;

  select settings.rounding_scale, settings.accounting_basis
  into rounding_scale, accounting_basis
  from public.business_accounting_settings settings
  where settings.business_id = p_business_id;

  if rounding_scale is null then
    raise exception 'Accounting settings are missing.' using errcode = '23503';
  end if;

  if accounting_basis <> 'accrual' then
    raise exception 'Sales invoicing currently requires accrual accounting.' using errcode = '0A000';
  end if;

  if p_invoice_date is null or p_due_date is null or p_due_date < p_invoice_date then
    raise exception 'Invoice and due dates are invalid.' using errcode = '22008';
  end if;

  if not exists (
    select 1
    from public.business_contacts contact
    where contact.id = p_customer_id
      and contact.business_id = p_business_id
      and contact.status = 'active'
      and contact.contact_type in ('customer', 'both')
  ) then
    raise exception 'Active customer not found.' using errcode = 'P0002';
  end if;

  normalized_currency := upper(btrim(coalesce(p_currency, business_currency)));
  if not public.is_supported_financial_currency(normalized_currency) then
    raise exception 'Unsupported invoice currency.' using errcode = '22023';
  end if;

  if p_exchange_rate is null or p_exchange_rate <= 0 then
    raise exception 'Exchange rate must be greater than zero.' using errcode = '22023';
  end if;

  if normalized_currency = business_currency and p_exchange_rate <> 1 then
    raise exception 'Base-currency invoices must use an exchange rate of 1.'
      using errcode = '22023';
  end if;

  if jsonb_typeof(p_lines) <> 'array'
    or jsonb_array_length(p_lines) < 1
    or jsonb_array_length(p_lines) > 100
  then
    raise exception 'Invoices require 1 to 100 lines.' using errcode = '22023';
  end if;

  select account.id
  into default_revenue_account_id
  from public.business_chart_of_accounts account
  where account.business_id = p_business_id
    and account.system_key = case
      when business_type in ('services', 'professional_services') then 'service_revenue'
      else 'sales_revenue'
    end
    and account.is_active;

  if default_revenue_account_id is null then
    raise exception 'Default revenue account is missing.' using errcode = '23503';
  end if;

  insert into public.business_sales_settings (business_id)
  values (p_business_id)
  on conflict (business_id) do nothing;

  update public.business_sales_settings settings
  set next_invoice_number = settings.next_invoice_number + 1,
      updated_at = now()
  where settings.business_id = p_business_id
  returning settings.invoice_prefix, settings.next_invoice_number - 1
  into selected_prefix, assigned_invoice_number;

  if assigned_invoice_number is null then
    raise exception 'Invoice sequence is missing.' using errcode = '23503';
  end if;

  insert into public.business_sales_invoices (
    business_id,
    customer_id,
    invoice_number,
    invoice_code,
    invoice_date,
    due_date,
    status,
    currency,
    exchange_rate,
    subtotal_transaction,
    discount_transaction,
    tax_transaction,
    total_transaction,
    subtotal_base,
    discount_base,
    tax_base,
    total_base,
    notes,
    idempotency_key,
    created_by
  ) values (
    p_business_id,
    p_customer_id,
    assigned_invoice_number,
    selected_prefix || '-' || lpad(assigned_invoice_number::text, 6, '0'),
    p_invoice_date,
    p_due_date,
    'draft',
    normalized_currency,
    p_exchange_rate,
    0, 0, 0, 1,
    0, 0, 0, 1,
    nullif(btrim(coalesce(p_notes, '')), ''),
    nullif(btrim(coalesce(p_idempotency_key, '')), ''),
    current_user_id
  ) returning id into created_invoice_id;

  for line_item in select value from jsonb_array_elements(p_lines)
  loop
    line_number := line_number + 1;
    line_description := btrim(coalesce(line_item ->> 'description', ''));

    begin
      line_quantity := coalesce(nullif(line_item ->> 'quantity', '')::numeric, 0);
      line_unit_price := coalesce(nullif(line_item ->> 'unit_price', '')::numeric, 0);
      line_discount_percent := coalesce(nullif(line_item ->> 'discount_percent', '')::numeric, 0);
      line_tax_rate := coalesce(nullif(line_item ->> 'tax_rate', '')::numeric, 0);
      revenue_account_id := coalesce(
        nullif(line_item ->> 'revenue_account_id', '')::uuid,
        default_revenue_account_id
      );
    exception
      when invalid_text_representation then
        raise exception 'Invoice lines contain invalid numeric or account values.'
          using errcode = '22023';
    end;

    if char_length(line_description) < 2
      or line_quantity <= 0
      or line_unit_price < 0
      or line_discount_percent not between 0 and 100
      or line_tax_rate not between 0 and 100
    then
      raise exception 'Invoice line values are invalid.' using errcode = '22023';
    end if;

    if not exists (
      select 1
      from public.business_chart_of_accounts account
      where account.id = revenue_account_id
        and account.business_id = p_business_id
        and account.is_active
        and account.account_type = 'revenue'
        and account.system_key in ('sales_revenue', 'service_revenue')
    ) then
      raise exception 'Invoice revenue account is invalid.' using errcode = '23514';
    end if;

    line_gross := round(line_quantity * line_unit_price, rounding_scale);
    line_discount := round(line_gross * line_discount_percent / 100, rounding_scale);
    line_net := line_gross - line_discount;
    line_tax := round(line_net * line_tax_rate / 100, rounding_scale);
    line_total := line_net + line_tax;

    if line_total <= 0 then
      raise exception 'Every invoice line must have a positive total.' using errcode = '22023';
    end if;

    insert into public.business_sales_invoice_lines (
      business_id,
      invoice_id,
      line_number,
      description,
      quantity,
      unit_price,
      discount_percent,
      gross_transaction,
      discount_transaction,
      net_transaction,
      tax_rate,
      tax_transaction,
      line_total_transaction,
      net_base,
      tax_base,
      line_total_base,
      revenue_account_id
    ) values (
      p_business_id,
      created_invoice_id,
      line_number,
      line_description,
      line_quantity,
      line_unit_price,
      line_discount_percent,
      line_gross,
      line_discount,
      line_net,
      line_tax_rate,
      line_tax,
      line_total,
      round(line_net * p_exchange_rate, rounding_scale),
      round(line_tax * p_exchange_rate, rounding_scale),
      round(line_total * p_exchange_rate, rounding_scale),
      revenue_account_id
    );

    subtotal_total := subtotal_total + line_gross;
    discount_total := discount_total + line_discount;
    tax_total := tax_total + line_tax;
    invoice_total := invoice_total + line_total;
  end loop;

  update public.business_sales_invoices invoice
  set subtotal_transaction = subtotal_total,
      discount_transaction = discount_total,
      tax_transaction = tax_total,
      total_transaction = invoice_total,
      subtotal_base = round(subtotal_total * p_exchange_rate, rounding_scale),
      discount_base = round(discount_total * p_exchange_rate, rounding_scale),
      tax_base = round(tax_total * p_exchange_rate, rounding_scale),
      total_base = round(invoice_total * p_exchange_rate, rounding_scale)
  where invoice.id = created_invoice_id
    and invoice.business_id = p_business_id;

  created_journal_id := public.post_business_journal_entry(
    p_business_id,
    p_invoice_date,
    'Sales invoice ' || selected_prefix || '-' || lpad(assigned_invoice_number::text, 6, '0'),
    selected_prefix || '-' || lpad(assigned_invoice_number::text, 6, '0'),
    'sales_invoice',
    created_invoice_id,
    normalized_currency,
    p_exchange_rate,
    '[]'::jsonb
  );

  update public.business_sales_invoices invoice
  set status = 'issued',
      journal_entry_id = created_journal_id,
      issued_at = now()
  where invoice.id = created_invoice_id
    and invoice.business_id = p_business_id;

  return created_invoice_id;
end;
$$;

create or replace function public.record_business_sales_payment(
  p_business_id uuid,
  p_invoice_id uuid,
  p_payment_date date,
  p_amount numeric,
  p_payment_account_id uuid,
  p_reference text default null,
  p_idempotency_key text default null
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  current_user_id uuid := auth.uid();
  invoice_record record;
  rounding_scale smallint;
  accounting_basis text;
  payment_amount numeric(24, 6);
  payment_amount_base numeric(24, 6);
  new_paid_transaction numeric(24, 6);
  new_paid_base numeric(24, 6);
  created_payment_id uuid;
  created_journal_id uuid;
  existing_payment_id uuid;
begin
  if current_user_id is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.business_members membership
    where membership.business_id = p_business_id
      and membership.user_id = current_user_id
      and membership.status = 'active'
      and (
        membership.role in ('owner', 'admin', 'accountant', 'manager', 'sales', 'cashier')
        or '*' = any(membership.permissions)
        or 'sales.manage' = any(membership.permissions)
        or 'sales.collect' = any(membership.permissions)
      )
  ) then
    raise exception 'Payment collection permission required.' using errcode = '42501';
  end if;

  if p_idempotency_key is not null then
    select payment.id
    into existing_payment_id
    from public.business_sales_payments payment
    where payment.business_id = p_business_id
      and payment.idempotency_key = nullif(btrim(p_idempotency_key), '');

    if existing_payment_id is not null then
      return existing_payment_id;
    end if;
  end if;

  select invoice.*
  into invoice_record
  from public.business_sales_invoices invoice
  where invoice.id = p_invoice_id
    and invoice.business_id = p_business_id
    and invoice.status in ('issued', 'partially_paid')
  for update;

  if not found then
    raise exception 'Open sales invoice not found.' using errcode = 'P0002';
  end if;

  select settings.rounding_scale, settings.accounting_basis
  into rounding_scale, accounting_basis
  from public.business_accounting_settings settings
  where settings.business_id = p_business_id;

  if rounding_scale is null then
    raise exception 'Accounting settings are missing.' using errcode = '23503';
  end if;

  if accounting_basis <> 'accrual' then
    raise exception 'Sales payments currently require accrual accounting.' using errcode = '0A000';
  end if;

  if p_payment_date is null or p_payment_date < invoice_record.invoice_date then
    raise exception 'Payment date is invalid.' using errcode = '22008';
  end if;

  payment_amount := round(coalesce(p_amount, 0), rounding_scale);
  if payment_amount <= 0
    or payment_amount > invoice_record.total_transaction - invoice_record.paid_transaction
  then
    raise exception 'Payment must be positive and cannot exceed the outstanding balance.'
      using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.business_chart_of_accounts account
    where account.id = p_payment_account_id
      and account.business_id = p_business_id
      and account.is_active
      and account.system_key in ('cash', 'bank')
  ) then
    raise exception 'Payment account must be an active cash or bank account.'
      using errcode = '23514';
  end if;

  payment_amount_base := round(payment_amount * invoice_record.exchange_rate, rounding_scale);

  insert into public.business_sales_payments (
    business_id,
    invoice_id,
    payment_date,
    amount_transaction,
    amount_base,
    payment_account_id,
    reference,
    idempotency_key,
    status,
    created_by
  ) values (
    p_business_id,
    p_invoice_id,
    p_payment_date,
    payment_amount,
    payment_amount_base,
    p_payment_account_id,
    nullif(btrim(coalesce(p_reference, '')), ''),
    nullif(btrim(coalesce(p_idempotency_key, '')), ''),
    'draft',
    current_user_id
  ) returning id into created_payment_id;

  created_journal_id := public.post_business_journal_entry(
    p_business_id,
    p_payment_date,
    'Payment received for ' || invoice_record.invoice_code,
    nullif(btrim(coalesce(p_reference, invoice_record.invoice_code)), ''),
    'sales_payment',
    created_payment_id,
    invoice_record.currency,
    invoice_record.exchange_rate,
    '[]'::jsonb
  );

  update public.business_sales_payments payment
  set status = 'posted',
      journal_entry_id = created_journal_id,
      posted_at = now()
  where payment.id = created_payment_id
    and payment.business_id = p_business_id;

  new_paid_transaction := invoice_record.paid_transaction + payment_amount;
  new_paid_base := invoice_record.paid_base + payment_amount_base;

  update public.business_sales_invoices invoice
  set paid_transaction = new_paid_transaction,
      paid_base = new_paid_base,
      status = case
        when new_paid_transaction = invoice.total_transaction then 'paid'
        else 'partially_paid'
      end
  where invoice.id = p_invoice_id
    and invoice.business_id = p_business_id;

  return created_payment_id;
end;
$$;

revoke execute on function public.upsert_business_contact(
  uuid, text, text, text, text, text, text, text, numeric, integer, jsonb, jsonb, text, uuid
) from public, anon;
grant execute on function public.upsert_business_contact(
  uuid, text, text, text, text, text, text, text, numeric, integer, jsonb, jsonb, text, uuid
) to authenticated, service_role;

revoke execute on function public.create_business_sales_invoice(
  uuid, uuid, date, date, text, numeric, text, jsonb, text
) from public, anon;
grant execute on function public.create_business_sales_invoice(
  uuid, uuid, date, date, text, numeric, text, jsonb, text
) to authenticated, service_role;

revoke execute on function public.record_business_sales_payment(
  uuid, uuid, date, numeric, uuid, text, text
) from public, anon;
grant execute on function public.record_business_sales_payment(
  uuid, uuid, date, numeric, uuid, text, text
) to authenticated, service_role;

alter table public.business_sales_settings enable row level security;
alter table public.business_contacts enable row level security;
alter table public.business_sales_invoices enable row level security;
alter table public.business_sales_invoice_lines enable row level security;
alter table public.business_sales_payments enable row level security;

revoke all privileges on table
  public.business_sales_settings,
  public.business_contacts,
  public.business_sales_invoices,
  public.business_sales_invoice_lines,
  public.business_sales_payments
from anon, authenticated;

grant select on table
  public.business_sales_settings,
  public.business_contacts,
  public.business_sales_invoices,
  public.business_sales_invoice_lines,
  public.business_sales_payments
to authenticated;

grant select, insert, update, delete on table
  public.business_sales_settings,
  public.business_contacts,
  public.business_sales_invoices,
  public.business_sales_invoice_lines,
  public.business_sales_payments
to service_role;

create policy business_sales_settings_select_member
on public.business_sales_settings
for select to authenticated
using (
  business_id in (
    select membership.business_id
    from public.business_members membership
    where membership.user_id = (select auth.uid())
      and membership.status = 'active'
  )
);

create policy business_contacts_select_member
on public.business_contacts
for select to authenticated
using (
  business_id in (
    select membership.business_id
    from public.business_members membership
    where membership.user_id = (select auth.uid())
      and membership.status = 'active'
  )
);

create policy business_sales_invoices_select_member
on public.business_sales_invoices
for select to authenticated
using (
  business_id in (
    select membership.business_id
    from public.business_members membership
    where membership.user_id = (select auth.uid())
      and membership.status = 'active'
  )
);

create policy business_sales_invoice_lines_select_member
on public.business_sales_invoice_lines
for select to authenticated
using (
  business_id in (
    select membership.business_id
    from public.business_members membership
    where membership.user_id = (select auth.uid())
      and membership.status = 'active'
  )
);

create policy business_sales_payments_select_member
on public.business_sales_payments
for select to authenticated
using (
  business_id in (
    select membership.business_id
    from public.business_members membership
    where membership.user_id = (select auth.uid())
      and membership.status = 'active'
  )
);

do $$
declare
  business_record record;
begin
  for business_record in
    select business.id, business.owner_user_id
    from public.businesses business
    where business.status = 'active'
  loop
    perform private.initialize_business_sales(
      business_record.id,
      business_record.owner_user_id
    );
  end loop;
end;
$$;

comment on column public.businesses.workspace_mode is
  'Advanced company ERP or future simplified shop presentation over the same tenant-safe engine.';
comment on table public.business_contacts is
  'Tenant-scoped customers and suppliers used by sales, purchases, statements, and CRM.';
comment on table public.business_sales_invoices is
  'Issued sales invoices with locked currency, server-calculated totals, and accounting linkage.';
comment on table public.business_sales_payments is
  'Customer receipts atomically linked to cash or bank and accounts receivable journals.';
comment on function public.create_business_sales_invoice(
  uuid, uuid, date, date, text, numeric, text, jsonb, text
) is
  'Atomically creates, calculates, issues, and posts a tenant-scoped accrual sales invoice.';
comment on function public.record_business_sales_payment(
  uuid, uuid, date, numeric, uuid, text, text
) is
  'Atomically records a customer payment and posts cash or bank against accounts receivable.';
