# Local Cantonese dictionaries

Yue uses four layers for translation reliability:

1. **Phrase memory** — `phrases.json` (exact EN↔粵 on the live hot path; curated conversation + daily vocab)
2. **Lexicon offline MT** — seed + **CC-Canto** reverse index / segmentation (used when phrase memory misses; critical for **no API key** mode)
3. **Demo echo** — only if phrase + lexicon both miss and no model is configured
4. **Model** — OpenAI / compatible, then scrub + **CC-Canto attestation** on finals

Pronunciation truth on the web client remains **`to-jyutping`**.

## Offline / no API key

When `OPENAI_API_KEY` (and `OPENAI_BASE_URL`) are unset:

```
exact phrases.json → CC-Canto/seed lexicon → demo prefix
```

- EN→粵 lexicon: English lemma reverse index over CC-Canto glosses (+ seed), with optional short multi-word composition  
- 粵→EN lexicon: whole-headword gloss, else greedy `segmentGlosses` join when coverage is strong  

Prefer growing `phrases.json` for spoken phrases; lexicon covers the long tail of dictionary words.

## Verification (with a model key)

On **final** EN→粵 translations, the API:

1. Scrubs common Mandarin/書面 slips  
2. Scores 口語 particles  
3. **Attests** the string against **CC-Canto (+ seed) headwords**  
4. If still Mandarin-leaning or weakly attested → one constrained rewrite (when a model key is set)

Interim live partials only get the cheap scrub — no attestation rewrite.

words.hk is **not** used for verification right now. Revisit only after a commercial license (or a clearly non-commercial deploy).

## words.hk (future / optional)

Import tooling and a license gate remain for later:

- `YUE_ALLOW_NONCOMMERCIAL_DICTS=1` + `YUE_ENABLE_WORDSHK=1`  
- `npm run import:wordshk` after placing a CSV under `vendor/`

Default: both flags **off**. Paid Yue should stay on CC-Canto only until licensed.

## Import commands

```bash
cd apps/api
npm run import:cc-canto   # builds cc-canto-gloss.json.gz
npm run smoke:canto
```

## Attribution

See `ATTRIBUTION.md` (CC-Canto CC-BY-SA 3.0).
