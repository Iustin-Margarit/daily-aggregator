-- =============================================================================
-- profiles.avatar_color is unused: the seal is printed in the reader's accent ink
-- since 2026-11-17 and nothing reads or writes the column any more (the live code
-- included), so it goes, with its check constraint and its column grant.
-- =============================================================================

alter table public.profiles drop constraint if exists profiles_avatar_color_format;
alter table public.profiles drop column if exists avatar_color;
