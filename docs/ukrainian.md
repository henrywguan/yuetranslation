# Ukrainian / Українська

Target variety for JyutTranslate when lang code is **`uk`**: everyday standard **Ukrainian** (українська) as used in Ukraine — never Russian or surzhyk. Strictly separate from Russian: own prompts, own voices, own script gate.

Azure Speech locale: **`uk-UA`** (TTS `uk-UA-PolinaNeural` default, `uk-UA-OstapNeural`).

## Product rules

- **Not a tone language.** No Cantonese-style tone digits, Chao tone letters, tone chips, or IPA dumps on Solo / Conversation / Cam lines.
- **Writing:** Ukrainian Cyrillic (і ї є ґ, apostrophe ʼ). Never Russian letters (ы э ъ ё), never Latin as the main line, no stress marks. Client and server reject payloads without Cyrillic or with Russian-only letters.
- **Register:** colloquial by default (**ти**); formal English gets **Ви** address.
- **Cam:** natural Ukrainian signage wording, same script rules.

## Compact vs detailed

- **Compact** (Solo / Conversation / Cam): Cyrillic only (no Latin) via `LangFamilyText` → `CyrillicText` (`lang="uk-UA"`). No romanization, tone, or register chips.
- **Details:** an optional Latin reading in the Ukrainian national system (Київ → Kyiv), a ти / Ви chip when detectable, and an honesty note.
- **Breakdown:** local word splitter with a Ukrainian-specific LLM path in `apps/api/src/breakdown.ts`.

## Implementation status

**Shipped (Batch 2)** — `Lang` code `uk` is wired through Solo, Conversation, Cam, Docs, breakdown, TTS prefs, Account Hub voice settings, and `PRIMARY_LANGS`.

- Register: `inferSourceRegister` in `apps/api/src/voiceLangRegister.ts`
- Translation: `translateUkrainian` (`apps/api/src/translateUkrainian.ts`, built on `makeVoicePairTranslator`), routed from `apps/api/src/translate.ts`
- Client guard: `sanitizeUkTranslation` in `apps/web/src/lib/translationGuard.ts`
- Compact / Details UI: `apps/web/src/components/LangFamilyText.tsx`
- Pedagogy: `apps/web/src/lib/cyrillicPedagogy.ts`
- Smoke: `npx tsx apps/api/src/voiceLangRegister.smoke.ts` · `npx tsx apps/web/src/lib/batch2Pedagogy.smoke.ts` · `npx tsx --tsconfig apps/web/tsconfig.app.json apps/web/src/components/batch2Text.smoke.ts`
- Azure: `uk-UA` STT/TTS; iPhone stays on Web Speech (not in `appleNeedsAzureStt`)
- Prefs: `tts_voice_uk` + `primary_lang` (`supabase/migrations/044_tts_voice_batch2.sql`)

## Known gaps

- Stress marks are not generated — Details explains that stress is free and unmarked.
- No Account Hub primary UI glosses yet (`primaryUiGloss.data.ts` TODO) — BiText falls back to English-only chrome.
- No phrase / dictionary seeds; translations come from the LLM path.
- iPhone Safari Web Speech support for `uk-UA` is unverified on device.
- TTS loudness equalize gain (`packages/yue-shared/src/ttsVolumeEqualize.ts`) is an untuned starting value.
