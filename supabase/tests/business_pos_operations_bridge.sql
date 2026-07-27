-- Run only against a disposable local/test database after all migrations.
-- Validates purchase, expense, refund/void approval, cash adjustment,
-- cashier attribution, idempotency, and accounting reuse. Everything rolls back.
begin;

insert into auth.users (
  id,aud,role,email,encrypted_password,email_confirmed_at,
  raw_app_meta_data,raw_user_meta_data,created_at,updated_at,is_anonymous
)
values
  ('81111111-1111-4111-8111-111111111111','authenticated','authenticated','operations-owner@example.invalid','test-only',now(),'{"provider":"email","providers":["email"]}'::jsonb,'{}'::jsonb,now(),now(),false),
  ('82222222-2222-4222-8222-222222222222','authenticated','authenticated','operations-cashier@example.invalid','test-only',now(),'{"provider":"email","providers":["email"]}'::jsonb,'{}'::jsonb,now(),now(),false),
  ('83333333-3333-4333-8333-333333333333','authenticated','authenticated','operations-approver@example.invalid','test-only',now(),'{"provider":"email","providers":["email"]}'::jsonb,'{}'::jsonb,now(),now(),false);

set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','81111111-1111-4111-8111-111111111111',true);
select set_config('request.jwt.claims','{"sub":"81111111-1111-4111-8111-111111111111","role":"authenticated","email":"operations-owner@example.invalid","aal":"aal2"}',true);
select public.claim_account_realm('business');

create temporary table pos_operation_state (
  business_id uuid,
  business_slug text,
  branch_id uuid,
  warehouse_id uuid,
  cash_account_id uuid,
  supplier_id uuid,
  customer_id uuid,
  product_id uuid,
  device_id uuid,
  session_id uuid,
  invoice_id uuid,
  invoice_line_id uuid
) on commit drop;

insert into pos_operation_state(business_id)
select public.create_business_organization(
  'POS Operations Contract Organization','retail','simple_shop',
  'PK','PKR','Asia/Karachi','retail_pos'
);
update pos_operation_state state set
  business_slug=(select business.slug from public.businesses business where business.id=state.business_id),
  branch_id=(select branch.id from public.business_branches branch where branch.business_id=state.business_id and branch.status='active' order by branch.is_primary desc,branch.created_at limit 1),
  warehouse_id=(select settings.default_warehouse_id from public.business_simple_shop_settings settings where settings.business_id=state.business_id),
  cash_account_id=(select settings.default_cash_account_id from public.business_simple_shop_settings settings where settings.business_id=state.business_id),
  supplier_id=(select settings.default_supplier_id from public.business_simple_shop_settings settings where settings.business_id=state.business_id),
  customer_id=(select settings.default_customer_id from public.business_simple_shop_settings settings where settings.business_id=state.business_id),
  product_id=gen_random_uuid();

select set_config('request.jwt.claim.sub','82222222-2222-4222-8222-222222222222',true);
select set_config('request.jwt.claims','{"sub":"82222222-2222-4222-8222-222222222222","role":"authenticated","email":"operations-cashier@example.invalid","aal":"aal1"}',true);
select public.claim_account_realm('business');
select set_config('request.jwt.claim.sub','83333333-3333-4333-8333-333333333333',true);
select set_config('request.jwt.claims','{"sub":"83333333-3333-4333-8333-333333333333","role":"authenticated","email":"operations-approver@example.invalid","aal":"aal2"}',true);
select public.claim_account_realm('business');

set local role service_role;
insert into public.business_members(
  business_id,user_id,role,status,permissions,invited_by,joined_at
)
select business_id,'82222222-2222-4222-8222-222222222222','cashier','active',
       array_append(array_append(private.business_team_role_template('cashier','simple_shop'),'pos.operate'),'shop.purchase'),
       '81111111-1111-4111-8111-111111111111',now()
from pos_operation_state;
insert into public.business_members(
  business_id,user_id,role,status,permissions,invited_by,joined_at
)
select business_id,'83333333-3333-4333-8333-333333333333','operations_manager','active',
       private.normalize_business_team_permissions(
         private.business_team_role_template('operations_manager','simple_shop') ||
         array['pos.approve','pos.cash.adjust','pos.discount.override']::text[]
       ),
       '81111111-1111-4111-8111-111111111111',now()
from pos_operation_state;

insert into public.business_products(
  id,business_id,sku,name,product_type,unit_of_measure,sales_price,purchase_cost_hint,
  reorder_level,revenue_account_id,inventory_account_id,cogs_account_id,status,created_by
)
select state.product_id,state.business_id,'POS-OPS-TEST','POS Operations Test Product','inventory','unit',
       120,60,0,
       (select id from public.business_chart_of_accounts where business_id=state.business_id and system_key='sales_revenue'),
       (select id from public.business_chart_of_accounts where business_id=state.business_id and system_key='inventory'),
       (select id from public.business_chart_of_accounts where business_id=state.business_id and system_key='cost_of_goods_sold'),
       'active','81111111-1111-4111-8111-111111111111'
from pos_operation_state state;

insert into public.business_pos_devices(
  business_id,branch_id,device_code,device_name,secret_hash,status,enrolled_by
)
select business_id,branch_id,'POS-OPS-TEST','Contract terminal',
       encode(extensions.digest('operations-device-secret','sha256'),'hex'),'active',
       '81111111-1111-4111-8111-111111111111'
from pos_operation_state;

update pos_operation_state state set device_id=(
  select device.id from public.business_pos_devices device
  where device.business_id=state.business_id and device.device_code='POS-OPS-TEST'
);
insert into public.business_pos_staff_credentials(
  business_id,user_id,staff_code,pin_hash,status,must_change_pin,set_by
)
select business_id,'82222222-2222-4222-8222-222222222222','EMP-OPS-TEST',
       extensions.crypt('482951',extensions.gen_salt('bf',12)),'active',false,
       '81111111-1111-4111-8111-111111111111'
from pos_operation_state;
insert into public.business_pos_sessions(
  business_id,branch_id,device_id,user_id,token_hash,token_prefix,
  must_change_pin,expires_at,last_activity_at
)
select business_id,branch_id,device_id,'82222222-2222-4222-8222-222222222222',
       encode(extensions.digest('operations-session-token','sha256'),'hex'),
       'operations',false,now()+interval '8 hours',now()
from pos_operation_state;
update pos_operation_state state set session_id=(
  select session.id from public.business_pos_sessions session
  where session.business_id=state.business_id
    and session.token_hash=encode(extensions.digest('operations-session-token','sha256'),'hex')
);

-- Purchase posts through the existing stock/bill/payment engine and is replay-safe.
do $$
declare state pos_operation_state; first_result jsonb; replay jsonb; bill_count bigint;
begin
  select * into state from pos_operation_state;
  first_result:=public.post_business_pos_operation(
    encode(extensions.digest('operations-session-token','sha256'),'hex'),
    'purchase',jsonb_build_object(
      'purchase_date',(now() at time zone 'Asia/Karachi')::date,
      'supplier_id',state.supplier_id,'supplier_document_number','OPS-PURCHASE-1',
      'paid_now',true,'notes','POS operations stock purchase',
      'lines',jsonb_build_array(jsonb_build_object(
        'product_id',state.product_id,'quantity',10,'discount_percent',0,'tax_rate',0
      ))
    ),'84444444-4444-4444-8444-444444444444',null
  );
  if not coalesce((first_result->>'ok')::boolean,false) then
    raise exception 'Valid POS purchase did not post.';
  end if;
  if not exists(
    select 1 from public.business_supplier_bills bill
    where bill.id=(first_result->>'bill_id')::uuid
      and bill.business_id=state.business_id
      and bill.created_by='82222222-2222-4222-8222-222222222222'
  ) then raise exception 'POS purchase was not attributed to the cashier.'; end if;

  replay:=public.post_business_pos_operation(
    encode(extensions.digest('operations-session-token','sha256'),'hex'),
    'purchase',jsonb_build_object(
      'purchase_date',(now() at time zone 'Asia/Karachi')::date,
      'supplier_id',state.supplier_id,'supplier_document_number','OPS-PURCHASE-1',
      'paid_now',true,'notes','POS operations stock purchase',
      'lines',jsonb_build_array(jsonb_build_object(
        'product_id',state.product_id,'quantity',10,'discount_percent',0,'tax_rate',0
      ))
    ),'84444444-4444-4444-8444-444444444444',null
  );
  if not coalesce((replay->>'replayed')::boolean,false) then
    raise exception 'POS purchase replay did not return the committed result.';
  end if;
  select count(*) into bill_count from public.business_supplier_bills bill
  where bill.business_id=state.business_id
    and bill.idempotency_key='shop-purchase:pos-purchase:84444444-4444-4444-8444-444444444444';
  if bill_count<>1 then raise exception 'POS operation replay created a second accounting record.'; end if;
end;
$$;

-- Expense posts a balanced journal and is attributed to the cashier.
do $$
declare state pos_operation_state; result jsonb;
begin
  select * into state from pos_operation_state;
  result:=public.post_business_pos_operation(
    encode(extensions.digest('operations-session-token','sha256'),'hex'),
    'expense',jsonb_build_object(
      'expense_date',(now() at time zone 'Asia/Karachi')::date,
      'description','POS counter supplies','amount',25,'reference','OPS-EXP-1'
    ),'85555555-5555-4555-8555-555555555555',null
  );
  if not coalesce((result->>'ok')::boolean,false) then raise exception 'Valid POS expense did not post.'; end if;
  if not exists(
    select 1 from public.business_simple_shop_expenses expense
    where expense.id=(result->>'expense_id')::uuid
      and expense.business_id=state.business_id
      and expense.created_by='82222222-2222-4222-8222-222222222222'
  ) then raise exception 'POS expense was not attributed to the cashier.'; end if;
end;
$$;

-- Create a paid sale which can later be refunded and voided through approvals.
do $$
declare state pos_operation_state; sale jsonb;
begin
  select * into state from pos_operation_state;
  sale:=public.post_business_pos_sale(
    encode(extensions.digest('operations-session-token','sha256'),'hex'),
    (now() at time zone 'Asia/Karachi')::date,state.customer_id,
    jsonb_build_array(jsonb_build_object(
      'product_id',state.product_id,'quantity',2,'discount_percent',0,'tax_rate',0
    )),true,'Refundable POS sale','86666666-6666-4666-8666-666666666666',null
  );
  if not coalesce((sale->>'ok')::boolean,false) then raise exception 'Refund fixture sale did not post.'; end if;
  update pos_operation_state set invoice_id=(sale->>'invoice_id')::uuid;
  update pos_operation_state state set invoice_line_id=(
    select line.id from public.business_sales_invoice_lines line
    where line.business_id=state.business_id and line.invoice_id=state.invoice_id
    order by line.line_number limit 1
  );
end;
$$;

-- Refund cannot post without approval; the approved retry posts return and payout atomically.
do $$
declare state pos_operation_state; required jsonb; approval jsonb; posted jsonb;
begin
  select * into state from pos_operation_state;
  required:=public.post_business_pos_operation(
    encode(extensions.digest('operations-session-token','sha256'),'hex'),
    'refund',jsonb_build_object(
      'return_date',(now() at time zone 'Asia/Karachi')::date,
      'invoice_id',state.invoice_id,'notes','Customer returned one item','refund_cash',true,
      'lines',jsonb_build_array(jsonb_build_object('invoice_line_id',state.invoice_line_id,'quantity',1))
    ),'87777777-7777-4777-8777-777777777777',null
  );
  if not coalesce((required->>'approval_required')::boolean,false) then
    raise exception 'POS refund posted without approval.';
  end if;
  approval:=public.create_business_pos_approval_request(
    encode(extensions.digest('operations-session-token','sha256'),'hex'),
    'refund',required->>'payload_hash','Customer return verified',
    (required->>'amount')::numeric,null
  );
  perform public.decide_business_pos_approval(
    '83333333-3333-4333-8333-333333333333',state.business_id,
    (approval->>'approval_id')::uuid,'approved','Return item and receipt checked'
  );
  posted:=public.post_business_pos_operation(
    encode(extensions.digest('operations-session-token','sha256'),'hex'),
    'refund',jsonb_build_object(
      'return_date',(now() at time zone 'Asia/Karachi')::date,
      'invoice_id',state.invoice_id,'notes','Customer returned one item','refund_cash',true,
      'lines',jsonb_build_array(jsonb_build_object('invoice_line_id',state.invoice_line_id,'quantity',1))
    ),'87777777-7777-4777-8777-777777777777',(approval->>'approval_id')::uuid
  );
  if not coalesce((posted->>'ok')::boolean,false) then raise exception 'Approved POS refund did not post.'; end if;
  if not exists(
    select 1 from public.business_sales_returns sales_return
    where sales_return.id=(posted->>'return_id')::uuid
      and sales_return.created_by='82222222-2222-4222-8222-222222222222'
  ) then raise exception 'Approved POS refund was not attributed to the cashier.'; end if;
  if not exists(
    select 1 from public.business_pos_refund_payouts payout
    where payout.operation_request_id=(posted->>'request_id')::uuid
  ) then raise exception 'Approved paid POS refund did not create a cash payout.'; end if;
end;
$$;

-- Same-day void returns every remaining line and also requires separate approval.
do $$
declare state pos_operation_state; required jsonb; approval jsonb; posted jsonb;
begin
  select * into state from pos_operation_state;
  required:=public.post_business_pos_operation(
    encode(extensions.digest('operations-session-token','sha256'),'hex'),
    'void',jsonb_build_object(
      'void_date',(now() at time zone 'Asia/Karachi')::date,
      'invoice_id',state.invoice_id,'reason','Duplicate sale entered at terminal'
    ),'89999999-9999-4999-8999-999999999999',null
  );
  if not coalesce((required->>'approval_required')::boolean,false) then
    raise exception 'POS void posted without approval.';
  end if;
  approval:=public.create_business_pos_approval_request(
    encode(extensions.digest('operations-session-token','sha256'),'hex'),
    'void',required->>'payload_hash','Duplicate receipt confirmed',
    (required->>'amount')::numeric,null
  );
  perform public.decide_business_pos_approval(
    '83333333-3333-4333-8333-333333333333',state.business_id,
    (approval->>'approval_id')::uuid,'approved','Duplicate invoice verified'
  );
  posted:=public.post_business_pos_operation(
    encode(extensions.digest('operations-session-token','sha256'),'hex'),
    'void',jsonb_build_object(
      'void_date',(now() at time zone 'Asia/Karachi')::date,
      'invoice_id',state.invoice_id,'reason','Duplicate sale entered at terminal'
    ),'89999999-9999-4999-8999-999999999999',(approval->>'approval_id')::uuid
  );
  if not coalesce((posted->>'ok')::boolean,false) then raise exception 'Approved POS void did not post.'; end if;
  if not exists(
    select 1 from public.business_sales_invoices invoice
    where invoice.id=state.invoice_id and invoice.returned_transaction=invoice.total_transaction
  ) then raise exception 'Approved POS full void did not return every remaining invoice amount.'; end if;
end;
$$;

-- Cash adjustment also requires separate manager approval and creates one journal.
do $$
declare state pos_operation_state; required jsonb; approval jsonb; posted jsonb; journal_count bigint;
begin
  select * into state from pos_operation_state;
  required:=public.post_business_pos_operation(
    encode(extensions.digest('operations-session-token','sha256'),'hex'),
    'cash_adjustment',jsonb_build_object(
      'adjustment_date',(now() at time zone 'Asia/Karachi')::date,
      'direction','increase','amount',10,'reason','Verified till overage'
    ),'88888888-8888-4888-8888-888888888888',null
  );
  if not coalesce((required->>'approval_required')::boolean,false) then
    raise exception 'POS cash adjustment posted without approval.';
  end if;
  approval:=public.create_business_pos_approval_request(
    encode(extensions.digest('operations-session-token','sha256'),'hex'),
    'cash_adjustment',required->>'payload_hash','Till overage counted twice',
    (required->>'amount')::numeric,null
  );
  perform public.decide_business_pos_approval(
    '83333333-3333-4333-8333-333333333333',state.business_id,
    (approval->>'approval_id')::uuid,'approved','Till count and reason verified'
  );
  posted:=public.post_business_pos_operation(
    encode(extensions.digest('operations-session-token','sha256'),'hex'),
    'cash_adjustment',jsonb_build_object(
      'adjustment_date',(now() at time zone 'Asia/Karachi')::date,
      'direction','increase','amount',10,'reason','Verified till overage'
    ),'88888888-8888-4888-8888-888888888888',(approval->>'approval_id')::uuid
  );
  if not coalesce((posted->>'ok')::boolean,false) then raise exception 'Approved POS cash adjustment did not post.'; end if;
  select count(*) into journal_count from public.business_pos_cash_adjustments adjustment
  where adjustment.operation_request_id=(posted->>'request_id')::uuid
    and adjustment.created_by='82222222-2222-4222-8222-222222222222';
  if journal_count<>1 then raise exception 'Approved POS cash adjustment did not create exactly one cashier-attributed journal.'; end if;
end;
$$;

rollback;
