# Dutch / Nederlands (Netherlands)

Target variety for JyutTranslate when lang code is **`nl`**: colloquial **standard Dutch** (Netherlands / nl-NL). Not Belgian Dutch (Flemish) as the primary default; mutual intelligibility is fine.

Azure Speech locale: **`nl-NL`** (TTS `nl-NL-FennaNeural`, `nl-NL-MaartenNeural`).

## Product rules

- **Not a tone language.** Do not invent Cantonese-style ASCII tone digits, Chao tone letters, or IPA dumps on Solo / Conversation / Cam lines.
- **Writing:** correct Dutch orthography (`ij`, `oe`, `ui`, long vowels, diaeresis where required). Compact = Dutch only (`lang="nl-NL"`).
- **Register:** colloquial by default (je / jij / everyday); formal (u / more careful) when the English source looks legal / medical / official (`dutchRegister.ts`).
- **Details:** light learner help — je/u address chip when detectable, plus a short spelling / reduction honesty note. No Chao/IPA on compact or forced into Details.

## Compact vs detailed

- **Compact** (Solo / Conversation / Cam): Netherlands Dutch orthography only. No IPA, Chao, or register chips.
- **Details:** same Dutch line, plus je/u chip when pronouns are detectable (`dutchPedagogy.ts`) and a short honesty note. No Chao. No IPA dump.
- **Register (pipeline):** colloquial by default; formal when source looks legal/medical/official.

## Implementation status

**Shipped** — `Lang` code `nl` is wired end-to-end: Solo, Conversation, Cam, breakdown, TTS prefs, Account Hub voice settings. Not in `PRIMARY_LANGS` (no full BiText gloss pass).

- Register: `apps/api/src/dutchRegister.ts`
- Translation: `translateDutch` in `apps/api/src/translateDutch.ts`
- Compact / Details UI: `apps/web/src/components/NlText.tsx`
- Pedagogy: `apps/web/src/lib/dutchPedagogy.ts`
- Smoke: `npx tsx apps/web/src/lib/dutchPedagogy.smoke.ts` · `npx tsx apps/api/src/dutchRegister.smoke.ts`
- Azure: `nl-NL` STT/TTS; iPhone stays on Web Speech (not in `appleNeedsAzureStt`)
- Prefs: `tts_voice_nl` (`supabase/migrations/038_tts_voice_scaffold_12.sql`)
