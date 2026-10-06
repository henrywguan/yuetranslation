# Javanese / Basa Jawa

Target variety for JyutTranslate when lang code is **`jv`**: **colloquial Javanese (Basa Jawa)** as spoken in Central/East Java media — **Latin script** (not Hanacaraka) to match Azure TTS/STT.

Azure Speech locale: **`jv-ID`** (TTS `jv-ID-SitiNeural`, `jv-ID-DimasNeural`).

## Product rules

- **Latin orthography only.** Compact UI shows Latin Javanese alone — no invented tone digits, no Chinese characters, no Chao tone letters, no IPA dump, no Hanacaraka by default.
- **Do not default to Indonesian** wording when Javanese differs (e.g. `suwun` / `matur nuwun` not `terima kasih`).
- **Register / undha-usuk:** ngoko by default for casual English (`inferJavaneseRegister`); more respectful (madya/krama-leaning) when the English source looks legal / medical / official.
- **Details:** speech-level honesty chips (`ngoko` / `madya` / `krama` / `mixed`) when pronouns or negation cue a level — the key pedagogy differentiator vs Indonesian.
- **iPhone STT:** Web Speech (`jv-ID` / `jv`). Do **not** add to `appleNeedsAzureStt`.
- **Not in `PRIMARY_LANGS`** (no BiText gloss pass).

## Compact vs detailed

- **Compact** (Solo / Conversation / Cam): Latin Javanese only (`lang="jv"`).
- **Details:** optional undha-usuk level chip + honesty note via `JvText` `showDetail` (`javaneseHonesty.ts`).

## Implementation status

**Shipped** — `Lang` code `jv` is wired end-to-end: Solo, Conversation, Cam, breakdown, TTS prefs, mirroring the `id` / `ms` Latin-orthography paths with undha-usuk pedagogy.

- Register inference: `apps/api/src/javaneseRegister.ts` (`inferJavaneseRegister`)
- Translation: `apps/api/src/translateJavanese.ts` — ngoko Basa Jawa by default; respectful when source is official; no Chinese / Chao / IPA / ASCII tone digits
- Cam: `apps/api/src/translateCamera.ts` (`isJavaneseTarget`) — dedicated Javanese system prompt; rejects Han in Javanese output
- Compact + Details: `apps/web/src/components/JvText.tsx` + `apps/web/src/lib/javaneseHonesty.ts`
- Conversation copy: `CONVERSATION_PANE_UI.jv` in `apps/web/src/lib/conversationUi.ts`
- Pedagogy / enrich: `DETAIL_PEDAGOGY.jv` · `ENRICH_META.jv` in `apps/api/src/detailsEnrich.ts`
- Azure: `jv-ID` STT/TTS; prefs via `tts_voice_jv` (`supabase/migrations/038_tts_voice_scaffold_12.sql`)
- Phrase seeds: EN↔jv pairs tagged `javanese` in `apps/api/src/canto/data/phrases.json`
