begin;

create index if not exists admin_release_approvals_approved_by_idx
  on private.admin_release_approvals (approved_by, approved_at desc);

commit;
