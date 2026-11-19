# Kannada / ಕನ್ನಡ

Target variety for JyutTranslate when lang code is **`kn`**: everyday spoken **Kannada** (ಕನ್ನಡ) as used in Karnataka — readable modern Kannada, not stiff literary style.

Azure Speech locale: **`kn-IN`** (TTS `kn-IN-SapnaNeural` default, `kn-IN-GaganNeural`).

## Product rules

- **Not a tone language.** No Cantonese-style tone digits, Chao tone letters, tone chips, or IPA dumps on Solo / Conversation / Cam lines.
- **Writing:** Kannada script only (`\u0C80-\u0CFF`). Never Latin as the main line, never Telugu, Tamil, Bengali, or Devanagari letters. Client and server reject payloads without Kannada script.
- **Register:** colloquial by default (ನೀನು / ನೀವು as natural); formal English gets respectful **ನೀವು** and careful wording.
- **Cam:** natural Kannada signage wording, same script rules.

## Compact vs detailed

- **Compact** (Solo / Conversation / Cam): Kannada script only via `LangFamilyText` → `IndicText` (`lang="kn-IN"`). No romanization, tone, or register chips.
- **Details:** optional **ISO 15919** reading (short e/o vs long ē/ō, ḷ), a ನೀವು / ನೀನು address chip when detectable, and an honesty note.
- **Breakdown:** local word splitter with a Kannada-specific LLM path in `apps/api/src/breakdown.ts`.

## Implementation status

**Shipped (Batch 2)** — `Lang` code `kn` is wired through Solo, Conversation, Cam, Docs, breakdown, TTS prefs, Account Hub voice settings, and `PRIMARY_LANGS`.

- Register: `inferSourceRegister` in `apps/api/src/voiceLangRegister.ts`
- Translation: `translateKannada` (`apps/api/src/translateKannada.ts`, built on `makeVoicePairTranslator`), routed from `apps/api/src/translate.ts`
- Client guard: `sanitizeKnTranslation` in `apps/web/src/lib/translationGuard.ts`
- Compact / Details UI: `apps/web/src/components/LangFamilyText.tsx`
- Pedagogy: `apps/web/src/lib/indicPedagogy.ts` · romanization: `apps/web/src/lib/indicIso15919.ts`
- Smoke: `npx tsx apps/api/src/voiceLangRegister.smoke.ts` · `npx tsx apps/web/src/lib/batch2Pedagogy.smoke.ts` · `npx tsx --tsconfig apps/web/tsconfig.app.json apps/web/src/components/batch2Text.smoke.ts`
- Azure: `kn-IN` STT/TTS; iPhone stays on Web Speech (not in `appleNeedsAzureStt`)
- Prefs: `tts_voice_kn` + `primary_lang` (`supabase/migrations/044_tts_voice_batch2.sql`)

## Known gaps

- No Account Hub primary UI glosses yet (`primaryUiGloss.data.ts` TODO) — BiText falls back to English-only chrome.
- No phrase / dictionary seeds; translations come from the LLM path.
- iPhone Safari Web Speech support for `kn-IN` is unverified on device.
- TTS loudness equalize gain (`packages/yue-shared/src/ttsVolumeEqualize.ts`) is an untuned starting value.
