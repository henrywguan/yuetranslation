# Russian / Русский

Target variety for JyutTranslate when lang code is **`ru`**: everyday **Russian** (русский) as used in Russia. Strictly separate from Ukrainian: own prompts, own voices, own script gate.

Azure Speech locale: **`ru-RU`** (TTS `ru-RU-SvetlanaNeural` default, `ru-RU-DmitryNeural`).

## Product rules

- **Not a tone language.** No Cantonese-style tone digits, Chao tone letters, tone chips, or IPA dumps on Solo / Conversation / Cam lines.
- **Writing:** Russian Cyrillic only. Never Ukrainian letters (і ї є ґ), never Latin translit as the main line, no stress marks. Client and server reject payloads without Cyrillic or with Ukrainian-only letters.
- **Register:** colloquial by default (**ты** between friends); formal English gets **Вы** address.
- **Cam:** natural Russian signage wording, same script rules.

## Compact vs detailed

- **Compact** (Solo / Conversation / Cam): Cyrillic only (no Latin) via `LangFamilyText` → `CyrillicText` (`lang="ru-RU"`). No romanization, tone, or register chips.
- **Details:** an optional BGN/PCGN-style Latin reading (`cyrillicPedagogy.ts`), a ты / Вы chip when detectable, and an honesty note (free, unmarked stress).
- **Breakdown:** local word splitter with a Russian-specific LLM path in `apps/api/src/breakdown.ts`.

## Implementation status

**Shipped (Batch 2)** — `Lang` code `ru` is wired through Solo, Conversation, Cam, Docs, breakdown, TTS prefs, Account Hub voice settings, and `PRIMARY_LANGS`.

- Register: `inferSourceRegister` in `apps/api/src/voiceLangRegister.ts`
- Translation: `translateRussian` (`apps/api/src/translateRussian.ts`, built on `makeVoicePairTranslator`), routed from `apps/api/src/translate.ts`
- Client guard: `sanitizeRuTranslation` in `apps/web/src/lib/translationGuard.ts`
- Compact / Details UI: `apps/web/src/components/LangFamilyText.tsx`
- Pedagogy: `apps/web/src/lib/cyrillicPedagogy.ts`
- Smoke: `npx tsx apps/api/src/voiceLangRegister.smoke.ts` · `npx tsx apps/web/src/lib/batch2Pedagogy.smoke.ts` · `npx tsx --tsconfig apps/web/tsconfig.app.json apps/web/src/components/batch2Text.smoke.ts`
- Azure: `ru-RU` STT/TTS; iPhone stays on Web Speech (not in `appleNeedsAzureStt`)
- Prefs: `tts_voice_ru` + `primary_lang` (`supabase/migrations/044_tts_voice_batch2.sql`)

## Known gaps

- Stress marks are not generated — Details explains that stress is free and unmarked.
- No Account Hub primary UI glosses yet (`primaryUiGloss.data.ts` TODO) — BiText falls back to English-only chrome.
- No phrase / dictionary seeds; translations come from the LLM path.
- iPhone Safari Web Speech support for `ru-RU` is unverified on device.
- TTS loudness equalize gain (`packages/yue-shared/src/ttsVolumeEqualize.ts`) is an untuned starting value.
