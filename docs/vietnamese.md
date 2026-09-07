# Vietnamese / tiếng Việt (Quốc ngữ)

Target variety for JyutTranslate when lang code is **`vi`**: **standard Vietnamese** with full Quốc ngữ diacritics. Lean **Northern / textbook** for six-tone pedagogy labels; keep colloquial register (particles, address terms, Saigon vs Hanoi lexicon) when the source is casual — still never strip orthographic tones.

Azure Speech locale: **`vi-VN`** (TTS e.g. `vi-VN-HoaiMyNeural`, `vi-VN-NamMinhNeural`). No separate North/South voice toggle today.

## Product rules

- **Is a tone language** — six lexical tones (thanh điệu). Five are written as tone marks on the main vowel; **ngang** (mid-level) is unmarked.
- **Quốc ngữ already encodes tones.** Compact UI must show fully marked Vietnamese. Do **not** invent Cantonese-style ASCII tone digits (`ma2`), Mandarin-style ruby above Latin, or a second romanization layer.
- **Vowel-quality vs tone:** Hats/whiskers on `ă â ê ô ơ ư` change vowel identity — they are **not** tones. Tone marks stack on top of (or under) those letters.
- Writing: correct tone + vowel diacritics always (`lang="vi"`). Never strip accents “for simplicity.” Do not display Telex/VNI input codes on the result line.
- **Regional honesty:** Writing keeps all six marks everywhere. Southern speech often merges **hỏi ≈ ngã**; Northern (Hanoi) keeps the clearest six-way contrast. Do not default UI labels to “only 5 tones.”
- Register: colloquial by default; formal when source looks legal/medical/official.

### Six tones (Northern / textbook)

| Tone (thanh) | Mark (dấu) | Glyph cue | Contour (learner cue) | Example (`ma`) |
| --- | --- | --- | --- | --- |
| Ngang | *(none)* | — | Mid-level / flat | ma — ghost |
| Sắc | Acute | ´ | High rising | má — cheek / mother |
| Huyền | Grave | \` | Low falling | mà — but |
| Hỏi | Hook above | ̉ | Dip–rise (“question”) | mả — grave |
| Ngã | Tilde | ˜ | Rising–broken (glottal) | mã — code / horse |
| Nặng | Dot below | ̣ | Low dropping + cut-off | mạ — rice seedling |

## Compact vs detailed

- **Compact** (Solo / Conversation / Cam text): fully accented Vietnamese only. No tone chips, no Chao, no IPA, no ASCII tone digits, no Telex/VNI on the line.
- **Details:** tone-class chips — *ngang / sắc / huyền / hỏi / ngã / nặng* — inferred from diacritics (`vietnameseTones.ts`). Always show the Southern merge note (*hỏi ≈ ngã* in Southern speech; writing keeps all six marks). No Chao letters. No IPA.
- **Learn / marketing (not every Solo line):** classic minimal pair `ma má mà mả mã mạ`; tone-mark placement tips (rhyme vowel; quality-diacritic vowels take the tone mark first).
- **Not on compact:** inventing `ma2`-style digits, stripping diacritics, ruby-above-Latin, treating vowel hats as tones.

## Implementation status

**Shipped** — `Lang` code `vi` is wired end-to-end: Solo, Conversation, Cam, breakdown, TTS prefs, and Account Hub voice settings, mirroring the `tl` / `es` Latin-orthography paths.

- Register inference: `apps/api/src/vietnameseRegister.ts` (`inferVietnameseRegister`) — colloquial by default, formal when the English source looks legal/medical/official. No user-facing toggle.
- Translation: `translateVietnamese` in `apps/api/src/translate.ts` — full Quốc ngữ diacritics, no Chinese characters, no Chao letters, no IPA, no ASCII tone digits.
- Cam: `apps/api/src/translateCamera.ts` (`isVietnameseTarget`) rejects Han characters in Vietnamese output the same way `es`/`tl` do.
- Tone classification (Details only): `apps/web/src/lib/vietnameseTones.ts` classifies the tone mark already present in a word via NFD decomposition — `ngang` (unmarked), `sắc` (acute), `huyền` (grave), `hỏi` (hook above), `ngã` (tilde), `nặng` (dot below). Vowel-quality marks (`ă â ê ô ơ ư`) decompose to separate combining characters and are never confused with tone marks.
- Compact rendering: `apps/web/src/components/VietnameseText.tsx` renders fully accented Quốc ngữ only (`lang="vi"`) with `showTones={false}` (the default) in Solo / Conversation / Cam — no tone chips, no IPA, no Chao letters.
- Details rendering: `VietnameseText` with `showTones={true}` (used in `CharacterBreakdownHost`) always renders tone-class chips **and** the Southern merge note (`VIETNAMESE_SOUTHERN_MERGE_NOTE`, "Southern speech often merges hỏi ≈ ngã; writing keeps all six marks.") beneath the chips — the note is never optional once tones are shown.
- Azure: `vi-VN` locale for STT (`azureSpeech.ts`, `webSpeech.ts` fallback) and TTS (`vi-VN-HoaiMyNeural`, `vi-VN-NamMinhNeural`), selectable per-user in Account Hub → Voice settings and persisted via `tts_voice_vi` (`supabase/migrations/023_tts_voice_vi.sql`).
- Phrase seeds: `apps/api/src/canto/data/phrases.json` has EN↔vi pairs tagged `vietnamese`, register `colloquial`.

No IPA and no Chao tone letters appear anywhere in the Vietnamese UI, compact or detailed — only the tone-class chip labels above.
