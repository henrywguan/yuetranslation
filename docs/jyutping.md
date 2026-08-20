# Jyutping (LSHK) / 粤拼（香港语言学学会）

Canonical scheme: [Jyutping: The Linguistic Society of Hong Kong Cantonese Romanization Scheme](https://jyutping.org/en/jyutping/).

规范方案：[粤拼：香港语言学学会粤语拼音方案](https://jyutping.org/en/jyutping/)。

Use this page as the source of truth for romanization in JyutTranslate. Compact UI keeps ASCII tone **numbers** (1–6) after each syllable, as LSHK specifies. Detailed expansions add Chao tone letters with the same contours as [cantonese.ca/tones](https://cantonese.ca/tones.php) (tone 5 = ˨˧).

粤译以本页为罗马化依据。紧凑界面按学会规定，在每个音节后使用 ASCII 声调**数字**（1–6）。展开详情时的赵元任调值字母与 [cantonese.ca/tones](https://cantonese.ca/tones.php) 一致（第 5 调为 ˨˧）。

## 4. Tone / 4. 声调

Tone marks appear at the end of the syllable. Examples: `fu1` 夫, `fu2` 虎, `fu3` 副, `fu4` 扶, `fu5` 婦, `fu6` 父.

调号写在音节末尾。例如：`fu1` 夫，`fu2` 虎，`fu3` 副，`fu4` 扶，`fu5` 婦，`fu6` 父。

| | 平 | 上 | 去 | 入 |
| --- | --- | --- | --- | --- |
| 陰 | 1 [˥] 詩 | 2 [˧˥] 史 | 3 [˧] 試 | 1 [˥] 識 · 3 [˧] 洩 |
| 陽 | 4 [˨˩] 時 | 5 [˨˧] 市 | 6 [˨] 事 | 6 [˨] 蝕 |

| Number / 数字 | Contour / 调型 | Chao letters / 调值字母 | Cue / 提示 |
| --- | --- | --- | --- |
| 1 | high level / 高平 | ˥ | high and steady / 高而平稳 |
| 2 | high rising / 高升 | ˧˥ | rises toward the top / 升向高处 |
| 3 | mid level / 中平 | ˧ | level in the middle / 中段持平 |
| 4 | low falling / 低降 | ˨˩ | low, slightly falling / 偏低并略降 |
| 5 | low rising / 低升 | ˨˧ | rises from low to low-mid / 由低升到中低 |
| 6 | low level / 低平 | ˨ | low and steady / 低而平稳 |

Entering tones (syllables ending in `-p` `-t` `-k`) reuse 1, 3, and 6 — they do not get extra numbers.

入声（以 `-p` `-t` `-k` 收尾的音节）复用 1、3、6 — 不再另设数字。

LSHK asks that tone numbers stay ordinary ASCII digits (not superscript). Color or a following Chao letter is fine for teaching.

学会要求调号使用普通 ASCII 数字（不要用上标）。教学时可用颜色，或在后面加调值字母。

## Compact vs detailed / 紧凑与详细

- **Compact** (always-visible translation line): `zou2 san4`  
  **紧凑**（翻译行始终可见）：`zou2 san4`
- **Detailed expansion** (hover / tap Jyutping): Chinese character above each syllable, e.g. `早` / `zou2 ˧˥` · `晨` / `san4 ˨˩`  
  **详细展开**（悬停或点按粤拼）：每个音节上方显示汉字，例如 `早` / `zou2 ˧˥` · `晨` / `san4 ˨˩`
- **Character drill-down**: tap a Han character when a definition exists → closable sheet with tone contour, Chao letters, character sense, and the phrase gloss  
  **单字下钻**：有释义时可点按汉字 → 弹出可关闭面板，含调型、调值字母、字义与短语释义

Implemented in `apps/web/src/lib/jyutping.ts` (`expandJyutping`, `ensureJyutpingSegs`) and `apps/web/src/components/JpPop.tsx`.

实现于 `apps/web/src/lib/jyutping.ts`（`expandJyutping`、`ensureJyutpingSegs`）与 `apps/web/src/components/JpPop.tsx`。
