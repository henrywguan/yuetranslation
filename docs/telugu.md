# Telugu / తెలుగు

Target variety for JyutTranslate when lang code is **`te`**: everyday spoken **Telugu** (తెలుగు) as used in Andhra Pradesh / Telangana — readable modern Telugu, not stiff గ్రాంథికం.

Azure Speech locale: **`te-IN`** (TTS `te-IN-ShrutiNeural` default, `te-IN-MohanNeural`).

## Product rules

- **Not a tone language.** No Cantonese-style tone digits, Chao tone letters, tone chips, or IPA dumps on Solo / Conversation / Cam lines.
- **Writing:** Telugu script only (`\u0C00-\u0C7F`). No Latin / Tenglish main line, never Kannada, Tamil, Bengali, or Devanagari letters. Client and server reject payloads without Telugu script.
- **Register:** colloquial by default (నువ్వు / మీరు as natural); formal English (`voiceLangRegister.ts`) gets respectful **మీరు** and careful wording.
- **Cam:** natural Telugu signage wording, same script rules.

## Compact vs detailed

- **Compact** (Solo / Conversation / Cam): Telugu script only via `LangFamilyText` → `IndicText` (`lang="te-IN"`). No romanization, tone, or register chips.
- **Details:** optional **ISO 15919** reading (`indicIso15919.ts` — short e/o vs long ē/ō, ḷ ṟ), a మీరు / నువ్వు address chip when detectable, and an honesty note.
- **Breakdown:** local word splitter with a Telugu-specific LLM path in `apps/api/src/breakdown.ts`.

## Implementation status

**Shipped (Batch 2)** — `Lang` code `te` is wired through Solo, Conversation, Cam, Docs, breakdown, TTS prefs, Account Hub voice settings, and `PRIMARY_LANGS`.

- Register: `inferSourceRegister` in `apps/api/src/voiceLangRegister.ts`
- Translation: `translateTelugu` (`apps/api/src/translateTelugu.ts`, built on `makeVoicePairTranslator`), routed from `apps/api/src/translate.ts`
- Client guard: `sanitizeTeTranslation` in `apps/web/src/lib/translationGuard.ts`
- Compact / Details UI: `apps/web/src/components/LangFamilyText.tsx`
- Pedagogy: `apps/web/src/lib/indicPedagogy.ts` · romanization: `apps/web/src/lib/indicIso15919.ts`
- Smoke: `npx tsx apps/api/src/voiceLangRegister.smoke.ts` · `npx tsx apps/web/src/lib/batch2Pedagogy.smoke.ts` · `npx tsx --tsconfig apps/web/tsconfig.app.json apps/web/src/components/batch2Text.smoke.ts`
- Azure: `te-IN` STT/TTS; iPhone stays on Web Speech (not in `appleNeedsAzureStt`)
- Prefs: `tts_voice_te` + `primary_lang` (`supabase/migrations/044_tts_voice_batch2.sql`)

## Known gaps

- No Account Hub primary UI glosses yet (`primaryUiGloss.data.ts` TODO) — BiText falls back to English-only chrome.
- No phrase / dictionary seeds; translations come from the LLM path.
- iPhone Safari Web Speech support for `te-IN` is unverified on device.
- TTS loudness equalize gain (`packages/yue-shared/src/ttsVolumeEqualize.ts`) is an untuned starting value.
