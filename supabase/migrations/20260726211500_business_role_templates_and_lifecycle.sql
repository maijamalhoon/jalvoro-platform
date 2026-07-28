-- Expand organization roles without weakening the existing tenant boundary.
-- Primary owner remains the only identity allowed to grant privileged roles or
-- sensitive financial/workforce permissions. Operational administrators can
-- manage ordinary least-privilege staff roles.

create or replace function private.business_team_assignable_roles()
returns text[]
language sql
immutable
set search_path='pg_catalog'
as $$
  select array[
    'admin','it_admin','hr_admin','finance','accountant','operations_manager',
    'manager','auditor','branch_staff','employee','sales','cashier','inventory','viewer'
  ]::text[];
$$;

create or replace function private.business_team_privileged_roles()
returns text[]
language sql
immutable
set search_path='pg_catalog'
as $$
  select array['admin','it_admin','hr_admin','finance']::text[];
$$;

create or replace function private.business_team_sensitive_permissions()
returns text[]
language sql
immutable
set search_path='pg_catalog'
as $$
  select array[
    'team.manage','notifications.manage','banking.manage','tax.manage',
    'budget.approve','approvals.decide','approvals.manage','payroll.manage',
    'payroll.process','payroll.pay','assets.dispose','fx.revalue',
    'branches.manage','projects.recognize'
  ]::text[];
$$;

create or replace function private.business_team_permission_catalog()
returns text[]
language sql
immutable
set search_path='pg_catalog'
as $$
  select array[
    'team.view','team.manage','notifications.view','notifications.manage',
    'accounting.view','accounting.manage','banking.view','banking.manage',
    'tax.view','tax.manage','budget.view','budget.manage','budget.approve',
    'documents.view','documents.manage','branches.view','branches.manage',
    'approvals.view','approvals.request','approvals.decide','approvals.manage',
    'payroll.view','payroll.manage','payroll.process','payroll.pay',
    'assets.view','assets.manage','assets.depreciate','assets.dispose',
    'fx.view','fx.manage','fx.revalue','projects.view','projects.manage',
    'projects.time','projects.recognize','contacts.view','contacts.manage',
    'sales.view','sales.manage','sales.collect','sales.return',
    'purchases.view','purchases.manage','purchases.pay','purchases.return',
    'inventory.view','inventory.manage','inventory.transfer','inventory.adjust',
    'crm.view','crm.manage','reports.view','shop.view','shop.sell',
    'shop.purchase','shop.expense'
  ]::text[];
$$;

create or replace function private.business_team_role_template(
  p_role text,
  p_workspace_mode text
)
returns text[]
language plpgsql
immutable
set search_path='pg_catalog','private'
as $$
declare
  normalized_role text := lower(btrim(coalesce(p_role,'')));
  normalized_mode text := lower(btrim(coalesce(p_workspace_mode,'advanced_company')));
  result text[];
begin
  if not (normalized_role = any(private.business_team_assignable_roles())) then
    raise exception 'Unsupported team role.' using errcode='22023';
  end if;

  if normalized_mode not in ('advanced_company','simple_shop') then
    raise exception 'Unsupported business workspace mode.' using errcode='22023';
  end if;

  if normalized_mode='simple_shop' then
    result := case normalized_role
      when 'admin' then array[
        'team.view','team.manage','notifications.view','notifications.manage',
        'accounting.view','accounting.manage','contacts.view','contacts.manage',
        'sales.view','sales.manage','sales.collect','sales.return',
        'purchases.view','purchases.manage','purchases.pay','purchases.return',
        'inventory.view','inventory.manage','inventory.transfer','inventory.adjust',
        'reports.view','shop.view','shop.sell','shop.purchase','shop.expense'
      ]::text[]
      when 'it_admin' then array[
        'team.view','team.manage','notifications.view','notifications.manage',
        'documents.view','documents.manage','branches.view','branches.manage'
      ]::text[]
      when 'hr_admin' then array[
        'team.view','team.manage','notifications.view','documents.view',
        'documents.manage','approvals.view','approvals.request','payroll.view',
        'payroll.manage','payroll.process'
      ]::text[]
      when 'finance' then array[
        'accounting.view','accounting.manage','banking.view','banking.manage',
        'purchases.view','purchases.pay','sales.view','sales.collect',
        'reports.view','shop.view'
      ]::text[]
      when 'accountant' then array[
        'accounting.view','accounting.manage','purchases.view','purchases.pay',
        'sales.view','sales.collect','reports.view','shop.view'
      ]::text[]
      when 'operations_manager' then array[
        'team.view','notifications.view','contacts.view','contacts.manage',
        'sales.view','sales.manage','sales.collect','sales.return',
        'purchases.view','purchases.manage','purchases.return','inventory.view',
        'inventory.manage','inventory.transfer','inventory.adjust','reports.view',
        'shop.view','shop.sell','shop.purchase','shop.expense'
      ]::text[]
      when 'manager' then array[
        'team.view','notifications.view','contacts.view','contacts.manage',
        'sales.view','sales.manage','sales.collect','purchases.view',
        'purchases.manage','inventory.view','inventory.manage','reports.view',
        'shop.view','shop.sell','shop.purchase','shop.expense'
      ]::text[]
      when 'auditor' then array[
        'team.view','accounting.view','contacts.view','sales.view',
        'purchases.view','inventory.view','reports.view','shop.view'
      ]::text[]
      when 'branch_staff' then array[
        'notifications.view','contacts.view','sales.view','sales.collect',
        'inventory.view','shop.view','shop.sell'
      ]::text[]
      when 'employee' then array['notifications.view','shop.view']::text[]
      when 'sales' then array[
        'notifications.view','contacts.view','contacts.manage','sales.view',
        'sales.manage','sales.collect','shop.view','shop.sell'
      ]::text[]
      when 'cashier' then array[
        'notifications.view','shop.view','shop.sell','shop.expense'
      ]::text[]
      when 'inventory' then array[
        'notifications.view','purchases.view','inventory.view','inventory.manage',
        'inventory.transfer','inventory.adjust','shop.view','shop.purchase'
      ]::text[]
      when 'viewer' then array[
        'accounting.view','contacts.view','sales.view','purchases.view',
        'inventory.view','reports.view','shop.view'
      ]::text[]
    end;
  else
    result := case normalized_role
      when 'admin' then private.business_team_permission_catalog()
      when 'it_admin' then array[
        'team.view','team.manage','notifications.view','notifications.manage',
        'documents.view','documents.manage','branches.view','branches.manage'
      ]::text[]
      when 'hr_admin' then array[
        'team.view','team.manage','notifications.view','documents.view',
        'documents.manage','approvals.view','approvals.request','payroll.view',
        'payroll.manage','payroll.process'
      ]::text[]
      when 'finance' then array[
        'accounting.view','accounting.manage','banking.view','banking.manage',
        'tax.view','tax.manage','budget.view','budget.manage','budget.approve',
        'approvals.view','approvals.decide','payroll.view','payroll.pay',
        'assets.view','assets.manage','assets.depreciate','assets.dispose',
        'fx.view','fx.manage','fx.revalue','purchases.view','purchases.pay',
        'sales.view','sales.collect','reports.view'
      ]::text[]
      when 'accountant' then array[
        'accounting.view','accounting.manage','banking.view','tax.view',
        'budget.view','payroll.view','assets.view','fx.view','purchases.view',
        'purchases.manage','purchases.pay','sales.view','sales.collect','reports.view'
      ]::text[]
      when 'operations_manager' then array[
        'team.view','notifications.view','contacts.view','contacts.manage',
        'sales.view','sales.manage','sales.collect','sales.return',
        'purchases.view','purchases.manage','purchases.return','inventory.view',
        'inventory.manage','inventory.transfer','inventory.adjust','crm.view',
        'crm.manage','documents.view','branches.view','approvals.view',
        'approvals.request','projects.view','projects.manage','projects.time',
        'reports.view'
      ]::text[]
      when 'manager' then array[
        'team.view','notifications.view','contacts.view','contacts.manage',
        'sales.view','sales.manage','sales.collect','purchases.view',
        'purchases.manage','inventory.view','inventory.manage','crm.view',
        'crm.manage','documents.view','branches.view','approvals.view',
        'approvals.request','projects.view','projects.time','reports.view'
      ]::text[]
      when 'auditor' then array[
        'team.view','notifications.view','accounting.view','banking.view',
        'tax.view','budget.view','documents.view','branches.view',
        'approvals.view','payroll.view','assets.view','fx.view','projects.view',
        'contacts.view','sales.view','purchases.view','inventory.view',
        'crm.view','reports.view'
      ]::text[]
      when 'branch_staff' then array[
        'notifications.view','branches.view','contacts.view','sales.view',
        'sales.manage','sales.collect','inventory.view','inventory.transfer',
        'shop.view','shop.sell'
      ]::text[]
      when 'employee' then array[
        'notifications.view','documents.view','approvals.view',
        'approvals.request','projects.view','projects.time'
      ]::text[]
      when 'sales' then array[
        'notifications.view','contacts.view','contacts.manage','sales.view',
        'sales.manage','sales.collect','crm.view','crm.manage'
      ]::text[]
      when 'cashier' then array[
        'notifications.view','contacts.view','sales.view','sales.collect',
        'shop.view','shop.sell'
      ]::text[]
      when 'inventory' then array[
        'notifications.view','purchases.view','inventory.view','inventory.manage',
        'inventory.transfer','inventory.adjust','shop.view','shop.purchase'
      ]::text[]
      when 'viewer' then array[
        'notifications.view','accounting.view','contacts.view','sales.view',
        'purchases.view','inventory.view','crm.view','reports.view'
      ]::text[]
    end;
  end if;

  return private.normalize_business_team_permissions(result);
end;
$$;

create or replace function private.business_team_role_catalog(
  p_workspace_mode text
)
returns jsonb
language sql
stable
security definer
set search_path='pg_catalog','private'
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'value', roles.value,
        'label', roles.label,
        'detail', roles.detail,
        'privileged', roles.privileged,
        'permissions', to_jsonb(private.business_team_role_template(roles.value,p_workspace_mode))
      ) order by roles.sort_order
    ),
    '[]'::jsonb
  )
  from (values
    (1,'admin','Administrator','Broad operational administration. Only the primary owner can grant this role.',true),
    (2,'it_admin','IT Administrator','Team access and technical operations without financial authority.',true),
    (3,'hr_admin','HR Administrator','Employees, payroll preparation, documents, and workforce approvals.',true),
    (4,'finance','Finance Manager','Accounting, banking, tax, budgets, payroll payments, assets, and FX controls.',true),
    (5,'accountant','Accountant','Accounting, reconciliations, purchases, collections, and reporting.',false),
    (6,'operations_manager','Operations Manager','Cross-functional daily operations, branches, approvals, projects, and inventory.',false),
    (7,'manager','Manager','Daily team and operational workflows without owner-level controls.',false),
    (8,'auditor','Auditor','Read-only financial, operational, payroll, tax, and document visibility.',false),
    (9,'branch_staff','Branch Staff','Branch-scoped sales, stock, customer, and counter workflows.',false),
    (10,'employee','Employee','Basic documents, notifications, approval requests, and assigned work.',false),
    (11,'sales','Sales','Customers, invoices, collections, and CRM workflows.',false),
    (12,'cashier','Cashier','Payments and approved counter workflows.',false),
    (13,'inventory','Inventory','Products, stock counts, transfers, and approved adjustments.',false),
    (14,'viewer','Viewer','General read-only operational and reporting access.',false)
  ) as roles(sort_order,value,label,detail,privileged);
$$;

create or replace function private.resolve_business_team_permissions(
  p_role text,
  p_permissions text[],
  p_workspace_mode text
)
returns text[]
language plpgsql
immutable
set search_path='pg_catalog','private'
as $$
begin
  if p_permissions is null then
    return private.business_team_role_template(p_role,p_workspace_mode);
  end if;
  return private.normalize_business_team_permissions(p_permissions);
end;
$$;

create or replace function private.business_team_has_sensitive_permissions(
  p_permissions text[]
)
returns boolean
language sql
immutable
set search_path='pg_catalog','private'
as $$
  select exists (
    select 1
    from unnest(coalesce(p_permissions,'{}'::text[])) permission
    where permission = any(private.business_team_sensitive_permissions())
  );
$$;

alter table public.business_members
  drop constraint if exists business_members_role_check;
alter table public.business_members
  add constraint business_members_role_check check (
    role in (
      'owner','admin','it_admin','hr_admin','finance','accountant',
      'operations_manager','manager','auditor','branch_staff','employee',
      'sales','cashier','inventory','viewer'
    )
  );

alter table public.business_invitations
  drop constraint if exists business_invitations_role_check;
alter table public.business_invitations
  add constraint business_invitations_role_check check (
    role in (
      'admin','it_admin','hr_admin','finance','accountant','operations_manager',
      'manager','auditor','branch_staff','employee','sales','cashier',
      'inventory','viewer'
    )
  );

create or replace function private.get_business_team_snapshot_internal(
  p_business_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path='pg_catalog','public','private'
as $$
declare
  result jsonb;
  business_mode text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required.' using errcode='42501';
  end if;
  if not private.can_view_business_team(p_business_id) then
    raise exception 'Team access required.' using errcode='42501';
  end if;

  select b.workspace_mode into business_mode
  from public.businesses b
  where b.id=p_business_id;

  select jsonb_build_object(
    'business',(
      select jsonb_build_object(
        'id',b.id,'name',b.name,'slug',b.slug,'workspace_mode',b.workspace_mode,
        'owner_user_id',b.owner_user_id
      )
      from public.businesses b where b.id=p_business_id
    ),
    'members',coalesce((
      select jsonb_agg(jsonb_build_object(
        'user_id',m.user_id,
        'name',coalesce(nullif(p.full_name,''),split_part(coalesce(p.email,''),'@',1),'Team member'),
        'email',p.email,'role',m.role,'status',m.status,'permissions',m.permissions,
        'joined_at',m.joined_at,'created_at',m.created_at,
        'is_primary_owner',(b.owner_user_id=m.user_id)
      ) order by (b.owner_user_id=m.user_id) desc,m.status,m.role,coalesce(p.full_name,p.email))
      from public.business_members m
      join public.businesses b on b.id=m.business_id
      left join public.profiles p on p.id=m.user_id
      where m.business_id=p_business_id
    ),'[]'::jsonb),
    'invitations',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',i.id,'email',i.email,'role',i.role,'permissions',i.permissions,
        'status',case when i.status='pending' and i.expires_at<=now() then 'expired' else i.status end,
        'expires_at',i.expires_at,'delivery_status',i.delivery_status,
        'delivery_error',i.delivery_error,'last_sent_at',i.last_sent_at,
        'resend_count',i.resend_count,'created_at',i.created_at,'invited_by',i.invited_by
      ) order by i.created_at desc)
      from public.business_invitations i where i.business_id=p_business_id
    ),'[]'::jsonb),
    'audit',coalesce((
      select jsonb_agg(row_data order by row_data->>'created_at' desc)
      from (
        select jsonb_build_object(
          'id',a.id,'action',a.action,'actor_user_id',a.actor_user_id,
          'actor_name',coalesce(ap.full_name,ap.email),
          'target_user_id',a.target_user_id,
          'target_name',coalesce(tp.full_name,tp.email),
          'invitation_id',a.invitation_id,'metadata',a.metadata,'created_at',a.created_at
        ) row_data
        from public.business_team_audit_log a
        left join public.profiles ap on ap.id=a.actor_user_id
        left join public.profiles tp on tp.id=a.target_user_id
        where a.business_id=p_business_id
        order by a.created_at desc
        limit 100
      ) q
    ),'[]'::jsonb),
    'permission_catalog',to_jsonb(private.business_team_permission_catalog()),
    'role_catalog',private.business_team_role_catalog(business_mode)
  ) into result;

  return result;
end;
$$;

create or replace function private.create_business_invitation_internal(
  p_business_id uuid,
  p_email text,
  p_role text,
  p_permissions text[],
  p_expires_days integer
)
returns jsonb
language plpgsql
security definer
set search_path='pg_catalog','public','private'
as $$
declare
  current_user_id uuid:=auth.uid();
  normalized_email text:=lower(btrim(coalesce(p_email,'')));
  normalized_role text:=lower(btrim(coalesce(p_role,'')));
  normalized_permissions text[];
  raw_token text;
  invitation_uuid uuid;
  expiry timestamptz;
  owner_id uuid;
  business_mode text;
  existing_user uuid;
  existing_realm text;
begin
  if current_user_id is null then
    raise exception 'Authentication required.' using errcode='42501';
  end if;
  perform private.require_current_account_realm('business');
  if not private.can_manage_business_team(p_business_id) then
    raise exception 'Team management permission required.' using errcode='42501';
  end if;
  if normalized_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'A valid email address is required.' using errcode='22023';
  end if;
  if not (normalized_role=any(private.business_team_assignable_roles())) then
    raise exception 'Unsupported team role.' using errcode='22023';
  end if;
  if coalesce(p_expires_days,7) not between 1 and 30 then
    raise exception 'Invitation expiry must be 1 to 30 days.' using errcode='22023';
  end if;

  select b.owner_user_id,b.workspace_mode
  into owner_id,business_mode
  from public.businesses b
  join public.business_members membership
    on membership.business_id=b.id
   and membership.user_id=current_user_id
   and membership.status='active'
  where b.id=p_business_id and b.status='active';

  if owner_id is null then
    raise exception 'Active business not found.' using errcode='P0002';
  end if;

  normalized_permissions:=private.resolve_business_team_permissions(
    normalized_role,p_permissions,business_mode
  );

  if current_user_id<>owner_id and (
    normalized_role=any(private.business_team_privileged_roles())
    or private.business_team_has_sensitive_permissions(normalized_permissions)
  ) then
    raise exception 'Only the primary owner can grant privileged organization access.'
      using errcode='42501';
  end if;

  select users.id into existing_user
  from auth.users users
  where lower(users.email)=normalized_email
  limit 1;

  if existing_user is not null then
    select private.get_account_realm(existing_user) into existing_realm;
    if existing_realm='individual' then
      raise exception 'This email belongs to an Individual account. Use a separate Business identity.'
        using errcode='42501';
    end if;
    if exists(
      select 1 from public.business_members membership
      where membership.business_id=p_business_id
        and membership.user_id=existing_user
        and membership.status='active'
    ) then
      raise exception 'This user is already an active team member.' using errcode='23505';
    end if;
  end if;

  update public.business_invitations
  set status='expired',updated_at=now()
  where business_id=p_business_id and email=normalized_email
    and status='pending' and expires_at<=now();

  if exists(
    select 1 from public.business_invitations
    where business_id=p_business_id and email=normalized_email and status='pending'
  ) then
    raise exception 'A pending invitation already exists for this email.' using errcode='23505';
  end if;

  raw_token:=replace(gen_random_uuid()::text,'-','')||replace(gen_random_uuid()::text,'-','');
  expiry:=now()+make_interval(days=>coalesce(p_expires_days,7));

  insert into public.business_invitations(
    business_id,email,role,permissions,token_hash,expires_at,invited_by
  ) values(
    p_business_id,normalized_email,normalized_role,normalized_permissions,
    encode(extensions.digest(raw_token,'sha256'),'hex'),expiry,current_user_id
  ) returning id into invitation_uuid;

  perform private.write_business_team_audit(
    p_business_id,'invitation_created',existing_user,invitation_uuid,null,
    jsonb_build_object(
      'email',normalized_email,'role',normalized_role,
      'permissions',normalized_permissions,'expires_at',expiry
    ),
    jsonb_build_object(
      'permission_source',case when p_permissions is null then 'role_template' else 'custom' end,
      'privileged_role',normalized_role=any(private.business_team_privileged_roles())
    )
  );

  return jsonb_build_object(
    'id',invitation_uuid,'email',normalized_email,'token',raw_token,
    'expires_at',expiry,'role',normalized_role,'permissions',normalized_permissions
  );
end;
$$;

create or replace function public.create_business_invitation(
  p_business_id uuid,
  p_email text,
  p_role text,
  p_permissions text[] default null,
  p_expires_days integer default 7
)
returns jsonb
language sql
security invoker
set search_path='pg_catalog','public','private'
as $$
  select private.create_business_invitation_internal(
    p_business_id,p_email,p_role,p_permissions,p_expires_days
  );
$$;

create or replace function private.update_business_team_member_internal(
  p_business_id uuid,
  p_user_id uuid,
  p_role text,
  p_status text,
  p_permissions text[]
)
returns jsonb
language plpgsql
security definer
set search_path='pg_catalog','public','private'
as $$
declare
  actor_id uuid:=auth.uid();
  owner_id uuid;
  business_mode text;
  old_member record;
  normalized_role text:=lower(btrim(coalesce(p_role,'')));
  normalized_status text:=lower(btrim(coalesce(p_status,'')));
  normalized_permissions text[];
  replacement_business_id uuid;
begin
  if actor_id is null or not private.can_manage_business_team(p_business_id) then
    raise exception 'Team management permission required.' using errcode='42501';
  end if;
  perform private.require_current_account_realm('business');

  select b.owner_user_id,b.workspace_mode
  into owner_id,business_mode
  from public.businesses b
  join public.business_members actor
    on actor.business_id=b.id and actor.user_id=actor_id and actor.status='active'
  where b.id=p_business_id;

  if p_user_id=owner_id then
    raise exception 'Primary owner cannot be edited, suspended, or removed. Transfer ownership first.'
      using errcode='42501';
  end if;

  select * into old_member
  from public.business_members
  where business_id=p_business_id and user_id=p_user_id
  for update;

  if not found then
    raise exception 'Team member not found.' using errcode='P0002';
  end if;
  if not (normalized_role=any(private.business_team_assignable_roles())) then
    raise exception 'Unsupported team role.' using errcode='22023';
  end if;
  if normalized_status not in('active','suspended','revoked') then
    raise exception 'Unsupported membership status.' using errcode='22023';
  end if;

  normalized_permissions:=private.resolve_business_team_permissions(
    normalized_role,p_permissions,business_mode
  );

  if actor_id=p_user_id and normalized_status<>'active' then
    raise exception 'Another owner or administrator must suspend or remove your access.'
      using errcode='42501';
  end if;

  if actor_id<>owner_id and (
    old_member.role=any(private.business_team_privileged_roles())
    or normalized_role=any(private.business_team_privileged_roles())
    or private.business_team_has_sensitive_permissions(old_member.permissions)
    or private.business_team_has_sensitive_permissions(normalized_permissions)
  ) then
    raise exception 'Only the primary owner can manage privileged organization access.'
      using errcode='42501';
  end if;

  update public.business_members
  set role=normalized_role,
      status=normalized_status,
      permissions=normalized_permissions,
      joined_at=case when normalized_status='active' then coalesce(joined_at,now()) else joined_at end,
      updated_at=now()
  where business_id=p_business_id and user_id=p_user_id;

  if normalized_status<>'active' then
    select membership.business_id into replacement_business_id
    from public.business_members membership
    where membership.user_id=p_user_id
      and membership.business_id<>p_business_id
      and membership.status='active'
    order by membership.updated_at desc
    limit 1;

    update public.business_workspace_preferences
    set active_business_id=replacement_business_id,
        default_workspace='business',
        onboarding_choice='business',
        updated_at=now()
    where user_id=p_user_id and active_business_id=p_business_id;
  end if;

  perform private.write_business_team_audit(
    p_business_id,
    case
      when normalized_status='suspended' then 'member_suspended'
      when normalized_status='revoked' then 'member_revoked'
      when old_member.status<>'active' and normalized_status='active' then 'member_reactivated'
      else 'member_updated'
    end,
    p_user_id,null,to_jsonb(old_member),
    jsonb_build_object(
      'role',normalized_role,'status',normalized_status,
      'permissions',normalized_permissions
    ),
    jsonb_build_object(
      'access_revoked_immediately',normalized_status<>'active',
      'permission_source',case when p_permissions is null then 'role_template' else 'custom' end
    )
  );

  return jsonb_build_object(
    'user_id',p_user_id,'role',normalized_role,'status',normalized_status,
    'permissions',normalized_permissions
  );
end;
$$;

create or replace function public.update_business_team_member(
  p_business_id uuid,
  p_user_id uuid,
  p_role text,
  p_status text,
  p_permissions text[] default null
)
returns jsonb
language sql
security invoker
set search_path='pg_catalog','public','private'
as $$
  select private.update_business_team_member_internal(
    p_business_id,p_user_id,p_role,p_status,p_permissions
  );
$$;

revoke all on function private.business_team_assignable_roles() from public,anon,authenticated;
revoke all on function private.business_team_privileged_roles() from public,anon,authenticated;
revoke all on function private.business_team_sensitive_permissions() from public,anon,authenticated;
revoke all on function private.business_team_role_template(text,text) from public,anon,authenticated;
revoke all on function private.business_team_role_catalog(text) from public,anon,authenticated;
revoke all on function private.resolve_business_team_permissions(text,text[],text) from public,anon,authenticated;
revoke all on function private.business_team_has_sensitive_permissions(text[]) from public,anon,authenticated;

grant execute on function private.business_team_assignable_roles() to service_role;
grant execute on function private.business_team_privileged_roles() to service_role;
grant execute on function private.business_team_sensitive_permissions() to service_role;
grant execute on function private.business_team_role_template(text,text) to service_role;
grant execute on function private.business_team_role_catalog(text) to service_role;
grant execute on function private.resolve_business_team_permissions(text,text[],text) to service_role;
grant execute on function private.business_team_has_sensitive_permissions(text[]) to service_role;

revoke all on function public.create_business_invitation(uuid,text,text,text[],integer) from public,anon;
revoke all on function public.update_business_team_member(uuid,uuid,text,text,text[]) from public,anon;
grant execute on function public.create_business_invitation(uuid,text,text,text[],integer) to authenticated,service_role;
grant execute on function public.update_business_team_member(uuid,uuid,text,text,text[]) to authenticated,service_role;

notify pgrst, 'reload schema';
