# Local Cantonese dictionaries

JyutTranslate uses four layers for translation reliability:

1. **Phrase memory** — `phrases.json` (exact EN↔粵 on the live hot path; curated conversation + daily vocab)
2. **Lexicon offline MT** — seed + **CC-Canto** exact headword hits (used when phrase memory misses; critical for **no API key** mode)
3. **Demo echo** — only if phrase + lexicon both miss and no model is configured (`（示範）…`)
4. **Model** — OpenAI / compatible, then scrub + **CC-Canto attestation** on every translation

Pronunciation on the web client remains **`to-jyutping`**.

## Live pipeline (final only)

Mic / typed input never requests interim machine translations:

```
speak → STT source preview → capture ends → one final translate → show target pane
```

Legacy clients may still send `stage: "interim"`; the API **coerces to `final`**.

## Offline / no API key

When `OPENAI_API_KEY` (and `OPENAI_BASE_URL`) are unset:

```
exact phrases.json → CC-Canto/seed exact lexicon → demo prefix
```

- EN→粵 lexicon: English lemma reverse index over CC-Canto glosses (+ seed), with optional short multi-word composition
- 粵→EN lexicon: **whole-headword gloss only** — segmented gloss joins are disabled (they produced junk like `question mark` / lemma dumps)

Prefer growing `phrases.json` for spoken phrases; lexicon covers the long tail of dictionary words.

## Verification (with a model key)

On EN→粵 translations, the API:

1. Scrubs common Mandarin/書面 slips
2. Scores 口語 particles
3. **Attests** the string against **CC-Canto (+ seed) headwords**
4. If still Mandarin-leaning or weakly attested → one constrained rewrite (when a model key is set)

## words.hk (future / optional)

Import tooling and a license gate remain for later:

- `YUE_ALLOW_NONCOMMERCIAL_DICTS=1` + `YUE_ENABLE_WORDSHK=1`
- `npm run import:wordshk` after placing a CSV under `vendor/`

Default: both flags **off**. Paid deploys should stay on CC-Canto only until licensed.

## Import commands

```bash
cd apps/api
npm run import:cc-canto   # builds cc-canto-gloss.json.gz
npm run smoke:canto
```

From repo root:

```bash
npm run smoke:canto
npm run test:translate    # quality bot (API + Solo/Conversation panes)
```

## Attribution

See `ATTRIBUTION.md` (CC-Canto CC-BY-SA 3.0).
