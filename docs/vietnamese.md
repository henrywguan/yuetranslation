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

- **Compact** (Solo / Conversation / Cam text): fully accented Vietnamese only. No tone chips, no Chao row, no ASCII tone digits, no Telex/VNI on the line.
- **Details:** tone-class chips — *ngang / sắc / huyền / hỏi / ngã / nặng* — inferred from diacritics (`vietnameseTones.ts` when implemented). Optional Chao letters / contour labels; optional IPA; optional short North vs South note when hỏi/ngã matters.
- **Learn / marketing (not every Solo line):** classic minimal pair `ma má mà mả mã mạ`; tone-mark placement tips (rhyme vowel; quality-diacritic vowels take the tone mark first).
- **Not on compact:** inventing `ma2`-style digits, stripping diacritics, ruby-above-Latin, treating vowel hats as tones.

## Implementation status

**Canon only** — product wiring (`VietnameseText`, `translateVietnamese`, `Lang` code `vi`, Solo / Conversation / Cam) is **not** shipped yet. Closest existing patterns: [`docs/jyutping.md`](./jyutping.md) (tone names + Chao), [`docs/mexican-spanish.md`](./mexican-spanish.md) (compact orthography + details chips), Mandarin tone marks in orthography.

When greenlit later: helpers `vietnameseTones.ts`, UI `VietnameseText.tsx`, API `translateVietnamese` in `apps/api/src/translate.ts`, Azure `vi-VN` STT/TTS, phrase seeds — wire like `tl` / `es`.
