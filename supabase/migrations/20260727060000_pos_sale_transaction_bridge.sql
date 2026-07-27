-- Retail POS sale transaction bridge.
--
-- The Edge Function is the only service-role caller. The database still treats
-- the cashier identity as the accounting actor by setting transaction-local JWT
-- claims only after validating the opaque POS session, active device, branch,
-- membership, and POS permissions.

alter table public.business_pos_security_events
  drop constraint if exists business_pos_security_events_event_type_check;
alter table public.business_pos_security_events
  add constraint business_pos_security_events_event_type_check check (event_type in (
    'device_enrolled','device_revoked','temporary_pin_issued','pin_changed',
    'pin_revoked','login_succeeded','login_failed','session_revoked',
    'approval_requested','approval_approved','approval_denied',
    'approval_expired','approval_consumed','branch_configured',
    'sale_approval_required','sale_posted','sale_failed','sale_replayed'
  ));

create table if not exists public.business_pos_branch_settings (
  business_id uuid not null references public.businesses(id) on delete cascade,
  branch_id uuid not null,
  warehouse_id uuid not null,
  cash_account_id uuid not null,
  high_discount_threshold numeric(5,2) not null default 10,
  allow_credit_sales boolean not null default false,
  configured_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (business_id, branch_id),
  foreign key (business_id, branch_id)
    references public.business_branches(business_id, id) on delete cascade,
  foreign key (business_id, warehouse_id)
    references public.business_warehouses(business_id, id) on delete restrict,
  foreign key (business_id, cash_account_id)
    references public.business_chart_of_accounts(business_id, id) on delete restrict,
  check (high_discount_threshold between 0 and 100)
);

create table if not exists public.business_pos_sale_requests (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  branch_id uuid not null,
  device_id uuid not null,
  session_id uuid not null references public.business_pos_sessions(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete restrict,
  request_key uuid not null,
  payload_hash text not null,
  approval_id uuid references public.business_pos_approval_requests(id) on delete set null,
  status text not null default 'pending' check (
    status in ('approval_required','pending','posted','failed')
  ),
  attempt_count smallint not null default 1 check (attempt_count between 1 and 20),
  invoice_id uuid,
  payment_id uuid,
  total numeric(24,6),
  error_code text,
  result jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, request_key),
  foreign key (business_id, branch_id)
    references public.business_branches(business_id, id) on delete restrict,
  foreign key (business_id, device_id)
    references public.business_pos_devices(business_id, id) on delete restrict,
  foreign key (business_id, invoice_id)
    references public.business_sales_invoices(business_id, id) on delete restrict,
  foreign key (business_id, payment_id)
    references public.business_sales_payments(business_id, id) on delete restrict,
  check (payload_hash ~ '^[0-9a-f]{64}$'),
  check (error_code is null or char_length(error_code) <= 40),
  check (result is null or jsonb_typeof(result)='object')
);

create index if not exists business_pos_sale_requests_session_idx
  on public.business_pos_sale_requests(session_id,created_at desc);
create index if not exists business_pos_sale_requests_business_status_idx
  on public.business_pos_sale_requests(business_id,status,created_at desc);

alter table public.business_pos_branch_settings enable row level security;
alter table public.business_pos_sale_requests enable row level security;
revoke all on table public.business_pos_branch_settings from public,anon,authenticated;
revoke all on table public.business_pos_sale_requests from public,anon,authenticated;
grant all on table public.business_pos_branch_settings to service_role;
grant all on table public.business_pos_sale_requests to service_role;

create trigger business_pos_branch_settings_updated_at
before update on public.business_pos_branch_settings
for each row execute function private.set_business_workspace_updated_at();

create trigger business_pos_sale_requests_updated_at
before update on public.business_pos_sale_requests
for each row execute function private.set_business_workspace_updated_at();

create or replace function private.ensure_business_pos_primary_branch_setting(p_business_id uuid)
returns void
language plpgsql
security definer
set search_path='pg_catalog','public','private'
as $$
declare
  target_branch uuid;
  target_warehouse uuid;
  target_cash uuid;
begin
  select branch.id into target_branch
  from public.business_branches branch
  join public.businesses business on business.id=branch.business_id
  where branch.business_id=p_business_id
    and branch.status='active'
    and business.status='active'
    and business.workspace_mode='simple_shop'
  order by branch.is_primary desc,branch.created_at
  limit 1;

  select settings.default_warehouse_id,settings.default_cash_account_id
  into target_warehouse,target_cash
  from public.business_simple_shop_settings settings
  where settings.business_id=p_business_id;

  if target_branch is null or target_warehouse is null or target_cash is null then
    return;
  end if;

  insert into public.business_pos_branch_settings(
    business_id,branch_id,warehouse_id,cash_account_id
  ) values (
    p_business_id,target_branch,target_warehouse,target_cash
  ) on conflict(business_id,branch_id) do nothing;
end;
$$;

create or replace function private.sync_business_pos_primary_branch_setting()
returns trigger
language plpgsql
security definer
set search_path='pg_catalog','public','private'
as $$
begin
  perform private.ensure_business_pos_primary_branch_setting(
    case when tg_table_name='business_branches' then new.business_id else new.business_id end
  );
  return new;
end;
$$;

drop trigger if exists business_pos_seed_from_shop_settings on public.business_simple_shop_settings;
create trigger business_pos_seed_from_shop_settings
after insert or update of default_warehouse_id,default_cash_account_id
on public.business_simple_shop_settings
for each row execute function private.sync_business_pos_primary_branch_setting();

drop trigger if exists business_pos_seed_from_primary_branch on public.business_branches;
create trigger business_pos_seed_from_primary_branch
after insert or update of status,is_primary
on public.business_branches
for each row execute function private.sync_business_pos_primary_branch_setting();

select private.ensure_business_pos_primary_branch_setting(business.id)
from public.businesses business
where business.status='active' and business.workspace_mode='simple_shop';

create or replace function public.configure_business_pos_branch(
  p_actor_user_id uuid,
  p_business_id uuid,
  p_branch_id uuid,
  p_warehouse_id uuid,
  p_cash_account_id uuid,
  p_high_discount_threshold numeric default 10,
  p_allow_credit_sales boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path='pg_catalog','public','private'
as $$
declare
  clean_threshold numeric(5,2):=round(coalesce(p_high_discount_threshold,10),2);
begin
  if not private.business_pos_actor_can(p_actor_user_id,p_business_id,'manage') then
    raise exception 'POS branch management permission required.' using errcode='42501';
  end if;
  if clean_threshold not between 0 and 100 then
    raise exception 'High discount threshold must be between 0 and 100.' using errcode='22023';
  end if;
  if not exists(
    select 1 from public.business_branches branch
    join public.businesses business on business.id=branch.business_id
    where branch.id=p_branch_id and branch.business_id=p_business_id
      and branch.status='active' and business.status='active'
      and business.workspace_mode='simple_shop'
  ) then
    raise exception 'Active Simple Shop branch not found.' using errcode='P0002';
  end if;
  if not exists(
    select 1 from public.business_warehouses warehouse
    where warehouse.id=p_warehouse_id and warehouse.business_id=p_business_id
      and warehouse.status='active'
  ) then
    raise exception 'Active branch warehouse not found.' using errcode='P0002';
  end if;
  if not exists(
    select 1 from public.business_chart_of_accounts account
    where account.id=p_cash_account_id and account.business_id=p_business_id
      and account.is_active and account.allow_manual_posting
      and account.account_type='asset' and account.normal_balance='debit'
  ) then
    raise exception 'Active posting asset account not found.' using errcode='P0002';
  end if;

  insert into public.business_pos_branch_settings(
    business_id,branch_id,warehouse_id,cash_account_id,
    high_discount_threshold,allow_credit_sales,configured_by
  ) values (
    p_business_id,p_branch_id,p_warehouse_id,p_cash_account_id,
    clean_threshold,coalesce(p_allow_credit_sales,false),p_actor_user_id
  ) on conflict(business_id,branch_id) do update set
    warehouse_id=excluded.warehouse_id,
    cash_account_id=excluded.cash_account_id,
    high_discount_threshold=excluded.high_discount_threshold,
    allow_credit_sales=excluded.allow_credit_sales,
    configured_by=excluded.configured_by,
    updated_at=now();

  perform private.write_business_pos_event(
    p_business_id,p_branch_id,null,null,p_actor_user_id,null,null,
    'branch_configured','success',jsonb_build_object(
      'warehouse_id',p_warehouse_id,
      'cash_account_id',p_cash_account_id,
      'high_discount_threshold',clean_threshold,
      'allow_credit_sales',coalesce(p_allow_credit_sales,false)
    )
  );

  return jsonb_build_object(
    'business_id',p_business_id,'branch_id',p_branch_id,
    'warehouse_id',p_warehouse_id,'cash_account_id',p_cash_account_id,
    'high_discount_threshold',clean_threshold,
    'allow_credit_sales',coalesce(p_allow_credit_sales,false)
  );
end;
$$;

create or replace function private.normalize_business_pos_sale_lines(
  p_business_id uuid,p_warehouse_id uuid,p_lines jsonb
)
returns jsonb
language plpgsql
stable
security definer
set search_path='pg_catalog','public','private'
as $$
declare
  item jsonb;
  item_number integer:=0;
  product_id_text text;
  target_product record;
  quantity numeric;
  discount_percent numeric;
  tax_rate numeric;
  normalized jsonb:='[]'::jsonb;
  seen_products uuid[]:='{}'::uuid[];
  max_discount numeric:=0;
  total numeric:=0;
  allowed_keys text[]:=array['product_id','quantity','discount_percent','tax_rate'];
begin
  if jsonb_typeof(p_lines)<>'array' or jsonb_array_length(p_lines) not between 1 and 100 then
    raise exception 'POS sale requires 1 to 100 lines.' using errcode='22023';
  end if;

  for item in select value from jsonb_array_elements(p_lines) loop
    item_number:=item_number+1;
    if jsonb_typeof(item)<>'object' or exists(
      select 1 from jsonb_object_keys(item) key where not (key=any(allowed_keys))
    ) then
      raise exception 'POS sale line % contains unsupported fields.',item_number using errcode='22023';
    end if;
    product_id_text:=item->>'product_id';
    if product_id_text is null or product_id_text !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
      raise exception 'POS sale line % has an invalid product.',item_number using errcode='22023';
    end if;
    if jsonb_typeof(item->'quantity')<>'number'
       or (item ? 'discount_percent' and jsonb_typeof(item->'discount_percent')<>'number')
       or (item ? 'tax_rate' and jsonb_typeof(item->'tax_rate')<>'number') then
      raise exception 'POS sale line % has invalid numeric values.',item_number using errcode='22023';
    end if;

    quantity:=(item->>'quantity')::numeric;
    discount_percent:=coalesce((item->>'discount_percent')::numeric,0);
    tax_rate:=coalesce((item->>'tax_rate')::numeric,0);
    if quantity<=0 or quantity>1000000
       or discount_percent not between 0 and 100
       or tax_rate not between 0 and 100 then
      raise exception 'POS sale line % is outside allowed limits.',item_number using errcode='22023';
    end if;
    if product_id_text::uuid=any(seen_products) then
      raise exception 'Duplicate POS sale product on line %.',item_number using errcode='22023';
    end if;

    select product.id,product.name,product.sales_price,product.revenue_account_id
    into target_product
    from public.business_products product
    where product.id=product_id_text::uuid
      and product.business_id=p_business_id
      and product.status='active';
    if not found then
      raise exception 'Active POS sale product not found on line %.',item_number using errcode='P0002';
    end if;

    seen_products:=array_append(seen_products,target_product.id);
    normalized:=normalized||jsonb_build_array(jsonb_build_object(
      'product_id',target_product.id,
      'warehouse_id',p_warehouse_id,
      'description',target_product.name,
      'quantity',quantity,
      'unit_price',target_product.sales_price,
      'discount_percent',discount_percent,
      'tax_rate',tax_rate,
      'revenue_account_id',target_product.revenue_account_id
    ));
    max_discount:=greatest(max_discount,discount_percent);
    total:=total+(
      quantity*target_product.sales_price*(1-discount_percent/100)*(1+tax_rate/100)
    );
  end loop;

  return jsonb_build_object(
    'lines',normalized,
    'max_discount_percent',round(max_discount,2),
    'estimated_total',round(total,6)
  );
end;
$$;

create or replace function public.post_business_pos_sale(
  p_session_token_hash text,
  p_sale_date date,
  p_customer_id uuid,
  p_lines jsonb,
  p_paid_now boolean,
  p_notes text,
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
  branch_settings public.business_pos_branch_settings;
  normalized_record jsonb;
  normalized_lines jsonb;
  max_discount numeric;
  estimated_total numeric;
  clean_notes text:=nullif(btrim(coalesce(p_notes,'')),'');
  payload_document jsonb;
  payload_hash text;
  existing_request public.business_pos_sale_requests;
  request_id uuid;
  sale_result jsonb;
  invoice_id uuid;
  payment_id uuid;
  final_total numeric;
  previous_sub text:=current_setting('request.jwt.claim.sub',true);
  previous_role text:=current_setting('request.jwt.claim.role',true);
  previous_claims text:=current_setting('request.jwt.claims',true);
  caught_state text;
begin
  if p_request_key is null then
    raise exception 'POS sale request key is required.' using errcode='22023';
  end if;
  if p_session_token_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'POS session is unavailable.' using errcode='POS02';
  end if;
  if clean_notes is not null and char_length(clean_notes)>300 then
    raise exception 'POS sale notes are too long.' using errcode='22023';
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
  if p_sale_date is null
     or p_sale_date<>(now() at time zone branch_record.timezone)::date then
    raise exception 'POS sales must use the current branch date.' using errcode='22023';
  end if;

  select settings.* into branch_settings
  from public.business_pos_branch_settings settings
  where settings.business_id=target_session.business_id
    and settings.branch_id=target_session.branch_id;
  if not found then
    raise exception 'POS branch configuration is missing.' using errcode='POS05';
  end if;
  if not coalesce(p_paid_now,true) and not branch_settings.allow_credit_sales then
    return jsonb_build_object('ok',false,'error','credit_sales_disabled');
  end if;

  normalized_record:=private.normalize_business_pos_sale_lines(
    target_session.business_id,branch_settings.warehouse_id,p_lines
  );
  normalized_lines:=normalized_record->'lines';
  max_discount:=(normalized_record->>'max_discount_percent')::numeric;
  estimated_total:=(normalized_record->>'estimated_total')::numeric;

  payload_document:=jsonb_build_object(
    'version',1,
    'business_id',target_session.business_id,
    'branch_id',target_session.branch_id,
    'device_id',target_session.device_id,
    'session_id',target_session.id,
    'user_id',target_session.user_id,
    'sale_date',p_sale_date,
    'customer_id',p_customer_id,
    'paid_now',coalesce(p_paid_now,true),
    'notes',clean_notes,
    'request_key',p_request_key,
    'lines',normalized_lines
  );
  payload_hash:=encode(extensions.digest(convert_to(payload_document::text,'UTF8'),'sha256'),'hex');

  select request.* into existing_request
  from public.business_pos_sale_requests request
  where request.business_id=target_session.business_id
    and request.request_key=p_request_key
  for update;

  if found then
    if existing_request.payload_hash<>payload_hash
       or existing_request.session_id<>target_session.id
       or existing_request.user_id<>target_session.user_id then
      return jsonb_build_object('ok',false,'error','idempotency_conflict');
    end if;
    if existing_request.status='posted' then
      perform private.write_business_pos_event(
        target_session.business_id,target_session.branch_id,target_session.device_id,
        target_session.id,target_session.user_id,target_session.user_id,
        existing_request.approval_id,'sale_replayed','success',
        jsonb_build_object('request_id',existing_request.id,'invoice_id',existing_request.invoice_id)
      );
      return coalesce(existing_request.result,'{}'::jsonb)||jsonb_build_object('replayed',true);
    end if;
    if existing_request.attempt_count>=5 then
      return jsonb_build_object('ok',false,'error','retry_limit_reached');
    end if;
    request_id:=existing_request.id;
    update public.business_pos_sale_requests
    set status='pending',attempt_count=attempt_count+1,error_code=null,
        approval_id=coalesce(p_approval_id,approval_id),updated_at=now()
    where id=request_id;
  else
    insert into public.business_pos_sale_requests(
      business_id,branch_id,device_id,session_id,user_id,request_key,
      payload_hash,approval_id,status
    ) values (
      target_session.business_id,target_session.branch_id,target_session.device_id,
      target_session.id,target_session.user_id,p_request_key,
      payload_hash,p_approval_id,'pending'
    ) returning id into request_id;
  end if;

  if max_discount>branch_settings.high_discount_threshold and p_approval_id is null then
    update public.business_pos_sale_requests
    set status='approval_required',updated_at=now()
    where id=request_id;
    perform private.write_business_pos_event(
      target_session.business_id,target_session.branch_id,target_session.device_id,
      target_session.id,target_session.user_id,target_session.user_id,null,
      'sale_approval_required','blocked',jsonb_build_object(
        'request_id',request_id,
        'max_discount_percent',max_discount,
        'estimated_total',estimated_total
      )
    );
    return jsonb_build_object(
      'ok',false,'approval_required',true,'operation_type','high_discount',
      'payload_hash',payload_hash,'request_id',request_id,
      'amount',estimated_total,'discount_percent',max_discount
    );
  end if;
  if max_discount<=branch_settings.high_discount_threshold and p_approval_id is not null then
    return jsonb_build_object('ok',false,'error','approval_not_required');
  end if;

  begin
    if max_discount>branch_settings.high_discount_threshold then
      perform public.consume_business_pos_approval(
        p_session_token_hash,p_approval_id,'high_discount',payload_hash
      );
    end if;

    perform set_config('request.jwt.claim.sub',target_session.user_id::text,true);
    perform set_config('request.jwt.claim.role','authenticated',true);
    perform set_config(
      'request.jwt.claims',
      jsonb_build_object(
        'sub',target_session.user_id,
        'role','authenticated',
        'aal','aal1',
        'pos_session_id',target_session.id,
        'pos_device_id',target_session.device_id,
        'pos_branch_id',target_session.branch_id
      )::text,
      true
    );

    sale_result:=private.create_business_simple_shop_sale_internal(
      target_session.business_id,p_customer_id,p_sale_date,normalized_lines,
      coalesce(p_paid_now,true),
      case when coalesce(p_paid_now,true) then branch_settings.cash_account_id else null end,
      clean_notes,'pos:'||p_request_key::text
    );
  exception when others then
    get stacked diagnostics caught_state=returned_sqlstate;
    perform set_config('request.jwt.claim.sub',coalesce(previous_sub,''),true);
    perform set_config('request.jwt.claim.role',coalesce(previous_role,''),true);
    perform set_config('request.jwt.claims',coalesce(previous_claims,''),true);
    update public.business_pos_sale_requests
    set status='failed',error_code=left(coalesce(caught_state,'P0001'),40),updated_at=now()
    where id=request_id;
    perform private.write_business_pos_event(
      target_session.business_id,target_session.branch_id,target_session.device_id,
      target_session.id,target_session.user_id,target_session.user_id,p_approval_id,
      'sale_failed','failure',jsonb_build_object(
        'request_id',request_id,'error_code',left(coalesce(caught_state,'P0001'),40)
      )
    );
    return jsonb_build_object('ok',false,'error','sale_rejected');
  end;

  perform set_config('request.jwt.claim.sub',coalesce(previous_sub,''),true);
  perform set_config('request.jwt.claim.role',coalesce(previous_role,''),true);
  perform set_config('request.jwt.claims',coalesce(previous_claims,''),true);

  invoice_id:=(sale_result->>'invoice_id')::uuid;
  payment_id:=nullif(sale_result->>'payment_id','')::uuid;
  final_total:=(sale_result->>'total')::numeric;
  sale_result:=sale_result||jsonb_build_object(
    'ok',true,'request_id',request_id,'payload_hash',payload_hash,
    'branch_id',target_session.branch_id,'device_id',target_session.device_id,
    'cashier_user_id',target_session.user_id,'replayed',false
  );

  update public.business_pos_sale_requests
  set status='posted',approval_id=p_approval_id,invoice_id=invoice_id,
      payment_id=payment_id,total=final_total,error_code=null,result=sale_result,updated_at=now()
  where id=request_id;

  perform private.write_business_pos_event(
    target_session.business_id,target_session.branch_id,target_session.device_id,
    target_session.id,target_session.user_id,target_session.user_id,p_approval_id,
    'sale_posted','success',jsonb_build_object(
      'request_id',request_id,'invoice_id',invoice_id,
      'payment_id',payment_id,'total',final_total
    )
  );

  return sale_result;
end;
$$;

revoke all on function private.ensure_business_pos_primary_branch_setting(uuid) from public,anon,authenticated;
revoke all on function private.sync_business_pos_primary_branch_setting() from public,anon,authenticated;
revoke all on function private.normalize_business_pos_sale_lines(uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function private.ensure_business_pos_primary_branch_setting(uuid) to service_role;
grant execute on function private.sync_business_pos_primary_branch_setting() to service_role;
grant execute on function private.normalize_business_pos_sale_lines(uuid,uuid,jsonb) to service_role;

revoke all on function public.configure_business_pos_branch(uuid,uuid,uuid,uuid,uuid,numeric,boolean) from public,anon,authenticated;
revoke all on function public.post_business_pos_sale(text,date,uuid,jsonb,boolean,text,uuid,uuid) from public,anon,authenticated;
grant execute on function public.configure_business_pos_branch(uuid,uuid,uuid,uuid,uuid,numeric,boolean) to service_role;
grant execute on function public.post_business_pos_sale(text,date,uuid,jsonb,boolean,text,uuid,uuid) to service_role;

notify pgrst, 'reload schema';
