begin;

create index if not exists platform_security_incidents_acknowledged_by_idx
  on private.platform_security_incidents (acknowledged_by)
  where acknowledged_by is not null;

create index if not exists platform_security_incidents_resolved_by_idx
  on private.platform_security_incidents (resolved_by)
  where resolved_by is not null;

create index if not exists platform_security_incident_audit_previous_assignment_idx
  on private.platform_security_incident_audit (previous_assignment)
  where previous_assignment is not null;

create index if not exists platform_security_incident_audit_next_assignment_idx
  on private.platform_security_incident_audit (next_assignment)
  where next_assignment is not null;

commit;
