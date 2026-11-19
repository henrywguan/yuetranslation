# Tamil / தமிழ்

Target variety for JyutTranslate when lang code is **`ta`**: everyday spoken **Tamil** (India, ta-IN). Colloquial by default — not literary செந்தமிழ் — and never Tanglish (Latin) as the main line.

Azure Speech locale: **`ta-IN`** (TTS `ta-IN-PallaviNeural` default, `ta-IN-ValluvarNeural`).

## Product rules

- **Not a tone language.** No Cantonese-style tone digits, Chao tone letters, tone chips, or IPA dumps on Solo / Conversation / Cam lines.
- **Writing:** Tamil script only (`\u0B80-\u0BFF`). No Tanglish / Latin transliteration as the primary line, no Han. Client and server both reject payloads without Tamil script.
- **Register:** colloquial spoken Tamil by default (நீங்க / நீ as natural); when the English source looks legal / medical / official (`tamilRegister.ts`), use respectful **நீங்கள்** and careful standard wording.
- **Cam:** natural Tamil signage wording, Tamil script only.

## Compact vs detailed

- **Compact** (Solo / Conversation / Cam): Tamil script only via `TaText` (`lang="ta-IN"`). No romanization, tone, or register chips.
- **Details:** optional **ISO 15919** romanization (`tamilIso15919.ts` — reading aid only, never the main line), a நீங்கள் / நீ address chip when detectable, and an honesty note (spoken vs written Tamil; not tonal).
- **Breakdown:** local Tamil word splitter with a Tamil-specific LLM path in `apps/api/src/breakdown.ts`.

## Implementation status

**Scaffolded** — `Lang` code `ta` is wired through Solo, Conversation, Cam, Docs, breakdown, TTS prefs, Account Hub voice settings, and `PRIMARY_LANGS`.

- Register: `apps/api/src/tamilRegister.ts`
- Translation: `translateTamil` (`apps/api/src/translateTamil.ts`), routed from `apps/api/src/translate.ts`
- Client guard: `sanitizeTaTranslation` in `apps/web/src/lib/translationGuard.ts`
- Compact / Details UI: `apps/web/src/components/TaText.tsx`
- Pedagogy: `apps/web/src/lib/tamilPedagogy.ts` · romanization: `apps/web/src/lib/tamilIso15919.ts`
- Smoke: `npx tsx apps/web/src/lib/tamil.smoke.ts` · `npx tsx apps/api/src/tamilRegister.smoke.ts` · `npx tsx apps/web/src/components/batch1Text.smoke.ts`
- Azure: `ta-IN` STT/TTS; iPhone stays on Web Speech (not in `appleNeedsAzureStt`)
- Prefs: `tts_voice_ta` + `primary_lang` (`supabase/migrations/043_tts_voice_batch1_ta_ptpt_tr_bn.sql`)

## Known gaps

- No Account Hub primary UI glosses yet (`primaryUiGloss.data.ts` TODO) — BiText falls back to English-only chrome.
- No phrase / dictionary seeds; translations come from the LLM path.
- iPhone Safari Web Speech support for `ta-IN` is unverified on device.
- TTS loudness equalize gain (`packages/yue-shared/src/ttsVolumeEqualize.ts`) is an untuned starting value.
