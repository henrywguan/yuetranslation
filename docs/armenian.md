# Armenian / Հայերեն

Target variety for JyutTranslate when lang code is **`hy`**: everyday spoken **Armenian** (Հայերեն). Strictly separate from its look-alike peers: own prompts, own voices, own script gate.

Azure Speech locale: **`hy-AM`** (TTS `hy-AM-AnahitNeural` default, `hy-AM-HaykNeural`).

## Product rules

- **Not a tone language.** No Cantonese-style tone digits, Chao tone letters, tone chips, or IPA dumps on Solo / Conversation / Cam lines.
- **Writing:** Armenian alphabet, Eastern Armenian (Armenia). Never Latin transliteration, Cyrillic, or Georgian; client and server reject payloads without Armenian script.
- **Register:** colloquial by default (**դու**); formal English gets **դուք** address forms.
- **Cam:** natural Armenian signage wording, same script rules.

- **Script family:** Armenian, Georgian and Amharic share one `LangFamilyText` branch (`ScriptText`) but keep separate tables — never folded into each other or into Russian / Arabic.

## Compact vs detailed

- **Compact** (Solo / Conversation / Cam): native script only via `LangFamilyText` → `ScriptText` (`lang="hy-AM"`). No romanization, tone, or register chips.
- **Details:** an address chip (դու / դուք) when detectable and an honesty note (Eastern Armenian). No Latin reading yet.
- **Breakdown:** local script word splitter (`localScriptBreakdown.ts`) with a Armenian-specific LLM path in `apps/api/src/breakdown.ts`.

## Implementation status

**Shipped (Batch 4)** — `Lang` code `hy` is wired through Solo, Conversation, Cam, Docs, breakdown, TTS prefs, Account Hub voice settings, and `PRIMARY_LANGS`.

- Register: `inferSourceRegister` in `apps/api/src/voiceLangRegister.ts`
- Translation: `translateArmenian` (`apps/api/src/translateArmenian.ts`, built on `makeVoicePairTranslator`), routed from `apps/api/src/translate.ts`
- Client guard: `sanitizeHyTranslation` in `apps/web/src/lib/translationGuard.ts`
- Compact / Details UI: `apps/web/src/components/LangFamilyText.tsx`
- Pedagogy: `apps/web/src/lib/scriptPedagogy.ts`
- Smoke: `npx tsx apps/api/src/voiceLangRegister.smoke.ts` · `npx tsx apps/web/src/lib/batch4Pedagogy.smoke.ts` · `npx tsx --tsconfig apps/web/tsconfig.app.json apps/web/src/components/batch4Text.smoke.ts`
- Azure: `hy-AM` STT/TTS; iPhone stays on Web Speech (not in `appleNeedsAzureStt`)
- Prefs: `tts_voice_hy` + `primary_lang` (`supabase/migrations/047_tts_voice_batch4.sql`)

## Known gaps

- No Account Hub primary UI glosses yet (`primaryUiGloss.data.ts` TODO) — BiText falls back to English-only chrome.
- No phrase / dictionary seeds; translations come from the LLM path.
- iPhone Safari Web Speech support for `hy-AM` is unverified on device.
- TTS loudness equalize gain (`packages/yue-shared/src/ttsVolumeEqualize.ts`) is an untuned starting value.
- UI strings (Conversation mic labels, Solo placeholder, address / honesty notes) are first-pass copy and want native-speaker review.
