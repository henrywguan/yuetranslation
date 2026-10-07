# Brazilian Portuguese / Português (Brasil)

Target variety for JyutTranslate when lang code is **`pt`**: colloquial **Brazilian Portuguese** (pt-BR), not European Portuguese (pt-PT).

Azure Speech locale: **`pt-BR`** (TTS `pt-BR-FranciscaNeural`, `pt-BR-AntonioNeural`).

## Status

**Shipped** — dedicated EN↔pt translate path, Conversation copy, Details stress pedagogy, Cam system prompt, and phrase seeds.

## Product rules

- **Variety:** Brazilian Portuguese (pt-BR) — everyday Brazil lexicon and spelling; never default to European Portuguese (`autocarro`, `telemóvel`, `fixe`, …).
- **Not a tone language.** Do not invent Cantonese/Wu-style tone digits or Chao/IPA dumps on the compact line.
- **Writing:** correct Portuguese orthography with Brazilian accents (`á à â ã é ê í ó ô õ ú ç`). Compact = Portuguese only.
- **Grammar defaults:** **`você` / `vocês`** (not European `tu`/`vós` as the conversation default).
- **Register (pipeline):** colloquial by default; formal when the English source looks legal / medical / official (`brazilianPortugueseRegister.ts`). Optional “Make formal” UI is not required (Tagalog-style).
- **Details:** optional stress-class chips — *oxítona / paroxítona / proparoxítona* — from orthography (`brazilianPortugueseStress.ts`). No Chao/IPA on compact.
- **iPhone:** Web Speech (`pt-BR`) — do **not** add to `appleNeedsAzureStt`.
- **Not in `PRIMARY_LANGS`** (no BiText gloss pass).

## Compact vs detailed

- **Compact** (Solo / Conversation / Cam text): accented Brazilian Portuguese only (`lang="pt-BR"`). No stress chips, no IPA.
- **Details:** stress-class chips from orthography when useful.

Implemented in `apps/web/src/components/PtText.tsx`. API path: `translateBrazilianPortuguese` in `apps/api/src/translateBrazilianPortuguese.ts` (`Lang` code `pt`).

## Implementation pointers

- Conversation: `apps/web/src/lib/conversationUi.ts`
- Translate: `apps/api/src/translateBrazilianPortuguese.ts` + register in `brazilianPortugueseRegister.ts`
- Compact / Details UI: `apps/web/src/components/PtText.tsx` + `brazilianPortugueseStress.ts`
- Camera: dedicated `pt` system prompt in `translateCamera.ts`
- Azure: `pt-BR` STT/TTS; iPhone stays on Web Speech (not Azure-forced)
- Prefs: `tts_voice_pt` (`supabase/migrations/038_tts_voice_scaffold_12.sql`)

## Smokes

```bash
npx tsx apps/web/src/lib/brazilianPortugueseStress.smoke.ts
npx tsx apps/api/src/brazilianPortugueseRegister.smoke.ts
npx tsx apps/web/src/lib/webSpeech.smoke.ts
```
