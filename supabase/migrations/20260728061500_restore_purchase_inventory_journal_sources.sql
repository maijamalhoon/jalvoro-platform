-- Restore purchase, supplier-payment, and inventory-COGS journal support that
-- was unintentionally removed when sales base-rounding logic replaced the
-- shared journal-line trigger function.

create or replace function private.prepare_business_journal_line()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  target_entry_id uuid;
  entry_business_id uuid;
  entry_status text;
  entry_source_type text;
  entry_source_id uuid;
  entry_exchange_rate numeric(24, 10);
  rounding_scale smallint;
  account_valid boolean;
  account_system_key text;
  invoice_total_base numeric(24, 6);
  invoice_tax_base numeric(24, 6);
  invoice_revenue_base numeric(24, 6);
  invoice_revenue_and_tax_base numeric(24, 6);
  first_revenue_account_id uuid;
  sales_payment_base numeric(24, 6);
  supplier_bill_total_base numeric(24, 6);
  supplier_bill_tax_base numeric(24, 6);
  supplier_bill_allocation_base numeric(24, 6);
  supplier_payment_base numeric(24, 6);
begin
  target_entry_id := case
    when tg_op = 'DELETE' then old.journal_entry_id
    else new.journal_entry_id
  end;

  select
    entry.business_id,
    entry.status,
    entry.source_type,
    entry.source_id,
    entry.exchange_rate
  into
    entry_business_id,
    entry_status,
    entry_source_type,
    entry_source_id,
    entry_exchange_rate
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

  select
    account.system_key,
    account.is_active and (
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
      or (
        entry_source_type = 'purchase_bill'
        and (
          account.system_key in ('accounts_payable', 'tax_recoverable')
          or account.account_type = 'expense'
          or (
            account.account_type = 'asset'
            and account.system_key in ('inventory', 'prepaid_expenses', 'fixed_assets')
          )
        )
      )
      or (
        entry_source_type = 'supplier_payment'
        and account.system_key in ('cash', 'bank', 'accounts_payable')
      )
      or (
        entry_source_type = 'inventory_cogs'
        and exists (
          select 1
          from public.business_stock_movements movement
          join public.business_products product
            on product.business_id = movement.business_id
           and product.id = movement.product_id
          where movement.business_id = new.business_id
            and movement.source_type = 'sales_invoice'
            and movement.source_id = entry_source_id
            and movement.status = 'draft'
            and new.account_id in (product.inventory_account_id, product.cogs_account_id)
        )
      )
    )
  into account_system_key, account_valid
  from public.business_chart_of_accounts account
  where account.id = new.account_id
    and account.business_id = new.business_id;

  if not coalesce(account_valid, false) then
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

  if entry_source_type in ('manual', 'inventory_cogs') then
    new.debit_base := round(new.debit_transaction * entry_exchange_rate, rounding_scale);
    new.credit_base := round(new.credit_transaction * entry_exchange_rate, rounding_scale);
    return new;
  end if;

  if entry_source_type = 'sales_invoice' then
    select invoice.total_base, invoice.tax_base
    into invoice_total_base, invoice_tax_base
    from public.business_sales_invoices invoice
    where invoice.id = entry_source_id
      and invoice.business_id = new.business_id
      and invoice.status = 'draft';

    if invoice_total_base is null then
      raise exception 'Sales invoice accounting source is unavailable.' using errcode = 'P0002';
    end if;

    if account_system_key = 'accounts_receivable' then
      new.debit_base := invoice_total_base;
      new.credit_base := 0;
      return new;
    end if;

    if account_system_key = 'taxes_payable' then
      new.debit_base := 0;
      new.credit_base := invoice_tax_base;
      return new;
    end if;

    select
      coalesce(sum(line.net_base) filter (where line.revenue_account_id = new.account_id), 0),
      coalesce(sum(line.net_base), 0) + invoice_tax_base,
      min(line.revenue_account_id::text)::uuid
    into
      invoice_revenue_base,
      invoice_revenue_and_tax_base,
      first_revenue_account_id
    from public.business_sales_invoice_lines line
    where line.business_id = new.business_id
      and line.invoice_id = entry_source_id;

    if new.account_id = first_revenue_account_id then
      invoice_revenue_base := invoice_revenue_base
        + (invoice_total_base - invoice_revenue_and_tax_base);
    end if;

    new.debit_base := 0;
    new.credit_base := invoice_revenue_base;
    return new;
  end if;

  if entry_source_type = 'sales_payment' then
    select payment.amount_base
    into sales_payment_base
    from public.business_sales_payments payment
    where payment.id = entry_source_id
      and payment.business_id = new.business_id
      and payment.status = 'draft';

    if sales_payment_base is null then
      raise exception 'Sales payment accounting source is unavailable.' using errcode = 'P0002';
    end if;

    if account_system_key in ('cash', 'bank') then
      new.debit_base := sales_payment_base;
      new.credit_base := 0;
    else
      new.debit_base := 0;
      new.credit_base := sales_payment_base;
    end if;
    return new;
  end if;

  if entry_source_type = 'purchase_bill' then
    select bill.total_base, bill.tax_base
    into supplier_bill_total_base, supplier_bill_tax_base
    from public.business_supplier_bills bill
    where bill.id = entry_source_id
      and bill.business_id = new.business_id
      and bill.status = 'draft';

    if supplier_bill_total_base is null then
      raise exception 'Supplier bill accounting source is unavailable.' using errcode = 'P0002';
    end if;

    if account_system_key = 'accounts_payable' then
      new.debit_base := 0;
      new.credit_base := supplier_bill_total_base;
      return new;
    end if;

    if account_system_key = 'tax_recoverable' then
      new.debit_base := supplier_bill_tax_base;
      new.credit_base := 0;
      return new;
    end if;

    select coalesce(sum(line.net_base), 0)
    into supplier_bill_allocation_base
    from public.business_supplier_bill_lines line
    where line.business_id = new.business_id
      and line.bill_id = entry_source_id
      and line.allocation_account_id = new.account_id;

    new.debit_base := supplier_bill_allocation_base;
    new.credit_base := 0;
    return new;
  end if;

  if entry_source_type = 'supplier_payment' then
    select payment.amount_base
    into supplier_payment_base
    from public.business_supplier_payments payment
    where payment.id = entry_source_id
      and payment.business_id = new.business_id
      and payment.status = 'draft';

    if supplier_payment_base is null then
      raise exception 'Supplier payment accounting source is unavailable.' using errcode = 'P0002';
    end if;

    if account_system_key = 'accounts_payable' then
      new.debit_base := supplier_payment_base;
      new.credit_base := 0;
    else
      new.debit_base := 0;
      new.credit_base := supplier_payment_base;
    end if;
    return new;
  end if;

  raise exception 'Unsupported journal source.' using errcode = '22023';
end;
$$;

revoke execute on function private.prepare_business_journal_line()
  from public, anon, authenticated;

comment on function private.prepare_business_journal_line() is
  'Derives immutable base-currency values for manual, sales, purchase, supplier-payment, and inventory-COGS journal lines with deterministic rounding.';
