-- Repairs runtime defects exposed only after the complete historical migration
-- chain is replayed on a clean database. No role, tenant, or service-key
-- boundary is widened by this migration.

alter table public.category_mutation_requests
  add column if not exists operation text,
  add column if not exists category_id uuid;

update public.category_mutation_requests request
set operation=coalesce(request.operation,request.action)
where request.operation is null;

update public.category_mutation_requests request
set category_id=coalesce(
  request.category_id,
  case
    when coalesce(request.response#>>'{category,id}',request.response->>'category_id','')
      ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    then coalesce(request.response#>>'{category,id}',request.response->>'category_id')::uuid
    else null
  end
)
where request.category_id is null;

alter table public.category_mutation_requests
  alter column operation set not null;

do $$
begin
  if not exists(
    select 1 from pg_constraint
    where conrelid='public.category_mutation_requests'::regclass
      and conname='category_mutation_requests_operation_check'
  ) then
    alter table public.category_mutation_requests
      add constraint category_mutation_requests_operation_check
      check(operation in ('create','update','archive','delete'));
  end if;
end;
$$;

create or replace function private.sync_category_mutation_request_shapes()
returns trigger
language plpgsql
security invoker
set search_path='pg_catalog','public','private'
as $$
declare
  response_category_id text;
begin
  new.operation:=coalesce(nullif(btrim(new.operation),''),nullif(btrim(new.action),''));
  new.action:=coalesce(nullif(btrim(new.action),''),new.operation);

  if new.operation not in ('create','update','archive','delete')
     or new.action not in ('create','update','archive','delete')
     or new.operation<>new.action then
    raise exception 'Unsupported category mutation operation.' using errcode='22023';
  end if;

  if new.category_id is null and new.response is not null then
    response_category_id:=coalesce(
      new.response#>>'{category,id}',
      new.response->>'category_id'
    );
    if response_category_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
      new.category_id:=response_category_id::uuid;
    end if;
  end if;

  if new.response is null then
    new.response:=jsonb_build_object(
      'action',new.action,
      'category',case
        when new.category_id is null then null
        else jsonb_build_object('id',new.category_id)
      end
    );
  end if;

  return new;
end;
$$;

revoke all on function private.sync_category_mutation_request_shapes()
  from public,anon,authenticated;
grant execute on function private.sync_category_mutation_request_shapes()
  to service_role;

drop trigger if exists sync_category_mutation_request_shapes
  on public.category_mutation_requests;
create trigger sync_category_mutation_request_shapes
before insert or update on public.category_mutation_requests
for each row execute function private.sync_category_mutation_request_shapes();

-- Qualify POS sale result variables so assignments cannot resolve to table
-- columns under any PL/pgSQL variable-conflict setting.
do $$
declare
  definition text;
  patched text;
begin
  select pg_get_functiondef(
    'public.post_business_pos_sale(text,date,uuid,jsonb,boolean,text,uuid,uuid)'::regprocedure
  ) into definition;
  patched:=definition;
  patched:=replace(patched,'invoice_id uuid;','created_invoice_id uuid;');
  patched:=replace(patched,'payment_id uuid;','created_payment_id uuid;');
  patched:=replace(patched,'invoice_id:=(sale_result->>''invoice_id'')::uuid;',
    'created_invoice_id:=(sale_result->>''invoice_id'')::uuid;');
  patched:=replace(patched,'payment_id:=nullif(sale_result->>''payment_id'','''')::uuid;',
    'created_payment_id:=nullif(sale_result->>''payment_id'','''')::uuid;');
  patched:=replace(patched,'invoice_id=invoice_id,','invoice_id=created_invoice_id,');
  patched:=replace(patched,'payment_id=payment_id,','payment_id=created_payment_id,');
  patched:=replace(patched,'''invoice_id'',invoice_id,','''invoice_id'',created_invoice_id,');
  patched:=replace(patched,'''payment_id'',payment_id,','''payment_id'',created_payment_id,');
  if patched=definition
     or position('created_invoice_id' in patched)=0
     or position('created_payment_id' in patched)=0 then
    raise exception 'POS sale variable-qualification repair did not apply.';
  end if;
  execute patched;
end;
$$;

-- Correct the invoice-line total column and local identifier resolution used
-- by refund normalization.
do $$
declare
  definition text;
  patched text;
begin
  select pg_get_functiondef(
    'private.normalize_business_pos_return_lines(uuid,uuid,uuid,uuid,jsonb)'::regprocedure
  ) into definition;
  patched:=definition;
  patched:=replace(patched,'invoice_line_id uuid;','target_invoice_line_id uuid;');
  patched:=replace(patched,'invoice_line_id:=(item->>''invoice_line_id'')::uuid;',
    'target_invoice_line_id:=(item->>''invoice_line_id'')::uuid;');
  patched:=replace(patched,'and line.id=invoice_line_id;',
    'and line.id=target_invoice_line_id;');
  patched:=replace(patched,'and return_line.invoice_line_id=invoice_line_id',
    'and return_line.invoice_line_id=target_invoice_line_id');
  patched:=replace(patched,'source_line.total_transaction',
    'source_line.line_total_transaction');
  if patched=definition
     or position('target_invoice_line_id' in patched)=0
     or position('source_line.line_total_transaction' in patched)=0 then
    raise exception 'POS return normalization repair did not apply.';
  end if;
  execute patched;
end;
$$;

-- Use the actual invoice-line total column in terminal snapshots and same-day
-- void estimates.
do $$
declare
  function_signature regprocedure;
  definition text;
  patched text;
begin
  foreach function_signature in array array[
    'public.get_business_pos_terminal_snapshot(text)'::regprocedure,
    'private.build_business_pos_void_lines(uuid,uuid,uuid,uuid,date)'::regprocedure
  ]
  loop
    select pg_get_functiondef(function_signature) into definition;
    patched:=replace(definition,'line.total_transaction','line.line_total_transaction');
    if patched=definition
       and position('line.line_total_transaction' in definition)=0 then
      raise exception 'POS invoice-line total repair target % not found.',function_signature;
    end if;
    if patched<>definition then execute patched; end if;
  end loop;
end;
$$;

-- Qualify POS operation result identifiers so the request-row update always
-- uses the PL/pgSQL values, not identically named columns.
do $$
declare
  definition text;
  patched text;
begin
  select pg_get_functiondef(
    'public.post_business_pos_operation(text,text,jsonb,uuid,uuid)'::regprocedure
  ) into definition;
  patched:=definition;
  patched:=replace(patched,'secondary_source_id uuid;','created_secondary_source_id uuid;');
  patched:=replace(patched,'source_id uuid;','created_source_id uuid;');
  patched:=replace(patched,'secondary_source_id:=nullif(operation_result->>''payment_id'','''')::uuid;',
    'created_secondary_source_id:=nullif(operation_result->>''payment_id'','''')::uuid;');
  patched:=replace(patched,'source_id:=(operation_result->>''bill_id'')::uuid;',
    'created_source_id:=(operation_result->>''bill_id'')::uuid;');
  patched:=replace(patched,'secondary_source_id:=(operation_result->>''journal_id'')::uuid;',
    'created_secondary_source_id:=(operation_result->>''journal_id'')::uuid;');
  patched:=replace(patched,'source_id:=(operation_result->>''expense_id'')::uuid;',
    'created_source_id:=(operation_result->>''expense_id'')::uuid;');
  patched:=replace(patched,'secondary_source_id:=payout_id;','created_secondary_source_id:=payout_id;');
  patched:=replace(patched,'source_id:=return_id;','created_source_id:=return_id;');
  patched:=replace(patched,'secondary_source_id:=(adjustment_result->>''journal_id'')::uuid;',
    'created_secondary_source_id:=(adjustment_result->>''journal_id'')::uuid;');
  patched:=replace(patched,'source_id:=(adjustment_result->>''adjustment_id'')::uuid;',
    'created_source_id:=(adjustment_result->>''adjustment_id'')::uuid;');
  patched:=replace(patched,'source_id=source_id,','source_id=created_source_id,');
  patched:=replace(patched,'secondary_source_id=secondary_source_id,',
    'secondary_source_id=created_secondary_source_id,');
  patched:=replace(patched,'''source_id'',source_id,','''source_id'',created_source_id,');
  if patched=definition
     or position('created_source_id' in patched)=0
     or position('created_secondary_source_id' in patched)=0 then
    raise exception 'POS operation variable-qualification repair did not apply.';
  end if;
  execute patched;
end;
$$;

-- Remove remaining variable/column ambiguity from inventory transfer and
-- adjustment internals while preserving their existing accounting behavior.
do $$
declare
  definition text;
  patched text;
begin
  select pg_get_functiondef(
    'private.create_business_warehouse_transfer_internal(uuid,date,uuid,uuid,jsonb,text,text)'::regprocedure
  ) into definition;
  patched:=definition;
  patched:=replace(patched,'out_movement_id uuid;','created_out_movement_id uuid;');
  patched:=replace(patched,'in_movement_id uuid;','created_in_movement_id uuid;');
  patched:=replace(patched,'returning id into out_movement_id;',
    'returning id into created_out_movement_id;');
  patched:=replace(patched,'returning id into in_movement_id;',
    'returning id into created_in_movement_id;');
  patched:=replace(patched,
    'set out_movement_id=out_movement_id,in_movement_id=in_movement_id',
    'set out_movement_id=created_out_movement_id,in_movement_id=created_in_movement_id');
  if patched=definition
     or position('created_out_movement_id' in patched)=0
     or position('created_in_movement_id' in patched)=0 then
    raise exception 'Warehouse transfer variable-qualification repair did not apply.';
  end if;
  execute patched;

  select pg_get_functiondef(
    'private.create_business_stock_adjustment_internal(uuid,date,uuid,text,jsonb,text,text)'::regprocedure
  ) into definition;
  patched:=definition;
  patched:=replace(patched,'movement_id uuid;','created_movement_id uuid;');
  patched:=replace(patched,'returning id into movement_id;',
    'returning id into created_movement_id;');
  patched:=replace(patched,'set movement_id=movement_id',
    'set movement_id=created_movement_id');
  if patched=definition or position('created_movement_id' in patched)=0 then
    raise exception 'Stock adjustment variable-qualification repair did not apply.';
  end if;
  execute patched;
end;
$$;

notify pgrst,'reload schema';
