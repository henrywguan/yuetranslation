# Khmer / ភាសាខ្មែរ (Cambodia)

Target variety for JyutTranslate when lang code is **`km`**: colloquial **standard Cambodian Khmer** (ភាសាខ្មែរ). Not Northern Khmer (Surin), not archaic literary-only register by default.

Azure Speech locale: **`km-KH`** (TTS `km-KH-SreymomNeural`, `km-KH-PisethNeural`).

## Product rules

- **Not a lexical tone language.** Do not invent Cantonese-style ASCII tone digits, Chao tone letters, or Thai-style tone chips on Solo / Conversation / Cam lines.
- **Khmer script is the writing system** (`lang="km"`). A simplified **UNGEGN-style reading** sits under the script on compact and Details when `analyzeKhmer` parses (`khmerReading.ts`).
- Series (a / o) plus dependent vowels decide vowel quality in the reading — not pitch marks.
- Register: colloquial Cambodia-natural by default; formal when the English source looks legal / medical / official (`khmerRegister.ts`).
- **Not in `PRIMARY_LANGS`** (no BiText gloss pass).

## Compact vs detailed

- **Compact** (Solo / Conversation / Cam): Khmer script plus reading when the orthography parses. Example: `សួស្តី` → `suo-stei`. No IPA, Chao, or tone digits.
- **Details:** same script + reading, plus honesty note that Khmer is not tonal and the line is a simplified UNGEGN-style aid.
- **Gap (documented):** full coeng / irregular spelling edge cases may fail closed (script only). A heavier dictionary-backed romanizer can come later — do not invent tones to fill gaps.

## Register

Colloquial Cambodian Khmer by default; formal when the English source looks legal, medical, or official.

## Implementation status

**Shipped** — `Lang` code `km` is wired end-to-end: Solo, Conversation, Cam, breakdown, TTS prefs, Account Hub voice settings.

- Register: `apps/api/src/khmerRegister.ts`
- Translation: `translateKhmer` in `apps/api/src/translate.ts`
- Compact / Details UI: `apps/web/src/components/KmText.tsx`
- Reading: `apps/web/src/lib/khmerReading.ts`
- Smoke: `npx tsx apps/web/src/lib/khmer.smoke.ts`
- Azure: `km-KH` STT/TTS; iPhone stays on Web Speech (not in `appleNeedsAzureStt`)
- Prefs: `tts_voice_km` (`supabase/migrations/038_tts_voice_scaffold_12.sql`)
