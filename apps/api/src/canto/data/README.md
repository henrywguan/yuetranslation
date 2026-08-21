# Local Cantonese dictionaries / 本地粤语词典

JyutTranslate uses four layers for translation reliability:

粤译用四层保证翻译可靠：

1. **Phrase memory / 短语记忆** — `phrases.json` (exact EN↔粵 on the live hot path; curated conversation + daily vocab)  
   实时热路径上的精确英↔粤（精选会话与日常词汇）
2. **Model / 模型** — OpenAI / compatible when a key is configured (primary accuracy path online)  
   配置密钥时走 OpenAI 或兼容接口（线上准确度主路径）
3. **Lexicon offline MT / 词库离线翻译** — seed + **CC-Canto** exact headword hits (**only when no model key**)  
   种子词 + **CC-Canto** 精确词头命中（**仅无模型密钥时**）
4. **Demo echo / 演示回声** — only if phrase + lexicon both miss and no model is configured (`（示範）…`)  
   仅当短语与词库都未命中、且未配置模型时（`（示範）…`）

Online deploys never use CC-Canto as a **translation source**. CC-Canto still helps **attest** model Cantonese and supply learner gloss senses.

线上部署**不会**用 CC-Canto 作为翻译来源；仍可用于**核验**模型粤语输出，以及提供学习释义。

Pronunciation on the web client remains **`to-jyutping`**.

网页端读音仍由 **`to-jyutping`** 提供。

## Live pipeline (final only) / 实时流程（仅终稿）

Mic / typed input never requests interim machine translations:

麦克风或打字输入不会请求中间过程的机器翻译：

```
speak → STT source preview → capture ends → one final translate → show target pane
说话 → 语音识别原文预览 → 采集结束 → 一次终稿翻译 → 显示目标面板
```

Legacy clients may still send `stage: "interim"`; the API **coerces to `final`**.

旧客户端仍可能发送 `stage: "interim"`；接口会**强制改为 `final`**。

## Online (model key) / 线上（有密钥）

```
exact phrases.json → model → scrub + CC-Canto attestation
精确 phrases.json → 模型 → 清洗 + CC-Canto 核验
```

Phrase memory stays first for zero-latency hits on curated speech. Everything else goes to the model.

短语记忆仍优先命中精选口语；其余一律走模型。

## Offline / no API key / 离线 / 无密钥

When `OPENAI_API_KEY` (and `OPENAI_BASE_URL`) are unset:

未设置 `OPENAI_API_KEY`（以及 `OPENAI_BASE_URL`）时：

```
exact phrases.json → CC-Canto/seed exact lexicon → demo prefix
精确 phrases.json → CC-Canto/种子精确词库 → 演示前缀
```

- EN→粵 lexicon: English lemma reverse index over CC-Canto glosses (+ seed), with optional short multi-word composition  
  英→粤词库：以 CC-Canto 释义（+ 种子）做英语词条倒排，可做短多词组合
- 粵→EN lexicon: **whole-headword gloss only** — segmented gloss joins are disabled (they produced junk like `question mark` / lemma dumps)  
  粤→英词库：**仅整词词头释义** — 已关闭切分后拼接（否则会出现 `question mark` 一类垃圾）

Prefer growing `phrases.json` for spoken phrases; lexicon covers the long tail of dictionary words offline.

口语短语请优先扩充 `phrases.json`；离线时长尾词由词库覆盖。

## Verification (with a model key) / 核验（有模型密钥时）

On EN→粵 translations, the API:

英→粤翻译时，接口会：

1. Scrubs common Mandarin/書面 slips / 清洗常见普通话/书面语串扰
2. Scores 口語 particles / 给口语助词打分
3. **Attests** the string against **CC-Canto (+ seed) headwords** / 用 **CC-Canto（+ 种子）词头**核验字符串
4. If still Mandarin-leaning or weakly attested → one constrained rewrite (when a model key is set) / 若仍偏普通话或核验偏弱 → 在有密钥时做一次受限改写

## words.hk (optional / license-gated) / 粤典（可选 / 许可闸门）

Import tooling exists but stays **off** unless both flags are set (non-commercial license only):

导入工具已就绪，但默认关闭；仅在两个开关都打开时加载（限非商业许可）：

- `YUE_ALLOW_NONCOMMERCIAL_DICTS=1` + `YUE_ENABLE_WORDSHK=1`
- `npm run import:wordshk` after placing a CSV under `vendor/`  
  将 CSV 放到 `vendor/` 后运行 `npm run import:wordshk`

Paid / commercial deploys should stay on CC-Canto only until licensed.

付费／商业部署在获得许可前应只用 CC-Canto。

## Import commands / 导入命令

```bash
cd apps/api
npm run import:cc-canto   # builds cc-canto-gloss.json.gz
npm run smoke:canto
```

From repo root / 在仓库根目录：

```bash
npm run smoke:canto
npm run test:translate    # quality bot (API + Solo/Conversation panes)
                          # 质量机器人（接口 + 独白/对话面板）
```

## Attribution / 署名

See `ATTRIBUTION.md` (CC-Canto CC-BY-SA 3.0).

见 `ATTRIBUTION.md`（CC-Canto CC-BY-SA 3.0）。
