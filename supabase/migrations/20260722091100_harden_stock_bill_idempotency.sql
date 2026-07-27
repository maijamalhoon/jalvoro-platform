create or replace function private.create_business_stock_supplier_bill_internal(
  p_business_id uuid,
  p_supplier_id uuid,
  p_bill_date date,
  p_due_date date,
  p_supplier_document_number text,
  p_currency text,
  p_exchange_rate numeric,
  p_notes text,
  p_lines jsonb,
  p_idempotency_key text
)
returns uuid
language plpgsql
security definer
set search_path=pg_catalog,public,private
as $$
declare
  current_user_id uuid:=auth.uid();
  transformed_lines jsonb:='[]'::jsonb;
  line_item jsonb;
  transformed_line jsonb;
  line_index bigint;
  product_uuid uuid;
  warehouse_uuid uuid;
  product_inventory_account_id uuid;
  created_bill_id uuid;
  bill_journal_id uuid;
  existing_inventory_receipt boolean;
begin
  if current_user_id is null then raise exception 'Authentication required.' using errcode='42501'; end if;
  if jsonb_typeof(p_lines)<>'array' then raise exception 'Supplier bill lines must be an array.' using errcode='22023'; end if;

  for line_item,line_index in
    select value,ordinality from jsonb_array_elements(p_lines) with ordinality
  loop
    product_uuid:=null;warehouse_uuid:=null;product_inventory_account_id:=null;
    begin
      product_uuid:=nullif(line_item->>'product_id','')::uuid;
      warehouse_uuid:=nullif(line_item->>'warehouse_id','')::uuid;
    exception when invalid_text_representation then
      raise exception 'Inventory product or warehouse is invalid.' using errcode='22023';
    end;
    transformed_line:=line_item;
    if product_uuid is not null or warehouse_uuid is not null then
      if product_uuid is null or warehouse_uuid is null then
        raise exception 'Inventory lines require both product and warehouse.' using errcode='22023';
      end if;
      select product.inventory_account_id into product_inventory_account_id
      from public.business_products product
      join public.business_warehouses warehouse
        on warehouse.business_id=product.business_id and warehouse.id=warehouse_uuid
      where product.id=product_uuid
        and product.business_id=p_business_id
        and product.status='active'
        and warehouse.status='active';
      if product_inventory_account_id is null then
        raise exception 'Active inventory product or warehouse not found.' using errcode='P0002';
      end if;
      transformed_line:=transformed_line||jsonb_build_object(
        'allocation_account_id',product_inventory_account_id
      );
    end if;
    transformed_lines:=transformed_lines||jsonb_build_array(transformed_line);
  end loop;

  created_bill_id:=public.create_business_supplier_bill(
    p_business_id,p_supplier_id,p_bill_date,p_due_date,p_supplier_document_number,
    p_currency,p_exchange_rate,p_notes,transformed_lines,p_idempotency_key
  );

  select exists(
    select 1
    from public.business_supplier_bill_lines line
    where line.business_id=p_business_id
      and line.bill_id=created_bill_id
      and line.inventory_movement_id is not null
  ) into existing_inventory_receipt;
  if existing_inventory_receipt then return created_bill_id; end if;

  for line_item,line_index in
    select value,ordinality from jsonb_array_elements(p_lines) with ordinality
  loop
    begin
      product_uuid:=nullif(line_item->>'product_id','')::uuid;
      warehouse_uuid:=nullif(line_item->>'warehouse_id','')::uuid;
    exception when invalid_text_representation then
      raise exception 'Inventory product or warehouse is invalid.' using errcode='22023';
    end;
    if product_uuid is not null then
      update public.business_supplier_bill_lines line
      set product_id=product_uuid,warehouse_id=warehouse_uuid,updated_at=now()
      where line.business_id=p_business_id
        and line.bill_id=created_bill_id
        and line.line_number=line_index;
    end if;
  end loop;

  select bill.journal_entry_id into bill_journal_id
  from public.business_supplier_bills bill
  where bill.id=created_bill_id and bill.business_id=p_business_id;
  perform private.receive_supplier_bill_inventory(
    p_business_id,created_bill_id,bill_journal_id,current_user_id
  );
  return created_bill_id;
end;
$$;
