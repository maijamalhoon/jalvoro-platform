-- Run only against a disposable local/test database after all migrations.
-- This validates DB authorization and audit functions; it does not call Auth admin APIs.
begin;

insert into auth.users (
  id,aud,role,email,encrypted_password,email_confirmed_at,
  raw_app_meta_data,raw_user_meta_data,created_at,updated_at,is_anonymous
)
values
  ('51111111-1111-4111-8111-111111111111','authenticated','authenticated','recovery-owner@example.invalid','test-only',now(),'{"provider":"email","providers":["email"]}'::jsonb,'{}'::jsonb,now(),now(),false),
  ('52222222-2222-4222-8222-222222222222','authenticated','authenticated','recovery-member@example.invalid','test-only',now(),'{"provider":"email","providers":["email"]}'::jsonb,'{}'::jsonb,now(),now(),false);

set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','51111111-1111-4111-8111-111111111111',true);
select set_config('request.jwt.claims','{"sub":"51111111-1111-4111-8111-111111111111","role":"authenticated","email":"recovery-owner@example.invalid","aal":"aal1"}',true);
select public.claim_account_realm('business');

create temporary table recovery_test_state (business_id uuid) on commit drop;
insert into recovery_test_state(business_id)
select public.create_business_organization(
  'Identity Recovery Contract Organization','services','advanced_company',
  'PK','PKR','UTC','enterprise'
);

select set_config('request.jwt.claim.sub','52222222-2222-4222-8222-222222222222',true);
select set_config('request.jwt.claims','{"sub":"52222222-2222-4222-8222-222222222222","role":"authenticated","email":"recovery-member@example.invalid","aal":"aal1"}',true);
select public.claim_account_realm('business');

-- Fixture setup may call private role-template helpers only through the
-- service-role boundary. Authorization assertions below immediately return to
-- the authenticated member/owner roles used by the application.
grant select on recovery_test_state to service_role;
set local role service_role;
insert into public.business_members(
  business_id,user_id,role,status,permissions,invited_by,joined_at
)
select business_id,'52222222-2222-4222-8222-222222222222','employee','active',
       private.business_team_role_template('employee','advanced_company'),
       '51111111-1111-4111-8111-111111111111',now()
from recovery_test_state;
set local role authenticated;

do $$
declare target_business uuid;
begin
  select business_id into target_business from recovery_test_state;
  begin
    perform public.get_business_identity_recovery_context(
      target_business,'51111111-1111-4111-8111-111111111111','inspect_mfa'
    );
    raise exception 'Non-owner inspected another member''s MFA context.';
  exception when insufficient_privilege then null;
  end;
end;
$$;

select set_config('request.jwt.claim.sub','51111111-1111-4111-8111-111111111111',true);
select set_config('request.jwt.claims','{"sub":"51111111-1111-4111-8111-111111111111","role":"authenticated","email":"recovery-owner@example.invalid","aal":"aal1"}',true);

do $$
declare target_business uuid;
begin
  select business_id into target_business from recovery_test_state;
  perform public.get_business_identity_recovery_context(
    target_business,'52222222-2222-4222-8222-222222222222','inspect_mfa'
  );
  begin
    perform public.get_business_identity_recovery_context(
      target_business,'52222222-2222-4222-8222-222222222222','reset_mfa'
    );
    raise exception 'AAL1 owner obtained reset authorization.';
  exception when sqlstate 'MFA02' then null;
  end;
end;
$$;

select set_config('request.jwt.claims','{"sub":"51111111-1111-4111-8111-111111111111","role":"authenticated","email":"recovery-owner@example.invalid","aal":"aal2"}',true);

do $$
declare target_business uuid;
begin
  select business_id into target_business from recovery_test_state;
  perform public.get_business_identity_recovery_context(
    target_business,'52222222-2222-4222-8222-222222222222','reset_mfa'
  );
  perform public.record_business_identity_recovery_result(
    target_business,'52222222-2222-4222-8222-222222222222',
    'reset_mfa','started',0,0,0,null
  );
  if not exists(
    select 1 from public.business_team_audit_log audit
    where audit.business_id=target_business
      and audit.target_user_id='52222222-2222-4222-8222-222222222222'
      and audit.action='mfa_recovery_started'
  ) then
    raise exception 'Identity recovery start audit event was not written.';
  end if;
  perform public.record_business_identity_recovery_result(
    target_business,'52222222-2222-4222-8222-222222222222',
    'reset_mfa','success',2,1,2,null
  );
  if not exists(
    select 1 from public.business_team_audit_log audit
    where audit.business_id=target_business
      and audit.target_user_id='52222222-2222-4222-8222-222222222222'
      and audit.action='mfa_recovery_completed'
      and (audit.after_state->>'deleted_factor_count')::integer=2
  ) then
    raise exception 'Identity recovery completion audit event was not written.';
  end if;
end;
$$;

rollback;
