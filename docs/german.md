# German / Deutsch (Deutschland)

Target variety for JyutTranslate when lang code is **`de`**: colloquial **standard German** (Deutschland / de-DE). Not Swiss- or Austrian-primary as the default line.

Azure Speech locale: **`de-DE`** (TTS `de-DE-KatjaNeural`, `de-DE-ConradNeural`).

## Product rules

- **Not a tone language.** Do not invent Cantonese-style ASCII tone digits, Chao tone letters, or IPA dumps on Solo / Conversation / Cam lines.
- **Writing:** correct German orthography with umlauts and ß where required (`ä`, `ö`, `ü`, `ß`, …). Compact = German only (`lang="de-DE"`).
- **Register:** colloquial by default (du / everyday); formal (Sie / more careful) when the English source looks legal / medical / official (`germanRegister.ts`).
- **Details:** light learner help — du/Sie address chip when detectable, plus a short honesty note (noun capitals + umlauts/ß). No Chao/IPA on compact or forced into Details.

## Compact vs detailed

- **Compact** (Solo / Conversation / Cam): standard German orthography only. No IPA, Chao, or register chips.
- **Details:** same German line, plus du/Sie chip when pronouns are detectable (`germanPedagogy.ts`) and a short honesty note. No Chao. No IPA dump.
- **Register (pipeline):** colloquial by default; formal when source looks legal/medical/official.

## Implementation status

**Shipped** — `Lang` code `de` is wired end-to-end: Solo, Conversation, Cam, breakdown, TTS prefs, Account Hub voice settings. Not in `PRIMARY_LANGS` (no full BiText gloss pass).

- Register: `apps/api/src/germanRegister.ts`
- Translation: `translateGerman` in `apps/api/src/translate.ts`
- Compact / Details UI: `apps/web/src/components/DeText.tsx`
- Pedagogy: `apps/web/src/lib/germanPedagogy.ts`
- Smoke: `npx tsx apps/web/src/lib/germanPedagogy.smoke.ts` · `npx tsx apps/api/src/germanRegister.smoke.ts`
- Azure: `de-DE` STT/TTS; iPhone stays on Web Speech (not in `appleNeedsAzureStt`)
- Prefs: `tts_voice_de` (`supabase/migrations/038_tts_voice_scaffold_12.sql`)
