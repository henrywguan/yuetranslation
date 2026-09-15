# Peninsular Spanish / español de España

Target variety for JyutTranslate when lang code is **`eses`**: colloquial **Peninsular / Castilian Spanish** (Spain), not Mexican and not generic “Latin American.”

Azure Speech locale: **`es-ES`** (TTS e.g. `es-ES-ElviraNeural`, `es-ES-AlvaroNeural`).

UI label: **Spanish(ES)**. Mexican Spanish stays **`es`** / Spanish(MX).

## Product rules

- **Not a tone language.** Do not invent Cantonese/Wu-style tone digits or sandhi rows.
- **Lexical stress** is the learner cue — carried by orthographic accents (**tilde**: `á é í ó ú`) and RAE default stress rules when unmarked. Stress helpers are shared with Mexican Spanish (`mexicanSpanishStress.ts`).
- Writing: natural Spain spellings and lexicon (`vale`, `tío`, `guay`, `mola`, `ordenador`, `móvil`, `vosotros`, …) when colloquial.
- Grammar defaults: **`vosotros` / `vosotras`** where natural with friends; spoken **pretérito perfecto compuesto** (`he comido`) where natural in Spain vs Mexican pretérito preference.
- Phonology notes (details / pedagogy only): distinción **c/z vs s** in northern/central Spain; yeísmo varies — do not respell the compact line.

## Compact vs detailed

- **Compact** (Solo / Conversation / Cam text): accented Peninsular Spanish only (`lang="es-ES"`). No stress chips, no IPA.
- **Details:** optional stress-class chips — *aguda / llana / esdrújula / sobreesdrújula* — from orthography (shared helpers). Optional IPA later.
- **Register (details):** when the line looks informal/slangy (`isInformalPeninsularSpanish`), show a short note plus a **Make formal** icon. Tap rewrites the Spanish in place (`eses→eses` + `register: "formal"`).
- **Register (pipeline):** colloquial by default; formal when source looks legal/medical/official (`peninsularSpanishRegister.ts`), or when the client sends `register: "formal"`.

## Do not confuse with Mexican `es`

| | Mexican `es` | Peninsular `eses` |
| --- | --- | --- |
| Locale | `es-MX` | `es-ES` |
| TTS | Dalia / Jorge | Elvira / Álvaro |
| Plural familiar | ustedes | vosotros |
| Slang | órale, güey, qué onda | vale, tío, guay, mola |

Implemented in `apps/web/src/components/PeninsularSpanishText.tsx` + `PeninsularSpanishRegisterPanel.tsx`. API path: `translatePeninsularSpanish` / `rewritePeninsularSpanishFormal` in `apps/api/src/translate.ts` (`Lang` code `eses`).
