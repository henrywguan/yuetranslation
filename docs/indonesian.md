# Indonesian / Bahasa Indonesia

Target variety for JyutTranslate when lang code is **`id`**: **standard Indonesian (Bahasa Indonesia)** with Jakarta/media colloquial register by default — not regional Malay, not formal bureaucratic Indonesian unless the English source is formal.

Azure Speech locale: **`id-ID`** (TTS `id-ID-GadisNeural`, `id-ID-ArdiNeural`).

## Product rules

- **Latin orthography only.** Compact UI shows Indonesian text alone — no invented tone digits, no Chinese characters, no Chao tone letters, no IPA dump.
- **Register:** colloquial by default (`inferIndonesianRegister`); formal when the English source looks legal / medical / official (same pattern as Tagalog / Korean).
- **Details:** light learner honesty — informal vs formal pronouns (`kamu`/`Anda`, `aku`/`saya`) and casual particles (`dong`/`deh`/`sih`) when present. Keep lean like Tagalog; no Chao/IPA on compact.
- **iPhone STT:** Web Speech (`id-ID` / `id`). Do **not** add to `appleNeedsAzureStt`.
- **Not in `PRIMARY_LANGS`** (no BiText gloss pass).

## Compact vs detailed

- **Compact** (Solo / Conversation / Cam): Indonesian Latin only (`lang="id"`).
- **Details:** optional register chip + particle chips + honesty note via `IdText` `showDetail` (`indonesianHonesty.ts`).

## Implementation status

**Shipped** — `Lang` code `id` is wired end-to-end: Solo, Conversation, Cam, breakdown, TTS prefs, mirroring the `tl` / `vi` Latin-orthography paths.

- Register inference: `apps/api/src/indonesianRegister.ts` (`inferIndonesianRegister`)
- Translation: `apps/api/src/translateIndonesian.ts` — colloquial Bahasa Indonesia, formal when source is official; no Chinese / Chao / IPA / ASCII tone digits
- Cam: `apps/api/src/translateCamera.ts` (`isIndonesianTarget`) — dedicated Indonesian system prompt; rejects Han in Indonesian output
- Compact + Details: `apps/web/src/components/IdText.tsx` + `apps/web/src/lib/indonesianHonesty.ts`
- Conversation copy: `CONVERSATION_PANE_UI.id` in `apps/web/src/lib/conversationUi.ts`
- Pedagogy / enrich: `DETAIL_PEDAGOGY.id` · `ENRICH_META.id` in `apps/api/src/detailsEnrich.ts`
- Azure: `id-ID` STT/TTS; prefs via `tts_voice_id` (`supabase/migrations/038_tts_voice_scaffold_12.sql`)
- Phrase seeds: EN↔id pairs tagged `indonesian` in `apps/api/src/canto/data/phrases.json`
