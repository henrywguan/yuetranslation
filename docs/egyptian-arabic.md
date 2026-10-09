# Egyptian Arabic / العربية المصرية (Masri)

Target variety for JyutTranslate when lang code is **`ar`**: colloquial **Egyptian Arabic** (Cairo Masri, ar-EG). Not Modern Standard Arabic — formal written Arabic is a separate peer code, **`arsa`** ([modern-standard-arabic.md](modern-standard-arabic.md)), like `es` / `eses`.

Azure Speech locale: **`ar-EG`** (TTS `ar-EG-SalmaNeural` default, `ar-EG-ShakirNeural`).

## Product rules

- **Never cross variants.** `ar-EG` never maps into `arsa`, and `ar-SA` never maps into `ar`. TTS voices, translate prompts, and honesty copy are never shared between the two codes.
- **Not a tone language.** No Cantonese-style tone digits, Chao tone letters, tone chips, or IPA dumps on Solo / Conversation / Cam lines.
- **Writing:** Arabic script only (`\u0600-\u06FF`). No Arabizi / Franco-Arabic (`3`, `7`, Latin transliteration) and no Han. Spelling follows common Egyptian usage (ده، دي، إزيك، عايز، مش).
- **RTL:** compact lines render through `ArText` with `dir="rtl"` and `lang="ar-EG"`. Conversation pane hints, the live mic label, the Solo textarea, and Arabic-primary BiText glosses get `dir="rtl"`.
- **Register:** everyday Masri by default; when the English source looks legal / medical / official (`arabicRegister.ts`), use **polite Egyptian** (حضرتك، لو سمحت) — still colloquial, never فصحى.
- **Cam:** Egyptian colloquial signage wording, Arabic script only.

## Compact vs detailed

- **Compact** (Solo / Conversation / Cam): Egyptian Arabic in Arabic script only. No transliteration, tone, or register chips.
- **Details:** same line, plus an Egyptian honesty note (spoken variety; ج as hard g, ق often a glottal stop) and a tashkeel note when vowel marks are present (`arabicPedagogy.ts`).
- **Breakdown:** local Arabic word splitter (keeps ، ؛ ؟ and Arabic-Indic digits) with an Egyptian-specific LLM path in `apps/api/src/breakdown.ts`.

## Implementation status

**Scaffolded** — `Lang` code `ar` is wired through Solo, Conversation, Cam, Docs, breakdown, TTS prefs, Account Hub voice settings, and `PRIMARY_LANGS`.

- Register: `apps/api/src/arabicRegister.ts`
- Translation: `translateEgyptianArabic` (`apps/api/src/translateEgyptianArabic.ts`), routed from `apps/api/src/translate.ts`
- Client guard: `sanitizeArTranslation` in `apps/web/src/lib/translationGuard.ts`
- Compact / Details UI: `apps/web/src/components/ArText.tsx` (`variant="ar"`)
- Pedagogy: `apps/web/src/lib/arabicPedagogy.ts`
- Smoke: `npx tsx apps/web/src/lib/arabicPedagogy.smoke.ts` · `npx tsx apps/api/src/arabicRegister.smoke.ts`
- Azure: `ar-EG` STT/TTS; iPhone stays on Web Speech (not in `appleNeedsAzureStt`)
- Prefs: `tts_voice_ar` + `primary_lang` (`supabase/migrations/040_tts_voice_ar_arsa.sql`)

## Known gaps

- No Account Hub primary UI glosses yet (`primaryUiGloss.data.ts` TODO) — BiText falls back to English-only chrome.
- No phrase / dictionary seeds; translations come from the LLM path.
- iPhone Safari Web Speech support for `ar-EG` is unverified on device.
