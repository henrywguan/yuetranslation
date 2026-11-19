# Azerbaijani / Azərbaycanca

Target variety for JyutTranslate when lang code is **`az`**: everyday spoken **Azerbaijani** (Azərbaycanca). Strictly separate from its look-alike peers: own prompts, own voices, own script gate.

Azure Speech locale: **`az-AZ`** (TTS `az-AZ-BanuNeural` default, `az-AZ-BabekNeural`).

## Product rules

- **Not a tone language.** No Cantonese-style tone digits, Chao tone letters, tone chips, or IPA dumps on Solo / Conversation / Cam lines.
- **Writing:** Latin orthography (a b c ç d e ə f g ğ h x ı i j k q l m n o ö p r s ş t u ü v y z). Never Cyrillic or Arabic script; client and server reject payloads in those scripts. Keep it distinct from Turkish — own prompts and voices.
- **Register:** colloquial by default (**sən**); formal English gets **siz** address forms.
- **Cam:** natural Azerbaijani signage wording, same script rules.

## Compact vs detailed

- **Compact** (Solo / Conversation / Cam): Latin orthography via `LangFamilyText` → `EuroText` (`lang="az-AZ"`). No romanization, tone, or register chips.
- **Details:** address chip when detectable + honesty note.
- **Breakdown:** local Latin word splitter (`localLatinBreakdown.ts`) with a Azerbaijani-specific LLM path in `apps/api/src/breakdown.ts`.

## Implementation status

**Shipped (Batch 3b)** — `Lang` code `az` is wired through Solo, Conversation, Cam, Docs, breakdown, TTS prefs, Account Hub voice settings, and `PRIMARY_LANGS`.

- Register: `inferSourceRegister` in `apps/api/src/voiceLangRegister.ts`
- Translation: `translateAzerbaijani` (`apps/api/src/translateAzerbaijani.ts`, built on `makeVoicePairTranslator`), routed from `apps/api/src/translate.ts`
- Client guard: `sanitizeAzTranslation` in `apps/web/src/lib/translationGuard.ts`
- Compact / Details UI: `apps/web/src/components/LangFamilyText.tsx`
- Pedagogy: `apps/web/src/lib/euroPedagogy.ts`
- Smoke: `npx tsx apps/api/src/voiceLangRegister.smoke.ts` · `npx tsx apps/web/src/lib/batch3bPedagogy.smoke.ts` · `npx tsx --tsconfig apps/web/tsconfig.app.json apps/web/src/components/batch3bText.smoke.ts`
- Azure: `az-AZ` STT/TTS; iPhone stays on Web Speech (not in `appleNeedsAzureStt`)
- Prefs: `tts_voice_az` + `primary_lang` (`supabase/migrations/046_tts_voice_batch3b.sql`)

## Known gaps

- No Account Hub primary UI glosses yet (`primaryUiGloss.data.ts` TODO) — BiText falls back to English-only chrome.
- No phrase / dictionary seeds; translations come from the LLM path.
- iPhone Safari Web Speech support for `az-AZ` is unverified on device.
- TTS loudness equalize gain (`packages/yue-shared/src/ttsVolumeEqualize.ts`) is an untuned starting value.
