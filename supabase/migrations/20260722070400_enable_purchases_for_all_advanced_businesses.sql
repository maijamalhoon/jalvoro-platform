update public.businesses business
set module_config = jsonb_set(
      coalesce(business.module_config, '{}'::jsonb),
      '{purchases}',
      'true'::jsonb,
      true
    ),
    updated_at = now()
where business.status = 'active'
  and coalesce((business.module_config ->> 'purchases')::boolean, false) is not true;

create or replace function public.create_business_workspace(
  p_name text,
  p_business_type text,
  p_country_code text default null,
  p_base_currency text default 'PKR',
  p_timezone text default 'UTC'
)
returns uuid
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  current_user_id uuid := auth.uid();
  clean_name text := btrim(coalesce(p_name, ''));
  normalized_type text := lower(btrim(coalesce(p_business_type, '')));
  normalized_country text := nullif(upper(btrim(coalesce(p_country_code, ''))), '');
  normalized_currency text := upper(btrim(coalesce(p_base_currency, 'PKR')));
  normalized_timezone text := btrim(coalesce(p_timezone, 'UTC'));
  base_slug text;
  generated_slug text;
  created_business_id uuid;
  modules jsonb;
begin
  if current_user_id is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

  if char_length(clean_name) < 2 or char_length(clean_name) > 120 then
    raise exception 'Business name must contain 2 to 120 characters.' using errcode = '22023';
  end if;

  if normalized_type not in (
    'retail',
    'wholesale',
    'services',
    'manufacturing',
    'restaurant',
    'ecommerce',
    'construction',
    'professional_services',
    'other'
  ) then
    raise exception 'Unsupported business type.' using errcode = '22023';
  end if;

  if normalized_country is not null and normalized_country !~ '^[A-Z]{2}$' then
    raise exception 'Country code must use two ISO letters.' using errcode = '22023';
  end if;

  if not public.is_supported_financial_currency(normalized_currency) then
    raise exception 'Unsupported base currency.' using errcode = '22023';
  end if;

  if normalized_timezone = ''
    or not exists (
      select 1
      from pg_catalog.pg_timezone_names
      where name = normalized_timezone
    )
  then
    raise exception 'Unsupported timezone.' using errcode = '22023';
  end if;

  base_slug := btrim(
    regexp_replace(lower(clean_name), '[^a-z0-9]+', '-', 'g'),
    '-'
  );
  if base_slug = '' then
    base_slug := 'business';
  end if;

  generated_slug := base_slug || '-' || substr(
    replace(gen_random_uuid()::text, '-', ''),
    1,
    8
  );

  modules := jsonb_build_object(
    'accounting', true,
    'contacts', true,
    'sales', true,
    'purchases', true,
    'inventory', normalized_type in (
      'retail',
      'wholesale',
      'manufacturing',
      'restaurant',
      'ecommerce'
    ),
    'crm', normalized_type in (
      'services',
      'construction',
      'professional_services',
      'other'
    ),
    'reports', true
  );

  insert into public.businesses (
    owner_user_id,
    name,
    slug,
    business_type,
    country_code,
    base_currency,
    timezone,
    module_config
  )
  values (
    current_user_id,
    clean_name,
    generated_slug,
    normalized_type,
    normalized_country,
    normalized_currency,
    normalized_timezone,
    modules
  )
  returning id into created_business_id;

  insert into public.business_members (
    business_id,
    user_id,
    role,
    status,
    permissions,
    invited_by,
    joined_at
  )
  values (
    created_business_id,
    current_user_id,
    'owner',
    'active',
    array['*']::text[],
    current_user_id,
    now()
  );

  insert into public.business_workspace_preferences (
    user_id,
    default_workspace,
    active_business_id,
    onboarding_choice
  )
  values (
    current_user_id,
    'business',
    created_business_id,
    'business'
  )
  on conflict (user_id) do update
  set default_workspace = excluded.default_workspace,
      active_business_id = excluded.active_business_id,
      onboarding_choice = excluded.onboarding_choice,
      updated_at = now();

  return created_business_id;
end;
$$;

revoke execute on function public.create_business_workspace(text, text, text, text, text)
  from public, anon;
grant execute on function public.create_business_workspace(text, text, text, text, text)
  to authenticated, service_role;

comment on function public.create_business_workspace(text, text, text, text, text) is
  'Creates a tenant workspace with accounting, contacts, sales, purchases, and reports enabled for every advanced company.';
