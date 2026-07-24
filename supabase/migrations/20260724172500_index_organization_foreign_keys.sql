create index command_center_organizations_created_by_idx
  on private.command_center_organizations (created_by)
  where created_by is not null;

create index command_center_organizations_updated_by_idx
  on private.command_center_organizations (updated_by)
  where updated_by is not null;

create index command_center_organization_memberships_created_by_idx
  on private.command_center_organization_memberships (created_by)
  where created_by is not null;

create index command_center_organization_memberships_updated_by_idx
  on private.command_center_organization_memberships (updated_by)
  where updated_by is not null;

create index command_center_organization_audit_subject_idx
  on private.command_center_organization_audit (subject_user_id)
  where subject_user_id is not null;
