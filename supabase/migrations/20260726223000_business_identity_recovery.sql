-- Primary-owner-only Business identity recovery. The database authorizes and
-- audits the operation; the service-role MFA API remains inside a Supabase Edge
-- Function and is never exposed to browser or Next.js application source.

alter table public.business_team_audit_log
  drop constraint if exists business_team_audit_action_check;
alter table public.business_team_audit_log
  add constraint business_team_audit_action_check check (action in (
    'invitation_created','invitation_sent','invitation_failed','invitation_resent',
    'invitation_cancelled','invitation_accepted','member_updated','member_suspended',
    'member_reactivated','member_revoked','ownership_transferred',
    'mfa_recovery_started','mfa_recovery_inspected','mfa_recovery_completed','mfa_recovery_failed'
  ));

create or replace function private.get_business_identity_recovery_context_internal(
  p_business_id uuid,
  p_target_user_id uuid,
  p_action text
)
returns jsonb
language plpgsql
stable
security definer
set search_path='pg_catalog','public','private','auth'
as $$
declare
  actor_id uuid := auth.uid();
  normalized_action text := lower(btrim(coalesce(p_action,'')));
  owner_id uuid;
  target record;
begin
  if actor_id is null then
    raise exception 'Authentication required.' using errcode='42501';
  end if;
  perform private.require_current_account_realm('business');

  if normalized_action not in ('inspect_mfa','reset_mfa') then
    raise exception 'Unsupported identity recovery action.' using errcode='22023';
  end if;

  select business.owner_user_id into owner_id
  from public.businesses business
  where business.id=p_business_id and business.status='active';

  if owner_id is null then
    raise exception 'Active business not found.' using errcode='P0002';
  end if;
  if owner_id<>actor_id then
    raise exception 'Primary owner access required.' using errcode='42501';
  end if;
  if p_target_user_id=owner_id then
    raise exception 'Primary owner must use self-service identity recovery.' using errcode='42501';
  end if;

  select membership.user_id,membership.status,membership.role,
         coalesce(nullif(profile.full_name,''),split_part(coalesce(profile.email,''),'@',1),'Team member') as name,
         profile.email
  into target
  from public.business_members membership
  left join public.profiles profile on profile.id=membership.user_id
  where membership.business_id=p_business_id
    and membership.user_id=p_target_user_id
    and membership.status in ('active','suspended');

  if not found then
    raise exception 'Recoverable team member not found.' using errcode='P0002';
  end if;

  if normalized_action='reset_mfa' and coalesce(auth.jwt()->>'aal','aal1')<>'aal2' then
    raise exception 'Owner MFA verification is required.' using errcode='MFA02';
  end if;

  if normalized_action='reset_mfa' and exists(
    select 1 from public.business_team_audit_log audit
    where audit.business_id=p_business_id
      and audit.target_user_id=p_target_user_id
      and audit.action='mfa_recovery_completed'
      and audit.created_at>now()-interval '5 minutes'
  ) then
    raise exception 'MFA recovery was completed recently.' using errcode='55000';
  end if;

  return jsonb_build_object(
    'business_id',p_business_id,
    'target_user_id',target.user_id,
    'target_name',target.name,
    'target_email',target.email,
    'target_status',target.status,
    'target_role',target.role
  );
end;
$$;

create or replace function public.get_business_identity_recovery_context(
  p_business_id uuid,
  p_target_user_id uuid,
  p_action text
)
returns jsonb
language sql
security invoker
set search_path='pg_catalog','public','private'
as $$
  select private.get_business_identity_recovery_context_internal(
    p_business_id,p_target_user_id,p_action
  );
$$;

create or replace function private.record_business_identity_recovery_result_internal(
  p_business_id uuid,
  p_target_user_id uuid,
  p_action text,
  p_outcome text,
  p_factor_count integer,
  p_verified_factor_count integer,
  p_deleted_factor_count integer,
  p_error_code text
)
returns void
language plpgsql
security definer
set search_path='pg_catalog','public','private','auth'
as $$
declare
  actor_id uuid := auth.uid();
  normalized_action text := lower(btrim(coalesce(p_action,'')));
  normalized_outcome text := lower(btrim(coalesce(p_outcome,'')));
  audit_action text;
  owner_id uuid;
begin
  if actor_id is null then
    raise exception 'Authentication required.' using errcode='42501';
  end if;
  perform private.require_current_account_realm('business');

  select owner_user_id into owner_id
  from public.businesses
  where id=p_business_id and status='active';
  if owner_id<>actor_id then
    raise exception 'Primary owner access required.' using errcode='42501';
  end if;
  if p_target_user_id=owner_id or not exists(
    select 1 from public.business_members membership
    where membership.business_id=p_business_id
      and membership.user_id=p_target_user_id
  ) then
    raise exception 'Team member not found.' using errcode='P0002';
  end if;
  if normalized_action not in ('inspect_mfa','reset_mfa')
     or normalized_outcome not in ('started','success','failed') then
    raise exception 'Invalid identity recovery result.' using errcode='22023';
  end if;
  if least(
    coalesce(p_factor_count,0),coalesce(p_verified_factor_count,0),
    coalesce(p_deleted_factor_count,0)
  )<0 then
    raise exception 'Identity recovery counts cannot be negative.' using errcode='22023';
  end if;

  audit_action := case
    when normalized_action='reset_mfa' and normalized_outcome='started'
      then 'mfa_recovery_started'
    when normalized_action='inspect_mfa' and normalized_outcome='success'
      then 'mfa_recovery_inspected'
    when normalized_action='reset_mfa' and normalized_outcome='success'
      then 'mfa_recovery_completed'
    else 'mfa_recovery_failed'
  end;

  perform private.write_business_team_audit(
    p_business_id,audit_action,p_target_user_id,null,null,
    jsonb_build_object(
      'factor_count',coalesce(p_factor_count,0),
      'verified_factor_count',coalesce(p_verified_factor_count,0),
      'deleted_factor_count',coalesce(p_deleted_factor_count,0)
    ),
    jsonb_build_object(
      'recovery_action',normalized_action,
      'outcome',normalized_outcome,
      'error_code',nullif(left(coalesce(p_error_code,''),80),'')
    )
  );
end;
$$;

create or replace function public.record_business_identity_recovery_result(
  p_business_id uuid,
  p_target_user_id uuid,
  p_action text,
  p_outcome text,
  p_factor_count integer,
  p_verified_factor_count integer,
  p_deleted_factor_count integer,
  p_error_code text default null
)
returns void
language sql
security invoker
set search_path='pg_catalog','public','private'
as $$
  select private.record_business_identity_recovery_result_internal(
    p_business_id,p_target_user_id,p_action,p_outcome,p_factor_count,
    p_verified_factor_count,p_deleted_factor_count,p_error_code
  );
$$;

revoke all on function private.get_business_identity_recovery_context_internal(uuid,uuid,text) from public,anon,authenticated;
revoke all on function private.record_business_identity_recovery_result_internal(uuid,uuid,text,text,integer,integer,integer,text) from public,anon,authenticated;
grant execute on function private.get_business_identity_recovery_context_internal(uuid,uuid,text) to service_role;
grant execute on function private.record_business_identity_recovery_result_internal(uuid,uuid,text,text,integer,integer,integer,text) to service_role;

revoke all on function public.get_business_identity_recovery_context(uuid,uuid,text) from public,anon;
revoke all on function public.record_business_identity_recovery_result(uuid,uuid,text,text,integer,integer,integer,text) from public,anon;
grant execute on function public.get_business_identity_recovery_context(uuid,uuid,text) to authenticated,service_role;
grant execute on function public.record_business_identity_recovery_result(uuid,uuid,text,text,integer,integer,integer,text) to authenticated,service_role;

notify pgrst, 'reload schema';
