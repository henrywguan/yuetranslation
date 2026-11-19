# Finnish / Suomi

Target variety for JyutTranslate when lang code is **`fi`**: everyday spoken **Finnish** (suomi) as used in Finland.

Azure Speech locale: **`fi-FI`** (TTS `fi-FI-SelmaNeural` default, `fi-FI-HarriNeural`).

## Product rules

- **Not a tone language.** No Cantonese-style tone digits, Chao tone letters, tone chips, or IPA dumps on Solo / Conversation / Cam lines.
- **Writing:** Latin orthography (ä ö). No Han; keep this language distinct from peers.
- **Register:** colloquial by default (sinä / te); formal English (`voiceLangRegister.ts`) gets the respectful address forms.
- **Cam:** natural Finnish signage wording, same script rules.


## Compact vs detailed

- **Compact** (Solo / Conversation / Cam): Latin orthography via `LangFamilyText` → `EuroText` (`lang="fi-FI"`). No romanization, tone, or register chips.
- **Details:** address chip when detectable + honesty note.
- **Breakdown:** local word splitter with a Finnish-specific LLM path in `apps/api/src/breakdown.ts`.

## Implementation status

**Shipped (Batch 3a)** — `Lang` code `fi` is wired through Solo, Conversation, Cam, Docs, breakdown, TTS prefs, Account Hub voice settings, and `PRIMARY_LANGS`.

- Register: `inferSourceRegister` in `apps/api/src/voiceLangRegister.ts`
- Translation: `translateFinnish` (`apps/api/src/translateFinnish.ts`, built on `makeVoicePairTranslator`), routed from `apps/api/src/translate.ts`
- Client guard: `sanitizeFiTranslation` in `apps/web/src/lib/translationGuard.ts`
- Compact / Details UI: `apps/web/src/components/LangFamilyText.tsx`
- Pedagogy: `apps/web/src/lib/euroPedagogy.ts`
- Smoke: `npx tsx apps/api/src/voiceLangRegister.smoke.ts` · `npx tsx apps/web/src/lib/batch3aPedagogy.smoke.ts` · `npx tsx --tsconfig apps/web/tsconfig.app.json apps/web/src/components/batch3aText.smoke.ts`
- Azure: `fi-FI` STT/TTS; iPhone stays on Web Speech (not in `appleNeedsAzureStt`)
- Prefs: `tts_voice_fi` + `primary_lang` (`supabase/migrations/045_tts_voice_batch3a.sql`)

## Known gaps

- No Account Hub primary UI glosses yet (`primaryUiGloss.data.ts` TODO) — BiText falls back to English-only chrome.
- No phrase / dictionary seeds; translations come from the LLM path.
- iPhone Safari Web Speech support for `fi-FI` is unverified on device.
- TTS loudness equalize gain (`packages/yue-shared/src/ttsVolumeEqualize.ts`) is an untuned starting value.
