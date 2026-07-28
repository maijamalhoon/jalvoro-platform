-- Atomic sales returns, credit notes, customer credits, and optional inventory restocking.
create or replace function private.create_business_sales_return_internal(
  p_business_id uuid,
  p_invoice_id uuid,
  p_return_date date,
  p_lines jsonb,
  p_notes text,
  p_idempotency_key text
)
returns uuid
language plpgsql
security definer
set search_path to pg_catalog,public,private
as $$
declare
  current_user_id uuid:=auth.uid();
  existing_return_id uuid;
  created_return_id uuid;
  assigned_number bigint;
  assigned_code text;
  invoice_record record;
  source_line record;
  line_item jsonb;
  line_number smallint:=0;
  source_line_id uuid;
  return_quantity numeric(24,6);
  restock_requested boolean;
  selected_warehouse_id uuid;
  seen_source_lines uuid[]:='{}'::uuid[];
  prior_quantity numeric(24,6);
  prior_net_transaction numeric(24,6);
  prior_tax_transaction numeric(24,6);
  prior_net_base numeric(24,6);
  prior_tax_base numeric(24,6);
  prior_restock_quantity numeric(24,6);
  prior_restock_cogs numeric(24,6);
  remaining_quantity numeric(24,6);
  line_net_transaction numeric(24,6);
  line_tax_transaction numeric(24,6);
  line_total_transaction numeric(24,6);
  line_net_base numeric(24,6);
  line_tax_base numeric(24,6);
  line_total_base numeric(24,6);
  line_cogs_base numeric(24,6);
  created_return_line_id uuid;
  created_movement_id uuid;
  current_quantity numeric(24,6);
  current_value numeric(24,6);
  new_quantity numeric(24,6);
  new_value numeric(24,6);
  new_average numeric(24,6);
  total_net_transaction numeric(24,6):=0;
  total_tax_transaction numeric(24,6):=0;
  total_return_transaction numeric(24,6):=0;
  total_net_base numeric(24,6):=0;
  total_tax_base numeric(24,6):=0;
  total_return_base numeric(24,6):=0;
  invoice_outstanding_base numeric(24,6);
  ar_credit_base numeric(24,6);
  customer_credit_base numeric(24,6);
  ar_account_id uuid;
  tax_account_id uuid;
  customer_credit_account_id uuid;
  journal_lines jsonb:='[]'::jsonb;
  grouped_record record;
  created_journal_id uuid;
begin
  if current_user_id is null then
    raise exception 'Authentication required.' using errcode='42501';
  end if;
  if not exists(
    select 1 from public.business_members membership
    where membership.business_id=p_business_id
      and membership.user_id=current_user_id
      and membership.status='active'
      and (
        membership.role in('owner','admin','accountant','manager','sales')
        or '*'=any(membership.permissions)
        or 'sales.manage'=any(membership.permissions)
        or 'sales.return'=any(membership.permissions)
      )
  ) then
    raise exception 'Sales return permission required.' using errcode='42501';
  end if;
  if p_return_date is null then
    raise exception 'Return date is required.' using errcode='22004';
  end if;
  if p_idempotency_key is not null then
    select sales_return.id into existing_return_id
    from public.business_sales_returns sales_return
    where sales_return.business_id=p_business_id
      and sales_return.idempotency_key=nullif(btrim(p_idempotency_key),'');
    if existing_return_id is not null then return existing_return_id; end if;
  end if;

  select invoice.* into invoice_record
  from public.business_sales_invoices invoice
  where invoice.business_id=p_business_id
    and invoice.id=p_invoice_id
    and invoice.status in('issued','partially_paid','paid')
  for update;
  if not found then
    raise exception 'Issued sales invoice not found.' using errcode='P0002';
  end if;
  if p_return_date<invoice_record.invoice_date then
    raise exception 'Sales return date cannot be before the invoice date.' using errcode='22008';
  end if;
  if jsonb_typeof(p_lines)<>'array' or jsonb_array_length(p_lines)<1 or jsonb_array_length(p_lines)>100 then
    raise exception 'Sales returns require 1 to 100 invoice lines.' using errcode='22023';
  end if;

  select account.id into ar_account_id
  from public.business_chart_of_accounts account
  where account.business_id=p_business_id and account.system_key='accounts_receivable' and account.is_active;
  select account.id into tax_account_id
  from public.business_chart_of_accounts account
  where account.business_id=p_business_id and account.system_key='taxes_payable' and account.is_active;
  select account.id into customer_credit_account_id
  from public.business_chart_of_accounts account
  where account.business_id=p_business_id and account.system_key='customer_credits' and account.is_active;
  if ar_account_id is null or tax_account_id is null or customer_credit_account_id is null then
    raise exception 'Sales return clearing accounts are missing.' using errcode='23503';
  end if;

  assigned_number:=private.next_business_inventory_operation_number(p_business_id,'sales_return');
  assigned_code:='SRN-'||lpad(assigned_number::text,6,'0');
  insert into public.business_sales_returns(
    business_id,return_number,return_code,invoice_id,customer_id,return_date,
    status,currency,exchange_rate,notes,idempotency_key,created_by
  ) values(
    p_business_id,assigned_number,assigned_code,p_invoice_id,invoice_record.customer_id,p_return_date,
    'draft',invoice_record.currency,invoice_record.exchange_rate,
    nullif(btrim(coalesce(p_notes,'')),''),nullif(btrim(coalesce(p_idempotency_key,'')),''),current_user_id
  ) returning id into created_return_id;

  for line_item in select value from jsonb_array_elements(p_lines)
  loop
    line_number:=line_number+1;
    begin
      source_line_id:=(line_item->>'invoice_line_id')::uuid;
      return_quantity:=coalesce(nullif(line_item->>'quantity','')::numeric,0);
      restock_requested:=coalesce(nullif(line_item->>'restock','')::boolean,true);
      selected_warehouse_id:=nullif(line_item->>'warehouse_id','')::uuid;
    exception when invalid_text_representation then
      raise exception 'Sales return lines contain invalid source, quantity, warehouse, or restock values.' using errcode='22023';
    end;
    if return_quantity<=0 then
      raise exception 'Sales return quantity must be greater than zero.' using errcode='22023';
    end if;
    if source_line_id=any(seen_source_lines) then
      raise exception 'An invoice line can appear only once per sales return.' using errcode='23505';
    end if;
    seen_source_lines:=array_append(seen_source_lines,source_line_id);

    select invoice_line.* into source_line
    from public.business_sales_invoice_lines invoice_line
    where invoice_line.business_id=p_business_id
      and invoice_line.invoice_id=p_invoice_id
      and invoice_line.id=source_line_id
    for update;
    if not found then
      raise exception 'Invoice line not found for this company invoice.' using errcode='P0002';
    end if;

    select
      coalesce(sum(return_line.quantity),0),
      coalesce(sum(return_line.net_transaction),0),
      coalesce(sum(return_line.tax_transaction),0),
      coalesce(sum(return_line.net_base),0),
      coalesce(sum(return_line.tax_base),0),
      coalesce(sum(return_line.quantity) filter(where return_line.restock),0),
      coalesce(sum(return_line.cogs_base) filter(where return_line.restock),0)
    into
      prior_quantity,prior_net_transaction,prior_tax_transaction,prior_net_base,prior_tax_base,
      prior_restock_quantity,prior_restock_cogs
    from public.business_sales_return_lines return_line
    join public.business_sales_returns sales_return
      on sales_return.business_id=return_line.business_id and sales_return.id=return_line.return_id
    where return_line.business_id=p_business_id
      and return_line.invoice_line_id=source_line_id
      and sales_return.status='posted';

    remaining_quantity:=source_line.quantity-prior_quantity;
    if return_quantity>remaining_quantity or remaining_quantity<=0 then
      raise exception 'Sales return quantity exceeds the unreturned invoice quantity.' using errcode='22023';
    end if;

    if return_quantity=remaining_quantity then
      line_net_transaction:=source_line.net_transaction-prior_net_transaction;
      line_tax_transaction:=source_line.tax_transaction-prior_tax_transaction;
      line_net_base:=source_line.net_base-prior_net_base;
      line_tax_base:=source_line.tax_base-prior_tax_base;
    else
      line_net_transaction:=round(source_line.net_transaction*return_quantity/source_line.quantity,6);
      line_tax_transaction:=round(source_line.tax_transaction*return_quantity/source_line.quantity,6);
      line_net_base:=round(source_line.net_base*return_quantity/source_line.quantity,6);
      line_tax_base:=round(source_line.tax_base*return_quantity/source_line.quantity,6);
    end if;
    line_total_transaction:=line_net_transaction+line_tax_transaction;
    line_total_base:=line_net_base+line_tax_base;

    if source_line.product_id is null then
      restock_requested:=false;
      selected_warehouse_id:=null;
      line_cogs_base:=0;
    elsif restock_requested then
      selected_warehouse_id:=coalesce(selected_warehouse_id,source_line.warehouse_id);
      if not exists(
        select 1 from public.business_warehouses warehouse
        where warehouse.business_id=p_business_id
          and warehouse.id=selected_warehouse_id
          and warehouse.status='active'
      ) then
        raise exception 'Active restock warehouse not found.' using errcode='P0002';
      end if;
      if prior_restock_quantity+return_quantity=source_line.quantity then
        line_cogs_base:=source_line.cogs_base-prior_restock_cogs;
      else
        line_cogs_base:=round(source_line.cogs_base*return_quantity/source_line.quantity,6);
      end if;
    else
      selected_warehouse_id:=null;
      line_cogs_base:=0;
    end if;

    insert into public.business_sales_return_lines(
      business_id,return_id,line_number,invoice_line_id,product_id,warehouse_id,
      quantity,restock,net_transaction,tax_transaction,total_transaction,
      net_base,tax_base,total_base,cogs_base
    ) values(
      p_business_id,created_return_id,line_number,source_line_id,source_line.product_id,selected_warehouse_id,
      return_quantity,restock_requested,line_net_transaction,line_tax_transaction,line_total_transaction,
      line_net_base,line_tax_base,line_total_base,line_cogs_base
    ) returning id into created_return_line_id;

    if source_line.product_id is not null and restock_requested then
      insert into public.business_inventory_balances(business_id,product_id,warehouse_id)
      values(p_business_id,source_line.product_id,selected_warehouse_id)
      on conflict(business_id,product_id,warehouse_id) do nothing;
      select balance.quantity_on_hand,balance.inventory_value_base
      into current_quantity,current_value
      from public.business_inventory_balances balance
      where balance.business_id=p_business_id
        and balance.product_id=source_line.product_id
        and balance.warehouse_id=selected_warehouse_id
      for update;
      new_quantity:=current_quantity+return_quantity;
      new_value:=current_value+line_cogs_base;
      new_average:=case when new_quantity=0 then 0 else round(new_value/new_quantity,6) end;
      update public.business_inventory_balances balance
      set quantity_on_hand=new_quantity,
          inventory_value_base=new_value,
          average_cost_base=new_average,
          updated_at=now()
      where balance.business_id=p_business_id
        and balance.product_id=source_line.product_id
        and balance.warehouse_id=selected_warehouse_id;
      insert into public.business_stock_movements(
        business_id,movement_number,movement_type,movement_date,product_id,warehouse_id,
        quantity,unit_cost_base,total_value_base,source_type,source_id,source_line_id,
        status,notes,created_by
      ) values(
        p_business_id,private.next_business_inventory_movement_number(p_business_id),'sales_return',p_return_date,
        source_line.product_id,selected_warehouse_id,return_quantity,
        case when return_quantity=0 then 0 else round(line_cogs_base/return_quantity,6) end,
        line_cogs_base,'sales_return',created_return_id,created_return_line_id,
        'draft','Customer return restocked',current_user_id
      ) returning id into created_movement_id;
      update public.business_sales_return_lines return_line
      set movement_id=created_movement_id
      where return_line.business_id=p_business_id and return_line.id=created_return_line_id;
    end if;

    total_net_transaction:=total_net_transaction+line_net_transaction;
    total_tax_transaction:=total_tax_transaction+line_tax_transaction;
    total_return_transaction:=total_return_transaction+line_total_transaction;
    total_net_base:=total_net_base+line_net_base;
    total_tax_base:=total_tax_base+line_tax_base;
    total_return_base:=total_return_base+line_total_base;
  end loop;

  if total_return_base<=0 then
    raise exception 'Sales return total must be greater than zero.' using errcode='22023';
  end if;
  invoice_outstanding_base:=greatest(
    invoice_record.total_base-invoice_record.paid_base-invoice_record.returned_base,
    0
  );
  ar_credit_base:=least(total_return_base,invoice_outstanding_base);
  customer_credit_base:=total_return_base-ar_credit_base;
  update public.business_sales_returns sales_return
  set net_transaction=total_net_transaction,
      tax_transaction=total_tax_transaction,
      total_transaction=total_return_transaction,
      net_base=total_net_base,
      tax_base=total_tax_base,
      total_base=total_return_base,
      ar_credit_base=ar_credit_base,
      customer_credit_base=customer_credit_base,
      updated_at=now()
  where sales_return.business_id=p_business_id and sales_return.id=created_return_id;

  for grouped_record in
    select invoice_line.revenue_account_id as account_id,
           sum(return_line.net_base)::numeric(24,6) as amount
    from public.business_sales_return_lines return_line
    join public.business_sales_invoice_lines invoice_line
      on invoice_line.business_id=return_line.business_id and invoice_line.id=return_line.invoice_line_id
    where return_line.business_id=p_business_id and return_line.return_id=created_return_id
    group by invoice_line.revenue_account_id
    order by invoice_line.revenue_account_id
  loop
    journal_lines:=journal_lines||jsonb_build_array(jsonb_build_object(
      'account_id',grouped_record.account_id,'debit',grouped_record.amount,'credit',0,
      'description','Sales return revenue reversal'
    ));
  end loop;
  if total_tax_base>0 then
    journal_lines:=journal_lines||jsonb_build_array(jsonb_build_object(
      'account_id',tax_account_id,'debit',total_tax_base,'credit',0,
      'description','Sales tax reversal'
    ));
  end if;
  if ar_credit_base>0 then
    journal_lines:=journal_lines||jsonb_build_array(jsonb_build_object(
      'account_id',ar_account_id,'debit',0,'credit',ar_credit_base,
      'description','Accounts receivable credit'
    ));
  end if;
  if customer_credit_base>0 then
    journal_lines:=journal_lines||jsonb_build_array(jsonb_build_object(
      'account_id',customer_credit_account_id,'debit',0,'credit',customer_credit_base,
      'description','Customer credit balance'
    ));
  end if;
  for grouped_record in
    select product.inventory_account_id as inventory_account_id,
           product.cogs_account_id as cogs_account_id,
           sum(return_line.cogs_base)::numeric(24,6) as amount
    from public.business_sales_return_lines return_line
    join public.business_products product
      on product.business_id=return_line.business_id and product.id=return_line.product_id
    where return_line.business_id=p_business_id
      and return_line.return_id=created_return_id
      and return_line.restock
      and return_line.cogs_base>0
    group by product.inventory_account_id,product.cogs_account_id
    order by product.inventory_account_id,product.cogs_account_id
  loop
    journal_lines:=journal_lines||jsonb_build_array(
      jsonb_build_object(
        'account_id',grouped_record.inventory_account_id,'debit',grouped_record.amount,'credit',0,
        'description','Returned inventory received'
      ),
      jsonb_build_object(
        'account_id',grouped_record.cogs_account_id,'debit',0,'credit',grouped_record.amount,
        'description','Cost of goods sold reversed'
      )
    );
  end loop;

  created_journal_id:=private.post_business_inventory_operation_journal(
    p_business_id,p_return_date,'sales_return',created_return_id,assigned_code,
    'Sales return '||assigned_code,journal_lines,current_user_id
  );
  update public.business_stock_movements movement
  set journal_entry_id=created_journal_id,status='posted',posted_at=now()
  where movement.business_id=p_business_id
    and movement.source_type='sales_return'
    and movement.source_id=created_return_id
    and movement.status='draft';
  update public.business_sales_invoices invoice
  set returned_transaction=invoice.returned_transaction+total_return_transaction,
      returned_base=invoice.returned_base+total_return_base,
      updated_at=now()
  where invoice.business_id=p_business_id and invoice.id=p_invoice_id;
  update public.business_sales_returns sales_return
  set status='posted',journal_entry_id=created_journal_id,posted_at=now(),updated_at=now()
  where sales_return.business_id=p_business_id and sales_return.id=created_return_id;
  return created_return_id;
end;
$$;

create or replace function public.create_business_sales_return(
  p_business_id uuid,
  p_invoice_id uuid,
  p_return_date date,
  p_lines jsonb default '[]'::jsonb,
  p_notes text default null,
  p_idempotency_key text default null
)
returns uuid
language plpgsql
set search_path to pg_catalog,public,private
as $$
begin
  return private.create_business_sales_return_internal(
    p_business_id,p_invoice_id,p_return_date,p_lines,p_notes,p_idempotency_key
  );
end;
$$;

revoke all on function public.create_business_sales_return(uuid,uuid,date,jsonb,text,text)
  from public,anon;
grant execute on function public.create_business_sales_return(uuid,uuid,date,jsonb,text,text)
  to authenticated,service_role;
revoke execute on function private.create_business_sales_return_internal(uuid,uuid,date,jsonb,text,text)
  from public,anon,authenticated;
