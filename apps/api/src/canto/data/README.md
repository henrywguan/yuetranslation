# Local Cantonese dictionaries

Yue uses three layers:

1. **Phrase memory** — `phrases.json` (exact EN↔粵 lines on the live hot path)
2. **Gloss packs** — CC-Canto (default) + optional words.hk (gated)
3. **`to-jyutping`** (web) — pronunciation truth

## What the license gate affects

| Setting | Effect |
|---|---|
| `YUE_ALLOW_NONCOMMERCIAL_DICTS=0` (default) | **Commercial-safe mode.** Only CC-Canto + seed glosses + your phrase memory. words.hk pack is never loaded even if the file exists. |
| `YUE_ALLOW_NONCOMMERCIAL_DICTS=1` | You assert this deployment is allowed to use non-commercial lexicons (hobby, research, eligible small personal use, or you have a separate words.hk license). |
| `YUE_ENABLE_WORDSHK=1` (also requires the gate above) | Load `wordshk-gloss.json.gz` for breakdown / gloss lookup. |

### Why this matters for Yue

words.hk’s Non-Commercial Open Data License **forbids commercial use** of that data (including selling a service that uses it as a value-add, ads on a site that uses it, etc.) unless you get a separate agreement or another exception applies. See https://words.hk/base/hoifong/

So for a **paid Pro / monetized** Yue:

- Keep the gate **off**
- Ship **CC-Canto** (CC-BY-SA — attribution required; ShareAlike if you redistribute adapted data)
- Keep **`to-jyutping`** for readings
- Use your curated `phrases.json` for conversation lines
- Optionally negotiate a commercial words.hk license later, then flip the gate

The gate does **not** block:

- LLM translation (DeepSeek/OpenAI)
- Mandarin→粵 scrub / 口語 scoring
- Phrase memory you wrote yourself
- CC-Canto glosses
- Client Jyutping

It only controls **loading words.hk-derived files** into the API process.

## Import commands

```bash
cd apps/api
npm run import:cc-canto          # downloads + builds cc-canto-gloss.json.gz
# optional:
# place vendor/wordshk.csv then:
npm run import:wordshk
```

## Recommended sources

### 1. CC-Canto — default open import
- CC-BY-SA 3.0 · https://cccanto.org/
- Bundled as `cc-canto-gloss.json.gz`

### 2. words.hk — best HK 口語 (gated)
- Request CSV: https://words.hk/faiman/request_data/
- Non-commercial unless separately licensed

### 3. `to-jyutping`
- Already in `apps/web` — UI pronunciation authority
