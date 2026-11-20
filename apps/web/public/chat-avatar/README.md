# DeepSeek Chat companion avatars

Higgsfield `gpt_image_2_6` assets for `#/chat` AUI (Muse / Grokbot-style).

Characters (user-selectable, persisted as `yue-deepseek-chat-avatar-character-v1`):

| Folder | Label |
| --- | --- |
| `boy/` | **DS Boy** |
| `girl/` | **DS Girl** |

Each folder (runtime assets only — shipped under `public/`):

| File | Role |
| --- | --- |
| `deep-idle.gif` | Empty-state + resting bubble loop |
| `deep-happy.gif` | Soft smile clip (kept; post-run uses celebrate) |
| `deep-celebrate.gif` | Brief post-reply cheer |
| `deep-think.gif` | Composer has draft text |
| `deep-speak.gif` | Assistant streaming / TTS base mouth loop |
| `deep-listen.gif` | Dictate mic listening |
| `deep-concern.gif` | Session error / apologetic |
| `deep-bust.png` | Reduced-motion / poster still |

**Do not** put character-bible `deep-sheet.png` (or other multi‑MB generation sources) in `public/chat-avatar/`. VitePWA `injectManifest` precaches `*.png` and rejects files over 2 MiB (broke prod after #796). Keep sheets outside the web public tree; `vite.config.ts` also glob-ignores `**/chat-avatar/**/deep-sheet.png` as a belt-and-suspenders guard.

## Quality bar

Mood loops are **720×720** transparent GIFs (≈ **3×** hero CSS `min(15rem)`, well above bubble). Prefer regenerating at ≥720 rather than stretching soft ≤360 sources. Poster stills ≥1024² when available. Mood GIFs may exceed 2 MiB — that is fine for runtime fetch; they are **not** in the SW precache glob (no `gif` in `globPatterns`).

## Mood state machine (`ChatDeepAvatar.tsx`)

Priority high → low:

1. **concern** — session error banner  
2. **listen** — composer dictate mic live  
3. **speak** — `thread.isRunning` **or** Azure / DeepSeek chat TTS playing  
4. **celebrate** / **proud** / **eureka** — brief after a run finishes (`proud` → `deep-happy.gif`, `eureka` → `deep-celebrate.gif`; CSS variants until new GIFs)  
5. **think** — engaged + composer draft  
6. **idle** — otherwise  

Character pick does not change the mood / TTS lip machine — only the asset folder.

**Celebrate fullscreen** (Inbox settings → Celebrate): Every success · Deep finishes (≥~15s Agent/Plan/Search or Plan→Build) · Frame only. Pref `yue-deepseek-chat-avatar-celebrate-v1`. `prefers-reduced-motion` skips fullscreen + particles.

## TTS lips

While TTS plays, a CSS mouth oval scales with a synthetic amplitude / vowel envelope (`getChatDeepAvatarLipLevel`). Not phoneme sync. `prefers-reduced-motion` hides lips and uses the static bust.
