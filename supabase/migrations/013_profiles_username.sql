-- Account Hub username (unique, once-per-hour change cooldown).
alter table public.profiles
  add column if not exists username text;

alter table public.profiles
  add column if not exists username_changed_at timestamptz;

-- Case-insensitive uniqueness; null usernames allowed (not yet set).
create unique index if not exists profiles_username_lower_uidx
  on public.profiles (lower(username))
  where username is not null;

alter table public.profiles
  drop constraint if exists profiles_username_format;

alter table public.profiles
  add constraint profiles_username_format
  check (
    username is null
    or (
      char_length(username) between 3 and 24
      and username ~ '^[A-Za-z0-9][A-Za-z0-9._-]*$'
    )
  );
