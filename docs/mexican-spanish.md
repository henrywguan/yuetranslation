# Mexican Spanish / español mexicano

Target variety for JyutTranslate when lang code is **`es`**: colloquial **central Mexican Spanish** (CDMX / altiplano), not Peninsular default and not generic “Latin American.”

Azure Speech locale: **`es-MX`** (TTS e.g. `es-MX-DaliaNeural`, `es-MX-JorgeNeural`).

## Product rules

- **Not a tone language.** Do not invent Cantonese/Wu-style tone digits or sandhi rows.
- **Lexical stress** is the learner cue — carried by orthographic accents (**tilde**: `á é í ó ú`) and RAE default stress rules when unmarked.
- Writing: natural Mexican spellings and lexicon (`güey`, `órale`, `camión`, `platicar`, …) when colloquial.
- Grammar defaults: **`ustedes`** (not `vosotros`); spoken pretérito preference over Peninsular present perfect where natural.
- Phonology notes (details / pedagogy only): **seseo**, **yeísmo**; highland tense `/s/` vs coastal aspiration — do not respell the compact line.

## Compact vs detailed

- **Compact** (Solo / Conversation / Cam text): accented Mexican Spanish only (`lang="es-MX"`). No stress chips, no IPA, no Sp_ToBI.
- **Details:** optional stress-class chips — *aguda / llana / esdrújula / sobreesdrújula* — from orthography (`mexicanSpanishStress.ts`). Optional IPA later.
- **Register:** colloquial by default; formal when source looks legal/medical/official (`mexicanSpanishRegister.ts`).

Implemented in `apps/web/src/components/MexicanSpanishText.tsx`. API path: `translateMexicanSpanish` in `apps/api/src/translate.ts` (`Lang` code `es`).
