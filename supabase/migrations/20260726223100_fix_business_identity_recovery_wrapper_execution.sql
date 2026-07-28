-- Public wrappers are the only authenticated entry points. Their private
-- implementations intentionally revoke authenticated execute permission, so the
-- wrappers must run as their migration owner. The private functions still read
-- auth.uid()/auth.jwt() and enforce Business realm, primary owner, target member,
-- AAL2, and cooldown requirements before any operation or audit write.

alter function public.get_business_identity_recovery_context(uuid,uuid,text)
  security definer;

alter function public.record_business_identity_recovery_result(
  uuid,uuid,text,text,integer,integer,integer,text
) security definer;

notify pgrst, 'reload schema';
