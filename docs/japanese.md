# Japanese / 日本語 (共通語)

Target variety for JyutTranslate when lang code is **`ja`**: colloquial **modern standard Japanese (共通語)**, Tokyo / national media Japanese. Not Kansai-ben as default, not classical written style.

Azure Speech locale: **`ja-JP`** (TTS `ja-JP-NanamiNeural`, `ja-JP-KeitaNeural`).

## Product rules

- **Not a lexical tone language.** Do not invent Cantonese-style ASCII tone digits, Chao tone letters, or IPA on Solo / Conversation / Cam compact lines.
- **Natural Japanese orthography** (`lang="ja"`): kanji + kana. Compact lines show that writing only — do **not** dump romaji under every Solo / Conversation line by default.
- **Speech level / politeness** carries social meaning (です・ます vs 普通形 / plain, plus rarer 敬語). Colloquial by default; formal です・ます / keigo when the English source looks legal / medical / official.
- Register: colloquial by default; formal when source looks legal/medical/official (`japaneseRegister.ts`).
- Kanji is part of Japanese writing — do not strip Han from Japanese output the way Korean strips Han. Reject long Chinese-only lines that lack kana.

## Compact vs detailed

- **Compact** (Solo / Conversation / Cam): Japanese orthography only. No romaji row, no IPA, no Chao.
- **Details:** same orthography, plus optional Hepburn reading when the phrase is known or kana-only (`japaneseReading.ts`), a politeness chip when endings are detectable (`japanesePoliteness.ts`), and a short honesty note. No Chao. No IPA on the compact path.
- **Not yet (optional later):** full furigana / morphological kanji readings for arbitrary mixed text.

## Implementation status

**Shipped** — `Lang` code `ja` is wired end-to-end: Solo, Conversation, Cam, breakdown, TTS prefs, Account Hub voice settings. Not in `PRIMARY_LANGS` (no full BiText gloss pass).

- Register: `apps/api/src/japaneseRegister.ts`
- Translation: `translateJapanese` in `apps/api/src/translate.ts`
- Compact / Details UI: `apps/web/src/components/JaText.tsx`
- Reading + politeness: `apps/web/src/lib/japaneseReading.ts`, `japanesePoliteness.ts`
- Smoke: `npx tsx apps/web/src/lib/japanese.smoke.ts` · compact/Details UI: `npx tsx --tsconfig apps/web/tsconfig.app.json apps/web/src/components/JaText.smoke.ts` · register: `npx tsx apps/api/src/japaneseRegister.smoke.ts`
- Azure: `ja-JP` STT/TTS; iPhone stays on Web Speech (not Azure-forced like `tl` / `wuu` / `sichuan`)
- Prefs: `tts_voice_ja` (`supabase/migrations/038_tts_voice_scaffold_12.sql`)
