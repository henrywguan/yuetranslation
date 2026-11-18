# Bengali / বাংলা

Target variety for JyutTranslate when lang code is **`bn`**: everyday **Standard Colloquial Bengali** (চলিত বাংলা), India-oriented (bn-IN, Kolkata norms). Not সাধু ভাষা, and never Banglish (Latin) as the main line.

Azure Speech locale: **`bn-IN`** (TTS `bn-IN-TanishaaNeural` default, `bn-IN-BashkarNeural`).

## Product rules

- **Not a tone language.** No Cantonese-style tone digits, Chao tone letters, tone chips, or IPA dumps on Solo / Conversation / Cam lines.
- **Writing:** Bangla script only (`\u0980-\u09FF`). No Banglish / Latin transliteration as the primary line, no Han. Client and server both reject payloads without Bangla script.
- **Register:** colloquial চলিত by default (তুমি / আপনি as natural); when the English source looks legal / medical / official (`bengaliRegister.ts`), use respectful **আপনি** and careful wording — still চলিত, not সাধু.
- **Cam:** natural Bengali signage wording (India), Bangla script only.

## Compact vs detailed

- **Compact** (Solo / Conversation / Cam): Bangla script only via `BnText` (`lang="bn-IN"`). No romanization, tone, or register chips.
- **Details:** optional **ISO 15919** romanization (`bengaliIso15919.ts` — strict letter-by-letter reading aid, so the inherent vowel shows as `a` even where speech drops it), an আপনি / তুমি / তুই address chip when detectable, and an honesty note.
- **Breakdown:** local Bangla word splitter (keeps ।) with a Bengali-specific LLM path in `apps/api/src/breakdown.ts`.

## Implementation status

**Scaffolded** — `Lang` code `bn` is wired through Solo, Conversation, Cam, Docs, breakdown, TTS prefs, Account Hub voice settings, and `PRIMARY_LANGS`.

- Register: `apps/api/src/bengaliRegister.ts`
- Translation: `translateBengali` (`apps/api/src/translateBengali.ts`), routed from `apps/api/src/translate.ts`
- Client guard: `sanitizeBnTranslation` in `apps/web/src/lib/translationGuard.ts`
- Compact / Details UI: `apps/web/src/components/BnText.tsx`
- Pedagogy: `apps/web/src/lib/bengaliPedagogy.ts` · romanization: `apps/web/src/lib/bengaliIso15919.ts`
- Smoke: `npx tsx apps/web/src/lib/bengali.smoke.ts` · `npx tsx apps/api/src/bengaliRegister.smoke.ts` · `npx tsx apps/web/src/components/batch1Text.smoke.ts`
- Azure: `bn-IN` STT/TTS; iPhone stays on Web Speech (not in `appleNeedsAzureStt`)
- Prefs: `tts_voice_bn` + `primary_lang` (`supabase/migrations/043_tts_voice_batch1_ta_ptpt_tr_bn.sql`)

## Known gaps

- No Account Hub primary UI glosses yet (`primaryUiGloss.data.ts` TODO) — BiText falls back to English-only chrome.
- No phrase / dictionary seeds; translations come from the LLM path.
- iPhone Safari Web Speech support for `bn-IN` is unverified on device.
- TTS loudness equalize gain (`packages/yue-shared/src/ttsVolumeEqualize.ts`) is an untuned starting value.
