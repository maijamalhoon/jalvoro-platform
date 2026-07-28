do $migration$
declare
  function_definition text;
  original_definition text;
  guarded_expression text := 'case when entry.id is not null';
  guarded_expression_count integer;
begin
  select pg_get_functiondef('public.get_business_reports_snapshot(uuid,date,date,date)'::regprocedure)
  into function_definition;
  original_definition := function_definition;

  guarded_expression_count := (
    length(function_definition) - length(replace(function_definition, guarded_expression, ''))
  ) / length(guarded_expression);

  if guarded_expression_count < 4 then
    function_definition := replace(
      function_definition,
      'then coalesce(sum(line.credit_base - line.debit_base), 0)::numeric(24,6)
        else coalesce(sum(line.debit_base - line.credit_base), 0)::numeric(24,6)',
      'then coalesce(sum(case when entry.id is not null then line.credit_base - line.debit_base else 0 end), 0)::numeric(24,6)
        else coalesce(sum(case when entry.id is not null then line.debit_base - line.credit_base else 0 end), 0)::numeric(24,6)'
    );

    function_definition := replace(
      function_definition,
      'then coalesce(sum(line.debit_base - line.credit_base), 0)::numeric(24,6)
        else coalesce(sum(line.credit_base - line.debit_base), 0)::numeric(24,6)',
      'then coalesce(sum(case when entry.id is not null then line.debit_base - line.credit_base else 0 end), 0)::numeric(24,6)
        else coalesce(sum(case when entry.id is not null then line.credit_base - line.debit_base else 0 end), 0)::numeric(24,6)'
    );

    guarded_expression_count := (
      length(function_definition) - length(replace(function_definition, guarded_expression, ''))
    ) / length(guarded_expression);

    if function_definition = original_definition or guarded_expression_count < 4 then
      raise exception 'Report date-filter patch did not match the expected function body.';
    end if;

    execute function_definition;
  end if;
end;
$migration$;
