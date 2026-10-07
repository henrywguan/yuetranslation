# Burmese / မြန်မာ

Target variety for JyutTranslate when lang code is **`my`**: colloquial **standard Burmese** (မြန်မာ) — Myanmar Yangon / media-natural spoken. Not Rakhine, not Shan, not formal literary Burmese by default.

Azure Speech locale: **`my-MM`** (TTS `my-MM-NilarNeural`, `my-MM-ThihaNeural`).

## Status

**Shipped** — dedicated EN↔Burmese translate + register, Conversation copy, Cam prompt, MLCTS compact reading, Details tone chips + honesty, phrase seeds.

## Tones

Four surface tones in Yangon Burmese: **low (level), high, creaky, checked**.

Spelling marks feed the tone (း high, ့ creaky, asat stop finals for checked). Do **not** invent Cantonese-style ASCII tone digits on the learner line.

## Compact vs detailed

- **Compact** (Solo / Conversation / Cam): Myanmar script plus an **MLCTS-style reading** under the line when `analyzeBurmese` parses syllables (`burmeseMlcts.ts`). Tone diacritics: low unmarked, high acute, creaky grave; checked shows a short nucleus + final.
- **Details:** tone-name chips (Low / High / Creaky / Checked) and the MLCTS honesty note.
- **Not used:** Chao tone letters, IPA as the compact line, ASCII tone digits.

If a spelling will not parse (kinzi stacks / rare conjuncts), show the Myanmar script only — do not invent a tone.

## Register

Colloquial Yangon / media Burmese by default; formal when the English source looks legal, medical, or official (`burmeseRegister.ts`).

## Product rules

- Not in `PRIMARY_LANGS` (no BiText gloss pass).
- iPhone stays on Web Speech (`my-MM` / `my`) — do **not** add to `appleNeedsAzureStt`.

## Implementation pointers

- Conversation: `apps/web/src/lib/conversationUi.ts` (`CONVERSATION_PANE_UI.my`)
- Translate: `translateBurmese` in `apps/api/src/translate.ts` + `apps/api/src/burmeseRegister.ts`
- Compact UI: `apps/web/src/components/MyText.tsx` + `apps/web/src/lib/burmeseMlcts.ts`
- Cam: dedicated Burmese system prompt in `apps/api/src/translateCamera.ts`
- Azure: `my-MM` STT/TTS; iPhone Web Speech
- Prefs: `tts_voice_my` (`supabase/migrations/038_tts_voice_scaffold_12.sql`)
- Smokes: `npx tsx apps/web/src/lib/burmeseMlcts.smoke.ts` · `npx tsx apps/api/src/burmeseRegister.smoke.ts`
