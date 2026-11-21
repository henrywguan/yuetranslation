-- DeepSeek chat companion prefs (names, trait, notes, sound, character, celebrate).
alter table public.profiles
  add column if not exists chat_deep_avatar jsonb;

comment on column public.profiles.chat_deep_avatar is
  'JyutTranslate #/chat companion blob: character, celebrateMode, names, trait, notes, soundEnabled, updatedAt';
