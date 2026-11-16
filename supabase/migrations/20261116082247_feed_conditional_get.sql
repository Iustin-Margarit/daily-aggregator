-- Conditional GET for feeds: the ingestion job sends the validators a feed gave last time
-- (If-None-Match / If-Modified-Since). A "304 Not Modified" answer means nothing changed:
-- no download, no parsing, no database writes for that paper.
--
-- Written and read only by the ingestion job (service role). The column grants on
-- public.sources (baseline) do not include these columns, so visitors and readers
-- cannot see them; admin_list_sources() does not return them either.

alter table public.sources
  add column etag text,
  add column last_modified text;

comment on column public.sources.etag is 'ETag the feed sent on its last full download (sent back as If-None-Match).';
comment on column public.sources.last_modified is 'Last-Modified the feed sent on its last full download (sent back as If-Modified-Since).';

-- A new feed address starts fresh: the old validators belong to the old address.
create function public.sources_forget_validators()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.rss_url is distinct from old.rss_url then
    new.etag := null;
    new.last_modified := null;
  end if;
  return new;
end;
$$;

create trigger sources_forget_validators
  before update of rss_url on public.sources
  for each row execute function public.sources_forget_validators();
