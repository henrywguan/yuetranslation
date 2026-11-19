# Basque / Euskara

Target variety for JyutTranslate when lang code is **`eu`**: everyday spoken **Basque** (Euskara). Strictly separate from its look-alike peers: own prompts, own voices, own script gate.

Azure Speech locale: **`eu-ES`** (TTS `eu-ES-AinhoaNeural` default, `eu-ES-AnderNeural`).

## Product rules

- **Not a tone language.** No Cantonese-style tone digits, Chao tone letters, tone chips, or IPA dumps on Solo / Conversation / Cam lines.
- **Writing:** Latin orthography (ñ, tx ts tz). No Han; Basque is a language isolate, not Spanish or French — own prompts and voices.
- **Register:** standard polite **zu** by default; **hi** (intimate) is used only when the source signals it; **zuek** for plural.
- **Cam:** natural Basque signage wording, same script rules.

## Compact vs detailed

- **Compact** (Solo / Conversation / Cam): Latin orthography via `LangFamilyText` → `EuroText` (`lang="eu-ES"`). No romanization, tone, or register chips.
- **Details:** an address chip when detectable and an honesty note.
- **Breakdown:** local Latin word splitter (`localLatinBreakdown.ts`) with a Basque-specific LLM path in `apps/api/src/breakdown.ts`.

## Implementation status

**Shipped (Batch 4)** — `Lang` code `eu` is wired through Solo, Conversation, Cam, Docs, breakdown, TTS prefs, Account Hub voice settings, and `PRIMARY_LANGS`.

- Register: `inferSourceRegister` in `apps/api/src/voiceLangRegister.ts`
- Translation: `translateBasque` (`apps/api/src/translateBasque.ts`, built on `makeVoicePairTranslator`), routed from `apps/api/src/translate.ts`
- Client guard: `sanitizeEuTranslation` in `apps/web/src/lib/translationGuard.ts`
- Compact / Details UI: `apps/web/src/components/LangFamilyText.tsx`
- Pedagogy: `apps/web/src/lib/euroPedagogy.ts`
- Smoke: `npx tsx apps/api/src/voiceLangRegister.smoke.ts` · `npx tsx apps/web/src/lib/batch4Pedagogy.smoke.ts` · `npx tsx --tsconfig apps/web/tsconfig.app.json apps/web/src/components/batch4Text.smoke.ts`
- Azure: `eu-ES` STT/TTS; iPhone stays on Web Speech (not in `appleNeedsAzureStt`)
- Prefs: `tts_voice_eu` + `primary_lang` (`supabase/migrations/047_tts_voice_batch4.sql`)

## Known gaps

- No Account Hub primary UI glosses yet (`primaryUiGloss.data.ts` TODO) — BiText falls back to English-only chrome.
- No phrase / dictionary seeds; translations come from the LLM path.
- iPhone Safari Web Speech support for `eu-ES` is unverified on device.
- TTS loudness equalize gain (`packages/yue-shared/src/ttsVolumeEqualize.ts`) is an untuned starting value.
- UI strings (Conversation mic labels, Solo placeholder, address / honesty notes) are first-pass copy and want native-speaker review.
