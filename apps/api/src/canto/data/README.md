# Local Cantonese dictionaries

Yue uses three layers:

1. **Phrase memory** — `phrases.json` (exact EN↔粵 on the live hot path)
2. **CC-Canto** — open gloss + **verification** (attest LLM output is real Cantonese)
3. **`to-jyutping`** (web) — pronunciation truth

## Verification (current)

On **final** EN→粵 translations, the API:

1. Scrubs common Mandarin/書面 slips  
2. Scores 口語 particles  
3. **Attests** the string against **CC-Canto (+ seed) headwords** (coverage of known tokens)  
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
