# Nepali / नेपाली

Target variety for JyutTranslate when lang code is **`ne`**: everyday spoken **Nepali** (नेपाली) as used in Nepal.

Azure Speech locale: **`ne-NP`** (TTS `ne-NP-HemkalaNeural` default, `ne-NP-SagarNeural`).

## Product rules

- **Not a tone language.** No Cantonese-style tone digits, Chao tone letters, tone chips, or IPA dumps on Solo / Conversation / Cam lines.
- **Writing:** Devanagari (U+0900–U+097F). No Han; keep this language distinct from peers.
- **Register:** colloquial by default (तपाईं / तिमी); formal English (`voiceLangRegister.ts`) gets the respectful address forms.
- **Cam:** natural Nepali signage wording, same script rules.


## Compact vs detailed

- **Compact** (Solo / Conversation / Cam): Devanagari via `LangFamilyText` → `IndicText` (`lang="ne-NP"`). No romanization, tone, or register chips.
- **Details:** optional ISO 15919 reading + address chip + honesty note.
- **Breakdown:** local word splitter with a Nepali-specific LLM path in `apps/api/src/breakdown.ts`.

## Implementation status

**Shipped (Batch 3a)** — `Lang` code `ne` is wired through Solo, Conversation, Cam, Docs, breakdown, TTS prefs, Account Hub voice settings, and `PRIMARY_LANGS`.

- Register: `inferSourceRegister` in `apps/api/src/voiceLangRegister.ts`
- Translation: `translateNepali` (`apps/api/src/translateNepali.ts`, built on `makeVoicePairTranslator`), routed from `apps/api/src/translate.ts`
- Client guard: `sanitizeNeTranslation` in `apps/web/src/lib/translationGuard.ts`
- Compact / Details UI: `apps/web/src/components/LangFamilyText.tsx`
- Pedagogy: `apps/web/src/lib/indicPedagogy.ts` · romanization: `apps/web/src/lib/indicIso15919.ts`
- Smoke: `npx tsx apps/api/src/voiceLangRegister.smoke.ts` · `npx tsx apps/web/src/lib/batch3aPedagogy.smoke.ts` · `npx tsx --tsconfig apps/web/tsconfig.app.json apps/web/src/components/batch3aText.smoke.ts`
- Azure: `ne-NP` STT/TTS; iPhone stays on Web Speech (not in `appleNeedsAzureStt`)
- Prefs: `tts_voice_ne` + `primary_lang` (`supabase/migrations/045_tts_voice_batch3a.sql`)

## Known gaps

- No Account Hub primary UI glosses yet (`primaryUiGloss.data.ts` TODO) — BiText falls back to English-only chrome.
- No phrase / dictionary seeds; translations come from the LLM path.
- iPhone Safari Web Speech support for `ne-NP` is unverified on device.
- TTS loudness equalize gain (`packages/yue-shared/src/ttsVolumeEqualize.ts`) is an untuned starting value.
