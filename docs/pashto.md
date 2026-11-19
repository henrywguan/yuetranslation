# Pashto / پښتو

Target variety for JyutTranslate when lang code is **`ps`**: everyday spoken **Pashto** (پښتو). Strictly separate from its look-alike peers: own prompts, own voices, own script gate.

Azure Speech locale: **`ps-AF`** (TTS `ps-AF-LatifaNeural` default, `ps-AF-GulNawazNeural`).

## Product rules

- **Not a tone language.** No Cantonese-style tone digits, Chao tone letters, tone chips, or IPA dumps on Solo / Conversation / Cam lines.
- **Writing:** Perso-Arabic script with Pashto letters (ټ ډ ړ ږ ښ ڼ ځ څ ې ۍ ګ), right-to-left. Never Persian / Dari wording, never Latin transliteration; client and server reject Devanagari and payloads without Arabic-block script.
- **Register:** colloquial by default (**ته**); formal English gets **تاسو** address forms.
- **Cam:** natural Pashto signage wording, same script rules.

## Compact vs detailed

- **Compact** (Solo / Conversation / Cam): RTL Pashto script only via `LangFamilyText` → `RtlText` (`lang="ps-AF"`, `dir="rtl"`). No romanization, tone, or register chips.
- **Details:** an address chip (ته / تاسو) when unambiguous and an honesty note (not Persian / Dari; short vowels unwritten). No Latin reading.
- **Breakdown:** local script word splitter (`localScriptBreakdown.ts`) with a Pashto-specific LLM path in `apps/api/src/breakdown.ts`.

## Implementation status

**Shipped (Batch 4)** — `Lang` code `ps` is wired through Solo, Conversation, Cam, Docs, breakdown, TTS prefs, Account Hub voice settings, and `PRIMARY_LANGS`.

- Register: `inferSourceRegister` in `apps/api/src/voiceLangRegister.ts`
- Translation: `translatePashto` (`apps/api/src/translatePashto.ts`, built on `makeVoicePairTranslator`), routed from `apps/api/src/translate.ts`
- Client guard: `sanitizePsTranslation` in `apps/web/src/lib/translationGuard.ts`
- Compact / Details UI: `apps/web/src/components/LangFamilyText.tsx`
- Pedagogy: `apps/web/src/lib/rtlPedagogy.ts`
- Smoke: `npx tsx apps/api/src/voiceLangRegister.smoke.ts` · `npx tsx apps/web/src/lib/batch4Pedagogy.smoke.ts` · `npx tsx --tsconfig apps/web/tsconfig.app.json apps/web/src/components/batch4Text.smoke.ts`
- Azure: `ps-AF` STT/TTS; iPhone stays on Web Speech (not in `appleNeedsAzureStt`)
- Prefs: `tts_voice_ps` + `primary_lang` (`supabase/migrations/047_tts_voice_batch4.sql`)

## Known gaps

- No Account Hub primary UI glosses yet (`primaryUiGloss.data.ts` TODO) — BiText falls back to English-only chrome.
- No phrase / dictionary seeds; translations come from the LLM path.
- iPhone Safari Web Speech support for `ps-AF` is unverified on device.
- TTS loudness equalize gain (`packages/yue-shared/src/ttsVolumeEqualize.ts`) is an untuned starting value.
- UI strings (Conversation mic labels, Solo placeholder, address / honesty notes) are first-pass copy and want native-speaker review.
