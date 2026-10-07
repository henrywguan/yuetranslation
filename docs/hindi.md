# Hindi / हिन्दी (Modern Standard Hindi)

Target variety for JyutTranslate when lang code is **`hi`**: colloquial **Modern Standard Hindi (मानक हिन्दी)**, India everyday speech. Not Urdu-primary, not Hinglish Latin as the compact line.

Azure Speech locale: **`hi-IN`** (TTS `hi-IN-AnanyaNeural`, `hi-IN-AaravNeural`).

## Product rules

- **Not a lexical tone language.** Do not invent Cantonese-style ASCII tone digits or Chao tone letters on Solo / Conversation / Cam lines.
- **Devanagari is the writing system** (`lang="hi"`). Compact UI shows Devanagari only — do **not** dump IAST/ISO under every Solo/Conversation line by default.
- **Details:** optional IAST romanization + address/formality honesty (आप / तुम / तू) when cues are detectable. No Chao. No IPA forced onto the result line.
- **Register:** colloquial by default; more formal/respectful (आप-forms) when the English source looks legal / medical / official (`hindiRegister.ts`).
- **Schwa honesty:** spoken Hindi often drops the inherent schwa; Devanagari keeps the spelling. Do not respell the compact Devanagari line as Hinglish Latin.

## Compact vs detailed

- **Compact** (Solo / Conversation / Cam): Devanagari only. Example: `नमस्ते` — no IAST underneath.
- **Details:** same Devanagari + optional IAST (`namaste`) + formality chip when detectable + short honesty note. No Chao. No IPA.
- **Not in `PRIMARY_LANGS`** (no BiText gloss pass).

## Implementation status

**Shipped** — `Lang` code `hi` is wired end-to-end: Solo, Conversation, Cam, breakdown, TTS prefs, Account Hub voice settings.

- Register: `apps/api/src/hindiRegister.ts`
- Translation: `translateHindi` in `apps/api/src/translate.ts`
- Compact / Details UI: `apps/web/src/components/HiText.tsx`
- IAST + formality: `apps/web/src/lib/hindiRomanization.ts`, `hindiFormality.ts`
- Smoke: `npx tsx apps/web/src/lib/hindi.smoke.ts` · Details UI: `npx tsx --tsconfig apps/web/tsconfig.app.json apps/web/src/components/HiText.smoke.ts`
- Azure: `hi-IN` STT/TTS; iPhone stays on Web Speech (not Azure-forced like `tl` / `wuu` / `sichuan`)
- Prefs: `tts_voice_hi` (`supabase/migrations/038_tts_voice_scaffold_12.sql`)
