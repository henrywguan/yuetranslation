# Turkish / Türkçe

Target variety for JyutTranslate when lang code is **`tr`**: everyday colloquial **Turkish** (Türkiye, tr-TR).

Azure Speech locale: **`tr-TR`** (TTS `tr-TR-EmelNeural` default, `tr-TR-AhmetNeural`).

## Product rules

- **Not a tone language.** No Cantonese-style tone digits, Chao tone letters, tone chips, or IPA dumps on Solo / Conversation / Cam lines.
- **Writing:** Latin script with correct **ı ğ ş ç ö ü** — never ASCII-folded (`i` for `ı`, `s` for `ş`). Casing is locale-aware: `I` ↔ `ı`, `İ` ↔ `i` (`turkishLower` / `turkishUpper` in `turkishPedagogy.ts` use `tr-TR`). Compact lines carry `lang="tr-TR"` so CSS casing stays correct.
- **Register:** colloquial everyday Turkish by default (sen between peers); when the English source looks legal / medical / official (`turkishRegister.ts`), use **siz** and careful wording.
- **Cam:** natural Turkish signage wording.

## Compact vs detailed

- **Compact** (Solo / Conversation / Cam): Turkish orthography only via `TrText`. No IPA, tone, or register chips.
- **Details:** a sen / siz chip when detectable (`detectTurkishAddress`), plus a vowel-harmony honesty note — suffix vowels follow the stem (two-fold e/a, four-fold i/ı/ü/u; `turkishHarmony`), and the app does not grade harmony.
- **Breakdown:** Latin token breakdown (`latinVoiceBreakdown` in `apps/api/src/breakdown.ts`; offline via `localLatinBreakdown.ts`).

## Implementation status

**Scaffolded** — `Lang` code `tr` is wired through Solo, Conversation, Cam, Docs, breakdown, TTS prefs, Account Hub voice settings, and `PRIMARY_LANGS`.

- Register: `apps/api/src/turkishRegister.ts`
- Translation: `translateTurkish` (`apps/api/src/translateTurkish.ts`), routed from `apps/api/src/translate.ts`
- Client guard: `sanitizeTrTranslation` in `apps/web/src/lib/translationGuard.ts`
- Compact / Details UI: `apps/web/src/components/TrText.tsx`
- Pedagogy: `apps/web/src/lib/turkishPedagogy.ts`
- Smoke: `npx tsx apps/web/src/lib/turkishPedagogy.smoke.ts` · `npx tsx apps/api/src/turkishRegister.smoke.ts` · `npx tsx apps/web/src/components/batch1Text.smoke.ts`
- Azure: `tr-TR` STT/TTS; iPhone stays on Web Speech (not in `appleNeedsAzureStt`)
- Prefs: `tts_voice_tr` + `primary_lang` (`supabase/migrations/043_tts_voice_batch1_ta_ptpt_tr_bn.sql`)

## Known gaps

- No Account Hub primary UI glosses yet (`primaryUiGloss.data.ts` TODO) — BiText falls back to English-only chrome.
- No phrase / dictionary seeds; translations come from the LLM path.
- iPhone Safari Web Speech support for `tr-TR` is unverified on device.
- TTS loudness equalize gain (`packages/yue-shared/src/ttsVolumeEqualize.ts`) is an untuned starting value.
