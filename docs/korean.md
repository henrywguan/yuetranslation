# Korean / 한국어 (South Korean 표준어)

Target variety for JyutTranslate when lang code is **`ko`**: colloquial **South Korean standard (표준어)**, Seoul / central media Korean. Not Busan/Gyeongsang 사투리, not Jeju, not North Korean 문화어.

Azure Speech locale: **`ko-KR`** (TTS `ko-KR-SunHiNeural`, `ko-KR-InJoonNeural`).

## Product rules

- **Not a lexical tone language.** Do not invent Cantonese-style ASCII tone digits, Chao tone letters, or K-ToBI pitch labels on Solo / Conversation / Cam lines.
- **Hangul is the writing system** (`lang="ko"`). Pronunciation-based **Revised Romanization** (NIKL) sits under the Hangul line on compact and Details so learners can read along without opening Details.
- **Speech levels / honorifics** carry social meaning (해요체, 합니다체, 해체, …). Colloquial 해요체 by default; formal 합니다체 when the English source looks legal / medical / official.
- **Batchim honesty:** spoken Korean links and assimilates finals (학교 → [학꾜]); Hangul keeps the spelling. Do not respell the compact Hangul line.
- **Seoul honesty:** speech often merges **에 ≈ 애**; writing keeps both letters.
- Register: colloquial by default; formal when source looks legal/medical/official (`koreanRegister.ts`).

## Compact vs detailed

- **Compact** (Solo / Conversation / Cam): Hangul plus RR reading when `romanizeKorean` parses (`koreanRomanization.ts`). Example: `안녕하세요` → `annyeonghaseyo`. No IPA, Chao, Yale, McCune–Reischauer, or Hanja forced onto the result line.
- **Details:** same Hangul + RR, plus speech-level chip when endings are detectable (`koreanSpeechLevel.ts`) and a short honesty note (batchim assimilation + Seoul 에/애 merge). No Chao. No IPA.
- **Not yet (optional later):** Hangul pronunciation brackets `[학꾜]` via a full batchim-rules engine.

## Implementation status

**Shipped** — `Lang` code `ko` is wired end-to-end: Solo, Conversation, Cam, breakdown, TTS prefs, Account Hub voice settings. Not in `PRIMARY_LANGS` (no full BiText gloss pass).

- Register: `apps/api/src/koreanRegister.ts`
- Translation: `translateKorean` in `apps/api/src/translate.ts`
- Compact / Details UI: `apps/web/src/components/KoreanText.tsx`
- RR + speech level: `apps/web/src/lib/koreanRomanization.ts`, `koreanSpeechLevel.ts`
- Smoke: `npx tsx apps/web/src/lib/korean.smoke.ts` · compact RR UI: `npx tsx --tsconfig apps/web/tsconfig.app.json apps/web/src/components/KoreanText.smoke.ts`
- Azure: `ko-KR` STT/TTS; iPhone stays on Web Speech (not Azure-forced like `tl` / `wuu` / `sichuan`)
- Prefs: `tts_voice_ko` (`supabase/migrations/037_tts_voice_ko.sql`)
