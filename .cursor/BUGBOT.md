# Bugbot — JyutTranslate security focus

Bugbot reviews every PR. Prefer **security, entitlement, and token-abuse** findings over style nits.

## Always flag

- Secrets or credentials in source, fixtures, client bundles, or PR description (Azure, OpenAI/DeepSeek, Supabase **service role**, Stripe secret, webhook `whsec_`, Resend)
- `VITE_*` or client code receiving **service role** or private keys (anon key only is OK)
- `YUE_OPEN_MODE=1` / open entitlements introduced into `vercel.json` or production paths
- Entitlement bypass: guests reaching live mic, `/api/speech-token`, Cam, docs, or `/api/admin/*`
- Metering skips: translate/TTS/camera/docs usage not incremented when `openMode` is false
- New paid endpoints without auth **and** rate limit / quota story
- Webhook handlers without signature / shared-secret verification
- `/api/health` or logs exposing absolute `.env` paths, raw keys, or internal hosts
- CORS / auth changes that widen cross-origin credentialed access

## Finding comments

For each security finding, include:

1. Severity (Critical / High / Medium / Low)
2. Evidence (file + behavior)
3. Concrete fix
4. **Fixability: AUTOMATED or NEEDS_HUMAN** (and why)

## Do not

- Demand paid live API calls to “prove” a finding in CI
- Approve PRs
- Nitpick unrelated formatting when no security/bug risk exists

## Product references

- `docs/agents/security-guardian.md`
- `docs/entitlements.md`
- `docs/admin.md`
- `AGENTS.md` (cloud paid-API rules)
