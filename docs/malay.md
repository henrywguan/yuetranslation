# Malay / Bahasa Melayu

Target variety for JyutTranslate when lang code is **`ms`**: **standard Malay (Bahasa Melayu)** with Malaysia (**ms-MY**) colloquial register by default — not Indonesian (`id`), not Brunei/Singapore-only slang unless natural.

Azure Speech locale: **`ms-MY`** (TTS `ms-MY-YasminNeural`, `ms-MY-OsmanNeural`).

## Product rules

- **Latin orthography only.** Compact UI shows Malay text alone — no invented tone digits, no Chinese characters, no Chao tone letters, no IPA dump.
- **Register:** colloquial by default (`inferMalayRegister`); formal when the English source looks legal / medical / official (same pattern as Tagalog / Indonesian).
- **Details:** light learner honesty — informal vs formal pronouns (`kau`/`anda`, `aku`/`saya`) and casual particles (`lah`/`je`/`kan`) when present. Keep lean like Tagalog; no Chao/IPA on compact.
- **iPhone STT:** Web Speech (`ms-MY` / `ms`). Do **not** add to `appleNeedsAzureStt`.
- **Not in `PRIMARY_LANGS`** (no BiText gloss pass).
- Prompts must say **Malay / Malaysia** — never conflate with Indonesian.

## Compact vs detailed

- **Compact** (Solo / Conversation / Cam): Malay Latin only (`lang="ms"`).
- **Details:** optional register chip + particle chips + honesty note via `MsText` `showDetail` (`malayHonesty.ts`).

## Implementation status

**Shipped** — `Lang` code `ms` is wired end-to-end: Solo, Conversation, Cam, breakdown, TTS prefs, mirroring the `tl` / `id` Latin-orthography paths.

- Register inference: `apps/api/src/malayRegister.ts` (`inferMalayRegister`)
- Translation: `apps/api/src/translateMalay.ts` — colloquial Bahasa Melayu (Malaysia), formal when source is official; no Chinese / Chao / IPA / ASCII tone digits
- Cam: `apps/api/src/translateCamera.ts` (`isMalayTarget`) — dedicated Malay system prompt; rejects Han in Malay output
- Compact + Details: `apps/web/src/components/MsText.tsx` + `apps/web/src/lib/malayHonesty.ts`
- Conversation copy: `CONVERSATION_PANE_UI.ms` in `apps/web/src/lib/conversationUi.ts`
- Pedagogy / enrich: `DETAIL_PEDAGOGY.ms` · `ENRICH_META.ms` in `apps/api/src/detailsEnrich.ts`
- Azure: `ms-MY` STT/TTS; prefs via `tts_voice_ms` (`supabase/migrations/038_tts_voice_scaffold_12.sql`)
- Phrase seeds: EN↔ms pairs tagged `malay` in `apps/api/src/canto/data/phrases.json`
