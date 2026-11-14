-- New readers who arrive through "Continue with Google" get their first name as the byline
-- ("Good evening, Ana") instead of the part of their e-mail address before the @.
-- Order: the username chosen at sign-up, then the Google first name / full name,
-- then the e-mail prefix. Accents are folded (María -> Maria) because bylines are
-- limited to A-Z, 0-9, _ . -; a name that leaves fewer than 3 letters (or none, in
-- a non-Latin script) falls back to the e-mail prefix. Readers can change it later.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_name text;
  v_base text;
  v_username text;
  v_attempt integer := 0;
begin
  v_base := nullif(btrim(v_meta ->> 'username'), '');

  if v_base is null then
    -- The first word of the name Google sends, with accents folded.
    v_name := split_part(btrim(coalesce(nullif(btrim(v_meta ->> 'given_name'), ''),
                                        nullif(btrim(v_meta ->> 'full_name'), ''),
                                        nullif(btrim(v_meta ->> 'name'), ''), '')), ' ', 1);
    v_name := replace(replace(replace(replace(replace(v_name,
                'ß', 'ss'), 'Æ', 'AE'), 'æ', 'ae'), 'Œ', 'OE'), 'œ', 'oe');
    v_name := translate(v_name,
      'ÀÁÂÃÄÅàáâãäåĀāĂăĄąÇçĆćČčĎďÈÉÊËèéêëĒēĖėĘęĚěÌÍÎÏìíîïĪīĮįŁłÑñŃńŇňÒÓÔÕÖØòóôõöøŌōŐőŘřŚśŞşȘșŠšŢţȚțŤťÙÚÛÜùúûüŪūŮůŰűÝýÿŹźŻżŽž',
      'AAAAAAaaaaaaAaAaAaCcCcCcDdEEEEeeeeEeEeEeEeIIIIiiiiIiIiLlNnNnNnOOOOOOooooooOoOoRrSsSsSsSsTtTtTtUUUUuuuuUuUuUuYyyZzZzZz');
    v_name := regexp_replace(v_name, '[^A-Za-z0-9_.-]', '', 'g');
    if char_length(v_name) >= 3 then
      v_base := v_name;
    end if;
  end if;

  v_base := coalesce(v_base, split_part(coalesce(new.email, ''), '@', 1));
  v_base := left(regexp_replace(v_base, '[^A-Za-z0-9_.-]', '', 'g'), 24);
  if char_length(v_base) < 3 or public.is_reserved_username(v_base) then
    v_base := left(v_base, 17) || '_reader';
  end if;
  v_username := v_base;

  loop
    begin
      insert into public.profiles (id, username) values (new.id, v_username);
      exit;
    exception when unique_violation then
      v_attempt := v_attempt + 1;
      if v_attempt > 25 then
        raise;
      end if;
      v_username := left(v_base, 24) || (1000 + floor(random() * 9000))::int::text;
    end;
  end loop;

  return new;
end;
$$;

-- Only the trigger calls it (as before).
revoke all on function public.handle_new_user() from public, anon, authenticated;
