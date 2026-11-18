# European Portuguese / Português europeu

Target variety for JyutTranslate when lang code is **`ptpt`**: everyday **European Portuguese** (Portugal, pt-PT), AO90 spelling. Brazilian Portuguese is a separate peer code, **`pt`** ([brazilian-portuguese.md](brazilian-portuguese.md)), like `es` / `eses` and `ar` / `arsa`.

Azure Speech locale: **`pt-PT`** (TTS `pt-PT-RaquelNeural` default, `pt-PT-DuarteNeural`).

## Product rules

- **Never cross variants.** `pt-PT` always maps to `ptpt`; `pt-BR` and bare `pt` map to `pt`. Locale maps check `pt-PT` first. TTS voices, translate prompts, and honesty copy are never shared between the two codes.
- **Portugal norms and lexicon:** autocarro (not ônibus), comboio (not trem), telemóvel (not celular), pequeno-almoço (not café da manhã), casa de banho (not banheiro); `estar a + infinitive` (estou a falar), not the Brazilian gerund; European clitic placement.
- **Spelling:** AO90 (facto, receção, ação) with European accents (económico, António, género).
- **Not a tone language.** Lexical stress is orthographic (acute / circumflex) — no tone digits, Chao tone letters, or IPA dumps on compact lines.
- **Register:** colloquial by default (tu between peers); when the English source looks legal / medical / official (`europeanPortugueseRegister.ts`), use **o senhor / a senhora** (or 3rd-person verbs without *você*) and careful wording.
- **Cam:** Portugal signage wording.

## Compact vs detailed

- **Compact** (Solo / Conversation / Cam): pt-PT orthography only via `PtptText` (`lang="pt-PT"`).
- **Details:** stress chips (oxítona / paroxítona / proparoxítona — reusing the shared stress classifier through `europeanPortugueseStress.ts`) and a vowel-reduction honesty note (unstressed vowels are reduced or dropped in Portugal speech).
- **Breakdown:** Latin token breakdown (`latinVoiceBreakdown` in `apps/api/src/breakdown.ts`; offline via `localLatinBreakdown.ts`).

## Implementation status

**Scaffolded** — `Lang` code `ptpt` is wired through Solo, Conversation, Cam, Docs, breakdown, TTS prefs, Account Hub voice settings, and `PRIMARY_LANGS`.

- Register: `apps/api/src/europeanPortugueseRegister.ts`
- Translation: `translateEuropeanPortuguese` (`apps/api/src/translateEuropeanPortuguese.ts`), routed from `apps/api/src/translate.ts`
- Client guard: `sanitizePtptTranslation` in `apps/web/src/lib/translationGuard.ts`
- Compact / Details UI: `apps/web/src/components/PtptText.tsx`
- Pedagogy: `apps/web/src/lib/europeanPortugueseStress.ts`
- Smoke: `npx tsx apps/web/src/lib/europeanPortugueseStress.smoke.ts` · `npx tsx apps/api/src/europeanPortugueseRegister.smoke.ts` · `npx tsx apps/web/src/components/batch1Text.smoke.ts`
- Azure: `pt-PT` STT/TTS; iPhone stays on Web Speech (not in `appleNeedsAzureStt`)
- Prefs: `tts_voice_ptpt` + `primary_lang` (`supabase/migrations/043_tts_voice_batch1_ta_ptpt_tr_bn.sql`)

## Known gaps

- No Account Hub primary UI glosses yet (`primaryUiGloss.data.ts` TODO) — BiText falls back to English-only chrome.
- No phrase / dictionary seeds; translations come from the LLM path.
- iPhone Safari Web Speech support for `pt-PT` is unverified on device.
- TTS loudness equalize gain (`packages/yue-shared/src/ttsVolumeEqualize.ts`) is an untuned starting value.
