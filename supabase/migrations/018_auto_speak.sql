-- Cross-device Auto-speak preference (Account Hub toggle).
alter table public.profiles
  add column if not exists auto_speak boolean not null default false;

comment on column public.profiles.auto_speak is
  'User preference: automatically speak translations after they land (Family/Business entitlement still gates playback).';
