-- Run only against a disposable local/test database after all migrations.
-- It validates cashier attribution, branch register mapping, stock/accounting
-- reuse, idempotency, and high-discount approval. Everything is rolled back.
begin;

insert into auth.users (
  id,aud,role,email,encrypted_password,email_confirmed_at,
  raw_app_meta_data,raw_user_meta_data,created_at,updated_at,is_anonymous
)
values
  ('71111111-1111-4111-8111-111111111111','authenticated','authenticated','sale-owner@example.invalid','test-only',now(),' {"provider":"email","providers":["email"]}'::jsonb,'{}'::jsonb,now(),now(),false),
  ('72222222-2222-4222-8222-222222222222','authenticated','authenticated','sale-cashier@example.invalid','test-only',now(),' {"provider":"email","providers":["email"]}'::jsonb,'{}'::jsonb,now(),now(),false),
  ('73333333-3333-4333-8333-333333333333','authenticated','authenticated','sale-approver@example.invalid','test-only',now(),' {"provider":"email","providers":["email"]}'::jsonb,'{}'::jsonb,now(),now(),false);

set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','71111111-1111-4111-8111-111111111111',true);
select set_config('request.jwt.claims','{"sub":"71111111-1111-4111-8111-111111111111","role":"authenticated","email":"sale-owner@example.invalid","aal":"aal2"}',true);
select public.claim_account_realm('business');

create temporary table pos_sale_state (
  business_id uuid,
  business_slug text,
  branch_id uuid,
  warehouse_id uuid,
  cash_account_id uuid,
  supplier_id uuid,
  product_id uuid,
  device_id uuid,
  session_id uuid,
  payload_hash text,
  approval_id uuid,
  first_invoice_id uuid
) on commit drop;

insert into pos_sale_state(business_id)
select public.create_business_organization(
  'POS Sale Bridge Contract Organization','retail','simple_shop',
  'PK','PKR','Asia/Karachi','retail_pos'
);
update pos_sale_state state set
  business_slug=(select business.slug from public.businesses business where business.id=state.business_id),
  branch_id=(select branch.id from public.business_branches branch where branch.business_id=state.business_id and branch.status='active' order by branch.is_primary desc,branch.created_at limit 1),
  warehouse_id=(select settings.default_warehouse_id from public.business_simple_shop_settings settings where settings.business_id=state.business_id),
  cash_account_id=(select settings.default_cash_account_id from public.business_simple_shop_settings settings where settings.business_id=state.business_id),
  supplier_id=(select settings.default_supplier_id from public.business_simple_shop_settings settings where settings.business_id=state.business_id);

select set_config('request.jwt.claim.sub','72222222-2222-4222-8222-222222222222',true);
select set_config('request.jwt.claims','{"sub":"72222222-2222-4222-8222-222222222222","role":"authenticated","email":"sale-cashier@example.invalid","aal":"aal1"}',true);
select public.claim_account_realm('business');
select set_config('request.jwt.claim.sub','73333333-3333-4333-8333-333333333333',true);
select set_config('request.jwt.claims','{"sub":"73333333-3333-4333-8333-333333333333","role":"authenticated","email":"sale-approver@example.invalid","aal":"aal2"}',true);
select public.claim_account_realm('business');

set local role service_role;
insert into public.business_members(
  business_id,user_id,role,status,permissions,invited_by,joined_at
)
select business_id,'72222222-2222-4222-8222-222222222222','cashier','active',
       private.business_team_role_template('cashier','simple_shop'),
       '71111111-1111-4111-8111-111111111111',now()
from pos_sale_state;
insert into public.business_members(
  business_id,user_id,role,status,permissions,invited_by,joined_at
)
select business_id,'73333333-3333-4333-8333-333333333333','operations_manager','active',
       array_append(private.business_team_role_template('operations_manager','simple_shop'),'pos.discount.override'),
       '71111111-1111-4111-8111-111111111111',now()
from pos_sale_state;

update pos_sale_state state set product_id=gen_random_uuid();
insert into public.business_products(
  id,business_id,sku,name,product_type,unit_of_measure,sales_price,purchase_cost_hint,
  reorder_level,revenue_account_id,inventory_account_id,cogs_account_id,status,created_by
)
select state.product_id,state.business_id,'POS-SALE-TEST','POS Sale Test Product','inventory','unit',
       100,50,0,
       (select id from public.business_chart_of_accounts where business_id=state.business_id and system_key='sales_revenue'),
       (select id from public.business_chart_of_accounts where business_id=state.business_id and system_key='inventory'),
       (select id from public.business_chart_of_accounts where business_id=state.business_id and system_key='cost_of_goods_sold'),
       'active','71111111-1111-4111-8111-111111111111'
from pos_sale_state state;

-- Seed stock through the existing authenticated Simple Shop purchase engine.
set local role authenticated;
select set_config('request.jwt.claim.sub','71111111-1111-4111-8111-111111111111',true);
select set_config('request.jwt.claims','{"sub":"71111111-1111-4111-8111-111111111111","role":"authenticated","email":"sale-owner@example.invalid","aal":"aal2"}',true);
select public.create_business_simple_shop_purchase(
  state.business_id,state.supplier_id,current_date,'POS-STOCK-SEED',
  jsonb_build_array(jsonb_build_object(
    'product_id',state.product_id,
    'warehouse_id',state.warehouse_id,
    'description','POS Sale Test Product',
    'quantity',10,
    'unit_cost',50,
    'discount_percent',0,
    'tax_rate',0,
    'allocation_account_id',(select id from public.business_chart_of_accounts where business_id=state.business_id and system_key='inventory')
  )),true,state.cash_account_id,'Contract inventory seed','pos-sale-stock-seed'
) from pos_sale_state state;

set local role service_role;
update pos_sale_state state set device_id=public.register_business_pos_device(
  '71111111-1111-4111-8111-111111111111',state.business_id,state.branch_id,
  'Sale bridge counter','POS-SALE01',encode(extensions.digest('sale-device-secret','sha256'),'hex')
);
select public.issue_business_pos_temporary_pin(
  '71111111-1111-4111-8111-111111111111',business_id,
  '72222222-2222-4222-8222-222222222222','EMP-SALE01','482913'
) from pos_sale_state;

do $$
declare state pos_sale_state; result jsonb;
begin
  select * into state from pos_sale_state;
  if not exists(
    select 1 from public.business_pos_branch_settings settings
    where settings.business_id=state.business_id
      and settings.branch_id=state.branch_id
      and settings.warehouse_id=state.warehouse_id
      and settings.cash_account_id=state.cash_account_id
  ) then raise exception 'Primary POS branch register was not seeded.'; end if;

  result:=public.start_business_pos_session(
    state.business_slug,'POS-SALE01',
    encode(extensions.digest('sale-device-secret','sha256'),'hex'),
    'EMP-SALE01','482913',
    encode(extensions.digest('sale-session-token','sha256'),'hex'),
    'SALESESS01',null,null
  );
  if not coalesce((result->>'ok')::boolean,false) then
    raise exception 'POS sale cashier session did not open.';
  end if;
  update pos_sale_state set session_id=(result->>'session_id')::uuid;
end;
$$;

select public.change_business_pos_pin(
  encode(extensions.digest('sale-session-token','sha256'),'hex'),'482913','739204'
);

do $$
declare state pos_sale_state; result jsonb; replay jsonb; conflict jsonb; invoice_count integer;
begin
  select * into state from pos_sale_state;
  result:=public.post_business_pos_sale(
    encode(extensions.digest('sale-session-token','sha256'),'hex'),
    (now() at time zone 'Asia/Karachi')::date,null,
    jsonb_build_array(jsonb_build_object(
      'product_id',state.product_id,'quantity',1,'discount_percent',0,'tax_rate',0
    )),true,'Cashier contract sale','74444444-4444-4444-8444-444444444444',null
  );
  if not coalesce((result->>'ok')::boolean,false) then
    raise exception 'Valid POS sale did not post.';
  end if;
  update pos_sale_state set first_invoice_id=(result->>'invoice_id')::uuid;

  if not exists(
    select 1 from public.business_sales_invoices invoice
    where invoice.id=(result->>'invoice_id')::uuid
      and invoice.business_id=state.business_id
      and invoice.created_by='72222222-2222-4222-8222-222222222222'
  ) then raise exception 'POS sale invoice was not attributed to the cashier.'; end if;
  if not exists(
    select 1 from public.business_sales_invoice_lines line
    where line.invoice_id=(result->>'invoice_id')::uuid
      and line.business_id=state.business_id
      and line.warehouse_id=state.warehouse_id
      and line.unit_price=100
  ) then raise exception 'POS sale did not use the configured warehouse and catalog price.'; end if;

  replay:=public.post_business_pos_sale(
    encode(extensions.digest('sale-session-token','sha256'),'hex'),
    (now() at time zone 'Asia/Karachi')::date,null,
    jsonb_build_array(jsonb_build_object(
      'product_id',state.product_id,'quantity',1,'discount_percent',0,'tax_rate',0
    )),true,'Cashier contract sale','74444444-4444-4444-8444-444444444444',null
  );
  if not coalesce((replay->>'replayed')::boolean,false)
     or replay->>'invoice_id'<>result->>'invoice_id' then
    raise exception 'POS sale replay did not return the committed result.';
  end if;
  select count(*) into invoice_count from public.business_sales_invoices invoice
  where invoice.business_id=state.business_id
    and invoice.idempotency_key='shop-sale:pos:74444444-4444-4444-8444-444444444444';
  if invoice_count<>1 then raise exception 'POS sale replay created a second invoice.'; end if;

  conflict:=public.post_business_pos_sale(
    encode(extensions.digest('sale-session-token','sha256'),'hex'),
    (now() at time zone 'Asia/Karachi')::date,null,
    jsonb_build_array(jsonb_build_object(
      'product_id',state.product_id,'quantity',2,'discount_percent',0,'tax_rate',0
    )),true,'Cashier contract sale','74444444-4444-4444-8444-444444444444',null
  );
  if conflict->>'error'<>'idempotency_conflict' then
    raise exception 'POS idempotency key accepted a different payload.';
  end if;

  begin
    perform public.post_business_pos_sale(
      encode(extensions.digest('sale-session-token','sha256'),'hex'),
      (now() at time zone 'Asia/Karachi')::date,null,
      jsonb_build_array(jsonb_build_object(
        'product_id',state.product_id,'quantity',1,'discount_percent',0,'tax_rate',0,
        'unit_price',0.01
      )),true,null,'74666666-6666-4666-8666-666666666666',null
    );
    raise exception 'POS sale accepted a client-controlled unit price.';
  exception when invalid_parameter_value then null;
  end;
end;
$$;

do $$
declare state pos_sale_state; required jsonb; approval jsonb; posted jsonb;
begin
  select * into state from pos_sale_state;
  required:=public.post_business_pos_sale(
    encode(extensions.digest('sale-session-token','sha256'),'hex'),
    (now() at time zone 'Asia/Karachi')::date,null,
    jsonb_build_array(jsonb_build_object(
      'product_id',state.product_id,'quantity',1,'discount_percent',20,'tax_rate',0
    )),true,'Manager-approved discount','75555555-5555-4555-8555-555555555555',null
  );
  if not coalesce((required->>'approval_required')::boolean,false) then
    raise exception 'High discount POS sale posted without approval.';
  end if;
  update pos_sale_state set payload_hash=required->>'payload_hash';

  approval:=public.create_business_pos_approval_request(
    encode(extensions.digest('sale-session-token','sha256'),'hex'),
    'high_discount',required->>'payload_hash','Customer retention discount',
    (required->>'amount')::numeric,(required->>'discount_percent')::numeric
  );
  update pos_sale_state set approval_id=(approval->>'approval_id')::uuid;

  perform public.decide_business_pos_approval(
    '73333333-3333-4333-8333-333333333333',state.business_id,
    (approval->>'approval_id')::uuid,'approved','Discount checked against branch policy'
  );

  posted:=public.post_business_pos_sale(
    encode(extensions.digest('sale-session-token','sha256'),'hex'),
    (now() at time zone 'Asia/Karachi')::date,null,
    jsonb_build_array(jsonb_build_object(
      'product_id',state.product_id,'quantity',1,'discount_percent',20,'tax_rate',0
    )),true,'Manager-approved discount','75555555-5555-4555-8555-555555555555',
    (approval->>'approval_id')::uuid
  );
  if not coalesce((posted->>'ok')::boolean,false) then
    raise exception 'Approved high discount POS sale did not post.';
  end if;
  if not exists(
    select 1 from public.business_pos_approval_requests request
    where request.id=(approval->>'approval_id')::uuid and request.status='consumed'
  ) then raise exception 'POS sale approval was not consumed atomically.'; end if;
  if not exists(
    select 1 from public.business_pos_security_events event
    where event.business_id=state.business_id and event.event_type='sale_posted'
  ) then raise exception 'POS sale posting audit event was not written.'; end if;
end;
$$;

rollback;
