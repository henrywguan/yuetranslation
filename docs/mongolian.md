# Mongolian / Монгол

Target variety for JyutTranslate when lang code is **`mn`**: everyday spoken **Mongolian** (Монгол). Strictly separate from its look-alike peers: own prompts, own voices, own script gate.

Azure Speech locale: **`mn-MN`** (TTS `mn-MN-YesuiNeural` default, `mn-MN-BataaNeural`).

## Product rules

- **Not a tone language.** No Cantonese-style tone digits, Chao tone letters, tone chips, or IPA dumps on Solo / Conversation / Cam lines.
- **Writing:** Mongolian Cyrillic only (Khalkha), including ө and ү. Never traditional vertical Mongolian script and never Latin as the main line; client and server reject Kazakh / Ukrainian-only letters.
- **Register:** colloquial by default (**чи**); formal English gets **та** address forms.
- **Cam:** natural Mongolian signage wording, same script rules.

- **Mongolian is Cyrillic only** — traditional Mongolian script is not supported.

## Compact vs detailed

- **Compact** (Solo / Conversation / Cam): Cyrillic only (no Latin) via `LangFamilyText` → `CyrillicText` (`lang="mn-MN"`). No romanization, tone, or register chips.
- **Details:** an approximate MNS 5217-style Latin reading (`cyrillicPedagogy.ts`), an address chip (чи / та) when detectable, and an honesty note.
- **Breakdown:** local Cyrillic word splitter (`localScriptBreakdown.ts`) with a Mongolian-specific LLM path in `apps/api/src/breakdown.ts`.

## Implementation status

**Shipped (Batch 4)** — `Lang` code `mn` is wired through Solo, Conversation, Cam, Docs, breakdown, TTS prefs, Account Hub voice settings, and `PRIMARY_LANGS`.

- Register: `inferSourceRegister` in `apps/api/src/voiceLangRegister.ts`
- Translation: `translateMongolian` (`apps/api/src/translateMongolian.ts`, built on `makeVoicePairTranslator`), routed from `apps/api/src/translate.ts`
- Client guard: `sanitizeMnTranslation` in `apps/web/src/lib/translationGuard.ts`
- Compact / Details UI: `apps/web/src/components/LangFamilyText.tsx`
- Pedagogy: `apps/web/src/lib/cyrillicPedagogy.ts`
- Smoke: `npx tsx apps/api/src/voiceLangRegister.smoke.ts` · `npx tsx apps/web/src/lib/batch4Pedagogy.smoke.ts` · `npx tsx --tsconfig apps/web/tsconfig.app.json apps/web/src/components/batch4Text.smoke.ts`
- Azure: `mn-MN` STT/TTS; iPhone stays on Web Speech (not in `appleNeedsAzureStt`)
- Prefs: `tts_voice_mn` + `primary_lang` (`supabase/migrations/047_tts_voice_batch4.sql`)

## Known gaps

- No Account Hub primary UI glosses yet (`primaryUiGloss.data.ts` TODO) — BiText falls back to English-only chrome.
- No phrase / dictionary seeds; translations come from the LLM path.
- iPhone Safari Web Speech support for `mn-MN` is unverified on device.
- TTS loudness equalize gain (`packages/yue-shared/src/ttsVolumeEqualize.ts`) is an untuned starting value.
- UI strings (Conversation mic labels, Solo placeholder, address / honesty notes) are first-pass copy and want native-speaker review.
