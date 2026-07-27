-- Restores a legacy personal-ledger RPC that was present in production before
-- the repository's migration history but was never represented as migration DDL.

create or replace function public.archive_transaction(p_transaction_id uuid)
returns uuid
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  current_user_id uuid := auth.uid();
  transaction_row public.transactions%rowtype;
begin
  if current_user_id is null then
    raise exception 'Please sign in again before deleting this transaction.';
  end if;

  select transaction.*
    into transaction_row
  from public.transactions transaction
  where transaction.id = p_transaction_id
    and transaction.user_id = current_user_id
  for update;

  if transaction_row.id is null then
    raise exception 'Transaction not found.';
  end if;

  if transaction_row.deleted_at is not null then
    return transaction_row.id;
  end if;

  if transaction_row.investment_id is not null then
    raise exception 'Delete this purchase from Investments so the position and ledger stay synchronized.';
  end if;

  if transaction_row.goal_contribution_id is not null then
    perform public.delete_goal_contribution(transaction_row.goal_contribution_id);
    return transaction_row.id;
  end if;

  if exists (
    select 1
    from public.liability_payments payment
    where payment.transaction_id = transaction_row.id
      and payment.user_id = current_user_id
  ) then
    perform public.delete_liability_payment_transaction(transaction_row.id);
    return transaction_row.id;
  end if;

  update public.transactions refund
  set deleted_at = now()
  where refund.refund_of_transaction_id = transaction_row.id
    and refund.user_id = current_user_id
    and refund.deleted_at is null;

  update public.transactions
  set deleted_at = now()
  where id = transaction_row.id
    and user_id = current_user_id
    and deleted_at is null;

  return transaction_row.id;
end;
$$;

revoke all on function public.archive_transaction(uuid) from public, anon;
