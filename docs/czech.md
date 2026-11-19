# Czech / Čeština

Target variety for JyutTranslate when lang code is **`cs`**: everyday standard **Czech** (čeština) as used in Czechia — never Slovak.

Azure Speech locale: **`cs-CZ`** (TTS `cs-CZ-VlastaNeural` default, `cs-CZ-AntoninNeural`).

## Product rules

- **Not a tone language.** No Cantonese-style tone digits, Chao tone letters, tone chips, or IPA dumps on Solo / Conversation / Cam lines.
- **Writing:** Latin orthography with háčky and čárky (ě ř ů …) — never ASCII-folded. No Han.
- **Register:** colloquial by default (**ty**); formal English gets **Vy** address.
- **Cam:** natural Czech signage wording, same script rules.

## Compact vs detailed

- **Compact** (Solo / Conversation / Cam): Czech orthography via `LangFamilyText` → `EuroText` (`lang="cs-CZ"`). No romanization, tone, or register chips.
- **Details:** a ty / Vy chip when detectable and an honesty note (first-syllable stress; čárka = length).
- **Breakdown:** local word splitter with a Czech-specific LLM path in `apps/api/src/breakdown.ts`.

## Implementation status

**Shipped (Batch 2)** — `Lang` code `cs` is wired through Solo, Conversation, Cam, Docs, breakdown, TTS prefs, Account Hub voice settings, and `PRIMARY_LANGS`.

- Register: `inferSourceRegister` in `apps/api/src/voiceLangRegister.ts`
- Translation: `translateCzech` (`apps/api/src/translateCzech.ts`, built on `makeVoicePairTranslator`), routed from `apps/api/src/translate.ts`
- Client guard: `sanitizeCsTranslation` in `apps/web/src/lib/translationGuard.ts`
- Compact / Details UI: `apps/web/src/components/LangFamilyText.tsx`
- Pedagogy: `apps/web/src/lib/euroPedagogy.ts`
- Smoke: `npx tsx apps/api/src/voiceLangRegister.smoke.ts` · `npx tsx apps/web/src/lib/batch2Pedagogy.smoke.ts` · `npx tsx --tsconfig apps/web/tsconfig.app.json apps/web/src/components/batch2Text.smoke.ts`
- Azure: `cs-CZ` STT/TTS; iPhone stays on Web Speech (not in `appleNeedsAzureStt`)
- Prefs: `tts_voice_cs` + `primary_lang` (`supabase/migrations/044_tts_voice_batch2.sql`)

## Known gaps

- No Account Hub primary UI glosses yet (`primaryUiGloss.data.ts` TODO) — BiText falls back to English-only chrome.
- No phrase / dictionary seeds; translations come from the LLM path.
- iPhone Safari Web Speech support for `cs-CZ` is unverified on device.
- TTS loudness equalize gain (`packages/yue-shared/src/ttsVolumeEqualize.ts`) is an untuned starting value.
