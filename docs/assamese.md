# Assamese / অসমীয়া

Target variety for JyutTranslate when lang code is **`as`**: everyday spoken **Assamese** (অসমীয়া). Strictly separate from its look-alike peers: own prompts, own voices, own script gate.

Azure Speech locale: **`as-IN`** (TTS `as-IN-YashicaNeural` default, `as-IN-PriyomNeural`).

## Product rules

- **Not a tone language.** No Cantonese-style tone digits, Chao tone letters, tone chips, or IPA dumps on Solo / Conversation / Cam lines.
- **Writing:** Bengali–Assamese script (U+0980–U+09FF) with Assamese ৰ and ৱ. Never Latin transliteration; never Bengali (Bangla) spelling. Client and server reject Devanagari payloads and payloads without the script.
- **Register:** colloquial by default (**তুমি**); formal English gets **আপুনি** address forms.
- **Cam:** natural Assamese signage wording, same script rules.

## Compact vs detailed

- **Compact** (Solo / Conversation / Cam): Assamese script via `LangFamilyText` → `IndicText` (`lang="as-IN"`). No romanization, tone, or register chips.
- **Details:** optional ISO 15919 reading, an address chip (আপুনি / তুমি / তই) when detectable, and an honesty note.
- **Breakdown:** local script word splitter (`localScriptBreakdown.ts`) with a Assamese-specific LLM path in `apps/api/src/breakdown.ts`.

## Implementation status

**Shipped (Batch 4)** — `Lang` code `as` is wired through Solo, Conversation, Cam, Docs, breakdown, TTS prefs, Account Hub voice settings, and `PRIMARY_LANGS`.

- Register: `inferSourceRegister` in `apps/api/src/voiceLangRegister.ts`
- Translation: `translateAssamese` (`apps/api/src/translateAssamese.ts`, built on `makeVoicePairTranslator`), routed from `apps/api/src/translate.ts`
- Client guard: `sanitizeAsTranslation` in `apps/web/src/lib/translationGuard.ts`
- Compact / Details UI: `apps/web/src/components/LangFamilyText.tsx`
- Pedagogy: `apps/web/src/lib/indicPedagogy.ts` · romanization: `apps/web/src/lib/indicIso15919.ts`
- Smoke: `npx tsx apps/api/src/voiceLangRegister.smoke.ts` · `npx tsx apps/web/src/lib/batch4Pedagogy.smoke.ts` · `npx tsx --tsconfig apps/web/tsconfig.app.json apps/web/src/components/batch4Text.smoke.ts`
- Azure: `as-IN` STT/TTS; iPhone stays on Web Speech (not in `appleNeedsAzureStt`)
- Prefs: `tts_voice_as` + `primary_lang` (`supabase/migrations/047_tts_voice_batch4.sql`)

## Known gaps

- No Account Hub primary UI glosses yet (`primaryUiGloss.data.ts` TODO) — BiText falls back to English-only chrome.
- No phrase / dictionary seeds; translations come from the LLM path.
- iPhone Safari Web Speech support for `as-IN` is unverified on device.
- TTS loudness equalize gain (`packages/yue-shared/src/ttsVolumeEqualize.ts`) is an untuned starting value.
- UI strings (Conversation mic labels, Solo placeholder, address / honesty notes) are first-pass copy and want native-speaker review.
