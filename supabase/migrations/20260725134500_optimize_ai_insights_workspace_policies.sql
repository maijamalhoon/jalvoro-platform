create index if not exists ai_insight_snapshots_user_idx
  on public.ai_insight_snapshots (user_id);

create index if not exists ai_saved_insights_user_idx
  on public.ai_saved_insights (user_id);

drop policy if exists ai_insight_snapshots_owner_select on public.ai_insight_snapshots;
drop policy if exists ai_insight_snapshots_owner_insert on public.ai_insight_snapshots;
drop policy if exists ai_insight_snapshots_owner_delete on public.ai_insight_snapshots;

create policy ai_insight_snapshots_owner_select
  on public.ai_insight_snapshots
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy ai_insight_snapshots_owner_insert
  on public.ai_insight_snapshots
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy ai_insight_snapshots_owner_delete
  on public.ai_insight_snapshots
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists ai_saved_insights_owner_select on public.ai_saved_insights;
drop policy if exists ai_saved_insights_owner_insert on public.ai_saved_insights;
drop policy if exists ai_saved_insights_owner_update on public.ai_saved_insights;
drop policy if exists ai_saved_insights_owner_delete on public.ai_saved_insights;

create policy ai_saved_insights_owner_select
  on public.ai_saved_insights
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy ai_saved_insights_owner_insert
  on public.ai_saved_insights
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy ai_saved_insights_owner_update
  on public.ai_saved_insights
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy ai_saved_insights_owner_delete
  on public.ai_saved_insights
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);
