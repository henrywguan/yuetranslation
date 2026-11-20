# DeepSeek Chat companion avatar

Higgsfield `gpt_image_2_6` assets for `#/chat` AUI (Muse / Grokbot-style).

| File | Role |
| --- | --- |
| `deep-sheet.png` | Character bible (front / ¾ / bust) |
| `deep-idle.gif` | Empty-state + resting bubble loop |
| `deep-happy.gif` | Soft smile clip (kept; post-run uses celebrate) |
| `deep-celebrate.gif` | Brief post-reply cheer |
| `deep-think.gif` | Composer has draft text |
| `deep-speak.gif` | Assistant streaming / TTS base mouth loop |
| `deep-listen.gif` | Dictate mic listening |
| `deep-concern.gif` | Session error / apologetic |
| `deep-bust.png` | Reduced-motion / poster still |

## Mood state machine (`ChatDeepAvatar.tsx`)

Priority high → low:

1. **concern** — session error banner  
2. **listen** — composer dictate mic live  
3. **speak** — `thread.isRunning` **or** Azure / DeepSeek chat TTS playing  
4. **celebrate** — ~2.4s after a run finishes  
5. **think** — engaged + composer draft  
6. **idle** — otherwise  

## TTS lips (v2)

While TTS plays (SpeakButton / auto-speak Azure path via `isTtsPlaying`, or DeepSeek chat TTS via `setChatDeepAvatarTtsPlaying`), a CSS mouth oval scales with a synthetic amplitude / vowel envelope (`getChatDeepAvatarLipLevel`). Not phoneme sync. `prefers-reduced-motion` hides lips and uses the static bust.
