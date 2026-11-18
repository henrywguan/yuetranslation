# Swedish / Svenska

Target variety for JyutTranslate when lang code is **`sv`**: everyday **Swedish** (svenska) as used in Sweden — never Norwegian or Danish spelling.

Azure Speech locale: **`sv-SE`** (TTS `sv-SE-SofieNeural` default, `sv-SE-MattiasNeural`).

## Product rules

- **Not a tone language** (pitch accent is word melody, not Cantonese-style lexical tone). No Cantonese-style tone digits, Chao tone letters, tone chips, or IPA dumps on Solo / Conversation / Cam lines.
- **Writing:** Latin orthography with å ä ö — never ASCII-folded. No Han.
- **Register:** **du** in almost all contexts (Sweden's du-reform); formal English keeps du with polite wording — **ni** only for plural.
- **Cam:** natural Swedish signage wording, same script rules.

## Compact vs detailed

- **Compact** (Solo / Conversation / Cam): Swedish orthography via `LangFamilyText` → `EuroText` (`lang="sv-SE"`). No romanization, tone, or register chips.
- **Details:** a du / ni chip when detectable and an honesty note (pitch accent 1 vs 2 is word melody, not lexical tone).
- **Breakdown:** local word splitter with a Swedish-specific LLM path in `apps/api/src/breakdown.ts`.

## Implementation status

**Shipped (Batch 2)** — `Lang` code `sv` is wired through Solo, Conversation, Cam, Docs, breakdown, TTS prefs, Account Hub voice settings, and `PRIMARY_LANGS`.

- Register: `inferSourceRegister` in `apps/api/src/voiceLangRegister.ts`
- Translation: `translateSwedish` (`apps/api/src/translateSwedish.ts`, built on `makeVoicePairTranslator`), routed from `apps/api/src/translate.ts`
- Client guard: `sanitizeSvTranslation` in `apps/web/src/lib/translationGuard.ts`
- Compact / Details UI: `apps/web/src/components/LangFamilyText.tsx`
- Pedagogy: `apps/web/src/lib/euroPedagogy.ts`
- Smoke: `npx tsx apps/api/src/voiceLangRegister.smoke.ts` · `npx tsx apps/web/src/lib/batch2Pedagogy.smoke.ts` · `npx tsx --tsconfig apps/web/tsconfig.app.json apps/web/src/components/batch2Text.smoke.ts`
- Azure: `sv-SE` STT/TTS; iPhone stays on Web Speech (not in `appleNeedsAzureStt`)
- Prefs: `tts_voice_sv` + `primary_lang` (`supabase/migrations/044_tts_voice_batch2.sql`)

## Known gaps

- No Account Hub primary UI glosses yet (`primaryUiGloss.data.ts` TODO) — BiText falls back to English-only chrome.
- No phrase / dictionary seeds; translations come from the LLM path.
- iPhone Safari Web Speech support for `sv-SE` is unverified on device.
- TTS loudness equalize gain (`packages/yue-shared/src/ttsVolumeEqualize.ts`) is an untuned starting value.
