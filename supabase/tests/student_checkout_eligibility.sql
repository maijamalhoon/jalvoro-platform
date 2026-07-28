-- Run only after all billing migrations on a disposable local/test database.
begin;

insert into auth.users (
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  is_anonymous
)
values (
  '66666666-6666-4666-8666-666666666666',
  'authenticated',
  'authenticated',
  'student-checkout-contract@example.invalid',
  'test-only',
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{}'::jsonb,
  now(),
  now(),
  false
);

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '66666666-6666-4666-8666-666666666666',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

do $$
declare
  eligibility text;
  direct_read_blocked boolean := false;
begin
  eligibility := public.get_my_student_verification_status();
  if eligibility <> 'not_submitted' then
    raise exception 'Missing verification should return not_submitted, got %.', eligibility;
  end if;

  begin
    perform 1 from billing.student_verifications;
  exception when insufficient_privilege then
    direct_read_blocked := true;
  end;

  if not direct_read_blocked then
    raise exception 'Security failure: authenticated role read private student verification data.';
  end if;
end;
$$;

reset role;

insert into billing.student_verifications (
  user_id,
  status,
  verification_provider,
  verified_at,
  expires_at,
  evidence_deleted_at
)
values (
  '66666666-6666-4666-8666-666666666666',
  'verified',
  'contract-test',
  now(),
  now() + interval '1 year',
  now()
);

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '66666666-6666-4666-8666-666666666666',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

do $$
declare
  eligibility text;
begin
  eligibility := public.get_my_student_verification_status();
  if eligibility <> 'verified' then
    raise exception 'Verified current student should be eligible, got %.', eligibility;
  end if;
end;
$$;

reset role;

update billing.student_verifications
set verified_at = now() - interval '1 year',
    expires_at = now() - interval '1 minute',
    updated_at = now()
where user_id = '66666666-6666-4666-8666-666666666666';

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '66666666-6666-4666-8666-666666666666',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

do $$
declare
  eligibility text;
begin
  eligibility := public.get_my_student_verification_status();
  if eligibility <> 'expired' then
    raise exception 'Expired verification should not remain eligible, got %.', eligibility;
  end if;
end;
$$;

reset role;
rollback;
