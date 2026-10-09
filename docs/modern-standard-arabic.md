# Modern Standard Arabic / العربية الفصحى (Fusha)

Target variety for JyutTranslate when lang code is **`arsa`**: **Modern Standard Arabic** — the formal written standard, voiced with Saudi (ar-SA) speech. Not a spoken dialect — colloquial Egyptian is a separate peer code, **`ar`** ([egyptian-arabic.md](egyptian-arabic.md)), like `es` / `eses`.

Azure Speech locale: **`ar-SA`** (TTS `ar-SA-ZariyahNeural` default, `ar-SA-HamedNeural`).

## Product rules

- **Never cross variants.** `ar-SA` never maps into `ar`, and `ar-EG` never maps into `arsa`. TTS voices, translate prompts, and honesty copy are never shared between the two codes.
- **Not a tone language.** No Cantonese-style tone digits, Chao tone letters, tone chips, or IPA dumps on Solo / Conversation / Cam lines.
- **Writing:** Arabic script only (`\u0600-\u06FF`). No Arabizi / transliteration and no Han. Standard MSA grammar and spelling (هذا، هذه، أريد، ليس). Full tashkeel only when it disambiguates.
- **RTL:** compact lines render through `ArText` with `dir="rtl"` and `lang="ar-SA"`. Conversation pane hints, the live mic label, the Solo textarea, and Arabic-primary BiText glosses get `dir="rtl"`.
- **Register:** neutral, clear MSA by default; official written MSA when the English source looks legal / medical / official (`arabicRegister.ts`). Never Gulf or Egyptian dialect.
- **Cam:** MSA formal signs and menus, Arabic script only.

## Compact vs detailed

- **Compact** (Solo / Conversation / Cam): MSA in Arabic script only. No transliteration, tone, or register chips.
- **Details:** same line, plus an MSA honesty note (formal written standard; daily speech is a local dialect) and a tashkeel note when vowel marks are present (`arabicPedagogy.ts`).
- **Breakdown:** local Arabic word splitter (keeps ، ؛ ؟ and Arabic-Indic digits) with an MSA-specific LLM path in `apps/api/src/breakdown.ts`.

## Implementation status

**Scaffolded** — `Lang` code `arsa` is wired through Solo, Conversation, Cam, Docs, breakdown, TTS prefs, Account Hub voice settings, and `PRIMARY_LANGS`.

- Register: `apps/api/src/arabicRegister.ts`
- Translation: `translateModernStandardArabic` (`apps/api/src/translateModernStandardArabic.ts`), routed from `apps/api/src/translate.ts`
- Client guard: `sanitizeArTranslation` in `apps/web/src/lib/translationGuard.ts`
- Compact / Details UI: `apps/web/src/components/ArText.tsx` (`variant="arsa"`)
- Pedagogy: `apps/web/src/lib/arabicPedagogy.ts`
- Smoke: `npx tsx apps/web/src/lib/arabicPedagogy.smoke.ts` · `npx tsx apps/api/src/arabicRegister.smoke.ts`
- Azure: `ar-SA` STT/TTS; iPhone stays on Web Speech (not in `appleNeedsAzureStt`)
- Prefs: `tts_voice_arsa` + `primary_lang` (`supabase/migrations/040_tts_voice_ar_arsa.sql`)

## Known gaps

- No Account Hub primary UI glosses yet (`primaryUiGloss.data.ts` TODO) — BiText falls back to English-only chrome.
- No phrase / dictionary seeds; translations come from the LLM path.
- iPhone Safari Web Speech support for `ar-SA` is unverified on device.
