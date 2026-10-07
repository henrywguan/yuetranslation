# Italian / Italiano

Target variety for JyutTranslate when lang code is **`it`**: colloquial **standard Italian** (Italia / it-IT). Not regional dialect (Neapolitan, Sicilian, …) as the default line.

Azure Speech locale: **`it-IT`** (TTS `it-IT-ElsaNeural`, `it-IT-DiegoNeural`).

## Product rules

- **Not a tone language.** Do not invent Cantonese-style ASCII tone digits, Chao tone letters, or IPA dumps on Solo / Conversation / Cam lines.
- **Writing:** correct Italian orthography with accents where needed (`è`, `é`, `à`, `ì`, `ò`, `ù`, …). Compact = Italian only (`lang="it-IT"`).
- **Register:** colloquial by default (tu / everyday); formal (Lei / more careful) when the English source looks legal / medical / official (`italianRegister.ts`).
- **Details:** light learner help — tu/Lei address chip when detectable, plus a short honesty note (elision + accents). No Chao/IPA on compact or forced into Details.

## Compact vs detailed

- **Compact** (Solo / Conversation / Cam): accented standard Italian only. No IPA, Chao, or register chips.
- **Details:** same Italian line, plus tu/Lei chip when pronouns are detectable (`italianPedagogy.ts`) and a short honesty note. No Chao. No IPA dump.
- **Register (pipeline):** colloquial by default; formal when source looks legal/medical/official.

## Implementation status

**Shipped** — `Lang` code `it` is wired end-to-end: Solo, Conversation, Cam, breakdown, TTS prefs, Account Hub voice settings. Not in `PRIMARY_LANGS` (no full BiText gloss pass).

- Register: `apps/api/src/italianRegister.ts`
- Translation: `translateItalian` in `apps/api/src/translate.ts`
- Compact / Details UI: `apps/web/src/components/ItText.tsx`
- Pedagogy: `apps/web/src/lib/italianPedagogy.ts`
- Smoke: `npx tsx apps/web/src/lib/italianPedagogy.smoke.ts` · `npx tsx apps/api/src/italianRegister.smoke.ts`
- Azure: `it-IT` STT/TTS; iPhone stays on Web Speech (not in `appleNeedsAzureStt`)
- Prefs: `tts_voice_it` (`supabase/migrations/038_tts_voice_scaffold_12.sql`)
