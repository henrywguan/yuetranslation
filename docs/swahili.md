# Swahili / Kiswahili

Target variety for JyutTranslate when lang code is **`sw`**: everyday spoken **Swahili** (Kiswahili). Strictly separate from its look-alike peers: own prompts, own voices, own script gate.

Azure Speech locale: **`sw-KE`** (TTS `sw-KE-ZuriNeural` default, `sw-KE-RafikiNeural`).

## Product rules

- **Not a tone language.** No Cantonese-style tone digits, Chao tone letters, tone chips, or IPA dumps on Solo / Conversation / Cam lines.
- **Writing:** Latin orthography; Swahili as used in Kenya (sw-KE). No Han; keep it distinct from peers.
- **Register:** everyday Swahili (**wewe** singular, **nyinyi** plural); no T-V split is forced.
- **Cam:** natural Swahili signage wording, same script rules.

## Compact vs detailed

- **Compact** (Solo / Conversation / Cam): Latin orthography via `LangFamilyText` → `EuroText` (`lang="sw-KE"`). No romanization, tone, or register chips.
- **Details:** address chip when detectable + honesty note.
- **Breakdown:** local Latin word splitter (`localLatinBreakdown.ts`) with a Swahili-specific LLM path in `apps/api/src/breakdown.ts`.

## Implementation status

**Shipped (Batch 3b)** — `Lang` code `sw` is wired through Solo, Conversation, Cam, Docs, breakdown, TTS prefs, Account Hub voice settings, and `PRIMARY_LANGS`.

- Register: `inferSourceRegister` in `apps/api/src/voiceLangRegister.ts`
- Translation: `translateSwahili` (`apps/api/src/translateSwahili.ts`, built on `makeVoicePairTranslator`), routed from `apps/api/src/translate.ts`
- Client guard: `sanitizeSwTranslation` in `apps/web/src/lib/translationGuard.ts`
- Compact / Details UI: `apps/web/src/components/LangFamilyText.tsx`
- Pedagogy: `apps/web/src/lib/euroPedagogy.ts`
- Smoke: `npx tsx apps/api/src/voiceLangRegister.smoke.ts` · `npx tsx apps/web/src/lib/batch3bPedagogy.smoke.ts` · `npx tsx --tsconfig apps/web/tsconfig.app.json apps/web/src/components/batch3bText.smoke.ts`
- Azure: `sw-KE` STT/TTS; iPhone stays on Web Speech (not in `appleNeedsAzureStt`)
- Prefs: `tts_voice_sw` + `primary_lang` (`supabase/migrations/046_tts_voice_batch3b.sql`)

## Known gaps

- No Account Hub primary UI glosses yet (`primaryUiGloss.data.ts` TODO) — BiText falls back to English-only chrome.
- No phrase / dictionary seeds; translations come from the LLM path.
- iPhone Safari Web Speech support for `sw-KE` is unverified on device.
- TTS loudness equalize gain (`packages/yue-shared/src/ttsVolumeEqualize.ts`) is an untuned starting value.
