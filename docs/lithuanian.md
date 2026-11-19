# Lithuanian / Lietuvių

Target variety for JyutTranslate when lang code is **`lt`**: everyday spoken **Lithuanian** (Lietuvių). Strictly separate from its look-alike peers: own prompts, own voices, own script gate.

Azure Speech locale: **`lt-LT`** (TTS `lt-LT-OnaNeural` default, `lt-LT-LeonasNeural`).

## Product rules

- **Not a tone language.** No Cantonese-style tone digits, Chao tone letters, tone chips, or IPA dumps on Solo / Conversation / Cam lines.
- **Writing:** Latin orthography with ą č ę ė į š ų ū ž. No Han; Lithuanian is Baltic, not Latvian or Russian — own prompts and voices.
- **Register:** colloquial by default (**tu**); formal English gets **jūs** address forms.
- **Cam:** natural Lithuanian signage wording, same script rules.

## Compact vs detailed

- **Compact** (Solo / Conversation / Cam): Latin orthography via `LangFamilyText` → `EuroText` (`lang="lt-LT"`). No romanization, tone, or register chips.
- **Details:** an address chip when detectable and an honesty note.
- **Breakdown:** local Latin word splitter (`localLatinBreakdown.ts`) with a Lithuanian-specific LLM path in `apps/api/src/breakdown.ts`.

## Implementation status

**Shipped (Batch 4)** — `Lang` code `lt` is wired through Solo, Conversation, Cam, Docs, breakdown, TTS prefs, Account Hub voice settings, and `PRIMARY_LANGS`.

- Register: `inferSourceRegister` in `apps/api/src/voiceLangRegister.ts`
- Translation: `translateLithuanian` (`apps/api/src/translateLithuanian.ts`, built on `makeVoicePairTranslator`), routed from `apps/api/src/translate.ts`
- Client guard: `sanitizeLtTranslation` in `apps/web/src/lib/translationGuard.ts`
- Compact / Details UI: `apps/web/src/components/LangFamilyText.tsx`
- Pedagogy: `apps/web/src/lib/euroPedagogy.ts`
- Smoke: `npx tsx apps/api/src/voiceLangRegister.smoke.ts` · `npx tsx apps/web/src/lib/batch4Pedagogy.smoke.ts` · `npx tsx --tsconfig apps/web/tsconfig.app.json apps/web/src/components/batch4Text.smoke.ts`
- Azure: `lt-LT` STT/TTS; iPhone stays on Web Speech (not in `appleNeedsAzureStt`)
- Prefs: `tts_voice_lt` + `primary_lang` (`supabase/migrations/047_tts_voice_batch4.sql`)

## Known gaps

- No Account Hub primary UI glosses yet (`primaryUiGloss.data.ts` TODO) — BiText falls back to English-only chrome.
- No phrase / dictionary seeds; translations come from the LLM path.
- iPhone Safari Web Speech support for `lt-LT` is unverified on device.
- TTS loudness equalize gain (`packages/yue-shared/src/ttsVolumeEqualize.ts`) is an untuned starting value.
- UI strings (Conversation mic labels, Solo placeholder, address / honesty notes) are first-pass copy and want native-speaker review.
