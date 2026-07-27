-- Normalizes the legacy sales-return permission expression before the POS
-- operations migration adds its validated cashier claim. This migration does
-- not add a role or permission; it only makes the stored source reproducible.

do $$
declare
  definition text;
  patched text;
  normalized_target text := $target$membership.role in('owner','admin','accountant','manager','sales') or '*'=any(membership.permissions) or 'sales.manage'=any(membership.permissions) or 'sales.return'=any(membership.permissions)$target$;
  legacy_pattern text := $pattern$membership\.role[[:space:]]+in[[:space:]]*\([[:space:]]*'owner'[[:space:]]*,[[:space:]]*'admin'[[:space:]]*,[[:space:]]*'accountant'[[:space:]]*,[[:space:]]*'manager'[[:space:]]*,[[:space:]]*'sales'[[:space:]]*\)[[:space:]]+or[[:space:]]+'\*'[[:space:]]*=[[:space:]]*any[[:space:]]*\([[:space:]]*membership\.permissions[[:space:]]*\)[[:space:]]+or[[:space:]]+'sales\.manage'[[:space:]]*=[[:space:]]*any[[:space:]]*\([[:space:]]*membership\.permissions[[:space:]]*\)[[:space:]]+or[[:space:]]+'sales\.return'[[:space:]]*=[[:space:]]*any[[:space:]]*\([[:space:]]*membership\.permissions[[:space:]]*\)$pattern$;
begin
  select pg_get_functiondef(
    'private.create_business_sales_return_internal(uuid,uuid,date,jsonb,text,text)'::regprocedure
  ) into definition;

  if definition is null then
    raise exception 'Sales return permission normalization target not found.';
  end if;

  if position('private.current_business_pos_claim_valid' in definition)>0
     or position(normalized_target in definition)>0 then
    return;
  end if;

  if definition !~ legacy_pattern then
    raise exception 'Sales return permission normalization source not found.';
  end if;

  patched := regexp_replace(definition,legacy_pattern,normalized_target);
  if patched=definition or position(normalized_target in patched)=0 then
    raise exception 'Sales return permission normalization failed.';
  end if;

  execute patched;
end;
$$;
