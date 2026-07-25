create index if not exists business_command_idempotency_actor_idx
  on private.business_command_idempotency(actor_user_id);

create index if not exists business_profile_command_audit_actor_idx
  on private.business_profile_command_audit(actor_user_id);
