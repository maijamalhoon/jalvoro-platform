-- Normalizes legacy function-source formatting before the Simple Shop migration
-- applies its scoped permission extensions. No permission is added here; this
-- migration only makes the existing deterministic patch targets reproducible.

do $$
declare
  definition text;
  patched text;
  source_text constant text := 'membership.role in (''owner'', ''admin'', ''accountant'', ''manager'')';
  target_text constant text := 'role in(''owner'',''admin'',''accountant'',''manager'')';
begin
  select pg_get_functiondef(p.oid)
  into definition
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'private'
    and p.proname = 'create_business_supplier_bill_internal'
  limit 1;

  if definition is null then
    raise exception 'Supplier bill permission normalization target not found.';
  end if;

  patched := replace(definition, source_text, target_text);
  if patched = definition and position(target_text in definition) = 0 then
    raise exception 'Supplier bill permission normalization source not found.';
  end if;
  if patched <> definition then execute patched; end if;
end;
$$;

do $$
declare
  definition text;
  patched text;
  source_text constant text := 'membership.role in (''owner'', ''admin'', ''accountant'', ''manager'')';
  target_text constant text := 'membership.role in(''owner'',''admin'',''accountant'',''manager'')';
begin
  select pg_get_functiondef(p.oid)
  into definition
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'private'
    and p.proname = 'record_business_supplier_payment_internal'
  limit 1;

  if definition is null then
    raise exception 'Supplier payment permission normalization target not found.';
  end if;

  patched := replace(definition, source_text, target_text);
  if patched = definition and position(target_text in definition) = 0 then
    raise exception 'Supplier payment permission normalization source not found.';
  end if;
  if patched <> definition then execute patched; end if;
end;
$$;

do $$
declare
  definition text;
  patched text;
  source_text constant text := $source$membership.role in ('owner', 'admin', 'accountant', 'manager')
          or '*' = any(membership.permissions)
          or 'purchases.manage' = any(membership.permissions)
          or 'purchases.pay' = any(membership.permissions)$source$;
  target_text constant text := 'role in(''owner'',''admin'',''accountant'',''manager'') or ''*''=any(permissions) or ''purchases.manage''=any(permissions) or ''purchases.pay''=any(permissions)';
begin
  select pg_get_functiondef(p.oid)
  into definition
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'private'
    and p.proname = 'post_business_journal_entry_internal'
  limit 1;

  if definition is null then
    raise exception 'Purchase journal permission normalization target not found.';
  end if;

  patched := replace(definition, source_text, target_text);
  if patched = definition and position(target_text in definition) = 0 then
    raise exception 'Purchase journal permission normalization source not found.';
  end if;
  if patched <> definition then execute patched; end if;
end;
$$;
