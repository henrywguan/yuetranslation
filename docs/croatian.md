# Croatian / Hrvatski

Target variety for JyutTranslate when lang code is **`hr`**: everyday spoken **Croatian** (hrvatski) as used in Croatia.

Azure Speech locale: **`hr-HR`** (TTS `hr-HR-GabrijelaNeural` default, `hr-HR-SreckoNeural`).

## Product rules

- **Not a tone language.** No Cantonese-style tone digits, Chao tone letters, tone chips, or IPA dumps on Solo / Conversation / Cam lines.
- **Writing:** Latin orthography (č ć đ š ž). No Han; keep this language distinct from peers.
- **Register:** colloquial by default (ti / Vi); formal English (`voiceLangRegister.ts`) gets the respectful address forms.
- **Cam:** natural Croatian signage wording, same script rules.


## Compact vs detailed

- **Compact** (Solo / Conversation / Cam): Latin orthography via `LangFamilyText` → `EuroText` (`lang="hr-HR"`). No romanization, tone, or register chips.
- **Details:** address chip when detectable + honesty note.
- **Breakdown:** local word splitter with a Croatian-specific LLM path in `apps/api/src/breakdown.ts`.

## Implementation status

**Shipped (Batch 3a)** — `Lang` code `hr` is wired through Solo, Conversation, Cam, Docs, breakdown, TTS prefs, Account Hub voice settings, and `PRIMARY_LANGS`.

- Register: `inferSourceRegister` in `apps/api/src/voiceLangRegister.ts`
- Translation: `translateCroatian` (`apps/api/src/translateCroatian.ts`, built on `makeVoicePairTranslator`), routed from `apps/api/src/translate.ts`
- Client guard: `sanitizeHrTranslation` in `apps/web/src/lib/translationGuard.ts`
- Compact / Details UI: `apps/web/src/components/LangFamilyText.tsx`
- Pedagogy: `apps/web/src/lib/euroPedagogy.ts`
- Smoke: `npx tsx apps/api/src/voiceLangRegister.smoke.ts` · `npx tsx apps/web/src/lib/batch3aPedagogy.smoke.ts` · `npx tsx --tsconfig apps/web/tsconfig.app.json apps/web/src/components/batch3aText.smoke.ts`
- Azure: `hr-HR` STT/TTS; iPhone stays on Web Speech (not in `appleNeedsAzureStt`)
- Prefs: `tts_voice_hr` + `primary_lang` (`supabase/migrations/045_tts_voice_batch3a.sql`)

## Known gaps

- No Account Hub primary UI glosses yet (`primaryUiGloss.data.ts` TODO) — BiText falls back to English-only chrome.
- No phrase / dictionary seeds; translations come from the LLM path.
- iPhone Safari Web Speech support for `hr-HR` is unverified on device.
- TTS loudness equalize gain (`packages/yue-shared/src/ttsVolumeEqualize.ts`) is an untuned starting value.
