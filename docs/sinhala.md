# Sinhala / සිංහල

Target variety for JyutTranslate when lang code is **`si`**: everyday spoken **Sinhala** (සිංහල) as used in Sri Lanka.

Azure Speech locale: **`si-LK`** (TTS `si-LK-ThiliniNeural` default, `si-LK-SameeraNeural`).

## Product rules

- **Not a tone language.** No Cantonese-style tone digits, Chao tone letters, tone chips, or IPA dumps on Solo / Conversation / Cam lines.
- **Writing:** Sinhala script (\\u0D80-\\u0DFF). No Han; keep this language distinct from peers.
- **Register:** colloquial by default (ඔබ / තෝ); formal English (`voiceLangRegister.ts`) gets the respectful address forms.
- **Cam:** natural Sinhala signage wording, same script rules.
- **Code collision:** product code `si` is Sinhala — never confuse with `sichuan`.

## Compact vs detailed

- **Compact** (Solo / Conversation / Cam): Sinhala script via `LangFamilyText` → `IndicText` (`lang="si-LK"`). No romanization, tone, or register chips.
- **Details:** optional ISO 15919 reading + address chip + honesty note.
- **Breakdown:** local word splitter with a Sinhala-specific LLM path in `apps/api/src/breakdown.ts`.

## Implementation status

**Shipped (Batch 3a)** — `Lang` code `si` is wired through Solo, Conversation, Cam, Docs, breakdown, TTS prefs, Account Hub voice settings, and `PRIMARY_LANGS`.

- Register: `inferSourceRegister` in `apps/api/src/voiceLangRegister.ts`
- Translation: `translateSinhala` (`apps/api/src/translateSinhala.ts`, built on `makeVoicePairTranslator`), routed from `apps/api/src/translate.ts`
- Client guard: `sanitizeSiTranslation` in `apps/web/src/lib/translationGuard.ts`
- Compact / Details UI: `apps/web/src/components/LangFamilyText.tsx`
- Pedagogy: `apps/web/src/lib/indicPedagogy.ts` · romanization: `apps/web/src/lib/indicIso15919.ts`
- Smoke: `npx tsx apps/api/src/voiceLangRegister.smoke.ts` · `npx tsx apps/web/src/lib/batch3aPedagogy.smoke.ts` · `npx tsx --tsconfig apps/web/tsconfig.app.json apps/web/src/components/batch3aText.smoke.ts`
- Azure: `si-LK` STT/TTS; iPhone stays on Web Speech (not in `appleNeedsAzureStt`)
- Prefs: `tts_voice_si` + `primary_lang` (`supabase/migrations/045_tts_voice_batch3a.sql`)

## Known gaps

- No Account Hub primary UI glosses yet (`primaryUiGloss.data.ts` TODO) — BiText falls back to English-only chrome.
- No phrase / dictionary seeds; translations come from the LLM path.
- iPhone Safari Web Speech support for `si-LK` is unverified on device.
- TTS loudness equalize gain (`packages/yue-shared/src/ttsVolumeEqualize.ts`) is an untuned starting value.
