# Kazakh / Қазақша

Target variety for JyutTranslate when lang code is **`kk`**: everyday spoken **Kazakh** (Қазақша). Strictly separate from its look-alike peers: own prompts, own voices, own script gate.

Azure Speech locale: **`kk-KZ`** (TTS `kk-KZ-AigulNeural` default, `kk-KZ-DauletNeural`).

## Product rules

- **Not a tone language.** No Cantonese-style tone digits, Chao tone letters, tone chips, or IPA dumps on Solo / Conversation / Cam lines.
- **Writing:** Kazakh Cyrillic only, including ә ғ қ ң ө ұ ү һ і. Never Latin as the main line and never Arabic script; client and server reject payloads without Cyrillic. Keep it distinct from Russian.
- **Register:** colloquial by default (**сен**); formal English gets **сіз** address forms.
- **Cam:** natural Kazakh signage wording, same script rules.

## Compact vs detailed

- **Compact** (Solo / Conversation / Cam): Cyrillic only (no Latin) via `LangFamilyText` → `CyrillicText` (`lang="kk-KZ"`). No romanization, tone, or register chips.
- **Details:** a BGN/PCGN-style Latin reading (`cyrillicPedagogy.ts`), an address chip when detectable, and an honesty note.
- **Breakdown:** local Cyrillic word splitter (`localScriptBreakdown.ts`) with a Kazakh-specific LLM path in `apps/api/src/breakdown.ts`.

## Implementation status

**Shipped (Batch 3b)** — `Lang` code `kk` is wired through Solo, Conversation, Cam, Docs, breakdown, TTS prefs, Account Hub voice settings, and `PRIMARY_LANGS`.

- Register: `inferSourceRegister` in `apps/api/src/voiceLangRegister.ts`
- Translation: `translateKazakh` (`apps/api/src/translateKazakh.ts`, built on `makeVoicePairTranslator`), routed from `apps/api/src/translate.ts`
- Client guard: `sanitizeKkTranslation` in `apps/web/src/lib/translationGuard.ts`
- Compact / Details UI: `apps/web/src/components/LangFamilyText.tsx`
- Pedagogy: `apps/web/src/lib/cyrillicPedagogy.ts`
- Smoke: `npx tsx apps/api/src/voiceLangRegister.smoke.ts` · `npx tsx apps/web/src/lib/batch3bPedagogy.smoke.ts` · `npx tsx --tsconfig apps/web/tsconfig.app.json apps/web/src/components/batch3bText.smoke.ts`
- Azure: `kk-KZ` STT/TTS; iPhone stays on Web Speech (not in `appleNeedsAzureStt`)
- Prefs: `tts_voice_kk` + `primary_lang` (`supabase/migrations/046_tts_voice_batch3b.sql`)

## Known gaps

- No Account Hub primary UI glosses yet (`primaryUiGloss.data.ts` TODO) — BiText falls back to English-only chrome.
- No phrase / dictionary seeds; translations come from the LLM path.
- iPhone Safari Web Speech support for `kk-KZ` is unverified on device.
- TTS loudness equalize gain (`packages/yue-shared/src/ttsVolumeEqualize.ts`) is an untuned starting value.
