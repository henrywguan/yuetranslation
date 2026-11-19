# Bulgarian / Български

Target variety for JyutTranslate when lang code is **`bg`**: everyday spoken **Bulgarian** (Български). Strictly separate from its look-alike peers: own prompts, own voices, own script gate.

Azure Speech locale: **`bg-BG`** (TTS `bg-BG-KalinaNeural` default, `bg-BG-BorislavNeural`).

## Product rules

- **Not a tone language.** No Cantonese-style tone digits, Chao tone letters, tone chips, or IPA dumps on Solo / Conversation / Cam lines.
- **Writing:** Bulgarian Cyrillic only. Never Russian-only letters (ы э ё), never Latin translit as the main line. ъ is a valid Bulgarian vowel. Client and server reject payloads without Cyrillic or with Russian-only letters.
- **Register:** colloquial by default (**ти**); formal English gets **Вие** address forms.
- **Cam:** natural Bulgarian signage wording, same script rules.

## Compact vs detailed

- **Compact** (Solo / Conversation / Cam): Cyrillic only (no Latin) via `LangFamilyText` → `CyrillicText` (`lang="bg-BG"`). No romanization, tone, or register chips.
- **Details:** a Streamlined System Latin reading (`cyrillicPedagogy.ts`), an address chip when detectable, and an honesty note.
- **Breakdown:** local Cyrillic word splitter (`localScriptBreakdown.ts`) with a Bulgarian-specific LLM path in `apps/api/src/breakdown.ts`.

## Implementation status

**Shipped (Batch 3b)** — `Lang` code `bg` is wired through Solo, Conversation, Cam, Docs, breakdown, TTS prefs, Account Hub voice settings, and `PRIMARY_LANGS`.

- Register: `inferSourceRegister` in `apps/api/src/voiceLangRegister.ts`
- Translation: `translateBulgarian` (`apps/api/src/translateBulgarian.ts`, built on `makeVoicePairTranslator`), routed from `apps/api/src/translate.ts`
- Client guard: `sanitizeBgTranslation` in `apps/web/src/lib/translationGuard.ts`
- Compact / Details UI: `apps/web/src/components/LangFamilyText.tsx`
- Pedagogy: `apps/web/src/lib/cyrillicPedagogy.ts`
- Smoke: `npx tsx apps/api/src/voiceLangRegister.smoke.ts` · `npx tsx apps/web/src/lib/batch3bPedagogy.smoke.ts` · `npx tsx --tsconfig apps/web/tsconfig.app.json apps/web/src/components/batch3bText.smoke.ts`
- Azure: `bg-BG` STT/TTS; iPhone stays on Web Speech (not in `appleNeedsAzureStt`)
- Prefs: `tts_voice_bg` + `primary_lang` (`supabase/migrations/046_tts_voice_batch3b.sql`)

## Known gaps

- No Account Hub primary UI glosses yet (`primaryUiGloss.data.ts` TODO) — BiText falls back to English-only chrome.
- No phrase / dictionary seeds; translations come from the LLM path.
- iPhone Safari Web Speech support for `bg-BG` is unverified on device.
- TTS loudness equalize gain (`packages/yue-shared/src/ttsVolumeEqualize.ts`) is an untuned starting value.
