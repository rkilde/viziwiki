-- ════════════════════════════════════════════════════════════════════
-- ViziWiki · Supabase — migration 0004 (phase 3: revisions, review, publish)
-- Paste into SQL Editor → Run (approve the "destructive" dialog — the drops
-- are idempotency guards; content is untouched). Idempotent.
--
-- The revision system (the Wikipedia model's data layer — built as VERSION
-- HISTORY from day one, per the recorded trust-ladder plan):
--   · every builder Save INSERTS a revision (full page snapshot + who + when)
--   · status: pending → published (or rejected); publishing moves the page's
--     published_rev pointer — THE version readers are served
--   · revert = a NEW published revision copied from an old one (history stays
--     linear and complete, exactly like Wikipedia)
--   · the `sections` table remains the WORKING COPY the builder edits;
--     revisions are the history; pages.published_rev is the public truth
-- ════════════════════════════════════════════════════════════════════

create table if not exists public.revisions (
  id            bigint generated always as identity primary key,
  wiki_id       text not null,
  page_id       text not null,
  doc           jsonb not null,                -- the FULL PageDoc snapshot
  author        uuid default auth.uid() references auth.users(id) on delete set null,
  author_email  text,                          -- denormalized for display
  status        text not null default 'pending'
                check (status in ('pending','published','rejected')),
  note          text,                          -- save note / reject reason / revert marker
  reviewed_by   uuid,
  reviewed_email text,
  reviewed_at   timestamptz,
  created_at    timestamptz not null default now(),
  foreign key (wiki_id, page_id) references public.pages(wiki_id, id) on delete cascade
);
create index if not exists revisions_by_page on public.revisions (wiki_id, page_id, id desc);

alter table public.pages add column if not exists published_rev bigint;

-- fill author_email automatically from the signer's profile
create or replace function public.revision_fill_author()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.author_email is null then
    new.author_email := coalesce((select email from public.profiles where id = new.author), 'system');
  end if;
  return new;
end $$;
drop trigger if exists revisions_fill_author on public.revisions;
create trigger revisions_fill_author before insert on public.revisions
  for each row execute function public.revision_fill_author();

-- ── who may APPROVE (publish/reject/revert) in wiki W: admin, or W's curator ──
create or replace function public.is_approver(w text) returns boolean
language sql security definer stable set search_path = public as $$
  select public.my_role() = 'admin'
      or (public.my_role() = 'contributor' and public.my_class() = 'curator' and public.my_wiki() = w);
$$;

-- pages.published_rev may ONLY move through the definer functions below
create or replace function public.guard_published_rev()
returns trigger language plpgsql as $$
begin
  if new.published_rev is distinct from old.published_rev
     and coalesce(current_setting('vizi.publishing', true), '') <> '1' then
    raise exception 'published_rev changes only via publish_revision / revert_to';
  end if;
  return new;
end $$;
drop trigger if exists pages_guard_published on public.pages;
create trigger pages_guard_published before update on public.pages
  for each row execute function public.guard_published_rev();

-- ── publish: approver blesses a revision → readers serve it ──────────
create or replace function public.publish_revision(rid bigint) returns void
language plpgsql security definer set search_path = public as $$
declare r record;
begin
  select * into r from public.revisions where id = rid;
  if r is null then raise exception 'no such revision'; end if;
  if not public.is_approver(r.wiki_id) then raise exception 'not an approver for %', r.wiki_id; end if;
  update public.revisions set status = 'published',
    reviewed_by = auth.uid(),
    reviewed_email = coalesce((select email from public.profiles where id = auth.uid()), 'system'),
    reviewed_at = now()
    where id = rid;
  perform set_config('vizi.publishing', '1', true);
  update public.pages set published_rev = rid where wiki_id = r.wiki_id and id = r.page_id;
end $$;

-- ── reject: approver declines a pending revision (reason in note) ────
create or replace function public.reject_revision(rid bigint, reason text default null) returns void
language plpgsql security definer set search_path = public as $$
declare r record;
begin
  select * into r from public.revisions where id = rid;
  if r is null then raise exception 'no such revision'; end if;
  if not public.is_approver(r.wiki_id) then raise exception 'not an approver for %', r.wiki_id; end if;
  update public.revisions set status = 'rejected',
    note = coalesce(reason, note),
    reviewed_by = auth.uid(),
    reviewed_email = coalesce((select email from public.profiles where id = auth.uid()), 'system'),
    reviewed_at = now()
    where id = rid;
end $$;

-- ── revert: copy an old revision's doc into a NEW published revision and
--    make it the working copy (linear history, Wikipedia-style) ────────
create or replace function public.revert_to(rid bigint) returns bigint
language plpgsql security definer set search_path = public as $$
declare r record; newid bigint;
begin
  select * into r from public.revisions where id = rid;
  if r is null then raise exception 'no such revision'; end if;
  if not public.is_approver(r.wiki_id) then raise exception 'not an approver for %', r.wiki_id; end if;
  -- the working copy becomes the reverted doc
  delete from public.sections where wiki_id = r.wiki_id and page_id = r.page_id;
  insert into public.sections (wiki_id, page_id, position, component, data) values
    (r.wiki_id, r.page_id, 0, 'hero', coalesce(r.doc->'hero', '{}'::jsonb)),
    (r.wiki_id, r.page_id, 1, 'overview', coalesce(r.doc->'overview', '{}'::jsonb));
  insert into public.sections (wiki_id, page_id, position, component, data)
  select r.wiki_id, r.page_id, 1 + ord, elem->>'type', coalesce(elem->'data', '{}'::jsonb)
  from jsonb_array_elements(coalesce(r.doc->'sections', '[]'::jsonb)) with ordinality as t(elem, ord);
  -- the revert itself is a new, immediately-published revision
  insert into public.revisions (wiki_id, page_id, doc, status, note, reviewed_by, reviewed_email, reviewed_at)
  values (r.wiki_id, r.page_id, r.doc, 'published', 'revert to #' || rid, auth.uid(),
          coalesce((select email from public.profiles where id = auth.uid()), 'system'), now())
  returning id into newid;
  perform set_config('vizi.publishing', '1', true);
  update public.pages set published_rev = newid where wiki_id = r.wiki_id and id = r.page_id;
  return newid;
end $$;

-- ── RLS: history is PUBLIC (Wikipedia-style transparency); contributors
--    append; only approvers change status (and only via the functions) ──
alter table public.revisions enable row level security;
drop policy if exists "read revisions"    on public.revisions;
drop policy if exists "append revisions"  on public.revisions;
drop policy if exists "review revisions"  on public.revisions;
create policy "read revisions" on public.revisions for select using (true);
create policy "append revisions" on public.revisions for insert
  with check (public.can_write_wiki(wiki_id));
create policy "review revisions" on public.revisions for update
  using (public.is_approver(wiki_id)) with check (true);

grant select, insert, update on public.revisions to anon, authenticated;

-- ── backfill: every existing page gets one PUBLISHED revision built from
--    its current working copy, so the reader keeps serving what it serves ──
insert into public.revisions (wiki_id, page_id, doc, status, author_email, note)
select s.wiki_id, s.page_id,
  jsonb_build_object(
    'hero',     coalesce((select h.data from public.sections h where h.wiki_id = s.wiki_id and h.page_id = s.page_id and h.position = 0), '{}'::jsonb),
    'overview', coalesce((select o.data from public.sections o where o.wiki_id = s.wiki_id and o.page_id = s.page_id and o.position = 1), '{}'::jsonb),
    'sections', coalesce((select jsonb_agg(jsonb_build_object('type', b.component, 'data', b.data) order by b.position)
                          from public.sections b where b.wiki_id = s.wiki_id and b.page_id = s.page_id and b.position >= 2), '[]'::jsonb)
  ),
  'published', 'system', 'backfilled from the working copy (phase-3 migration)'
from (select distinct wiki_id, page_id from public.sections) s
where not exists (select 1 from public.revisions r where r.wiki_id = s.wiki_id and r.page_id = s.page_id);

select set_config('vizi.publishing', '1', false);   -- the backfill may move the pointer
update public.pages p
set published_rev = (select max(r.id) from public.revisions r
                     where r.wiki_id = p.wiki_id and r.page_id = p.id and r.status = 'published')
where p.published_rev is null;
select set_config('vizi.publishing', '', false);
