# Testing JyutTranslate / 测试粤译

## Quality bot (recommended) / 质量机器人（推荐）

With API (`:8787`) and web (`:5173`) running:

请先运行 API（`:8787`）与网页（`:5173`）：

```bash
npm run test:translate
```

What it does / 它会做什么：

1. **API** — translates several EN and 粵 phrases; requires `engine !== "demo"` and rejects gloss-dump junk.  
   **接口** — 翻译若干英语与粤语句子；要求 `engine !== "demo"`，并拒绝词典释义堆砌。
2. **UI** — opens Solo and Conversation, uses browser `speechSynthesis` to “speak” each line, then runs the same **final** translate path as post-mic capture (`translateTyped`), and asserts the **translation pane** is clean (not source, not junk).  
   **界面** — 打开独白与对话，用浏览器 `speechSynthesis`「朗读」各句，再走与麦克风采集结束后相同的**终稿**翻译路径（`translateTyped`），并断言**翻译面板**干净（不是原文、不是垃圾释义）。
3. Requires **≥3** successful non-demo text translations.  
   至少需要 **3** 次成功的非演示文字翻译。

Useful env flags / 常用环境变量：

| Env / 变量 | Effect / 作用 |
| --- | --- |
| `SKIP_UI=1` | API cases only / 仅跑接口用例 |
| `REQUIRE_OPENAI=1` | Fail if `/api/health` has `engines.openai=false` / 若未配置 OpenAI 则失败 |
| `API_BASE` / `WEB_BASE` | Override defaults / 覆盖默认地址 |

### Live DeepSeek + Azure pipeline / 付费 DeepSeek + Azure 通路

When keys are configured and you want to verify Azure/model paths (speech token, free tap-to-play TTS, model MT, Solo UI):

密钥已配置、需要核验 Azure／模型通路（语音令牌、人人免费的点击朗读、模型翻译、独白界面）时：

```bash
npm run test:translate:live
```

Uses novel phrases so DeepSeek is actually hit (not phrase memory). Cloud agents must only run this when Henry explicitly approves that request.

使用未见过的句子，确保真正打到 DeepSeek（而不是短语记忆）。云端代理只有在 Henry 明确批准该次请求时才可运行。

## Cantonese smoke / 粤语冒烟测试

```bash
npm run smoke:canto
```

Covers phrase memory, scrub, attestation, lexicon exact-only 粵→EN, and `stage: interim` coerced to final.

覆盖短语记忆、书面语清洗、词条核验、词库仅整词粤→英，以及把 `stage: interim` 强制改为终稿。

## Manual mic check / 手动麦克风检查

1. Put `OPENAI_API_KEY` (+ optional `AZURE_SPEECH_KEY`) in `apps/api/.env`, restart `dev:api`.  
   在 `apps/api/.env` 填写 `OPENAI_API_KEY`（以及可选的 `AZURE_SPEECH_KEY`），然后重启 `dev:api`。
2. Open [http://localhost:5173/?view=app](http://localhost:5173/?view=app) (or tunnel on phone).  
   打开 [http://localhost:5173/?view=app](http://localhost:5173/?view=app)（或手机隧道）。
3. Solo / Conversation: hold or tap mic → speak → release → **one** translation appears on the target side.  
   独白 / 对话：按住或点按麦克风 → 说话 → 松开 → 目标侧出现**一次**翻译。

## Demo mode vs real MT / 演示模式与真实翻译

| Symptom / 现象 | Cause / 原因 |
| --- | --- |
| `（示範）…` | No model key **and** phrase/lexicon miss / 没有模型密钥**且**未命中短语或词库 |
| Clean phrase like `你做緊咩呀？` without OpenAI / 没有 OpenAI 也能得到干净句子 | Phrase memory / lexicon (still not demo) / 短语记忆或词库（仍非演示） |
| Health `"demo": true` | OpenAI not configured — model path offline; dictionary + lexicon still work / 未配置 OpenAI，模型通路关闭；短语与词库仍可用 |
| Online with OpenAI | Phrase memory first, then **model only** (CC-Canto is attestation, not MT) / 有密钥时先短语记忆，其余**只走模型**（CC-Canto 仅核验，不作翻译源） |

## Screenshots for docs / 文档截图

```bash
npm run docs:screenshots   # writes docs/demos/*.png
                           # 写入 docs/demos/*.png
```
