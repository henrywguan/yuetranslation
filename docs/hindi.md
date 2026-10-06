# Hindi / हिन्दी

Target variety for JyutTranslate when lang code is **`hi`**.

Azure Speech locale: **`hi-IN`** (TTS `hi-IN-AnanyaNeural`, `hi-IN-AaravNeural`).

## Status

**Scaffold** — wired into Solo / Conversation / Cam / Docs / STT / TTS prefs with stub pedagogy.
A dedicated cloud agent should polish: native Conversation copy, translate register prompts,
Details pedagogy, compact line helpers, and phrase seeds.

## Product rules (scaffold defaults)

- Colloquial register by default; formal when the English source looks legal / medical / official.
- Compact UI shows the native script/orthography only until pedagogy lands.
- Not in `PRIMARY_LANGS` (no BiText gloss pass yet).

## Implementation pointers

- Conversation: `apps/web/src/lib/conversationUi.ts`
- Translate: `apps/api/src/translateScaffold.ts` + router in `translate.ts`
- Compact UI: `apps/web/src/components/HiText.tsx`
- Azure: `hi-IN` STT/TTS; iPhone stays on Web Speech (not Azure-forced)
- Prefs: `tts_voice_hi` (`supabase/migrations/038_tts_voice_scaffold_12.sql`)
