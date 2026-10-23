-- ════════════════════════════════════════════════════════════════════
-- ViziWiki · Supabase — migration 0005: rename the class "curator" →
-- "wiki_master" (owner's vocabulary change, Oct 2026). Paste into SQL
-- Editor → Run. Idempotent; content untouched.
-- ════════════════════════════════════════════════════════════════════

-- 1 · widen the check, move the rows, tighten the check
alter table public.profiles drop constraint if exists profiles_class_check;
update public.profiles set class = 'wiki_master' where class = 'curator';
alter table public.profiles add constraint profiles_class_check
  check (class in ('writer','designer','wiki_master'));

-- 2 · re-point the helper functions at the new name
create or replace function public.can_write_wiki(w text) returns boolean
language sql security definer stable set search_path = public as $$
  select public.my_role() = 'admin'
      or (public.my_role() = 'contributor'
          and (public.my_class() is distinct from 'wiki_master' or public.my_wiki() = w));
$$;

create or replace function public.is_approver(w text) returns boolean
language sql security definer stable set search_path = public as $$
  select public.my_role() = 'admin'
      or (public.my_role() = 'contributor' and public.my_class() = 'wiki_master' and public.my_wiki() = w);
$$;
