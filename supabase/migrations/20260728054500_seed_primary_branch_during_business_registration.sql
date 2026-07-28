-- Ensure every active Business has a primary operating branch and make future
-- organization registration create that branch through the guarded branch engine.
-- This migration is schema/metadata-only and does not touch hosted projects until
-- an explicit later deployment is approved.

select set_config('app.business_branch_action', 'bootstrap', true);

insert into public.business_branches(
  business_id,
  code,
  name,
  branch_type,
  status,
  is_primary,
  country_code,
  timezone,
  created_by,
  updated_by
)
select
  business.id,
  case when business.workspace_mode = 'simple_shop' then 'MAIN' else 'HQ' end,
  case when business.workspace_mode = 'simple_shop' then 'Main Store' else 'Head Office' end,
  case when business.workspace_mode = 'simple_shop' then 'store' else 'head_office' end,
  'active',
  true,
  business.country_code,
  business.timezone,
  business.owner_user_id,
  business.owner_user_id
from public.businesses business
where business.status = 'active'
  and not exists(
    select 1
    from public.business_branches branch
    where branch.business_id = business.id
  );

select set_config('app.business_branch_action', 'audit', true);

insert into public.business_branch_audit_log(
  business_id,
  branch_id,
  actor_user_id,
  action,
  metadata
)
select
  branch.business_id,
  branch.id,
  business.owner_user_id,
  'bootstrap',
  jsonb_build_object(
    'code', branch.code,
    'source', 'business_registration_primary_branch_repair'
  )
from public.business_branches branch
join public.businesses business on business.id = branch.business_id
where branch.is_primary
  and not exists(
    select 1
    from public.business_branch_audit_log audit
    where audit.business_id = branch.business_id
      and audit.branch_id = branch.id
      and audit.action = 'bootstrap'
  );

create or replace function public.create_business_organization(
  p_name text,
  p_business_type text,
  p_workspace_mode text default 'advanced_company',
  p_country_code text default null,
  p_base_currency text default 'PKR',
  p_timezone text default 'UTC',
  p_product_tier text default 'growing_business'
)
returns uuid
language plpgsql
security invoker
set search_path='pg_catalog','public','private'
as $$
declare
  current_user_id uuid:=auth.uid();
  clean_name text:=btrim(coalesce(p_name,''));
  normalized_type text:=lower(btrim(coalesce(p_business_type,'')));
  normalized_mode text:=lower(btrim(coalesce(p_workspace_mode,'advanced_company')));
  normalized_tier text:=lower(btrim(coalesce(p_product_tier,'growing_business')));
  normalized_country text:=nullif(upper(btrim(coalesce(p_country_code,''))),'');
  normalized_currency text:=upper(btrim(coalesce(p_base_currency,'PKR')));
  normalized_timezone text:=btrim(coalesce(p_timezone,'UTC'));
  base_slug text;
  generated_slug text;
  created_business_id uuid;
  modules jsonb;
  branch_result jsonb;
begin
  if current_user_id is null then
    raise exception 'Authentication required.' using errcode='42501';
  end if;

  if char_length(clean_name)<2 or char_length(clean_name)>120 then
    raise exception 'Business name must contain 2 to 120 characters.' using errcode='22023';
  end if;

  if normalized_type not in(
    'retail','wholesale','services','manufacturing','restaurant','ecommerce',
    'construction','professional_services','other'
  ) then
    raise exception 'Unsupported business type.' using errcode='22023';
  end if;

  if normalized_mode not in('advanced_company','simple_shop') then
    raise exception 'Unsupported workspace mode.' using errcode='22023';
  end if;

  if normalized_tier not in(
    'solo_business','retail_pos','growing_business','enterprise'
  ) then
    raise exception 'Unsupported Business product.' using errcode='22023';
  end if;

  if normalized_tier='retail_pos' and normalized_mode<>'simple_shop' then
    raise exception 'Retail & POS requires the simple shop operating mode.' using errcode='22023';
  end if;

  if normalized_tier<>'retail_pos' and normalized_mode<>'advanced_company' then
    raise exception 'This Business product requires the advanced company operating mode.' using errcode='22023';
  end if;

  if normalized_country is not null and normalized_country !~ '^[A-Z]{2}$' then
    raise exception 'Country code must use two ISO letters.' using errcode='22023';
  end if;

  if not public.is_supported_financial_currency(normalized_currency) then
    raise exception 'Unsupported base currency.' using errcode='22023';
  end if;

  if normalized_timezone='' or not exists(
    select 1 from pg_catalog.pg_timezone_names where name=normalized_timezone
  ) then
    raise exception 'Unsupported timezone.' using errcode='22023';
  end if;

  base_slug:=btrim(regexp_replace(lower(clean_name),'[^a-z0-9]+','-','g'),'-');
  if base_slug='' then base_slug:='business'; end if;
  generated_slug:=base_slug||'-'||substr(replace(gen_random_uuid()::text,'-',''),1,8);

  modules:=case
    when normalized_tier='retail_pos' then
      jsonb_build_object(
        'accounting',true,'contacts',true,'sales',true,'purchases',true,
        'inventory',true,'crm',false,'reports',true,'simple_shop',true,
        'payroll',false,'budgeting',false,'approvals',false
      )
    when normalized_tier='solo_business' then
      jsonb_build_object(
        'accounting',true,'contacts',true,'sales',true,'purchases',true,
        'inventory',false,'crm',true,'reports',true,'simple_shop',false,
        'payroll',false,'budgeting',false,'approvals',false
      )
    when normalized_tier='enterprise' then
      jsonb_build_object(
        'accounting',true,'contacts',true,'sales',true,'purchases',true,
        'inventory',true,'crm',true,'reports',true,'simple_shop',false,
        'payroll',true,'budgeting',true,'approvals',true
      )
    else
      jsonb_build_object(
        'accounting',true,'contacts',true,'sales',true,'purchases',true,
        'inventory',normalized_type in('retail','wholesale','manufacturing','restaurant','ecommerce'),
        'crm',true,'reports',true,'simple_shop',false,
        'payroll',true,'budgeting',true,'approvals',true
      )
  end;

  insert into public.businesses(
    owner_user_id,name,slug,business_type,product_tier,country_code,
    base_currency,timezone,module_config,workspace_mode
  )
  values(
    current_user_id,clean_name,generated_slug,normalized_type,normalized_tier,
    normalized_country,normalized_currency,normalized_timezone,modules,normalized_mode
  )
  returning id into created_business_id;

  insert into public.business_members(
    business_id,user_id,role,status,permissions,invited_by,joined_at
  )
  values(
    created_business_id,current_user_id,'owner','active',array['*']::text[],
    current_user_id,now()
  );

  branch_result:=private.create_business_branch_internal(
    created_business_id,
    case when normalized_mode='simple_shop' then 'Main Store' else 'Head Office' end,
    case when normalized_mode='simple_shop' then 'MAIN' else 'HQ' end,
    case when normalized_mode='simple_shop' then 'store' else 'head_office' end,
    true,
    normalized_country,
    null,
    null,
    null,
    null,
    normalized_timezone,
    null,
    null,
    null
  );

  if nullif(branch_result->>'branch_id','') is null then
    raise exception 'Primary Business branch could not be created.' using errcode='23503';
  end if;

  if normalized_mode='simple_shop' then
    perform private.initialize_business_simple_shop(created_business_id,current_user_id);
  end if;

  insert into public.business_workspace_preferences(
    user_id,default_workspace,active_business_id,onboarding_choice
  )
  values(current_user_id,'business',created_business_id,'business')
  on conflict(user_id) do update set
    default_workspace=excluded.default_workspace,
    active_business_id=excluded.active_business_id,
    onboarding_choice=excluded.onboarding_choice,
    updated_at=now();

  return created_business_id;
end;
$$;

revoke all on function public.create_business_organization(
  text,text,text,text,text,text,text
) from public,anon;
grant execute on function public.create_business_organization(
  text,text,text,text,text,text,text
) to authenticated,service_role;
