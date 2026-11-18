# Romanian / Română

Target variety for JyutTranslate when lang code is **`ro`**: everyday **Romanian** (română) as used in Romania.

Azure Speech locale: **`ro-RO`** (TTS `ro-RO-AlinaNeural` default, `ro-RO-EmilNeural`).

## Product rules

- **Not a tone language.** No Cantonese-style tone digits, Chao tone letters, tone chips, or IPA dumps on Solo / Conversation / Cam lines.
- **Writing:** Latin orthography with ă â î and **comma-below ș ț** (never cedilla ş ţ) — never ASCII-folded. No Han.
- **Register:** colloquial by default (**tu**); formal English gets **dumneavoastră** address.
- **Cam:** natural Romanian signage wording, same script rules.

## Compact vs detailed

- **Compact** (Solo / Conversation / Cam): Romanian orthography via `LangFamilyText` → `EuroText` (`lang="ro-RO"`). No romanization, tone, or register chips.
- **Details:** a tu / dumneavoastră chip when detectable and an honesty note (stress unmarked, comma-below letters).
- **Breakdown:** local word splitter with a Romanian-specific LLM path in `apps/api/src/breakdown.ts`.

## Implementation status

**Shipped (Batch 2)** — `Lang` code `ro` is wired through Solo, Conversation, Cam, Docs, breakdown, TTS prefs, Account Hub voice settings, and `PRIMARY_LANGS`.

- Register: `inferSourceRegister` in `apps/api/src/voiceLangRegister.ts`
- Translation: `translateRomanian` (`apps/api/src/translateRomanian.ts`, built on `makeVoicePairTranslator`), routed from `apps/api/src/translate.ts`
- Client guard: `sanitizeRoTranslation` in `apps/web/src/lib/translationGuard.ts`
- Compact / Details UI: `apps/web/src/components/LangFamilyText.tsx`
- Pedagogy: `apps/web/src/lib/euroPedagogy.ts`
- Smoke: `npx tsx apps/api/src/voiceLangRegister.smoke.ts` · `npx tsx apps/web/src/lib/batch2Pedagogy.smoke.ts` · `npx tsx --tsconfig apps/web/tsconfig.app.json apps/web/src/components/batch2Text.smoke.ts`
- Azure: `ro-RO` STT/TTS; iPhone stays on Web Speech (not in `appleNeedsAzureStt`)
- Prefs: `tts_voice_ro` + `primary_lang` (`supabase/migrations/044_tts_voice_batch2.sql`)

## Known gaps

- No Account Hub primary UI glosses yet (`primaryUiGloss.data.ts` TODO) — BiText falls back to English-only chrome.
- No phrase / dictionary seeds; translations come from the LLM path.
- iPhone Safari Web Speech support for `ro-RO` is unverified on device.
- TTS loudness equalize gain (`packages/yue-shared/src/ttsVolumeEqualize.ts`) is an untuned starting value.
