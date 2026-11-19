# Greek / Ελληνικά

Target variety for JyutTranslate when lang code is **`el`**: everyday **Modern Greek** (Ελληνικά) as used in Greece, monotonic spelling.

Azure Speech locale: **`el-GR`** (TTS `el-GR-AthinaNeural` default, `el-GR-NestorasNeural`).

## Product rules

- **Not a tone language.** No Cantonese-style tone digits, Chao tone letters, tone chips, or IPA dumps on Solo / Conversation / Cam lines.
- **Writing:** Greek alphabet only (`\u0370-\u03FF`, monotonic τόνος). Never Greeklish / Latin transliteration as the main line. Client and server reject payloads without Greek script.
- **Register:** colloquial by default (**εσύ**); formal English gets **εσείς** address.
- **Cam:** natural Greek signage wording, same script rules.

## Compact vs detailed

- **Compact** (Solo / Conversation / Cam): Greek script only via `LangFamilyText` → `EuroText` (`lang="el-GR"`). No romanization, tone, or register chips.
- **Details:** an εσύ / εσείς chip when detectable and an honesty note (τόνος marks stress, not tone).
- **Breakdown:** local word splitter with a Greek-specific LLM path in `apps/api/src/breakdown.ts`.

## Implementation status

**Shipped (Batch 2)** — `Lang` code `el` is wired through Solo, Conversation, Cam, Docs, breakdown, TTS prefs, Account Hub voice settings, and `PRIMARY_LANGS`.

- Register: `inferSourceRegister` in `apps/api/src/voiceLangRegister.ts`
- Translation: `translateGreek` (`apps/api/src/translateGreek.ts`, built on `makeVoicePairTranslator`), routed from `apps/api/src/translate.ts`
- Client guard: `sanitizeElTranslation` in `apps/web/src/lib/translationGuard.ts`
- Compact / Details UI: `apps/web/src/components/LangFamilyText.tsx`
- Pedagogy: `apps/web/src/lib/euroPedagogy.ts`
- Smoke: `npx tsx apps/api/src/voiceLangRegister.smoke.ts` · `npx tsx apps/web/src/lib/batch2Pedagogy.smoke.ts` · `npx tsx --tsconfig apps/web/tsconfig.app.json apps/web/src/components/batch2Text.smoke.ts`
- Azure: `el-GR` STT/TTS; iPhone stays on Web Speech (not in `appleNeedsAzureStt`)
- Prefs: `tts_voice_el` + `primary_lang` (`supabase/migrations/044_tts_voice_batch2.sql`)

## Known gaps

- No Account Hub primary UI glosses yet (`primaryUiGloss.data.ts` TODO) — BiText falls back to English-only chrome.
- No phrase / dictionary seeds; translations come from the LLM path.
- iPhone Safari Web Speech support for `el-GR` is unverified on device.
- TTS loudness equalize gain (`packages/yue-shared/src/ttsVolumeEqualize.ts`) is an untuned starting value.
