---
name: live-mic-invariants
description: >-
  Critical live mic / tap-to-talk invariants. Use whenever hunting bugs, reviewing
  PRs, or changing STT, Web Speech, Azure speech, LiveHoldButton, startHold,
  iPhone mic, or live API call volume.
---

# Live mic — critical regressions

Treat these as **release-blocking**. They shipped before (Aug 2026 #46, Sep 2026 #293) and made the mic look on (Safari orange pill) while the in-app button snapped back to **Hold or tap**.

## Tap / hold contract (every language)

- **Tap** → keep listening until a **second tap** or **~2s silence after speech** (not after empty Safari `onend`).
- **Hold** → listen until release.
- If Safari’s orange mic is on, the in-app button must stay in a listening state (`liveInteraction` tap or hold). Never idle while the OS mic pill is on.

## Must not regress

In `apps/web/src/lib/webSpeech.ts`:

- `rec.continuous = true` for **every** language on iPhone (not only `en`). Do not restore `continuous = !apple` or `!apple || activeLang === 'en'`.
- Do **not** kill the session after two empty `onend`s on Apple. The store’s 7s silence timer / second tap ends the turn. Desktop may still cap empty restarts.
- iOS `stop()` uses `recognition.stop()`, not `abort()`.

In `apps/web/src/lib/store.ts`:

- Sticky tap must arm even if `pointerup` lands while `startHold` is awaiting `recognition.start()` (`pendingStickyTap` / `keepHoldOrSticky`).
- Do not `loadBootstrap()` (GET `/health` + history) on every mic teardown — that burst tripped Vercel’s security checkpoint after 2–3 turns.
- iPhone live STT stays on Web Speech for Yue/En/Cmn/Es/Vi. Do not mint
  `/api/speech-token` or fall back to Azure LID on later taps (English leaked
  onto a Yue lock). **Exception:** Tagalog (`tl`) and Shanghainese (`wuu`) use
  Azure **fixed-locale** on iPhone — Safari Web Speech returns
  `service-not-allowed` for `fil-PH` / lacks Wu. Never use LID for those panes.
- **Auto-speak barge-in:** tapping the mic while TTS plays must start Web Speech *then*
  pause TTS (`shouldDeferTtsStopUntilSttStarts`). Do not `speechSynthesis.cancel()`,
  `audio.load()`, silent-WAV unlock, or `getUserMedia` until STT has started — those
  abort Safari capture (pill on, no audio). Do not arm the 600ms echo tail on user
  barge-in. Skip auto-speak if a new mic turn is already live.
- **Background privacy:** Home / app switcher / Control Center must **stop tracks immediately** (`releaseCaptureOnBackground`). Do not wait for `session.stop()` — iOS can freeze JS and leave the orange “Safari Websites” pill on. Do not `loadBootstrap` on hide.

In `apps/web/src/lib/tts.ts`:

- Mic barge-in uses `stopSpeaking({ preserveSession: true })` after `recognition.start()` — pause only, never `cancel()` / `load()`.
- `unlockTtsPlayback()` is a no-op while TTS is playing.

In `apps/web/src/lib/api.ts` / `apiError.ts`:

- Never throw `res.text()` HTML (Vercel checkpoint) into the error banner.

## Check

```bash
npx tsx apps/web/src/lib/webSpeech.smoke.ts
npx tsx apps/web/src/lib/liveStt.smoke.ts
npx tsx apps/web/src/lib/tts.smoke.ts
npx tsx apps/web/src/lib/micPrivacy.smoke.ts
npx tsx apps/web/src/lib/apiError.smoke.ts
```
