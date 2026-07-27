-- Resolve compact PL/pgSQL variable/column collisions in return internals.
do $$
declare
  function_name text;
  function_definition text;
begin
  foreach function_name in array array[
    'create_business_sales_return_internal',
    'create_business_purchase_return_internal'
  ]
  loop
    select pg_get_functiondef(function_row.oid)
    into function_definition
    from pg_proc function_row
    join pg_namespace namespace_row on namespace_row.oid=function_row.pronamespace
    where namespace_row.nspname='private'
      and function_row.proname=function_name
    order by function_row.oid desc
    limit 1;

    if function_definition is null then
      raise exception 'Return function % is missing.',function_name;
    end if;

    if position('#variable_conflict use_variable' in function_definition)=0 then
      function_definition:=replace(
        function_definition,
        E'AS $function$\n',
        E'AS $function$\n#variable_conflict use_variable\n'
      );
      function_definition:=replace(
        function_definition,
        'AS $function$declare',
        E'AS $function$\n#variable_conflict use_variable\ndeclare'
      );
      execute function_definition;
    end if;
  end loop;
end;
$$;
