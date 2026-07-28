-- Run only against a disposable local/test Supabase database after all migrations.
-- The transaction always rolls back.
begin;

insert into auth.users (
  id,aud,role,email,encrypted_password,email_confirmed_at,
  raw_app_meta_data,raw_user_meta_data,created_at,updated_at,is_anonymous
)
values
  ('41111111-1111-4111-8111-111111111111','authenticated','authenticated','role-owner@example.invalid','test-only',now(),'{"provider":"email","providers":["email"]}'::jsonb,'{}'::jsonb,now(),now(),false),
  ('42222222-2222-4222-8222-222222222222','authenticated','authenticated','role-admin@example.invalid','test-only',now(),'{"provider":"email","providers":["email"]}'::jsonb,'{}'::jsonb,now(),now(),false);

set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','41111111-1111-4111-8111-111111111111',true);
select set_config('request.jwt.claims','{"sub":"41111111-1111-4111-8111-111111111111","role":"authenticated","email":"role-owner@example.invalid"}',true);
select public.claim_account_realm('business');

create temporary table role_test_state (
  business_id uuid,
  admin_token text,
  auditor_invitation jsonb,
  employee_invitation jsonb
) on commit drop;

insert into role_test_state(business_id)
select public.create_business_organization(
  'Role Template Contract Organization','services','advanced_company',
  'PK','PKR','UTC','enterprise'
);

update role_test_state
set auditor_invitation = public.create_business_invitation(
  business_id,'role-auditor@example.invalid','auditor',null,7
);

do $$
declare
  invitation jsonb;
  permission text;
begin
  select auditor_invitation into invitation from role_test_state;
  if jsonb_array_length(invitation->'permissions') < 10 then
    raise exception 'Auditor template is unexpectedly incomplete.';
  end if;

  for permission in select jsonb_array_elements_text(invitation->'permissions')
  loop
    if permission not like '%.view' then
      raise exception 'Auditor template unexpectedly contains a write permission: %',permission;
    end if;
  end loop;
end;
$$;

update role_test_state
set admin_token = (
  public.create_business_invitation(
    business_id,'role-admin@example.invalid','admin',null,7
  )->>'token'
);

select set_config('request.jwt.claim.sub','42222222-2222-4222-8222-222222222222',true);
select set_config('request.jwt.claims','{"sub":"42222222-2222-4222-8222-222222222222","role":"authenticated","email":"role-admin@example.invalid"}',true);
select public.accept_business_invitation(admin_token) from role_test_state;

do $$
declare
  target_business uuid;
begin
  select business_id into target_business from role_test_state;
  begin
    perform public.create_business_invitation(
      target_business,'forbidden-finance@example.invalid','finance',null,7
    );
    raise exception 'Administrator granted a privileged Finance role.';
  exception
    when insufficient_privilege then null;
  end;
end;
$$;

update role_test_state
set employee_invitation = public.create_business_invitation(
  business_id,'allowed-employee@example.invalid','employee',null,7
);

do $$
declare
  invitation jsonb;
begin
  select employee_invitation into invitation from role_test_state;
  if invitation->>'role' <> 'employee' then
    raise exception 'Administrator could not create the ordinary Employee invitation.';
  end if;
  if invitation->'permissions' ? 'team.manage' then
    raise exception 'Employee invitation received team management.';
  end if;
end;
$$;

rollback;
