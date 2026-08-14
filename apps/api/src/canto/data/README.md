# Local Cantonese dictionaries (import guide)

Yue keeps a small **phrase memory** in `phrases.json` on the hot path (exact match → skip the model).
Larger lexicons should be imported offline into the same schema (`sourceLang`, `targetLang`, `source`, `text`, `alternatives`, `register`).

## Recommended sources

### 1. words.hk (粵典) — best for HK spoken Cantonese
- **Why:** Hand-built HK Cantonese, Jyutping, English glosses, usage tags; strongest “is this real 口語?” signal.
- **Size:** ~50k+ entries.
- **License:** Non-commercial / request-based CSV ([request data](https://words.hk/faiman/request_data/)); research dump notes in the [ACL paper](https://aclanthology.org/2022.dclrl-1.7/).
- **Tooling:** [wordshk-tools](https://github.com/AlienKevin/wordshk-tools), [words-hk-parse](https://github.com/MarvNC/words-hk-parse).
- **Use in Yue:** gloss + character breakdown meanings; optional fuzzy phrase hints. **Not** drop-in free commercial redistributable without checking their license for your product.

### 2. CC-Canto (+ CC-CEDICT Cantonese readings) — best open import start
- **Why:** Open CC-BY-SA 3.0; Traditional + Jyutping `{...}` in CEDICT-like lines; ~22k Canto-specific entries plus readings for CEDICT.
- **Download:** [cccanto.org/download](https://cccanto.org/download.html), mirror [amadeusine/cc-canto-data](https://github.com/amadeusine/cc-canto-data), JSON helpers [poliwhirl555/cc-canto-cedict-jsons](https://github.com/poliwhirl555/cc-canto-cedict-jsons).
- **Use in Yue:** word-level EN↔粵 gloss table and Jyutping cross-check alongside `to-jyutping`. Attribute CC-BY-SA if you ship the data.

### 3. `to-jyutping` (already in the web app)
- **Why:** Fast, local, LSHK Jyutping labeling — **source of truth for pronunciation in the UI**.
- **Use in Yue:** always overwrite model Jyutping; do not trust DeepSeek/OpenAI for tones.

### 4. Later: Mandarin (`targetLang: "cmn"`)
- **CC-CEDICT** for EN↔普通話 phrase/word memory and pinyin.
- Keep **separate** post-filters (no Canto particle scorer on `cmn`).

## Suggested import policy for live speech

| Data | Hot path (interim/final) | Breakdown / text |
|---|---|---|
| High-frequency EN↔粵 utterances | In-memory exact match (`phrases.json`) | yes |
| Full CC-Canto / words.hk | **No** full scan per interim | gloss lookup by character/word |
| Jyutping | `to-jyutping` only | same |

Keep the live path to **O(1) exact keys** (+ light Mandarin scrub). Build richer indexes offline if you add fuzzy/embedding search later.
