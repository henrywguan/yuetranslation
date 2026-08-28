-- Assignable user roles (admin panel). Panel access also checks YUE_ADMIN_EMAILS.
alter table public.profiles
  add column if not exists role text
  check (role is null or role in ('admin', 'family'));

create index if not exists profiles_role_idx on public.profiles (role)
  where role is not null;
