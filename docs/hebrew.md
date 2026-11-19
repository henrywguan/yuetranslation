# Hebrew / עברית

Target variety for JyutTranslate when lang code is **`he`**: everyday **Modern Israeli Hebrew** (עברית), unpointed as in normal print.

Azure Speech locale: **`he-IL`** (TTS `he-IL-HilaNeural` default, `he-IL-AvriNeural`).

## Product rules

- **Not a tone language.** No Cantonese-style tone digits, Chao tone letters, tone chips, or IPA dumps on Solo / Conversation / Cam lines.
- **Writing:** Hebrew script only (`\u0590-\u05FF`), no niqqud, right-to-left. Never Latin transliteration, Arabic, or Yiddish. Client and server reject payloads without Hebrew script.
- **Register:** colloquial by default; formal English gets polite, careful wording (Hebrew marks gender rather than a tu/vous split).
- **Cam:** natural Hebrew signage wording, same script rules.

## Compact vs detailed

- **Compact** (Solo / Conversation / Cam): RTL Hebrew script only via `LangFamilyText` → `RtlText` (`lang="he-IL"`, `dir="rtl"`). No romanization, tone, or register chips.
- **Details:** an honesty note on unpointed spelling and stress (no address chip — את / אתה overlap the object marker).
- **Breakdown:** local word splitter with a Hebrew-specific LLM path in `apps/api/src/breakdown.ts`.

## Implementation status

**Shipped (Batch 2)** — `Lang` code `he` is wired through Solo, Conversation, Cam, Docs, breakdown, TTS prefs, Account Hub voice settings, and `PRIMARY_LANGS`.

- Register: `inferSourceRegister` in `apps/api/src/voiceLangRegister.ts`
- Translation: `translateHebrew` (`apps/api/src/translateHebrew.ts`, built on `makeVoicePairTranslator`), routed from `apps/api/src/translate.ts`
- Client guard: `sanitizeHeTranslation` in `apps/web/src/lib/translationGuard.ts`
- Compact / Details UI: `apps/web/src/components/LangFamilyText.tsx`
- Pedagogy: `apps/web/src/lib/rtlPedagogy.ts`
- Smoke: `npx tsx apps/api/src/voiceLangRegister.smoke.ts` · `npx tsx apps/web/src/lib/batch2Pedagogy.smoke.ts` · `npx tsx --tsconfig apps/web/tsconfig.app.json apps/web/src/components/batch2Text.smoke.ts`
- Azure: `he-IL` STT/TTS; iPhone stays on Web Speech (not in `appleNeedsAzureStt`)
- Prefs: `tts_voice_he` + `primary_lang` (`supabase/migrations/044_tts_voice_batch2.sql`)

## Known gaps

- No niqqud / vocalized reading in Details.
- No Account Hub primary UI glosses yet (`primaryUiGloss.data.ts` TODO) — BiText falls back to English-only chrome.
- No phrase / dictionary seeds; translations come from the LLM path.
- iPhone Safari Web Speech support for `he-IL` is unverified on device.
- TTS loudness equalize gain (`packages/yue-shared/src/ttsVolumeEqualize.ts`) is an untuned starting value.
