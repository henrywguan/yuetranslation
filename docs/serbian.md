# Serbian / Српски

Target variety for JyutTranslate when lang code is **`sr`**: everyday spoken **Serbian** (Српски). Strictly separate from its look-alike peers: own prompts, own voices, own script gate.

Azure Speech locale: **`sr-RS`** (TTS `sr-RS-SophieNeural` default, `sr-RS-NicholasNeural`).

## Product rules

- **Not a tone language.** No Cantonese-style tone digits, Chao tone letters, tone chips, or IPA dumps on Solo / Conversation / Cam lines.
- **Writing:** **Cyrillic only — never Latin.** Serbian Cyrillic (ј љ њ ђ ћ џ); client and server reject Latin Serbian (č ć š ž đ) and payloads without Cyrillic. Azure locale is `sr-RS`; UI `lang` tags use `sr-Cyrl-RS`.
- **Register:** colloquial by default (**ти**); formal English gets **Ви** address forms.
- **Cam:** natural Serbian signage wording, same script rules.

## Compact vs detailed

- **Compact** (Solo / Conversation / Cam): Cyrillic only (no Latin) via `LangFamilyText` → `CyrillicText` (`lang="sr-Cyrl-RS"`). No romanization, tone, or register chips.
- **Details:** an address chip when detectable and an honesty note. **No Latin reading line** — Serbian stays Cyrillic only.
- **Breakdown:** local Cyrillic word splitter (`localScriptBreakdown.ts`) with a Serbian-specific LLM path in `apps/api/src/breakdown.ts`.

## Implementation status

**Shipped (Batch 3b)** — `Lang` code `sr` is wired through Solo, Conversation, Cam, Docs, breakdown, TTS prefs, Account Hub voice settings, and `PRIMARY_LANGS`.

- Register: `inferSourceRegister` in `apps/api/src/voiceLangRegister.ts`
- Translation: `translateSerbian` (`apps/api/src/translateSerbian.ts`, built on `makeVoicePairTranslator`), routed from `apps/api/src/translate.ts`
- Client guard: `sanitizeSrTranslation` in `apps/web/src/lib/translationGuard.ts`
- Compact / Details UI: `apps/web/src/components/LangFamilyText.tsx`
- Pedagogy: `apps/web/src/lib/cyrillicPedagogy.ts`
- Smoke: `npx tsx apps/api/src/voiceLangRegister.smoke.ts` · `npx tsx apps/web/src/lib/batch3bPedagogy.smoke.ts` · `npx tsx --tsconfig apps/web/tsconfig.app.json apps/web/src/components/batch3bText.smoke.ts`
- Azure: `sr-RS` STT/TTS; iPhone stays on Web Speech (not in `appleNeedsAzureStt`)
- Prefs: `tts_voice_sr` + `primary_lang` (`supabase/migrations/046_tts_voice_batch3b.sql`)

## Known gaps

- No Account Hub primary UI glosses yet (`primaryUiGloss.data.ts` TODO) — BiText falls back to English-only chrome.
- No phrase / dictionary seeds; translations come from the LLM path.
- iPhone Safari Web Speech support for `sr-RS` is unverified on device.
- TTS loudness equalize gain (`packages/yue-shared/src/ttsVolumeEqualize.ts`) is an untuned starting value.
