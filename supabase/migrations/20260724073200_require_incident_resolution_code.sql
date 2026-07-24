begin;

alter table private.platform_security_incidents
  drop constraint if exists platform_security_incidents_resolution_check;

alter table private.platform_security_incidents
  add constraint platform_security_incidents_resolution_check check (
    (
      status in ('resolved', 'dismissed')
      and resolution_code is not null
      and resolution_code in (
        'mitigated',
        'false_positive',
        'duplicate',
        'accepted_risk',
        'no_action_required',
        'superseded'
      )
      and resolved_at is not null
      and resolved_by is not null
      and expires_at is not null
    )
    or (
      status not in ('resolved', 'dismissed')
      and resolution_code is null
      and resolved_at is null
      and resolved_by is null
      and expires_at is null
    )
  );

create or replace function private.apply_platform_security_incident_workflow(
  p_incident_code text,
  p_status text,
  p_severity text,
  p_due_at timestamptz default null,
  p_assign_to_self boolean default false,
  p_resolution_code text default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, auth, private
as $$
declare
  v_actor uuid := auth.uid();
  v_actor_role text;
  v_incident private.platform_security_incidents%rowtype;
  v_incident_code text := upper(trim(coalesce(p_incident_code, '')));
  v_resolution_code text := nullif(lower(trim(coalesce(p_resolution_code, ''))), '');
  v_next_assignment uuid;
  v_now timestamptz := now();
begin
  select role into v_actor_role
  from private.platform_admins
  where user_id = v_actor and disabled_at is null;

  if v_actor is null or v_actor_role not in ('owner', 'admin') then
    raise exception 'incident_operator_access_required' using errcode = '42501';
  end if;

  if v_incident_code !~ '^INC-[A-F0-9]{12}$' then
    raise exception 'incident_code_invalid' using errcode = '22023';
  end if;

  select * into v_incident
  from private.platform_security_incidents
  where incident_code = v_incident_code
  for update;

  if not found then
    raise exception 'incident_not_found' using errcode = 'P0002';
  end if;

  if v_incident.status in ('resolved', 'dismissed') then
    raise exception 'incident_closed' using errcode = '22023';
  end if;

  if v_incident.assigned_to is not null
    and v_incident.assigned_to <> v_actor
    and v_actor_role <> 'owner' then
    raise exception 'incident_assigned_elsewhere' using errcode = '42501';
  end if;

  if p_status not in ('open', 'acknowledged', 'investigating', 'monitoring', 'resolved', 'dismissed') then
    raise exception 'incident_status_invalid' using errcode = '22023';
  end if;

  if p_severity not in ('low', 'medium', 'high', 'critical') then
    raise exception 'incident_severity_invalid' using errcode = '22023';
  end if;

  if p_due_at is not null
    and (p_due_at <= v_incident.created_at - interval '1 day'
      or p_due_at > v_now + interval '365 days') then
    raise exception 'incident_due_at_invalid' using errcode = '22023';
  end if;

  if p_status in ('resolved', 'dismissed') then
    if v_resolution_code is null or v_resolution_code not in (
      'mitigated', 'false_positive', 'duplicate',
      'accepted_risk', 'no_action_required', 'superseded'
    ) then
      raise exception 'incident_resolution_invalid' using errcode = '22023';
    end if;

    if p_status = 'dismissed'
      and p_severity = 'critical'
      and v_actor_role <> 'owner' then
      raise exception 'critical_incident_owner_required' using errcode = '42501';
    end if;
  elsif v_resolution_code is not null then
    raise exception 'incident_resolution_not_allowed' using errcode = '22023';
  end if;

  v_next_assignment := case
    when p_assign_to_self then v_actor
    else v_incident.assigned_to
  end;

  update private.platform_security_incidents
  set status = p_status,
      severity = p_severity,
      due_at = p_due_at,
      assigned_to = v_next_assignment,
      acknowledged_at = case
        when p_status <> 'open' and acknowledged_at is null then v_now
        else acknowledged_at
      end,
      acknowledged_by = case
        when p_status <> 'open' and acknowledged_by is null then v_actor
        else acknowledged_by
      end,
      resolution_code = case
        when p_status in ('resolved', 'dismissed') then v_resolution_code
        else null
      end,
      resolved_at = case
        when p_status in ('resolved', 'dismissed') then v_now
        else null
      end,
      resolved_by = case
        when p_status in ('resolved', 'dismissed') then v_actor
        else null
      end,
      expires_at = case
        when p_status in ('resolved', 'dismissed') then v_now + interval '24 months'
        else null
      end,
      updated_at = v_now
  where id = v_incident.id;

  insert into private.platform_security_incident_audit (
    incident_id,
    actor_user_id,
    action,
    previous_status,
    next_status,
    previous_severity,
    next_severity,
    previous_assignment,
    next_assignment,
    resolution_code
  ) values (
    v_incident.id,
    v_actor,
    'workflow_updated',
    v_incident.status,
    p_status,
    v_incident.severity,
    p_severity,
    v_incident.assigned_to,
    v_next_assignment,
    case when p_status in ('resolved', 'dismissed') then v_resolution_code else null end
  );

  return jsonb_build_object(
    'incidentCode', v_incident.incident_code,
    'updated', true
  );
end;
$$;

revoke all on function private.apply_platform_security_incident_workflow(text, text, text, timestamptz, boolean, text)
  from public, anon;
grant execute on function private.apply_platform_security_incident_workflow(text, text, text, timestamptz, boolean, text)
  to authenticated;

commit;
