# Hungarian / Magyar

Target variety for JyutTranslate when lang code is **`hu`**: everyday **Hungarian** (magyar) as used in Hungary.

Azure Speech locale: **`hu-HU`** (TTS `hu-HU-NoemiNeural` default, `hu-HU-TamasNeural`).

## Product rules

- **Not a tone language.** No Cantonese-style tone digits, Chao tone letters, tone chips, or IPA dumps on Solo / Conversation / Cam lines.
- **Writing:** Latin orthography with ö ő ü ű and long vowels (double acute, never ô / õ) — never ASCII-folded. No Han.
- **Register:** colloquial by default (**te**); formal English gets **Ön** address.
- **Cam:** natural Hungarian signage wording, same script rules.

## Compact vs detailed

- **Compact** (Solo / Conversation / Cam): Hungarian orthography via `LangFamilyText` → `EuroText` (`lang="hu-HU"`). No romanization, tone, or register chips.
- **Details:** a te / Ön chip when detectable and an honesty note (first-syllable stress; accents = length; vowel harmony).
- **Breakdown:** local word splitter with a Hungarian-specific LLM path in `apps/api/src/breakdown.ts`.

## Implementation status

**Shipped (Batch 2)** — `Lang` code `hu` is wired through Solo, Conversation, Cam, Docs, breakdown, TTS prefs, Account Hub voice settings, and `PRIMARY_LANGS`.

- Register: `inferSourceRegister` in `apps/api/src/voiceLangRegister.ts`
- Translation: `translateHungarian` (`apps/api/src/translateHungarian.ts`, built on `makeVoicePairTranslator`), routed from `apps/api/src/translate.ts`
- Client guard: `sanitizeHuTranslation` in `apps/web/src/lib/translationGuard.ts`
- Compact / Details UI: `apps/web/src/components/LangFamilyText.tsx`
- Pedagogy: `apps/web/src/lib/euroPedagogy.ts`
- Smoke: `npx tsx apps/api/src/voiceLangRegister.smoke.ts` · `npx tsx apps/web/src/lib/batch2Pedagogy.smoke.ts` · `npx tsx --tsconfig apps/web/tsconfig.app.json apps/web/src/components/batch2Text.smoke.ts`
- Azure: `hu-HU` STT/TTS; iPhone stays on Web Speech (not in `appleNeedsAzureStt`)
- Prefs: `tts_voice_hu` + `primary_lang` (`supabase/migrations/044_tts_voice_batch2.sql`)

## Known gaps

- No Account Hub primary UI glosses yet (`primaryUiGloss.data.ts` TODO) — BiText falls back to English-only chrome.
- No phrase / dictionary seeds; translations come from the LLM path.
- iPhone Safari Web Speech support for `hu-HU` is unverified on device.
- TTS loudness equalize gain (`packages/yue-shared/src/ttsVolumeEqualize.ts`) is an untuned starting value.
