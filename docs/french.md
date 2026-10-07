# French / Français (France)

Target variety for JyutTranslate when lang code is **`fr`**: colloquial **Metropolitan French** (France / fr-FR). Not Quebec-primary (`fr-CA`) unless naturally overlapping; do not market as Canadian French.

Azure Speech locale: **`fr-FR`** (TTS `fr-FR-DeniseNeural`, `fr-FR-HenriNeural`).

## Product rules

- **Not a tone language.** Do not invent Cantonese-style ASCII tone digits, Chao tone letters, or IPA dumps on Solo / Conversation / Cam lines.
- **Writing:** correct French orthography with accents (`é`, `è`, `ê`, `ç`, …). Compact = French only (`lang="fr-FR"`).
- **Register:** colloquial by default (tu / everyday); formal (vous / more careful) when the English source looks legal / medical / official (`frenchRegister.ts`).
- **Details:** light learner help — tu/vous address chip when detectable, plus a short liaison / mute-e honesty note. No Chao/IPA on compact or forced into Details.

## Compact vs detailed

- **Compact** (Solo / Conversation / Cam): accented Metropolitan French only. No IPA, Chao, or register chips.
- **Details:** same French line, plus tu/vous chip when pronouns are detectable (`frenchPedagogy.ts`) and a short honesty note (liaison + mute e). No Chao. No IPA dump.
- **Register (pipeline):** colloquial by default; formal when source looks legal/medical/official.

## Implementation status

**Shipped** — `Lang` code `fr` is wired end-to-end: Solo, Conversation, Cam, breakdown, TTS prefs, Account Hub voice settings. Not in `PRIMARY_LANGS` (no full BiText gloss pass).

- Register: `apps/api/src/frenchRegister.ts`
- Translation: `translateFrench` in `apps/api/src/translate.ts`
- Compact / Details UI: `apps/web/src/components/FrText.tsx`
- Pedagogy: `apps/web/src/lib/frenchPedagogy.ts`
- Smoke: `npx tsx apps/web/src/lib/frenchPedagogy.smoke.ts` · `npx tsx apps/api/src/frenchRegister.smoke.ts`
- Azure: `fr-FR` STT/TTS; iPhone stays on Web Speech (not in `appleNeedsAzureStt`)
- Prefs: `tts_voice_fr` (`supabase/migrations/038_tts_voice_scaffold_12.sql`)
