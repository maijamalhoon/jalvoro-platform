-- Extend the existing overview compatibility policy to the new Global Operations
-- module without making the permission product-wide or environment-wide.
insert into private.command_center_role_permissions (
  role,
  permission_key,
  product_key,
  module_key,
  environment_key
)
values
  ('owner', 'command-center:overview:view', 'command-center', 'global-operations', null),
  ('admin', 'command-center:overview:view', 'command-center', 'global-operations', null),
  ('analyst', 'command-center:overview:view', 'command-center', 'global-operations', null),
  ('support', 'command-center:overview:view', 'command-center', 'global-operations', null)
on conflict do nothing;
