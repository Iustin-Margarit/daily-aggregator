-- Saved stories are organised by folders only (V2.1): the reader's personal
-- notes are gone, so their column goes too (its length check goes with it).
-- get_saved_articles() returned the column, so it is rebuilt without it; a
-- change of return type needs drop + create, and the new function starts
-- locked (default privileges revoked in 2.2.1), hence the grant again.

drop function public.get_saved_articles();

alter table public.saved_articles drop column notes;

create function public.get_saved_articles()
returns table (
  article_id uuid,
  title text,
  summary text,
  url text,
  slug text,
  image_url text,
  published_at timestamptz,
  reading_minutes smallint,
  source_id uuid,
  source_name text,
  source_enabled boolean,
  category_id uuid,
  category_name text,
  folder_id uuid,
  is_read boolean,
  saved_at timestamptz
)
language sql
stable
set search_path = ''
as $$
  select a.id, a.title, a.summary, a.url, a.slug, a.image_url, a.published_at, a.reading_minutes,
         a.source_id, s.name, s.is_enabled, s.category_id, c.name,
         sa.folder_id, sa.is_read, sa.saved_at
    from public.saved_articles sa
    join public.articles a on a.id = sa.article_id
    join public.sources s on s.id = a.source_id
    join public.categories c on c.id = s.category_id
   where sa.user_id = (select auth.uid())
   order by sa.saved_at desc;
$$;

revoke execute on function public.get_saved_articles() from public;
grant execute on function public.get_saved_articles() to authenticated;
