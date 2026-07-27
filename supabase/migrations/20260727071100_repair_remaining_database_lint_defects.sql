-- Final clean-replay runtime repairs discovered after the complete migration
-- chain was linted. These changes preserve existing authorization and
-- accounting semantics.

-- Keep the latest 25 POS operation rows inside a limiting subquery before
-- aggregating them; an outer ORDER BY on an aggregate query is invalid SQL.
do $$
declare
  definition text;
  patched text;
  old_text text := $old$'recent_operations',coalesce((select jsonb_agg(jsonb_build_object(
      'id',request.id,'operation_type',request.operation_type,
      'status',request.status,'amount',request.amount,
      'result',request.result,'created_at',request.created_at
    ) order by request.created_at desc)
      from public.business_pos_operation_requests request
      where request.session_id=target_session.id
      order by request.created_at desc limit 25),'[]'::jsonb)$old$;
  new_text text := $new$'recent_operations',coalesce((select jsonb_agg(
      operation_row order by operation_row->>'created_at' desc
    ) from (
      select jsonb_build_object(
        'id',request.id,'operation_type',request.operation_type,
        'status',request.status,'amount',request.amount,
        'result',request.result,'created_at',request.created_at
      ) operation_row
      from public.business_pos_operation_requests request
      where request.session_id=target_session.id
      order by request.created_at desc
      limit 25
    ) recent_operations),'[]'::jsonb)$new$;
begin
  select pg_get_functiondef(
    'public.get_business_pos_terminal_snapshot(text)'::regprocedure
  ) into definition;
  if position(new_text in definition)>0 then return; end if;
  patched:=replace(definition,old_text,new_text);
  if patched=definition or position(new_text in patched)=0 then
    raise exception 'POS recent-operation aggregation repair did not apply.';
  end if;
  execute patched;
end;
$$;

-- Rename the stock-adjustment header identifier so it cannot collide with the
-- identically named line-table column in journal aggregation queries.
do $$
declare
  definition text;
  patched text;
begin
  select pg_get_functiondef(
    'private.create_business_stock_adjustment_internal(uuid,date,uuid,text,jsonb,text,text)'::regprocedure
  ) into definition;
  patched:=definition;
  patched:=replace(patched,'adjustment_id uuid;','created_adjustment_id uuid;');
  patched:=replace(patched,'returning id into adjustment_id;',
    'returning id into created_adjustment_id;');
  patched:=replace(patched,'values(p_business_id,adjustment_id,',
    'values(p_business_id,created_adjustment_id,');
  patched:=replace(patched,'''stock_adjustment'',adjustment_id,',
    '''stock_adjustment'',created_adjustment_id,');
  patched:=replace(patched,'.adjustment_id=adjustment_id',
    '.adjustment_id=created_adjustment_id');
  patched:=replace(patched,'source_id=adjustment_id',
    'source_id=created_adjustment_id');
  patched:=replace(patched,'adjustment.id=adjustment_id',
    'adjustment.id=created_adjustment_id');
  patched:=replace(patched,'return adjustment_id;',
    'return created_adjustment_id;');
  if patched=definition
     or position('created_adjustment_id' in patched)=0
     or position('.adjustment_id=adjustment_id' in patched)>0 then
    raise exception 'Stock adjustment header-variable repair did not apply.';
  end if;
  execute patched;
end;
$$;

notify pgrst,'reload schema';
