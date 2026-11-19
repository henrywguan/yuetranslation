# Uzbek / O‘zbekcha

Target variety for JyutTranslate when lang code is **`uz`**: everyday spoken **Uzbek** (O‘zbekcha). Strictly separate from its look-alike peers: own prompts, own voices, own script gate.

Azure Speech locale: **`uz-UZ`** (TTS `uz-UZ-MadinaNeural` default, `uz-UZ-SardorNeural`).

## Product rules

- **Not a tone language.** No Cantonese-style tone digits, Chao tone letters, tone chips, or IPA dumps on Solo / Conversation / Cam lines.
- **Writing:** Latin orthography (o‘ g‘ sh ch ng). Never Cyrillic or Arabic script; client and server reject payloads in those scripts.
- **Register:** colloquial by default (**sen**); formal English gets **siz** address forms.
- **Cam:** natural Uzbek signage wording, same script rules.

## Compact vs detailed

- **Compact** (Solo / Conversation / Cam): Latin orthography via `LangFamilyText` → `EuroText` (`lang="uz-UZ"`). No romanization, tone, or register chips.
- **Details:** address chip when detectable + honesty note.
- **Breakdown:** local Latin word splitter (`localLatinBreakdown.ts`) with a Uzbek-specific LLM path in `apps/api/src/breakdown.ts`.

## Implementation status

**Shipped (Batch 3b)** — `Lang` code `uz` is wired through Solo, Conversation, Cam, Docs, breakdown, TTS prefs, Account Hub voice settings, and `PRIMARY_LANGS`.

- Register: `inferSourceRegister` in `apps/api/src/voiceLangRegister.ts`
- Translation: `translateUzbek` (`apps/api/src/translateUzbek.ts`, built on `makeVoicePairTranslator`), routed from `apps/api/src/translate.ts`
- Client guard: `sanitizeUzTranslation` in `apps/web/src/lib/translationGuard.ts`
- Compact / Details UI: `apps/web/src/components/LangFamilyText.tsx`
- Pedagogy: `apps/web/src/lib/euroPedagogy.ts`
- Smoke: `npx tsx apps/api/src/voiceLangRegister.smoke.ts` · `npx tsx apps/web/src/lib/batch3bPedagogy.smoke.ts` · `npx tsx --tsconfig apps/web/tsconfig.app.json apps/web/src/components/batch3bText.smoke.ts`
- Azure: `uz-UZ` STT/TTS; iPhone stays on Web Speech (not in `appleNeedsAzureStt`)
- Prefs: `tts_voice_uz` + `primary_lang` (`supabase/migrations/046_tts_voice_batch3b.sql`)

## Known gaps

- No Account Hub primary UI glosses yet (`primaryUiGloss.data.ts` TODO) — BiText falls back to English-only chrome.
- No phrase / dictionary seeds; translations come from the LLM path.
- iPhone Safari Web Speech support for `uz-UZ` is unverified on device.
- TTS loudness equalize gain (`packages/yue-shared/src/ttsVolumeEqualize.ts`) is an untuned starting value.
