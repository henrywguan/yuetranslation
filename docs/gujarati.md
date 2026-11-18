# Gujarati / ગુજરાતી

Target variety for JyutTranslate when lang code is **`gu`**: everyday spoken **Gujarati** (ગુજરાતી) as used in Gujarat — readable modern Gujarati as on shop signs.

Azure Speech locale: **`gu-IN`** (TTS `gu-IN-DhwaniNeural` default, `gu-IN-NiranjanNeural`).

## Product rules

- **Not a tone language.** No Cantonese-style tone digits, Chao tone letters, tone chips, or IPA dumps on Solo / Conversation / Cam lines.
- **Writing:** Gujarati script only (`\u0A80-\u0AFF`). Never Devanagari / Hindi, never Latin as the main line, never Tamil / Bengali letters. Client and server reject Devanagari and payloads without Gujarati script.
- **Register:** colloquial by default (તું / તમે as natural); formal English gets respectful **તમે** (or **આપ** where honorific) and careful wording.
- **Cam:** natural Gujarati signage wording, same script rules.

## Compact vs detailed

- **Compact** (Solo / Conversation / Cam): Gujarati script only via `LangFamilyText` → `IndicText` (`lang="gu-IN"`). No romanization, tone, or register chips.
- **Details:** optional **ISO 15919** reading (follows spelling — speech often drops the final inherent a), an આપ / તમે / તું address chip when detectable, and an honesty note.
- **Breakdown:** local word splitter with a Gujarati-specific LLM path in `apps/api/src/breakdown.ts`.

## Implementation status

**Shipped (Batch 2)** — `Lang` code `gu` is wired through Solo, Conversation, Cam, Docs, breakdown, TTS prefs, Account Hub voice settings, and `PRIMARY_LANGS`.

- Register: `inferSourceRegister` in `apps/api/src/voiceLangRegister.ts`
- Translation: `translateGujarati` (`apps/api/src/translateGujarati.ts`, built on `makeVoicePairTranslator`), routed from `apps/api/src/translate.ts`
- Client guard: `sanitizeGuTranslation` in `apps/web/src/lib/translationGuard.ts`
- Compact / Details UI: `apps/web/src/components/LangFamilyText.tsx`
- Pedagogy: `apps/web/src/lib/indicPedagogy.ts` · romanization: `apps/web/src/lib/indicIso15919.ts`
- Smoke: `npx tsx apps/api/src/voiceLangRegister.smoke.ts` · `npx tsx apps/web/src/lib/batch2Pedagogy.smoke.ts` · `npx tsx --tsconfig apps/web/tsconfig.app.json apps/web/src/components/batch2Text.smoke.ts`
- Azure: `gu-IN` STT/TTS; iPhone stays on Web Speech (not in `appleNeedsAzureStt`)
- Prefs: `tts_voice_gu` + `primary_lang` (`supabase/migrations/044_tts_voice_batch2.sql`)

## Known gaps

- No Account Hub primary UI glosses yet (`primaryUiGloss.data.ts` TODO) — BiText falls back to English-only chrome.
- No phrase / dictionary seeds; translations come from the LLM path.
- iPhone Safari Web Speech support for `gu-IN` is unverified on device.
- TTS loudness equalize gain (`packages/yue-shared/src/ttsVolumeEqualize.ts`) is an untuned starting value.
