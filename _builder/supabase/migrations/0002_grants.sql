-- ════════════════════════════════════════════════════════════════════
-- ViziWiki · Supabase — migration 0002: table grants for the API roles.
-- Newer Supabase projects do NOT auto-grant table privileges to the API
-- roles; RLS policies alone aren't enough (error 42501 "permission denied
-- for table wikis"). Grants say what a role MAY do at the SQL level; RLS
-- then filters which rows. Phase 2 (auth + roles) tightens both together.
-- Paste into SQL Editor → Run. Idempotent.
-- ════════════════════════════════════════════════════════════════════
grant usage on schema public to anon, authenticated;

grant select, insert, update, delete
  on public.wikis, public.pages, public.sections
  to anon, authenticated;

-- future tables created in public get the same automatically
alter default privileges in schema public
  grant select, insert, update, delete on tables to anon, authenticated;
