# Amharic / አማርኛ

Target variety for JyutTranslate when lang code is **`am`**: everyday spoken **Amharic** (አማርኛ). Strictly separate from its look-alike peers: own prompts, own voices, own script gate.

Azure Speech locale: **`am-ET`** (TTS `am-ET-MekdesNeural` default, `am-ET-AmehaNeural`).

## Product rules

- **Not a tone language.** No Cantonese-style tone digits, Chao tone letters, tone chips, or IPA dumps on Solo / Conversation / Cam lines.
- **Writing:** Ethiopic (Ge’ez) script, left-to-right abugida. Never Latin transliteration or Arabic script; client and server reject payloads without Ethiopic script.
- **Register:** colloquial by default; polite English gets **እርስዎ**, with **አንተ / አንቺ** for masculine / feminine “you”.
- **Cam:** natural Amharic signage wording, same script rules.

- **Script family:** Armenian, Georgian and Amharic share one `LangFamilyText` branch (`ScriptText`) but keep separate tables — never folded into each other or into Russian / Arabic.

## Compact vs detailed

- **Compact** (Solo / Conversation / Cam): native script only via `LangFamilyText` → `ScriptText` (`lang="am-ET"`). No romanization, tone, or register chips.
- **Details:** an address chip (አንተ / አንቺ / እርስዎ / እናንተ) when detectable and an honesty note. No Latin reading yet.
- **Breakdown:** local script word splitter (`localScriptBreakdown.ts`) with a Amharic-specific LLM path in `apps/api/src/breakdown.ts`.

## Implementation status

**Shipped (Batch 4)** — `Lang` code `am` is wired through Solo, Conversation, Cam, Docs, breakdown, TTS prefs, Account Hub voice settings, and `PRIMARY_LANGS`.

- Register: `inferSourceRegister` in `apps/api/src/voiceLangRegister.ts`
- Translation: `translateAmharic` (`apps/api/src/translateAmharic.ts`, built on `makeVoicePairTranslator`), routed from `apps/api/src/translate.ts`
- Client guard: `sanitizeAmTranslation` in `apps/web/src/lib/translationGuard.ts`
- Compact / Details UI: `apps/web/src/components/LangFamilyText.tsx`
- Pedagogy: `apps/web/src/lib/scriptPedagogy.ts`
- Smoke: `npx tsx apps/api/src/voiceLangRegister.smoke.ts` · `npx tsx apps/web/src/lib/batch4Pedagogy.smoke.ts` · `npx tsx --tsconfig apps/web/tsconfig.app.json apps/web/src/components/batch4Text.smoke.ts`
- Azure: `am-ET` STT/TTS; iPhone stays on Web Speech (not in `appleNeedsAzureStt`)
- Prefs: `tts_voice_am` + `primary_lang` (`supabase/migrations/047_tts_voice_batch4.sql`)

## Known gaps

- No Account Hub primary UI glosses yet (`primaryUiGloss.data.ts` TODO) — BiText falls back to English-only chrome.
- No phrase / dictionary seeds; translations come from the LLM path.
- iPhone Safari Web Speech support for `am-ET` is unverified on device.
- TTS loudness equalize gain (`packages/yue-shared/src/ttsVolumeEqualize.ts`) is an untuned starting value.
- UI strings (Conversation mic labels, Solo placeholder, address / honesty notes) are first-pass copy and want native-speaker review.
