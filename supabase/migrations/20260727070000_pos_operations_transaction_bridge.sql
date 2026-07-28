-- Retail POS operations transaction bridge.
--
-- This migration extends the verified POS sale bridge with branch-scoped
-- purchases, expenses, approved customer refunds, immutable same-day voids,
-- and approved cash adjustments. The service-role Edge Function remains the
-- only caller; every accounting record is attributed to the validated cashier
-- through transaction-local JWT claims.

alter table public.business_pos_security_events
  drop constraint if exists business_pos_security_events_event_type_check;
alter table public.business_pos_security_events
  add constraint business_pos_security_events_event_type_check check (event_type in (
    'device_enrolled','device_revoked','temporary_pin_issued','pin_changed',
    'pin_revoked','login_succeeded','login_failed','session_revoked',
    'approval_requested','approval_approved','approval_denied',
    'approval_expired','approval_consumed','branch_configured',
    'sale_approval_required','sale_posted','sale_failed','sale_replayed',
    'purchase_posted','purchase_failed','purchase_replayed',
    'expense_posted','expense_failed','expense_replayed',
    'refund_approval_required','refund_posted','refund_failed','refund_replayed',
    'void_approval_required','void_posted','void_failed','void_replayed',
    'cash_adjustment_approval_required','cash_adjustment_posted',
    'cash_adjustment_failed','cash_adjustment_replayed'
  ));

alter table public.business_pos_branch_settings
  add column if not exists expense_account_id uuid,
  add column if not exists cash_gain_account_id uuid,
  add column if not exists cash_loss_account_id uuid,
  add column if not exists allow_purchases boolean not null default true,
  add column if not exists allow_expenses boolean not null default true;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname='business_pos_branch_settings_expense_account_fk'
  ) then
    alter table public.business_pos_branch_settings
      add constraint business_pos_branch_settings_expense_account_fk
      foreign key (business_id,expense_account_id)
      references public.business_chart_of_accounts(business_id,id) on delete restrict;
  end if;
  if not exists (
    select 1 from pg_constraint
    where conname='business_pos_branch_settings_gain_account_fk'
  ) then
    alter table public.business_pos_branch_settings
      add constraint business_pos_branch_settings_gain_account_fk
      foreign key (business_id,cash_gain_account_id)
      references public.business_chart_of_accounts(business_id,id) on delete restrict;
  end if;
  if not exists (
    select 1 from pg_constraint
    where conname='business_pos_branch_settings_loss_account_fk'
  ) then
    alter table public.business_pos_branch_settings
      add constraint business_pos_branch_settings_loss_account_fk
      foreign key (business_id,cash_loss_account_id)
      references public.business_chart_of_accounts(business_id,id) on delete restrict;
  end if;
end;
$$;

create table if not exists public.business_pos_operation_requests (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  branch_id uuid not null,
  device_id uuid not null,
  session_id uuid not null references public.business_pos_sessions(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete restrict,
  request_key uuid not null,
  operation_type text not null check (
    operation_type in ('purchase','expense','refund','void','cash_adjustment')
  ),
  payload_hash text not null,
  approval_id uuid references public.business_pos_approval_requests(id) on delete set null,
  status text not null default 'pending' check (
    status in ('approval_required','pending','posted','failed')
  ),
  attempt_count smallint not null default 1 check (attempt_count between 1 and 20),
  source_id uuid,
  secondary_source_id uuid,
  amount numeric(24,6),
  error_code text,
  result jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id,request_key),
  foreign key (business_id,branch_id)
    references public.business_branches(business_id,id) on delete restrict,
  foreign key (business_id,device_id)
    references public.business_pos_devices(business_id,id) on delete restrict,
  check (payload_hash ~ '^[0-9a-f]{64}$'),
  check (amount is null or amount >= 0),
  check (error_code is null or char_length(error_code)<=40),
  check (result is null or jsonb_typeof(result)='object')
);

create table if not exists public.business_pos_refund_payouts (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  operation_request_id uuid not null unique
    references public.business_pos_operation_requests(id) on delete restrict,
  sales_return_id uuid not null,
  cash_account_id uuid not null,
  journal_entry_id uuid not null,
  amount_base numeric(24,6) not null check (amount_base > 0),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  foreign key (business_id,sales_return_id)
    references public.business_sales_returns(business_id,id) on delete restrict,
  foreign key (business_id,cash_account_id)
    references public.business_chart_of_accounts(business_id,id) on delete restrict,
  foreign key (business_id,journal_entry_id)
    references public.business_journal_entries(business_id,id) on delete restrict
);

create table if not exists public.business_pos_cash_adjustments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  branch_id uuid not null,
  operation_request_id uuid not null unique
    references public.business_pos_operation_requests(id) on delete restrict,
  direction text not null check (direction in ('increase','decrease')),
  amount_base numeric(24,6) not null check (amount_base > 0),
  cash_account_id uuid not null,
  offset_account_id uuid not null,
  journal_entry_id uuid not null,
  reason text not null check (char_length(btrim(reason)) between 5 and 300),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  foreign key (business_id,branch_id)
    references public.business_branches(business_id,id) on delete restrict,
  foreign key (business_id,cash_account_id)
    references public.business_chart_of_accounts(business_id,id) on delete restrict,
  foreign key (business_id,offset_account_id)
    references public.business_chart_of_accounts(business_id,id) on delete restrict,
  foreign key (business_id,journal_entry_id)
    references public.business_journal_entries(business_id,id) on delete restrict
);

create index if not exists business_pos_operation_requests_session_idx
  on public.business_pos_operation_requests(session_id,created_at desc);
create index if not exists business_pos_operation_requests_business_status_idx
  on public.business_pos_operation_requests(business_id,status,created_at desc);
create index if not exists business_pos_refund_payouts_business_idx
  on public.business_pos_refund_payouts(business_id,created_at desc);
create index if not exists business_pos_cash_adjustments_business_idx
  on public.business_pos_cash_adjustments(business_id,created_at desc);

alter table public.business_pos_operation_requests enable row level security;
alter table public.business_pos_refund_payouts enable row level security;
alter table public.business_pos_cash_adjustments enable row level security;
revoke all on table public.business_pos_operation_requests from public,anon,authenticated;
revoke all on table public.business_pos_refund_payouts from public,anon,authenticated;
revoke all on table public.business_pos_cash_adjustments from public,anon,authenticated;
grant all on table public.business_pos_operation_requests to service_role;
grant all on table public.business_pos_refund_payouts to service_role;
grant all on table public.business_pos_cash_adjustments to service_role;

drop trigger if exists business_pos_operation_requests_updated_at
  on public.business_pos_operation_requests;
create trigger business_pos_operation_requests_updated_at
before update on public.business_pos_operation_requests
for each row execute function private.set_business_workspace_updated_at();

create or replace function private.ensure_business_pos_operation_settings(
  p_business_id uuid,
  p_branch_id uuid
)
returns public.business_pos_branch_settings
language plpgsql
security definer
set search_path='pg_catalog','public','private'
as $$
declare
  current_settings public.business_pos_branch_settings;
  default_expense uuid;
  gain_account uuid;
  loss_account uuid;
begin
  perform private.ensure_business_pos_primary_branch_setting(p_business_id);

  select settings.* into current_settings
  from public.business_pos_branch_settings settings
  where settings.business_id=p_business_id and settings.branch_id=p_branch_id
  for update;
  if not found then
    raise exception 'POS branch configuration is missing.' using errcode='POS05';
  end if;

  select simple.default_expense_account_id into default_expense
  from public.business_simple_shop_settings simple
  where simple.business_id=p_business_id;

  select account.id into gain_account
  from public.business_chart_of_accounts account
  where account.business_id=p_business_id
    and account.system_key='other_income'
    and account.is_active
  limit 1;

  select account.id into loss_account
  from public.business_chart_of_accounts account
  where account.business_id=p_business_id
    and account.system_key in ('other_expenses','operating_expenses')
    and account.is_active
  order by case account.system_key when 'other_expenses' then 0 else 1 end
  limit 1;

  update public.business_pos_branch_settings
  set expense_account_id=coalesce(expense_account_id,default_expense),
      cash_gain_account_id=coalesce(cash_gain_account_id,gain_account),
      cash_loss_account_id=coalesce(cash_loss_account_id,loss_account),
      updated_at=now()
  where business_id=p_business_id and branch_id=p_branch_id
  returning * into current_settings;

  return current_settings;
end;
$$;

create or replace function private.current_business_pos_claim_valid(
  p_business_id uuid,
  p_user_id uuid
)
returns boolean
language plpgsql
stable
security definer
set search_path='pg_catalog','public'
as $$
declare
  claims jsonb;
  claimed_session uuid;
begin
  begin
    claims:=nullif(current_setting('request.jwt.claims',true),'')::jsonb;
    claimed_session:=nullif(claims->>'pos_session_id','')::uuid;
  exception when others then
    return false;
  end;

  return claimed_session is not null and exists(
    select 1
    from public.business_pos_sessions session
    join public.business_pos_devices device
      on device.business_id=session.business_id and device.id=session.device_id
    join public.business_branches branch
      on branch.business_id=session.business_id and branch.id=session.branch_id
    join public.business_pos_staff_credentials credential
      on credential.business_id=session.business_id and credential.user_id=session.user_id
    where session.id=claimed_session
      and session.business_id=p_business_id
      and session.user_id=p_user_id
      and session.revoked_at is null
      and session.expires_at>now()
      and session.last_activity_at>now()-interval '30 minutes'
      and device.status='active'
      and branch.status='active'
      and credential.status='active'
      and private.business_pos_actor_can(session.user_id,session.business_id,'operate')
      and private.business_pos_member_has_branch_access(session.business_id,session.user_id,session.branch_id)
  );
end;
$$;

-- Permit a cashier sales return only when it originates inside the validated
-- service-role POS bridge. Normal website callers retain the existing roles.
do $$
declare
  definition text;
  old_text text:=$old$membership.role in('owner','admin','accountant','manager','sales') or '*'=any(membership.permissions) or 'sales.manage'=any(membership.permissions) or 'sales.return'=any(membership.permissions)$old$;
  new_text text:=$new$membership.role in('owner','admin','accountant','manager','sales') or (membership.role='cashier' and 'shop.sell'=any(membership.permissions) and private.current_business_pos_claim_valid(p_business_id,current_user_id)) or '*'=any(membership.permissions) or 'sales.manage'=any(membership.permissions) or 'sales.return'=any(membership.permissions)$new$;
begin
  select pg_get_functiondef(
    'private.create_business_sales_return_internal(uuid,uuid,date,jsonb,text,text)'::regprocedure
  ) into definition;
  if position(old_text in definition)=0 then
    raise exception 'Sales return permission patch target not found.';
  end if;
  execute replace(definition,old_text,new_text);
end;
$$;

create or replace function private.business_pos_user_can_shop_operation(
  p_user_id uuid,
  p_business_id uuid,
  p_operation_type text
)
returns boolean
language sql
stable
security definer
set search_path='pg_catalog','public','private'
as $$
  select exists(
    select 1
    from public.business_members member
    join public.businesses business on business.id=member.business_id
    where member.business_id=p_business_id
      and member.user_id=p_user_id
      and member.status='active'
      and business.status='active'
      and business.workspace_mode='simple_shop'
      and (
        '*'=any(member.permissions)
        or case lower(btrim(coalesce(p_operation_type,'')))
          when 'sale' then member.role in ('owner','admin','manager','sales','cashier')
            or 'shop.sell'=any(member.permissions)
          when 'purchase' then member.role in ('owner','admin','manager','inventory')
            or 'shop.purchase'=any(member.permissions)
          when 'expense' then member.role in ('owner','admin','manager','cashier')
            or 'shop.expense'=any(member.permissions)
          when 'refund' then member.role in ('owner','admin','accountant','manager','sales','cashier')
            or 'sales.manage'=any(member.permissions)
            or 'sales.return'=any(member.permissions)
            or 'shop.sell'=any(member.permissions)
          when 'void' then member.role in ('owner','admin','accountant','manager','sales','cashier')
            or 'sales.manage'=any(member.permissions)
            or 'sales.return'=any(member.permissions)
            or 'shop.sell'=any(member.permissions)
          when 'cash_adjustment' then private.business_pos_actor_can(p_user_id,p_business_id,'operate')
          else false
        end
      )
  );
$$;

create or replace function private.normalize_business_pos_purchase_lines(
  p_business_id uuid,
  p_warehouse_id uuid,
  p_lines jsonb
)
returns jsonb
language plpgsql
stable
security definer
set search_path='pg_catalog','public'
as $$
declare
  item jsonb;
  target_product record;
  product_id uuid;
  quantity numeric;
  discount_percent numeric;
  tax_rate numeric;
  normalized jsonb:='[]'::jsonb;
  estimated_total numeric:=0;
begin
  if p_lines is null or jsonb_typeof(p_lines)<>'array'
     or jsonb_array_length(p_lines)<1 or jsonb_array_length(p_lines)>100 then
    raise exception 'POS purchase requires 1 to 100 lines.' using errcode='22023';
  end if;

  for item in select value from jsonb_array_elements(p_lines)
  loop
    if jsonb_typeof(item)<>'object'
       or item - array['product_id','quantity','discount_percent','tax_rate']<> '{}'::jsonb then
      raise exception 'POS purchase line contains unsupported fields.' using errcode='22023';
    end if;
    if not (item ? 'product_id') or not (item ? 'quantity') then
      raise exception 'POS purchase line requires product and quantity.' using errcode='22023';
    end if;
    begin
      product_id:=(item->>'product_id')::uuid;
      quantity:=(item->>'quantity')::numeric;
      discount_percent:=coalesce(nullif(item->>'discount_percent','')::numeric,0);
      tax_rate:=coalesce(nullif(item->>'tax_rate','')::numeric,0);
    exception when others then
      raise exception 'POS purchase line is invalid.' using errcode='22023';
    end;
    if quantity<=0 or quantity>1000000
       or discount_percent not between 0 and 100
       or tax_rate not between 0 and 100 then
      raise exception 'POS purchase quantity, discount, or tax is invalid.' using errcode='22023';
    end if;

    select product.* into target_product
    from public.business_products product
    where product.business_id=p_business_id
      and product.id=product_id
      and product.status='active';
    if not found or target_product.inventory_account_id is null then
      raise exception 'Active inventory product not found.' using errcode='P0002';
    end if;

    normalized:=normalized||jsonb_build_array(jsonb_build_object(
      'product_id',target_product.id,
      'warehouse_id',p_warehouse_id,
      'description',target_product.name,
      'quantity',quantity,
      'unit_cost',target_product.purchase_cost_hint,
      'discount_percent',discount_percent,
      'tax_rate',tax_rate,
      'allocation_account_id',target_product.inventory_account_id
    ));
    estimated_total:=estimated_total+
      round(
        quantity*target_product.purchase_cost_hint*
        (1-discount_percent/100)*(1+tax_rate/100),
        6
      );
  end loop;

  return jsonb_build_object('lines',normalized,'estimated_total',estimated_total);
end;
$$;

create or replace function private.normalize_business_pos_return_lines(
  p_business_id uuid,
  p_branch_id uuid,
  p_invoice_id uuid,
  p_warehouse_id uuid,
  p_lines jsonb
)
returns jsonb
language plpgsql
stable
security definer
set search_path='pg_catalog','public'
as $$
declare
  item jsonb;
  source_line record;
  invoice_line_id uuid;
  return_quantity numeric;
  prior_quantity numeric;
  remaining_quantity numeric;
  normalized jsonb:='[]'::jsonb;
  estimated_total numeric:=0;
begin
  if not exists(
    select 1
    from public.business_pos_sale_requests request
    where request.business_id=p_business_id
      and request.branch_id=p_branch_id
      and request.invoice_id=p_invoice_id
      and request.status='posted'
  ) then
    raise exception 'Branch POS invoice not found.' using errcode='P0002';
  end if;
  if p_lines is null or jsonb_typeof(p_lines)<>'array'
     or jsonb_array_length(p_lines)<1 or jsonb_array_length(p_lines)>100 then
    raise exception 'POS refund requires 1 to 100 invoice lines.' using errcode='22023';
  end if;

  for item in select value from jsonb_array_elements(p_lines)
  loop
    if jsonb_typeof(item)<>'object'
       or item - array['invoice_line_id','quantity']<> '{}'::jsonb then
      raise exception 'POS refund line contains unsupported fields.' using errcode='22023';
    end if;
    begin
      invoice_line_id:=(item->>'invoice_line_id')::uuid;
      return_quantity:=(item->>'quantity')::numeric;
    exception when others then
      raise exception 'POS refund line is invalid.' using errcode='22023';
    end;
    if return_quantity<=0 then
      raise exception 'POS refund quantity must be greater than zero.' using errcode='22023';
    end if;

    select line.* into source_line
    from public.business_sales_invoice_lines line
    where line.business_id=p_business_id
      and line.invoice_id=p_invoice_id
      and line.id=invoice_line_id;
    if not found then
      raise exception 'Invoice line not found.' using errcode='P0002';
    end if;

    select coalesce(sum(return_line.quantity),0) into prior_quantity
    from public.business_sales_return_lines return_line
    join public.business_sales_returns sales_return
      on sales_return.business_id=return_line.business_id
     and sales_return.id=return_line.return_id
    where return_line.business_id=p_business_id
      and return_line.invoice_line_id=invoice_line_id
      and sales_return.status='posted';
    remaining_quantity:=source_line.quantity-prior_quantity;
    if remaining_quantity<=0 or return_quantity>remaining_quantity then
      raise exception 'POS refund quantity exceeds the remaining quantity.' using errcode='22023';
    end if;

    normalized:=normalized||jsonb_build_array(jsonb_build_object(
      'invoice_line_id',source_line.id,
      'quantity',return_quantity,
      'restock',source_line.product_id is not null,
      'warehouse_id',case when source_line.product_id is null then null else p_warehouse_id end
    ));
    estimated_total:=estimated_total+
      round(source_line.total_transaction*return_quantity/source_line.quantity,6);
  end loop;

  return jsonb_build_object('lines',normalized,'estimated_total',estimated_total);
end;
$$;

create or replace function private.build_business_pos_void_lines(
  p_business_id uuid,
  p_branch_id uuid,
  p_invoice_id uuid,
  p_warehouse_id uuid,
  p_void_date date
)
returns jsonb
language plpgsql
stable
security definer
set search_path='pg_catalog','public'
as $$
declare
  result jsonb;
begin
  if not exists(
    select 1
    from public.business_pos_sale_requests request
    join public.business_sales_invoices invoice
      on invoice.business_id=request.business_id and invoice.id=request.invoice_id
    where request.business_id=p_business_id
      and request.branch_id=p_branch_id
      and request.invoice_id=p_invoice_id
      and request.status='posted'
      and invoice.invoice_date=p_void_date
  ) then
    raise exception 'Same-day branch POS invoice not found.' using errcode='P0002';
  end if;

  select jsonb_build_object(
    'lines',coalesce(jsonb_agg(jsonb_build_object(
      'invoice_line_id',line.id,
      'quantity',line.quantity-coalesce(returned.quantity,0),
      'restock',line.product_id is not null,
      'warehouse_id',case when line.product_id is null then null else p_warehouse_id end
    ) order by line.line_number) filter (
      where line.quantity-coalesce(returned.quantity,0)>0
    ),'[]'::jsonb),
    'estimated_total',coalesce(sum(
      line.total_transaction*
      (line.quantity-coalesce(returned.quantity,0))/line.quantity
    ) filter (where line.quantity-coalesce(returned.quantity,0)>0),0)
  ) into result
  from public.business_sales_invoice_lines line
  left join lateral (
    select coalesce(sum(return_line.quantity),0) quantity
    from public.business_sales_return_lines return_line
    join public.business_sales_returns sales_return
      on sales_return.business_id=return_line.business_id
     and sales_return.id=return_line.return_id
    where return_line.business_id=line.business_id
      and return_line.invoice_line_id=line.id
      and sales_return.status='posted'
  ) returned on true
  where line.business_id=p_business_id and line.invoice_id=p_invoice_id;

  if jsonb_array_length(result->'lines')=0 then
    raise exception 'POS invoice has no remaining quantity to void.' using errcode='22023';
  end if;
  return result;
end;
$$;

create or replace function private.create_business_pos_refund_payout(
  p_request_id uuid,
  p_business_id uuid,
  p_return_id uuid,
  p_cash_account_id uuid,
  p_cashier_user_id uuid
)
returns uuid
language plpgsql
security definer
set search_path='pg_catalog','public','private'
as $$
declare
  return_record record;
  customer_credit_account uuid;
  fiscal_period uuid;
  journal_id uuid;
  payout_id uuid;
  transaction_amount numeric(24,6);
begin
  select sales_return.* into return_record
  from public.business_sales_returns sales_return
  where sales_return.business_id=p_business_id and sales_return.id=p_return_id
  for update;
  if not found or return_record.customer_credit_base<=0 then
    return null;
  end if;

  select account.id into customer_credit_account
  from public.business_chart_of_accounts account
  where account.business_id=p_business_id
    and account.system_key='customer_credits'
    and account.is_active;
  if customer_credit_account is null then
    raise exception 'Customer credit account is missing.' using errcode='23503';
  end if;

  select period.id into fiscal_period
  from public.business_fiscal_periods period
  where period.business_id=p_business_id
    and period.status='open'
    and return_record.return_date between period.starts_on and period.ends_on
  order by period.starts_on desc limit 1;
  if fiscal_period is null then
    raise exception 'No open fiscal period contains the refund date.' using errcode='22008';
  end if;

  transaction_amount:=round(
    return_record.customer_credit_base/nullif(return_record.exchange_rate,0),
    6
  );
  insert into public.business_journal_entries(
    business_id,entry_date,fiscal_period_id,source_type,source_id,reference,
    description,status,transaction_currency,exchange_rate,created_by
  ) values (
    p_business_id,return_record.return_date,fiscal_period,'manual',p_request_id,
    'POS-REFUND-'||left(p_request_id::text,8),'Immediate POS customer refund',
    'draft',return_record.currency,return_record.exchange_rate,p_cashier_user_id
  ) returning id into journal_id;

  insert into public.business_journal_lines(
    business_id,journal_entry_id,line_number,account_id,description,
    debit_transaction,credit_transaction
  ) values
    (p_business_id,journal_id,1,customer_credit_account,'Clear customer credit',
      transaction_amount,0),
    (p_business_id,journal_id,2,p_cash_account_id,'Cash refund paid',0,
      transaction_amount);
  update public.business_journal_entries
  set status='posted'
  where business_id=p_business_id and id=journal_id;

  insert into public.business_pos_refund_payouts(
    business_id,operation_request_id,sales_return_id,cash_account_id,
    journal_entry_id,amount_base,created_by
  ) values (
    p_business_id,p_request_id,p_return_id,p_cash_account_id,
    journal_id,return_record.customer_credit_base,p_cashier_user_id
  ) returning id into payout_id;
  return payout_id;
end;
$$;

create or replace function private.create_business_pos_cash_adjustment(
  p_request_id uuid,
  p_business_id uuid,
  p_branch_id uuid,
  p_adjustment_date date,
  p_direction text,
  p_amount numeric,
  p_reason text,
  p_cash_account_id uuid,
  p_gain_account_id uuid,
  p_loss_account_id uuid,
  p_cashier_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path='pg_catalog','public','private'
as $$
declare
  business_currency text;
  rounding_scale smallint;
  amount_base numeric(24,6);
  offset_account uuid;
  fiscal_period uuid;
  journal_id uuid;
  adjustment_id uuid;
begin
  select business.base_currency,accounting.rounding_scale
  into business_currency,rounding_scale
  from public.businesses business
  join public.business_accounting_settings accounting
    on accounting.business_id=business.id
  where business.id=p_business_id
    and business.status='active'
    and business.workspace_mode='simple_shop';
  if business_currency is null then
    raise exception 'Active simple shop not found.' using errcode='P0002';
  end if;

  amount_base:=round(coalesce(p_amount,0),rounding_scale);
  if p_direction not in ('increase','decrease') or amount_base<=0 then
    raise exception 'Cash adjustment direction or amount is invalid.' using errcode='22023';
  end if;
  if char_length(btrim(coalesce(p_reason,''))) not between 5 and 300 then
    raise exception 'Cash adjustment reason must contain 5 to 300 characters.' using errcode='22023';
  end if;
  offset_account:=case when p_direction='increase' then p_gain_account_id else p_loss_account_id end;
  if offset_account is null then
    raise exception 'Cash adjustment offset account is missing.' using errcode='POS05';
  end if;

  select period.id into fiscal_period
  from public.business_fiscal_periods period
  where period.business_id=p_business_id
    and period.status='open'
    and p_adjustment_date between period.starts_on and period.ends_on
  order by period.starts_on desc limit 1;
  if fiscal_period is null then
    raise exception 'No open fiscal period contains the adjustment date.' using errcode='22008';
  end if;

  insert into public.business_journal_entries(
    business_id,entry_date,fiscal_period_id,source_type,source_id,reference,
    description,status,transaction_currency,exchange_rate,created_by
  ) values (
    p_business_id,p_adjustment_date,fiscal_period,'manual',p_request_id,
    'POS-CASH-'||left(p_request_id::text,8),btrim(p_reason),'draft',
    business_currency,1,p_cashier_user_id
  ) returning id into journal_id;

  if p_direction='increase' then
    insert into public.business_journal_lines(
      business_id,journal_entry_id,line_number,account_id,description,
      debit_transaction,credit_transaction
    ) values
      (p_business_id,journal_id,1,p_cash_account_id,btrim(p_reason),amount_base,0),
      (p_business_id,journal_id,2,offset_account,btrim(p_reason),0,amount_base);
  else
    insert into public.business_journal_lines(
      business_id,journal_entry_id,line_number,account_id,description,
      debit_transaction,credit_transaction
    ) values
      (p_business_id,journal_id,1,offset_account,btrim(p_reason),amount_base,0),
      (p_business_id,journal_id,2,p_cash_account_id,btrim(p_reason),0,amount_base);
  end if;
  update public.business_journal_entries
  set status='posted'
  where business_id=p_business_id and id=journal_id;

  insert into public.business_pos_cash_adjustments(
    business_id,branch_id,operation_request_id,direction,amount_base,
    cash_account_id,offset_account_id,journal_entry_id,reason,created_by
  ) values (
    p_business_id,p_branch_id,p_request_id,p_direction,amount_base,
    p_cash_account_id,offset_account,journal_id,btrim(p_reason),p_cashier_user_id
  ) returning id into adjustment_id;

  return jsonb_build_object(
    'adjustment_id',adjustment_id,'journal_id',journal_id,
    'direction',p_direction,'amount',amount_base
  );
end;
$$;

create or replace function public.end_business_pos_session(
  p_session_token_hash text
)
returns void
language plpgsql
security definer
set search_path='pg_catalog','public','private'
as $$
declare target_session public.business_pos_sessions;
begin
  target_session:=private.get_business_pos_session_internal(p_session_token_hash,false);
  update public.business_pos_sessions
  set revoked_at=now(),revoked_by=target_session.user_id,revoke_reason='cashier_ended_shift'
  where id=target_session.id and revoked_at is null;
  perform private.write_business_pos_event(
    target_session.business_id,target_session.branch_id,target_session.device_id,
    target_session.id,target_session.user_id,target_session.user_id,null,
    'session_revoked','success',jsonb_build_object('reason','cashier_ended_shift')
  );
end;
$$;

create or replace function public.get_business_pos_terminal_snapshot(
  p_session_token_hash text
)
returns jsonb
language plpgsql
security definer
set search_path='pg_catalog','public','private'
as $$
declare
  target_session public.business_pos_sessions;
  settings public.business_pos_branch_settings;
  result jsonb;
begin
  target_session:=private.get_business_pos_session_internal(p_session_token_hash,true);
  settings:=private.ensure_business_pos_operation_settings(
    target_session.business_id,target_session.branch_id
  );

  select jsonb_build_object(
    'session',jsonb_build_object(
      'id',target_session.id,'business_id',target_session.business_id,
      'branch_id',target_session.branch_id,'device_id',target_session.device_id,
      'user_id',target_session.user_id,'expires_at',target_session.expires_at
    ),
    'business',(select jsonb_build_object(
      'id',business.id,'slug',business.slug,'name',business.name,
      'base_currency',business.base_currency,'timezone',business.timezone
    ) from public.businesses business where business.id=target_session.business_id),
    'branch',(select jsonb_build_object(
      'id',branch.id,'code',branch.code,'name',branch.name,'timezone',branch.timezone,
      'current_date',(now() at time zone branch.timezone)::date
    ) from public.business_branches branch where branch.id=target_session.branch_id),
    'settings',jsonb_build_object(
      'warehouse_id',settings.warehouse_id,
      'cash_account_id',settings.cash_account_id,
      'high_discount_threshold',settings.high_discount_threshold,
      'allow_credit_sales',settings.allow_credit_sales,
      'allow_purchases',settings.allow_purchases,
      'allow_expenses',settings.allow_expenses
    ),
    'capabilities',jsonb_build_object(
      'sale',private.business_pos_user_can_shop_operation(target_session.user_id,target_session.business_id,'sale'),
      'purchase',settings.allow_purchases and private.business_pos_user_can_shop_operation(target_session.user_id,target_session.business_id,'purchase'),
      'expense',settings.allow_expenses and private.business_pos_user_can_shop_operation(target_session.user_id,target_session.business_id,'expense'),
      'refund',private.business_pos_user_can_shop_operation(target_session.user_id,target_session.business_id,'refund'),
      'void',private.business_pos_user_can_shop_operation(target_session.user_id,target_session.business_id,'void'),
      'cash_adjustment',private.business_pos_user_can_shop_operation(target_session.user_id,target_session.business_id,'cash_adjustment')
    ),
    'products',coalesce((select jsonb_agg(jsonb_build_object(
      'id',product.id,'sku',product.sku,'name',product.name,'unit',product.unit_of_measure,
      'sales_price',product.sales_price,'purchase_cost_hint',product.purchase_cost_hint,
      'quantity_on_hand',coalesce(balance.quantity_on_hand,0)
    ) order by product.name)
      from public.business_products product
      left join public.business_inventory_balances balance
        on balance.business_id=product.business_id
       and balance.product_id=product.id
       and balance.warehouse_id=settings.warehouse_id
      where product.business_id=target_session.business_id
        and product.status='active'),'[]'::jsonb),
    'customers',coalesce((select jsonb_agg(jsonb_build_object(
      'id',contact.id,'name',contact.display_name
    ) order by contact.display_name)
      from public.business_contacts contact
      where contact.business_id=target_session.business_id
        and contact.status='active'
        and contact.contact_type in ('customer','both')),'[]'::jsonb),
    'suppliers',coalesce((select jsonb_agg(jsonb_build_object(
      'id',contact.id,'name',contact.display_name
    ) order by contact.display_name)
      from public.business_contacts contact
      where contact.business_id=target_session.business_id
        and contact.status='active'
        and contact.contact_type in ('supplier','both')),'[]'::jsonb),
    'recent_invoices',coalesce((select jsonb_agg(invoice_row order by invoice_row->>'created_at' desc)
      from (
        select jsonb_build_object(
          'id',invoice.id,'code',invoice.invoice_code,'date',invoice.invoice_date,
          'total',invoice.total_transaction,'paid',invoice.paid_transaction,
          'returned',invoice.returned_transaction,'status',invoice.status,
          'customer_id',invoice.customer_id,'created_at',invoice.created_at,
          'lines',coalesce((select jsonb_agg(jsonb_build_object(
            'id',line.id,'product_id',line.product_id,'description',line.description,
            'quantity',line.quantity,'total',line.total_transaction,
            'returned_quantity',coalesce(returned.quantity,0)
          ) order by line.line_number)
            from public.business_sales_invoice_lines line
            left join lateral (
              select coalesce(sum(return_line.quantity),0) quantity
              from public.business_sales_return_lines return_line
              join public.business_sales_returns sales_return
                on sales_return.business_id=return_line.business_id
               and sales_return.id=return_line.return_id
              where return_line.business_id=line.business_id
                and return_line.invoice_line_id=line.id
                and sales_return.status='posted'
            ) returned on true
            where line.business_id=invoice.business_id and line.invoice_id=invoice.id
          ),'[]'::jsonb)
        ) invoice_row
        from public.business_pos_sale_requests request
        join public.business_sales_invoices invoice
          on invoice.business_id=request.business_id and invoice.id=request.invoice_id
        where request.business_id=target_session.business_id
          and request.branch_id=target_session.branch_id
          and request.status='posted'
        order by invoice.created_at desc
        limit 50
      ) recent),'[]'::jsonb),
    'recent_operations',coalesce((select jsonb_agg(jsonb_build_object(
      'id',request.id,'operation_type',request.operation_type,
      'status',request.status,'amount',request.amount,
      'result',request.result,'created_at',request.created_at
    ) order by request.created_at desc)
      from public.business_pos_operation_requests request
      where request.session_id=target_session.id
      order by request.created_at desc limit 25),'[]'::jsonb)
  ) into result;
  return result;
end;
$$;

create or replace function public.post_business_pos_operation(
  p_session_token_hash text,
  p_operation_type text,
  p_payload jsonb,
  p_request_key uuid,
  p_approval_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path='pg_catalog','public','private','auth','extensions'
as $$
declare
  target_session public.business_pos_sessions;
  branch_record record;
  settings public.business_pos_branch_settings;
  normalized_operation text:=lower(btrim(coalesce(p_operation_type,'')));
  normalized_payload jsonb;
  payload_document jsonb;
  payload_hash text;
  existing_request public.business_pos_operation_requests;
  request_id uuid;
  approval_operation text;
  approval_amount numeric;
  operation_result jsonb;
  source_id uuid;
  secondary_source_id uuid;
  final_amount numeric;
  previous_sub text:=current_setting('request.jwt.claim.sub',true);
  previous_role text:=current_setting('request.jwt.claim.role',true);
  previous_claims text:=current_setting('request.jwt.claims',true);
  caught_state text;
  purchase_record jsonb;
  return_record jsonb;
  return_id uuid;
  payout_id uuid;
  void_lines jsonb;
  expense_result jsonb;
  adjustment_result jsonb;
begin
  if normalized_operation not in ('purchase','expense','refund','void','cash_adjustment')
     or p_request_key is null or p_payload is null or jsonb_typeof(p_payload)<>'object' then
    raise exception 'Invalid POS operation request.' using errcode='22023';
  end if;
  if p_session_token_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'POS session is unavailable.' using errcode='POS02';
  end if;

  target_session:=private.get_business_pos_session_internal(p_session_token_hash,true);
  select branch.id,branch.timezone into branch_record
  from public.business_branches branch
  where branch.id=target_session.branch_id
    and branch.business_id=target_session.business_id
    and branch.status='active';
  if not found then
    raise exception 'Active POS branch not found.' using errcode='P0002';
  end if;
  settings:=private.ensure_business_pos_operation_settings(
    target_session.business_id,target_session.branch_id
  );
  if not private.business_pos_user_can_shop_operation(
    target_session.user_id,target_session.business_id,normalized_operation
  ) then
    raise exception 'POS operation permission required.' using errcode='42501';
  end if;

  if normalized_operation='purchase' then
    if not settings.allow_purchases then
      return jsonb_build_object('ok',false,'error','purchases_disabled');
    end if;
    if nullif(p_payload->>'purchase_date','')::date <>
       (now() at time zone branch_record.timezone)::date then
      raise exception 'POS purchases must use the current branch date.' using errcode='22023';
    end if;
    purchase_record:=private.normalize_business_pos_purchase_lines(
      target_session.business_id,settings.warehouse_id,p_payload->'lines'
    );
    normalized_payload:=jsonb_build_object(
      'purchase_date',(p_payload->>'purchase_date')::date,
      'supplier_id',nullif(p_payload->>'supplier_id','')::uuid,
      'supplier_document_number',nullif(btrim(coalesce(p_payload->>'supplier_document_number','')),''),
      'paid_now',coalesce((p_payload->>'paid_now')::boolean,true),
      'notes',nullif(btrim(coalesce(p_payload->>'notes','')),''),
      'lines',purchase_record->'lines'
    );
    approval_amount:=(purchase_record->>'estimated_total')::numeric;
  elsif normalized_operation='expense' then
    if not settings.allow_expenses then
      return jsonb_build_object('ok',false,'error','expenses_disabled');
    end if;
    if nullif(p_payload->>'expense_date','')::date <>
       (now() at time zone branch_record.timezone)::date then
      raise exception 'POS expenses must use the current branch date.' using errcode='22023';
    end if;
    if coalesce((p_payload->>'amount')::numeric,0)<=0
       or char_length(btrim(coalesce(p_payload->>'description',''))) not between 2 and 300 then
      raise exception 'POS expense is invalid.' using errcode='22023';
    end if;
    normalized_payload:=jsonb_build_object(
      'expense_date',(p_payload->>'expense_date')::date,
      'description',btrim(p_payload->>'description'),
      'amount',(p_payload->>'amount')::numeric,
      'reference',nullif(btrim(coalesce(p_payload->>'reference','')),'')
    );
    approval_amount:=(normalized_payload->>'amount')::numeric;
  elsif normalized_operation='refund' then
    if nullif(p_payload->>'return_date','')::date <>
       (now() at time zone branch_record.timezone)::date then
      raise exception 'POS refunds must use the current branch date.' using errcode='22023';
    end if;
    return_record:=private.normalize_business_pos_return_lines(
      target_session.business_id,target_session.branch_id,
      (p_payload->>'invoice_id')::uuid,settings.warehouse_id,p_payload->'lines'
    );
    normalized_payload:=jsonb_build_object(
      'return_date',(p_payload->>'return_date')::date,
      'invoice_id',(p_payload->>'invoice_id')::uuid,
      'notes',nullif(btrim(coalesce(p_payload->>'notes','')),''),
      'refund_cash',coalesce((p_payload->>'refund_cash')::boolean,true),
      'lines',return_record->'lines'
    );
    approval_operation:='refund';
    approval_amount:=(return_record->>'estimated_total')::numeric;
  elsif normalized_operation='void' then
    if nullif(p_payload->>'void_date','')::date <>
       (now() at time zone branch_record.timezone)::date then
      raise exception 'POS voids must use the current branch date.' using errcode='22023';
    end if;
    if char_length(btrim(coalesce(p_payload->>'reason',''))) not between 5 and 300 then
      raise exception 'POS void reason must contain 5 to 300 characters.' using errcode='22023';
    end if;
    void_lines:=private.build_business_pos_void_lines(
      target_session.business_id,target_session.branch_id,
      (p_payload->>'invoice_id')::uuid,settings.warehouse_id,
      (p_payload->>'void_date')::date
    );
    normalized_payload:=jsonb_build_object(
      'void_date',(p_payload->>'void_date')::date,
      'invoice_id',(p_payload->>'invoice_id')::uuid,
      'reason',btrim(p_payload->>'reason'),
      'lines',void_lines->'lines'
    );
    approval_operation:='void';
    approval_amount:=(void_lines->>'estimated_total')::numeric;
  else
    if nullif(p_payload->>'adjustment_date','')::date <>
       (now() at time zone branch_record.timezone)::date then
      raise exception 'POS cash adjustments must use the current branch date.' using errcode='22023';
    end if;
    if (p_payload->>'direction') not in ('increase','decrease')
       or coalesce((p_payload->>'amount')::numeric,0)<=0
       or char_length(btrim(coalesce(p_payload->>'reason',''))) not between 5 and 300 then
      raise exception 'POS cash adjustment is invalid.' using errcode='22023';
    end if;
    normalized_payload:=jsonb_build_object(
      'adjustment_date',(p_payload->>'adjustment_date')::date,
      'direction',p_payload->>'direction',
      'amount',(p_payload->>'amount')::numeric,
      'reason',btrim(p_payload->>'reason')
    );
    approval_operation:='cash_adjustment';
    approval_amount:=(normalized_payload->>'amount')::numeric;
  end if;

  if approval_operation is null and p_approval_id is not null then
    return jsonb_build_object('ok',false,'error','approval_not_required');
  end if;

  payload_document:=jsonb_build_object(
    'version',1,'business_id',target_session.business_id,
    'branch_id',target_session.branch_id,'device_id',target_session.device_id,
    'session_id',target_session.id,'user_id',target_session.user_id,
    'operation_type',normalized_operation,'request_key',p_request_key,
    'payload',normalized_payload
  );
  payload_hash:=encode(
    extensions.digest(convert_to(payload_document::text,'UTF8'),'sha256'),'hex'
  );

  select request.* into existing_request
  from public.business_pos_operation_requests request
  where request.business_id=target_session.business_id
    and request.request_key=p_request_key
  for update;

  if found then
    if existing_request.operation_type<>normalized_operation
       or existing_request.payload_hash<>payload_hash
       or existing_request.session_id<>target_session.id
       or existing_request.user_id<>target_session.user_id then
      return jsonb_build_object('ok',false,'error','idempotency_conflict');
    end if;
    if existing_request.status='posted' then
      perform private.write_business_pos_event(
        target_session.business_id,target_session.branch_id,target_session.device_id,
        target_session.id,target_session.user_id,target_session.user_id,
        existing_request.approval_id,normalized_operation||'_replayed','success',
        jsonb_build_object('request_id',existing_request.id)
      );
      return coalesce(existing_request.result,'{}'::jsonb)||jsonb_build_object('replayed',true);
    end if;
    if existing_request.status='approval_required' and p_approval_id is null then
      return jsonb_build_object(
        'ok',false,'approval_required',true,'operation_type',approval_operation,
        'payload_hash',payload_hash,'request_id',existing_request.id,
        'amount',approval_amount
      );
    end if;
    if existing_request.attempt_count>=5 then
      return jsonb_build_object('ok',false,'error','retry_limit_reached');
    end if;
    request_id:=existing_request.id;
    update public.business_pos_operation_requests
    set status='pending',attempt_count=attempt_count+1,error_code=null,
        approval_id=coalesce(p_approval_id,approval_id),updated_at=now()
    where id=request_id;
  else
    insert into public.business_pos_operation_requests(
      business_id,branch_id,device_id,session_id,user_id,request_key,
      operation_type,payload_hash,approval_id,status
    ) values (
      target_session.business_id,target_session.branch_id,target_session.device_id,
      target_session.id,target_session.user_id,p_request_key,
      normalized_operation,payload_hash,p_approval_id,'pending'
    ) returning id into request_id;
  end if;

  if approval_operation is not null and p_approval_id is null then
    update public.business_pos_operation_requests
    set status='approval_required',updated_at=now()
    where id=request_id;
    perform private.write_business_pos_event(
      target_session.business_id,target_session.branch_id,target_session.device_id,
      target_session.id,target_session.user_id,target_session.user_id,null,
      normalized_operation||'_approval_required','blocked',
      jsonb_build_object('request_id',request_id,'amount',approval_amount)
    );
    return jsonb_build_object(
      'ok',false,'approval_required',true,'operation_type',approval_operation,
      'payload_hash',payload_hash,'request_id',request_id,'amount',approval_amount
    );
  end if;
  begin
    if approval_operation is not null then
      perform public.consume_business_pos_approval(
        p_session_token_hash,p_approval_id,approval_operation,payload_hash
      );
    end if;

    perform set_config('request.jwt.claim.sub',target_session.user_id::text,true);
    perform set_config('request.jwt.claim.role','authenticated',true);
    perform set_config('request.jwt.claims',jsonb_build_object(
      'sub',target_session.user_id,'role','authenticated','aal','aal1',
      'pos_session_id',target_session.id,'pos_device_id',target_session.device_id,
      'pos_branch_id',target_session.branch_id
    )::text,true);

    if normalized_operation='purchase' then
      operation_result:=private.create_business_simple_shop_purchase_internal(
        target_session.business_id,(normalized_payload->>'supplier_id')::uuid,
        (normalized_payload->>'purchase_date')::date,
        normalized_payload->>'supplier_document_number',
        normalized_payload->'lines',(normalized_payload->>'paid_now')::boolean,
        case when (normalized_payload->>'paid_now')::boolean then settings.cash_account_id else null end,
        normalized_payload->>'notes','pos-purchase:'||p_request_key::text
      );
      source_id:=(operation_result->>'bill_id')::uuid;
      secondary_source_id:=nullif(operation_result->>'payment_id','')::uuid;
      final_amount:=(operation_result->>'total')::numeric;
    elsif normalized_operation='expense' then
      operation_result:=private.create_business_simple_shop_expense_internal(
        target_session.business_id,(normalized_payload->>'expense_date')::date,
        normalized_payload->>'description',(normalized_payload->>'amount')::numeric,
        settings.expense_account_id,settings.cash_account_id,
        normalized_payload->>'reference','pos-expense:'||p_request_key::text
      );
      source_id:=(operation_result->>'expense_id')::uuid;
      secondary_source_id:=(operation_result->>'journal_id')::uuid;
      final_amount:=(operation_result->>'amount')::numeric;
    elsif normalized_operation in ('refund','void') then
      return_id:=private.create_business_sales_return_internal(
        target_session.business_id,(normalized_payload->>'invoice_id')::uuid,
        case when normalized_operation='refund'
          then (normalized_payload->>'return_date')::date
          else (normalized_payload->>'void_date')::date end,
        normalized_payload->'lines',
        case when normalized_operation='refund'
          then normalized_payload->>'notes'
          else 'POS void: '||(normalized_payload->>'reason') end,
        'pos-'||normalized_operation||':'||p_request_key::text
      );
      if normalized_operation='void'
         or coalesce((normalized_payload->>'refund_cash')::boolean,true) then
        payout_id:=private.create_business_pos_refund_payout(
          request_id,target_session.business_id,return_id,
          settings.cash_account_id,target_session.user_id
        );
      end if;
      select jsonb_build_object(
        'return_id',sales_return.id,'return_code',sales_return.return_code,
        'total',sales_return.total_transaction,
        'customer_credit',sales_return.customer_credit_base,
        'refund_payout_id',payout_id
      ),sales_return.total_transaction
      into operation_result,final_amount
      from public.business_sales_returns sales_return
      where sales_return.business_id=target_session.business_id
        and sales_return.id=return_id;
      source_id:=return_id;
      secondary_source_id:=payout_id;
    else
      adjustment_result:=private.create_business_pos_cash_adjustment(
        request_id,target_session.business_id,target_session.branch_id,
        (normalized_payload->>'adjustment_date')::date,
        normalized_payload->>'direction',(normalized_payload->>'amount')::numeric,
        normalized_payload->>'reason',settings.cash_account_id,
        settings.cash_gain_account_id,settings.cash_loss_account_id,
        target_session.user_id
      );
      operation_result:=adjustment_result;
      source_id:=(adjustment_result->>'adjustment_id')::uuid;
      secondary_source_id:=(adjustment_result->>'journal_id')::uuid;
      final_amount:=(adjustment_result->>'amount')::numeric;
    end if;
  exception when others then
    get stacked diagnostics caught_state=returned_sqlstate;
    perform set_config('request.jwt.claim.sub',coalesce(previous_sub,''),true);
    perform set_config('request.jwt.claim.role',coalesce(previous_role,''),true);
    perform set_config('request.jwt.claims',coalesce(previous_claims,''),true);
    update public.business_pos_operation_requests
    set status='failed',error_code=left(coalesce(caught_state,'P0001'),40),updated_at=now()
    where id=request_id;
    perform private.write_business_pos_event(
      target_session.business_id,target_session.branch_id,target_session.device_id,
      target_session.id,target_session.user_id,target_session.user_id,p_approval_id,
      normalized_operation||'_failed','failure',
      jsonb_build_object('request_id',request_id,'error_code',left(coalesce(caught_state,'P0001'),40))
    );
    return jsonb_build_object('ok',false,'error',normalized_operation||'_rejected');
  end;

  perform set_config('request.jwt.claim.sub',coalesce(previous_sub,''),true);
  perform set_config('request.jwt.claim.role',coalesce(previous_role,''),true);
  perform set_config('request.jwt.claims',coalesce(previous_claims,''),true);

  operation_result:=coalesce(operation_result,'{}'::jsonb)||jsonb_build_object(
    'ok',true,'request_id',request_id,'operation_type',normalized_operation,
    'payload_hash',payload_hash,'branch_id',target_session.branch_id,
    'device_id',target_session.device_id,'cashier_user_id',target_session.user_id,
    'replayed',false
  );

  update public.business_pos_operation_requests
  set status='posted',approval_id=p_approval_id,source_id=source_id,
      secondary_source_id=secondary_source_id,amount=final_amount,
      error_code=null,result=operation_result,updated_at=now()
  where id=request_id;

  perform private.write_business_pos_event(
    target_session.business_id,target_session.branch_id,target_session.device_id,
    target_session.id,target_session.user_id,target_session.user_id,p_approval_id,
    normalized_operation||'_posted','success',
    jsonb_build_object('request_id',request_id,'source_id',source_id,'amount',final_amount)
  );
  return operation_result;
end;
$$;

revoke all on function private.ensure_business_pos_operation_settings(uuid,uuid) from public,anon,authenticated;
revoke all on function private.current_business_pos_claim_valid(uuid,uuid) from public,anon,authenticated;
revoke all on function private.business_pos_user_can_shop_operation(uuid,uuid,text) from public,anon,authenticated;
revoke all on function private.normalize_business_pos_purchase_lines(uuid,uuid,jsonb) from public,anon,authenticated;
revoke all on function private.normalize_business_pos_return_lines(uuid,uuid,uuid,uuid,jsonb) from public,anon,authenticated;
revoke all on function private.build_business_pos_void_lines(uuid,uuid,uuid,uuid,date) from public,anon,authenticated;
revoke all on function private.create_business_pos_refund_payout(uuid,uuid,uuid,uuid,uuid) from public,anon,authenticated;
revoke all on function private.create_business_pos_cash_adjustment(uuid,uuid,uuid,date,text,numeric,text,uuid,uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function private.ensure_business_pos_operation_settings(uuid,uuid) to service_role;
grant execute on function private.current_business_pos_claim_valid(uuid,uuid) to service_role;
grant execute on function private.business_pos_user_can_shop_operation(uuid,uuid,text) to service_role;
grant execute on function private.normalize_business_pos_purchase_lines(uuid,uuid,jsonb) to service_role;
grant execute on function private.normalize_business_pos_return_lines(uuid,uuid,uuid,uuid,jsonb) to service_role;
grant execute on function private.build_business_pos_void_lines(uuid,uuid,uuid,uuid,date) to service_role;
grant execute on function private.create_business_pos_refund_payout(uuid,uuid,uuid,uuid,uuid) to service_role;
grant execute on function private.create_business_pos_cash_adjustment(uuid,uuid,uuid,date,text,numeric,text,uuid,uuid,uuid,uuid) to service_role;

revoke all on function public.end_business_pos_session(text) from public,anon,authenticated;
revoke all on function public.get_business_pos_terminal_snapshot(text) from public,anon,authenticated;
revoke all on function public.post_business_pos_operation(text,text,jsonb,uuid,uuid) from public,anon,authenticated;
grant execute on function public.end_business_pos_session(text) to service_role;
grant execute on function public.get_business_pos_terminal_snapshot(text) to service_role;
grant execute on function public.post_business_pos_operation(text,text,jsonb,uuid,uuid) to service_role;

notify pgrst, 'reload schema';
