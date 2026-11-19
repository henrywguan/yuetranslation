# Polish / Polski

Target variety for JyutTranslate when lang code is **`pl`**: everyday **Polish** (polski) as used in Poland.

Azure Speech locale: **`pl-PL`** (TTS `pl-PL-AgnieszkaNeural` default, `pl-PL-MarekNeural`).

## Product rules

- **Not a tone language.** No Cantonese-style tone digits, Chao tone letters, tone chips, or IPA dumps on Solo / Conversation / Cam lines.
- **Writing:** Latin orthography with ą ć ę ł ń ó ś ź ż — never ASCII-folded. No Han.
- **Register:** colloquial by default (**ty** between friends); formal English gets **Pan / Pani** address.
- **Cam:** natural Polish signage wording, same script rules.

## Compact vs detailed

- **Compact** (Solo / Conversation / Cam): Polish orthography via `LangFamilyText` → `EuroText` (`lang="pl-PL"`). No romanization, tone, or register chips.
- **Details:** a ty / Pan(i) chip when detectable and a stress honesty note (penultimate stress; ą ę nasal).
- **Breakdown:** local word splitter with a Polish-specific LLM path in `apps/api/src/breakdown.ts`.

## Implementation status

**Shipped (Batch 2)** — `Lang` code `pl` is wired through Solo, Conversation, Cam, Docs, breakdown, TTS prefs, Account Hub voice settings, and `PRIMARY_LANGS`.

- Register: `inferSourceRegister` in `apps/api/src/voiceLangRegister.ts`
- Translation: `translatePolish` (`apps/api/src/translatePolish.ts`, built on `makeVoicePairTranslator`), routed from `apps/api/src/translate.ts`
- Client guard: `sanitizePlTranslation` in `apps/web/src/lib/translationGuard.ts`
- Compact / Details UI: `apps/web/src/components/LangFamilyText.tsx`
- Pedagogy: `apps/web/src/lib/euroPedagogy.ts`
- Smoke: `npx tsx apps/api/src/voiceLangRegister.smoke.ts` · `npx tsx apps/web/src/lib/batch2Pedagogy.smoke.ts` · `npx tsx --tsconfig apps/web/tsconfig.app.json apps/web/src/components/batch2Text.smoke.ts`
- Azure: `pl-PL` STT/TTS; iPhone stays on Web Speech (not in `appleNeedsAzureStt`)
- Prefs: `tts_voice_pl` + `primary_lang` (`supabase/migrations/044_tts_voice_batch2.sql`)

## Known gaps

- No Account Hub primary UI glosses yet (`primaryUiGloss.data.ts` TODO) — BiText falls back to English-only chrome.
- No phrase / dictionary seeds; translations come from the LLM path.
- iPhone Safari Web Speech support for `pl-PL` is unverified on device.
- TTS loudness equalize gain (`packages/yue-shared/src/ttsVolumeEqualize.ts`) is an untuned starting value.
