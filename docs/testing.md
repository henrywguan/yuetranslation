# Testing JyutTranslate

## Quality bot (recommended)

With API (`:8787`) and web (`:5173`) running:

```bash
npm run test:translate
```

What it does:

1. **API** — translates several EN and 粵 phrases; requires `engine !== "demo"` and rejects gloss-dump junk.
2. **UI** — opens Solo and Conversation, uses browser `speechSynthesis` to “speak” each line, then runs the same **final** translate path as post-mic capture (`translateTyped`), and asserts the **translation pane** is clean (not source, not junk).
3. Requires **≥3** successful non-demo text translations.

Useful env flags:

| Env | Effect |
| --- | --- |
| `SKIP_UI=1` | API cases only |
| `REQUIRE_OPENAI=1` | Fail if `/api/health` has `engines.openai=false` |
| `API_BASE` / `WEB_BASE` | Override defaults |

### Live DeepSeek + Azure pipeline

When keys are configured and you want to verify the paid paths (speech token, TTS, model MT, Solo UI):

```bash
npm run test:translate:live
```

Uses novel phrases so DeepSeek is actually hit (not phrase memory). Cloud agents must only run this when Henry explicitly approves that request.

## Cantonese smoke

```bash
npm run smoke:canto
```

Covers phrase memory, scrub, attestation, lexicon exact-only 粵→EN, and interim→final coerce.

## Manual mic check

1. Put `OPENAI_API_KEY` (+ optional `AZURE_SPEECH_KEY`) in `apps/api/.env`, restart `dev:api`.
2. Open [http://localhost:5173/?view=app](http://localhost:5173/?view=app) (or tunnel on phone).
3. Solo / Conversation: hold or tap mic → speak → release → **one** translation appears on the target side.

## Demo mode vs real MT

| Symptom | Cause |
| --- | --- |
| `（示範）…` | No model key **and** phrase/lexicon miss |
| Clean phrase like `你做緊咩呀？` without OpenAI | Phrase memory / lexicon (still not demo) |
| Health `"demo": true` | OpenAI not configured — model path offline; dictionary still works |

## Screenshots for docs

```bash
npm run docs:screenshots   # writes docs/demos/*.png
```
