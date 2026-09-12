# Jyutping (LSHK) / 粤拼（香港语言学学会）

Canonical scheme: [Jyutping: The Linguistic Society of Hong Kong Cantonese Romanization Scheme](https://jyutping.org/en/jyutping/).

规范方案：[粤拼：香港语言学学会粤语拼音方案](https://jyutping.org/en/jyutping/)。

Use this page as the source of truth for romanization in JyutTranslate. Compact UI keeps ASCII tone **numbers** (1–6) after each syllable, as LSHK specifies. Detailed expansions may add the Chao tone letters from **§4 Tone**.

### Product naming / 产品用语

In the JyutTranslate UI and creator kit, the clipboard feature that copies
`syllable + tone number + contour mark` (e.g. `teng1˥`) is labeled
**Jyutping + Chao tone letters** (粵：**粵拼＋趙元任調號**). The contour glyphs (˥ ˧˥ ˧ ˨˩ ˩˧ ˨) are the academic
**Chao tone letters** (赵元任调值字母) from LSHK §4.

界面与创作者页将「音节 + 调号数字 + 调型符号」（如 `teng1˥`）称为
**Jyutping + Chao tone letters**（**粵拼＋趙元任調號**）。符号本身即学会方案 §4 的**赵元任调值字母**。


## 4. Tone / 4. 声调

Tone marks appear at the end of the syllable. Examples: `fu1` 夫, `fu2` 虎, `fu3` 副, `fu4` 扶, `fu5` 婦, `fu6` 父.

调号写在音节末尾。例如：`fu1` 夫，`fu2` 虎，`fu3` 副，`fu4` 扶，`fu5` 婦，`fu6` 父。

| | 平 | 上 | 去 | 入 |
| --- | --- | --- | --- | --- |
| 陰 | 1 [˥] 詩 | 2 [˧˥] 史 | 3 [˧] 試 | 1 [˥] 識 · 3 [˧] 洩 |
| 陽 | 4 [˨˩] 時 | 5 [˩˧] 市 | 6 [˨] 事 | 6 [˨] 蝕 |

| Number / 数字 | Contour / 调型 | Chao tone letters / 调值字母 | Cue / 提示 |
| --- | --- | --- | --- |
| 1 | high level / 高平 | ˥ | high and steady / 高而平稳 |
| 2 | high rising / 高升 | ˧˥ | rises toward the top / 升向高处 |
| 3 | mid level / 中平 | ˧ | level in the middle / 中段持平 |
| 4 | low falling / 低降 | ˨˩ | low, slightly falling / 偏低并略降 |
| 5 | low rising / 低升 | ˩˧ | rises from low to mid / 由低升至中 |
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
- **Character drill-down**: tap a Han character when a definition exists → closable sheet with tone contour, Chao tone letters, character sense, and the phrase gloss  
  **单字下钻**：有释义时可点按汉字 → 弹出可关闭面板，含调型、调值字母、字义与短语释义

Implemented in `apps/web/src/lib/jyutping.ts` (`rubyJpSyllable`, `ensureJyutpingSegs`, `JYUTPING_UI_SVG_TONES`, `JYUTPING_SELECT_COPY_TRAP`) and `apps/web/src/components/JyutRuby.tsx` / `JpPop.tsx`.

**On-screen vs clipboard:** with `JYUTPING_UI_SVG_TONES = true` (default), ruby UI draws contours as SVG so inspect/select does not yield Chao Unicode; Family **Copy Jyutping + Chao** still copies `teng1˥ …`. Set the flag to `false` to restore Unicode Chao in the DOM.

**Select/copy trap:** with `JYUTPING_SELECT_COPY_TRAP = true` (default), Free/guest users who select ruby and copy get a playful Family nudge on the clipboard instead of syllables (`data-jyutping-notice` also shows in inspect). Family/Business exempt. Set to `false` to disable.

实现于 `apps/web/src/lib/jyutping.ts`（`rubyJpSyllable`、`ensureJyutpingSegs`、`JYUTPING_UI_SVG_TONES`、`JYUTPING_SELECT_COPY_TRAP`）与 `apps/web/src/components/JyutRuby.tsx` / `JpPop.tsx`。
