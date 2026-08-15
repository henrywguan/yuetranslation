# Jyutping (LSHK)

Canonical scheme: [Jyutping: The Linguistic Society of Hong Kong Cantonese Romanization Scheme](https://jyutping.org/en/jyutping/).

Use this page as the source of truth for romanization in JyutTranslate. Compact UI keeps ASCII tone **numbers** (1–6) after each syllable, as LSHK specifies. Detailed expansions may add the Chao tone letters from **§4 Tone**.

## 4. Tone

Tone marks appear at the end of the syllable. Examples: `fu1` 夫, `fu2` 虎, `fu3` 副, `fu4` 扶, `fu5` 婦, `fu6` 父.

| | 平 | 上 | 去 | 入 |
| --- | --- | --- | --- | --- |
| 陰 | 1 [˥] 詩 | 2 [˧˥] 史 | 3 [˧] 試 | 1 [˥] 識 · 3 [˧] 洩 |
| 陽 | 4 [˨˩] 時 | 5 [˩˧] 市 | 6 [˨] 事 | 6 [˨] 蝕 |

| Number | Contour | Chao letters | Cue |
| --- | --- | --- | --- |
| 1 | high level | ˥ | high and steady |
| 2 | high rising | ˧˥ | rises toward the top |
| 3 | mid level | ˧ | level in the middle |
| 4 | low falling | ˨˩ | low, slightly falling |
| 5 | low rising | ˩˧ | rises from low to mid |
| 6 | low level | ˨ | low and steady |

Entering tones (syllables ending in `-p` `-t` `-k`) reuse 1, 3, and 6 — they do not get extra numbers.

LSHK asks that tone numbers stay ordinary ASCII digits (not superscript). Color or a following Chao letter is fine for teaching.

## Compact vs detailed

- **Compact** (always-visible translation line): `zou2 san4`
- **Detailed expansion** (hover / tap Jyutping): Chinese character above each syllable, e.g. `早` / `zou2 ˧˥` · `晨` / `san4 ˨˩`
- **Character drill-down**: tap a Han character when a definition exists → closable sheet with tone contour, Chao letters, character sense, and the phrase gloss

Implemented in `apps/web/src/lib/jyutping.ts` (`expandJyutping`, `ensureJyutpingSegs`) and `apps/web/src/components/JpPop.tsx`.
