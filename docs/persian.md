# Persian / فارسی

Target variety for JyutTranslate when lang code is **`fa`**: everyday **Iranian Persian / Farsi** (فارسی). Persian is **not Arabic** — dedicated prompts, never shared with `ar` / `arsa`.

Azure Speech locale: **`fa-IR`** (TTS `fa-IR-DilaraNeural` default, `fa-IR-FaridNeural`).

## Product rules

- **Not a tone language.** No Cantonese-style tone digits, Chao tone letters, tone chips, or IPA dumps on Solo / Conversation / Cam lines.
- **Writing:** Perso-Arabic script with Persian letters (پ چ ژ گ, Persian ی ک) and ZWNJ, right-to-left. Never Arabic grammar / ي ك, never Urdu-only letters (ٹ ڈ ڑ ں ے), never Finglish. Client and server reject Urdu-only letters and payloads without Arabic-block script.
- **Register:** colloquial by default (تو between friends); formal English gets **شما** and polite verb forms.
- **Cam:** natural Persian signage wording, same script rules.

## Compact vs detailed

- **Compact** (Solo / Conversation / Cam): RTL Persian script only via `LangFamilyText` → `RtlText` (`lang="fa-IR"`, `dir="rtl"`). No romanization, tone, or register chips.
- **Details:** a شما / تو chip when unambiguous and an honesty note (not Arabic; short vowels unwritten).
- **Breakdown:** local word splitter with a Persian-specific LLM path in `apps/api/src/breakdown.ts`.

## Implementation status

**Shipped (Batch 2)** — `Lang` code `fa` is wired through Solo, Conversation, Cam, Docs, breakdown, TTS prefs, Account Hub voice settings, and `PRIMARY_LANGS`.

- Register: `inferSourceRegister` in `apps/api/src/voiceLangRegister.ts`
- Translation: `translatePersian` (`apps/api/src/translatePersian.ts`, built on `makeVoicePairTranslator`), routed from `apps/api/src/translate.ts`
- Client guard: `sanitizeFaTranslation` in `apps/web/src/lib/translationGuard.ts`
- Compact / Details UI: `apps/web/src/components/LangFamilyText.tsx`
- Pedagogy: `apps/web/src/lib/rtlPedagogy.ts`
- Smoke: `npx tsx apps/api/src/voiceLangRegister.smoke.ts` · `npx tsx apps/web/src/lib/batch2Pedagogy.smoke.ts` · `npx tsx --tsconfig apps/web/tsconfig.app.json apps/web/src/components/batch2Text.smoke.ts`
- Azure: `fa-IR` STT/TTS; iPhone stays on Web Speech (not in `appleNeedsAzureStt`)
- Prefs: `tts_voice_fa` + `primary_lang` (`supabase/migrations/044_tts_voice_batch2.sql`)

## Known gaps

- No Latin reading in Details (Persian vowels are unwritten — a letter-by-letter reading would mislead).
- No Account Hub primary UI glosses yet (`primaryUiGloss.data.ts` TODO) — BiText falls back to English-only chrome.
- No phrase / dictionary seeds; translations come from the LLM path.
- iPhone Safari Web Speech support for `fa-IR` is unverified on device.
- TTS loudness equalize gain (`packages/yue-shared/src/ttsVolumeEqualize.ts`) is an untuned starting value.
