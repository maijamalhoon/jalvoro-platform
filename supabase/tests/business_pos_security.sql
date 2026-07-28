-- Run only against a disposable local/test database after all migrations.
-- It validates POS device/PIN/session/approval invariants and rolls everything back.
begin;

insert into auth.users (
  id,aud,role,email,encrypted_password,email_confirmed_at,
  raw_app_meta_data,raw_user_meta_data,created_at,updated_at,is_anonymous
)
values
  ('61111111-1111-4111-8111-111111111111','authenticated','authenticated','pos-owner@example.invalid','test-only',now(),'{"provider":"email","providers":["email"]}'::jsonb,'{}'::jsonb,now(),now(),false),
  ('62222222-2222-4222-8222-222222222222','authenticated','authenticated','pos-cashier@example.invalid','test-only',now(),'{"provider":"email","providers":["email"]}'::jsonb,'{}'::jsonb,now(),now(),false),
  ('63333333-3333-4333-8333-333333333333','authenticated','authenticated','pos-manager@example.invalid','test-only',now(),'{"provider":"email","providers":["email"]}'::jsonb,'{}'::jsonb,now(),now(),false);

set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','61111111-1111-4111-8111-111111111111',true);
select set_config('request.jwt.claims','{"sub":"61111111-1111-4111-8111-111111111111","role":"authenticated","email":"pos-owner@example.invalid","aal":"aal2"}',true);
select public.claim_account_realm('business');

create temporary table pos_test_state (
  business_id uuid,
  business_slug text,
  branch_id uuid,
  device_id uuid,
  session_id uuid,
  approval_id uuid
) on commit drop;

insert into pos_test_state(business_id)
select public.create_business_organization(
  'POS Security Contract Organization','retail','simple_shop',
  'PK','PKR','Asia/Karachi','retail_pos'
);
update pos_test_state state
set business_slug=(select business.slug from public.businesses business where business.id=state.business_id);

select set_config('request.jwt.claim.sub','62222222-2222-4222-8222-222222222222',true);
select set_config('request.jwt.claims','{"sub":"62222222-2222-4222-8222-222222222222","role":"authenticated","email":"pos-cashier@example.invalid","aal":"aal1"}',true);
select public.claim_account_realm('business');
select set_config('request.jwt.claim.sub','63333333-3333-4333-8333-333333333333',true);
select set_config('request.jwt.claims','{"sub":"63333333-3333-4333-8333-333333333333","role":"authenticated","email":"pos-manager@example.invalid","aal":"aal2"}',true);
select public.claim_account_realm('business');

set local role service_role;
update pos_test_state state
set branch_id=(
  select branch.id from public.business_branches branch
  where branch.business_id=state.business_id and branch.status='active'
  order by branch.is_primary desc,branch.created_at limit 1
);

insert into public.business_members(
  business_id,user_id,role,status,permissions,invited_by,joined_at
)
select business_id,'62222222-2222-4222-8222-222222222222','cashier','active',
       private.business_team_role_template('cashier','simple_shop'),
       '61111111-1111-4111-8111-111111111111',now()
from pos_test_state;

insert into public.business_members(
  business_id,user_id,role,status,permissions,invited_by,joined_at
)
select business_id,'63333333-3333-4333-8333-333333333333','manager','active',
       private.business_team_role_template('manager','simple_shop'),
       '61111111-1111-4111-8111-111111111111',now()
from pos_test_state;

update pos_test_state state
set device_id=public.register_business_pos_device(
  '61111111-1111-4111-8111-111111111111',state.business_id,state.branch_id,
  'Contract counter','POS-TEST01',encode(extensions.digest('raw-device-secret','sha256'),'hex')
);

select public.issue_business_pos_temporary_pin(
  '61111111-1111-4111-8111-111111111111',business_id,
  '62222222-2222-4222-8222-222222222222','EMP-TEST01','482913'
) from pos_test_state;

do $$
declare state pos_test_state; attempt integer; result jsonb;
begin
  select * into state from pos_test_state;
  if exists(
    select 1 from public.business_pos_devices
    where id=state.device_id and secret_hash='raw-device-secret'
  ) then raise exception 'Raw device secret was stored.'; end if;
  if exists(
    select 1 from public.business_pos_staff_credentials
    where business_id=state.business_id and user_id='62222222-2222-4222-8222-222222222222'
      and pin_hash='482913'
  ) then raise exception 'Raw POS PIN was stored.'; end if;

  for attempt in 1..5 loop
    result:=public.start_business_pos_session(
      state.business_slug,'POS-TEST01',
      encode(extensions.digest('raw-device-secret','sha256'),'hex'),
      'EMP-TEST01','000001',
      encode(extensions.digest('failed-session-'||attempt::text,'sha256'),'hex'),
      'FAIL'||attempt::text,null,null
    );
    if coalesce((result->>'ok')::boolean,true) then
      raise exception 'Wrong POS PIN opened a session.';
    end if;
  end loop;

  if not exists(
    select 1 from public.business_pos_staff_credentials
    where business_id=state.business_id and user_id='62222222-2222-4222-8222-222222222222'
      and failed_attempts=5 and locked_until>now()
  ) then raise exception 'Wrong PIN attempts did not persist a lockout.'; end if;
end;
$$;

-- Reissuing a temporary PIN clears the lock and revokes old sessions.
select public.issue_business_pos_temporary_pin(
  '61111111-1111-4111-8111-111111111111',business_id,
  '62222222-2222-4222-8222-222222222222','EMP-TEST01','482913'
) from pos_test_state;

do $$
declare state pos_test_state; result jsonb;
begin
  select * into state from pos_test_state;
  result:=public.start_business_pos_session(
    state.business_slug,'POS-TEST01',
    encode(extensions.digest('raw-device-secret','sha256'),'hex'),
    'EMP-TEST01','482913',
    encode(extensions.digest('raw-session-token','sha256'),'hex'),
    'TOKTEST01',null,null
  );
  if not coalesce((result->>'ok')::boolean,false) then
    raise exception 'Valid POS credentials did not open a session.';
  end if;
  update pos_test_state set session_id=(result->>'session_id')::uuid;
  if exists(select 1 from public.business_pos_sessions where token_hash='raw-session-token') then
    raise exception 'Raw POS session token was stored.';
  end if;
end;
$$;

select public.change_business_pos_pin(
  encode(extensions.digest('raw-session-token','sha256'),'hex'),'482913','739204'
);

do $$
declare state pos_test_state; approval jsonb;
begin
  select * into state from pos_test_state;
  approval:=public.create_business_pos_approval_request(
    encode(extensions.digest('raw-session-token','sha256'),'hex'),
    'refund',encode(extensions.digest('refund-payload','sha256'),'hex'),
    'Customer returned an unopened item',1000,null
  );
  update pos_test_state set approval_id=(approval->>'approval_id')::uuid;
end;
$$;

do $$
declare state pos_test_state;
begin
  select * into state from pos_test_state;
  begin
    perform public.decide_business_pos_approval(
      '62222222-2222-4222-8222-222222222222',state.business_id,state.approval_id,
      'approved','Self approval attempt'
    );
    raise exception 'Cashier self-approved a sensitive POS operation.';
  exception when insufficient_privilege then null;
  end;

  perform public.decide_business_pos_approval(
    '63333333-3333-4333-8333-333333333333',state.business_id,state.approval_id,
    'approved','Refund checked against the original receipt'
  );

  begin
    perform public.consume_business_pos_approval(
      encode(extensions.digest('raw-session-token','sha256'),'hex'),state.approval_id,
      'refund',encode(extensions.digest('different-payload','sha256'),'hex')
    );
    raise exception 'Approval was consumed with a different payload.';
  exception when sqlstate 'POS04' then null;
  end;

  perform public.consume_business_pos_approval(
    encode(extensions.digest('raw-session-token','sha256'),'hex'),state.approval_id,
    'refund',encode(extensions.digest('refund-payload','sha256'),'hex')
  );

  begin
    perform public.consume_business_pos_approval(
      encode(extensions.digest('raw-session-token','sha256'),'hex'),state.approval_id,
      'refund',encode(extensions.digest('refund-payload','sha256'),'hex')
    );
    raise exception 'Approval was consumed more than once.';
  exception when sqlstate 'POS04' then null;
  end;
end;
$$;

do $$
declare state pos_test_state;
begin
  select * into state from pos_test_state;
  update public.business_members
  set status='suspended',updated_at=now()
  where business_id=state.business_id
    and user_id='62222222-2222-4222-8222-222222222222';
  if not exists(
    select 1 from public.business_pos_staff_credentials
    where business_id=state.business_id
      and user_id='62222222-2222-4222-8222-222222222222'
      and status='revoked'
  ) then raise exception 'Suspended member retained an active POS PIN.'; end if;
  if not exists(
    select 1 from public.business_pos_sessions
    where id=state.session_id and revoked_at is not null
  ) then raise exception 'Suspended member retained an active POS session.'; end if;
end;
$$;

do $$
declare state pos_test_state;
begin
  select * into state from pos_test_state;
  perform public.revoke_business_pos_device(
    '61111111-1111-4111-8111-111111111111',state.business_id,state.device_id,
    'Contract test revocation'
  );
  if not exists(
    select 1 from public.business_pos_sessions
    where id=state.session_id and revoked_at is not null
  ) then raise exception 'Revoked device left an active POS session.'; end if;
  if not exists(
    select 1 from public.business_pos_security_events
    where business_id=state.business_id and event_type='approval_consumed'
  ) then raise exception 'POS privilege escalation audit event was not written.'; end if;
end;
$$;

rollback;
