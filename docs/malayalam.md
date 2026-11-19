# Malayalam / മലയാളം

Target variety for JyutTranslate when lang code is **`ml`**: everyday spoken **Malayalam** (മലയാളം) as used in Kerala.

Azure Speech locale: **`ml-IN`** (TTS `ml-IN-SobhanaNeural` default, `ml-IN-MidhunNeural`).

## Product rules

- **Not a tone language.** No Cantonese-style tone digits, Chao tone letters, tone chips, or IPA dumps on Solo / Conversation / Cam lines.
- **Writing:** Malayalam script (U+0D00–U+0D7F). No Han; keep this language distinct from peers.
- **Register:** colloquial by default (നിങ്ങൾ / നീ); formal English (`voiceLangRegister.ts`) gets the respectful address forms.
- **Cam:** natural Malayalam signage wording, same script rules.


## Compact vs detailed

- **Compact** (Solo / Conversation / Cam): Malayalam script via `LangFamilyText` → `IndicText` (`lang="ml-IN"`). No romanization, tone, or register chips.
- **Details:** optional ISO 15919 reading + address chip + honesty note.
- **Breakdown:** local word splitter with a Malayalam-specific LLM path in `apps/api/src/breakdown.ts`.

## Implementation status

**Shipped (Batch 3a)** — `Lang` code `ml` is wired through Solo, Conversation, Cam, Docs, breakdown, TTS prefs, Account Hub voice settings, and `PRIMARY_LANGS`.

- Register: `inferSourceRegister` in `apps/api/src/voiceLangRegister.ts`
- Translation: `translateMalayalam` (`apps/api/src/translateMalayalam.ts`, built on `makeVoicePairTranslator`), routed from `apps/api/src/translate.ts`
- Client guard: `sanitizeMlTranslation` in `apps/web/src/lib/translationGuard.ts`
- Compact / Details UI: `apps/web/src/components/LangFamilyText.tsx`
- Pedagogy: `apps/web/src/lib/indicPedagogy.ts` · romanization: `apps/web/src/lib/indicIso15919.ts`
- Smoke: `npx tsx apps/api/src/voiceLangRegister.smoke.ts` · `npx tsx apps/web/src/lib/batch3aPedagogy.smoke.ts` · `npx tsx --tsconfig apps/web/tsconfig.app.json apps/web/src/components/batch3aText.smoke.ts`
- Azure: `ml-IN` STT/TTS; iPhone stays on Web Speech (not in `appleNeedsAzureStt`)
- Prefs: `tts_voice_ml` + `primary_lang` (`supabase/migrations/045_tts_voice_batch3a.sql`)

## Known gaps

- No Account Hub primary UI glosses yet (`primaryUiGloss.data.ts` TODO) — BiText falls back to English-only chrome.
- No phrase / dictionary seeds; translations come from the LLM path.
- iPhone Safari Web Speech support for `ml-IN` is unverified on device.
- TTS loudness equalize gain (`packages/yue-shared/src/ttsVolumeEqualize.ts`) is an untuned starting value.
