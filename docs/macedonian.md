# Macedonian / Македонски

Target variety for JyutTranslate when lang code is **`mk`**: everyday spoken **Macedonian** (Македонски). Strictly separate from its look-alike peers: own prompts, own voices, own script gate.

Azure Speech locale: **`mk-MK`** (TTS `mk-MK-MarijaNeural` default, `mk-MK-AleksandarNeural`).

## Product rules

- **Not a tone language.** No Cantonese-style tone digits, Chao tone letters, tone chips, or IPA dumps on Solo / Conversation / Cam lines.
- **Writing:** Macedonian Cyrillic only, including ѓ ќ ѕ љ њ џ ј. Never Latin as the main line; client and server reject Russian / Ukrainian / Serbian-only letters. Distinct from Bulgarian and Serbian.
- **Register:** colloquial by default (**ти**); formal English gets **Вие** address forms.
- **Cam:** natural Macedonian signage wording, same script rules.

## Compact vs detailed

- **Compact** (Solo / Conversation / Cam): Cyrillic only (no Latin) via `LangFamilyText` → `CyrillicText` (`lang="mk-MK"`). No romanization, tone, or register chips.
- **Details:** a BGN/PCGN Latin reading (`cyrillicPedagogy.ts`), an address chip (ти / Вие) when detectable, and an honesty note.
- **Breakdown:** local Cyrillic word splitter (`localScriptBreakdown.ts`) with a Macedonian-specific LLM path in `apps/api/src/breakdown.ts`.

## Implementation status

**Shipped (Batch 4)** — `Lang` code `mk` is wired through Solo, Conversation, Cam, Docs, breakdown, TTS prefs, Account Hub voice settings, and `PRIMARY_LANGS`.

- Register: `inferSourceRegister` in `apps/api/src/voiceLangRegister.ts`
- Translation: `translateMacedonian` (`apps/api/src/translateMacedonian.ts`, built on `makeVoicePairTranslator`), routed from `apps/api/src/translate.ts`
- Client guard: `sanitizeMkTranslation` in `apps/web/src/lib/translationGuard.ts`
- Compact / Details UI: `apps/web/src/components/LangFamilyText.tsx`
- Pedagogy: `apps/web/src/lib/cyrillicPedagogy.ts`
- Smoke: `npx tsx apps/api/src/voiceLangRegister.smoke.ts` · `npx tsx apps/web/src/lib/batch4Pedagogy.smoke.ts` · `npx tsx --tsconfig apps/web/tsconfig.app.json apps/web/src/components/batch4Text.smoke.ts`
- Azure: `mk-MK` STT/TTS; iPhone stays on Web Speech (not in `appleNeedsAzureStt`)
- Prefs: `tts_voice_mk` + `primary_lang` (`supabase/migrations/047_tts_voice_batch4.sql`)

## Known gaps

- No Account Hub primary UI glosses yet (`primaryUiGloss.data.ts` TODO) — BiText falls back to English-only chrome.
- No phrase / dictionary seeds; translations come from the LLM path.
- iPhone Safari Web Speech support for `mk-MK` is unverified on device.
- TTS loudness equalize gain (`packages/yue-shared/src/ttsVolumeEqualize.ts`) is an untuned starting value.
- UI strings (Conversation mic labels, Solo placeholder, address / honesty notes) are first-pass copy and want native-speaker review.
