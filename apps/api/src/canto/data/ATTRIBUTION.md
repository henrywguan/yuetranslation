# Third-party dictionary attribution / 第三方词典署名

## CC-Canto (always bundled when `cc-canto-gloss.json.gz` is present)
## CC-Canto（存在 `cc-canto-gloss.json.gz` 时始终打包）

- **Work / 作品：** CC-Canto Cantonese–English dictionary / CC-Canto 粤英词典  
- **Copyright / 版权：** © 2015–17 Pleco Inc.  
- **License / 许可：** [Creative Commons Attribution-ShareAlike 3.0](https://creativecommons.org/licenses/by-sa/3.0/)  
- **Site / 网站：** https://cccanto.org/  
- **Use in JyutTranslate / 在粤译中的用途：** glosses for character breakdown, and **headword attestation** to verify LLM Cantonese on finals.  
  用于单字拆解释义，以及**词头核验**，以核对模型终稿粤语。  
- **ShareAlike note / 相同方式共享说明：** if you distribute an adapted CC-Canto-derived data file, keep attribution and share adaptations under a compatible license.  
  若分发改编自 CC-Canto 的数据文件，请保留署名，并以兼容许可分享改编内容。

## CC-CEDICT Cantonese readings (`cc-cedict-readings.json.gz`)
## CC-CEDICT 粤语读音（`cc-cedict-readings.json.gz`）

- **Work / 作品：** Cantonese Jyutping readings for CC-CEDICT headwords / CC-CEDICT 词头粤拼读音  
- **Copyright / 版权：** © 2015 Pleco Software Incorporated  
- **License / 许可：** [Creative Commons Attribution-ShareAlike 3.0](https://creativecommons.org/licenses/by-sa/3.0/)  
- **Site / 网站：** https://cccanto.org/  
- **Use in JyutTranslate / 在粤译中的用途：** **attestation + Jyutping only** — expands headword coverage beyond CC-Canto. **Not** used as an English gloss source for offline lexicon MT.  
  **仅用于核验与粤拼** — 扩大词头覆盖；**不用**作离线词库英译释义来源。  
- Import: `npm run import:cc-cedict-readings --prefix apps/api`  
  导入：`npm run import:cc-cedict-readings --prefix apps/api`

Related: full CC-CEDICT (Mandarin pinyin + English) is CC-BY-SA via [MDBG](https://www.mdbg.net/chinese/dictionary?page=cc-cedict) — not bundled as a translation source here.

相关：完整 CC-CEDICT（拼音 + 英语）经 MDBG 以 CC-BY-SA 发布 — 本仓库不将其作为翻译来源打包。

## OpenCC (via `opencc-js`)
## OpenCC（经 `opencc-js`）

- **Work / 作品：** Open Chinese Convert / 开放中文转换  
- **Upstream / 上游：** [BYVoid/OpenCC](https://github.com/BYVoid/OpenCC) (Apache-2.0) · JS port [nk2028/opencc-js](https://github.com/nk2028/opencc-js) (MIT + Apache-2.0 data)  
- **Use in JyutTranslate / 在粤译中的用途：** Simplified ↔ Hong Kong Traditional (`s2hk` / `hk2s`) on scrub, attestation, Cam Chinese OCR paths.  
  清洗、核验、相机中文 OCR 路径上的简繁（香港）转换。

## words.hk 粵典 (future — only with a license)
## words.hk 粤典（未来 — 仅在获得许可后）

- **Work / 作品：** words.hk Cantonese dictionary data / words.hk 粤语词典数据  
- **Copyright / 版权：** Hong Kong Lexicography Limited / 香港辞书有限公司  
- **License / 许可：** [Non-Commercial Open Data License 1.0](https://words.hk/base/hoifong/)  
- **Status in JyutTranslate / 在粤译中的状态：** **Not used.** Verification and glosses currently rely on **CC-Canto** + seed (+ CC-CEDICT readings for attestation).  
  **未使用。** 核验与释义目前依赖 **CC-Canto** + 种子词（+ CC-CEDICT 读音核验）。  
- Revisit after obtaining a commercial license (or for a clearly non-commercial deploy). Import stubs: `npm run import:wordshk` + `YUE_ALLOW_NONCOMMERCIAL_DICTS` / `YUE_ENABLE_WORDSHK`.  
  取得商业许可后（或明确的非商业部署）再评估。导入占位：`npm run import:wordshk` + `YUE_ALLOW_NONCOMMERCIAL_DICTS` / `YUE_ENABLE_WORDSHK`。

## `to-jyutping` (web app) / `to-jyutping`（网页应用）

- Pronunciation labeling library used in the client — **Jyutping source of truth** for UI display.  
  客户端读音标注库 — 界面展示的**粤拼依据**。  
- Dictionary data from [rime/rime-cantonese](https://github.com/rime/rime-cantonese) (CC BY 4.0).  
  词典数据来自 rime-cantonese（CC BY 4.0）。  
- See the `to-jyutping` package license in `apps/web/node_modules/to-jyutping`.  
  许可见 `apps/web/node_modules/to-jyutping`。
