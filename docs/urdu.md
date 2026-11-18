# Urdu / اردو

Target variety for JyutTranslate when lang code is **`ur`**: everyday **Urdu** (اردو) in Perso-Arabic **Nastaliq** script. Urdu is never written as Hindi / Devanagari.

Azure Speech locale: **`ur-IN`** (TTS `ur-IN-GulNeural` default, `ur-IN-SalmanNeural`).

## Product rules

- **Not a tone language.** No Cantonese-style tone digits, Chao tone letters, tone chips, or IPA dumps on Solo / Conversation / Cam lines.
- **Writing:** Urdu Perso-Arabic script (ٹ ڈ ڑ ں ے ھ), right-to-left. Never Devanagari, never Roman Urdu as the main line. Client and server reject Devanagari and payloads without Arabic-block script.
- **Register:** colloquial by default (تم as natural); formal English gets respectful **آپ** and careful wording.
- **Cam:** natural Urdu signage wording, same script rules.

## Compact vs detailed

- **Compact** (Solo / Conversation / Cam): RTL Urdu script only (Nastaliq font stack) via `LangFamilyText` → `RtlText` (`lang="ur-IN"`, `dir="rtl"`). No romanization, tone, or register chips.
- **Details:** an آپ / تم chip when detectable and an honesty note (Nastaliq, not Devanagari).
- **Breakdown:** local word splitter with a Urdu-specific LLM path in `apps/api/src/breakdown.ts`.

## Implementation status

**Shipped (Batch 2)** — `Lang` code `ur` is wired through Solo, Conversation, Cam, Docs, breakdown, TTS prefs, Account Hub voice settings, and `PRIMARY_LANGS`.

- Register: `inferSourceRegister` in `apps/api/src/voiceLangRegister.ts`
- Translation: `translateUrdu` (`apps/api/src/translateUrdu.ts`, built on `makeVoicePairTranslator`), routed from `apps/api/src/translate.ts`
- Client guard: `sanitizeUrTranslation` in `apps/web/src/lib/translationGuard.ts`
- Compact / Details UI: `apps/web/src/components/LangFamilyText.tsx`
- Pedagogy: `apps/web/src/lib/rtlPedagogy.ts`
- Smoke: `npx tsx apps/api/src/voiceLangRegister.smoke.ts` · `npx tsx apps/web/src/lib/batch2Pedagogy.smoke.ts` · `npx tsx --tsconfig apps/web/tsconfig.app.json apps/web/src/components/batch2Text.smoke.ts`
- Azure: `ur-IN` STT/TTS; iPhone stays on Web Speech (not in `appleNeedsAzureStt`)
- Prefs: `tts_voice_ur` + `primary_lang` (`supabase/migrations/044_tts_voice_batch2.sql`)

## Known gaps

- Azure locale is `ur-IN`; Pakistan-specific (`ur-PK`) voices are not offered yet.
- No Account Hub primary UI glosses yet (`primaryUiGloss.data.ts` TODO) — BiText falls back to English-only chrome.
- No phrase / dictionary seeds; translations come from the LLM path.
- iPhone Safari Web Speech support for `ur-IN` is unverified on device.
- TTS loudness equalize gain (`packages/yue-shared/src/ttsVolumeEqualize.ts`) is an untuned starting value.
