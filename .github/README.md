# GitHub project docs

Product and ops documentation lives in the repo:

- [`README.md`](../README.md) — overview, quick start, doc index
- [`docs/`](../docs/) — camera, entitlements, admin, Harbor Quest, design, testing, legal, Android TWA
- [`docs/harbor-quest/`](../docs/harbor-quest/) — Harbor Quest craft bible + social/MMO notes
- [`AGENTS.md`](../AGENTS.md) — Cursor Cloud agent rules (live mic, Harbor Free+ beta, metering)

Internal marketing ops notes may live under `docs/agents/` and `docs/social/` — prefer not publishing all of `/docs` via GitHub Pages while the repo is public.

Pull requests use [PULL_REQUEST_TEMPLATE.md](./PULL_REQUEST_TEMPLATE.md).

CI: [`.github/workflows/vercel-preview.yml`](./workflows/vercel-preview.yml) waits for the Vercel Preview deployment on every PR (fails the check if Vercel fails). Cursor automation paste prompt: [`docs/agents/vercel-deploy-guardian.md`](../docs/agents/vercel-deploy-guardian.md).
