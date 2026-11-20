# DeepSeek Chat companion avatar

Higgsfield `gpt_image_2_6` assets for `#/chat` AUI (Muse / Grokbot-style).

| File | Role |
| --- | --- |
| `deep-sheet.png` | Character bible (front / ¾ / bust) |
| `deep-idle.gif` | Empty-state + resting bubble loop |
| `deep-happy.gif` | Brief post-reply celebrate |
| `deep-think.gif` | Composer has draft text |
| `deep-speak.gif` | Assistant streaming (simple mouth loop) |
| `deep-bust.png` | Reduced-motion / poster still |

## Mood wiring (`ChatDeepAvatar.tsx`)

- **idle** — empty thread, or engaged with empty composer  
- **think** — engaged + composer draft  
- **speak** — `thread.isRunning`  
- **happy** — ~2.2s after a run finishes  

v1 uses whole-clip GIF swaps (not phoneme lip-sync). Stretch: layered SVG mouth / Live2D / TTS sync.
