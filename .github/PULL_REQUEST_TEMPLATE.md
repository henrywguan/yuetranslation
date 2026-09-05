## Summary
-

## Test plan
- [ ] `npx tsc --noEmit -p apps/web/tsconfig.json` (and/or API) when TS changed
- [ ] Offline `npm run smoke:all` (or at least `smoke:canto`) when API / entitlements touched
- [ ] Manual check of the affected UI / API path

## Notes
- Do not burn DeepSeek / Azure from Cloud agents without explicit OK — see `AGENTS.md`.
- Prefer not enabling GitHub Pages on all of `/docs` while `docs/agents` / `docs/social` stay public.
- Security / leak / token-abuse: Security Guardian + Bugbot — see `docs/agents/security-guardian.md`.
