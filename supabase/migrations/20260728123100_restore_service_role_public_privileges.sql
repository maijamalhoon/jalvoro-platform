-- Match the hosted Supabase privilege baseline on fresh migration replays.
-- The service role is server-only, bypasses RLS by design, and has CRUD access
-- to every public relation in production. Browser roles remain unchanged.

grant all privileges on all tables in schema public to service_role;
grant all privileges on all sequences in schema public to service_role;

alter default privileges in schema public
  grant all privileges on tables to service_role;
alter default privileges in schema public
  grant all privileges on sequences to service_role;
