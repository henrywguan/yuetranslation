# DeepSeek Chat companion avatars

Higgsfield `gpt_image_2_6` assets for `#/chat` AUI (Muse / Grokbot-style).

Characters (user-selectable, persisted as `yue-deepseek-chat-avatar-character-v1`; cloud blob `profiles.chat_deep_avatar`):

| Folder | Default label |
| --- | --- |
| `boy/` | **DS Boy** (renameable) |
| `girl/` | **DS Girl** (renameable) |

Each folder (runtime assets only — shipped under `public/`):

| File | Role |
| --- | --- |
| `deep-idle.gif` | Empty-state + resting bubble loop |
| `deep-happy.gif` | Soft smile clip |
| `deep-proud.gif` | Clean Ask / short-win outro |
| `deep-celebrate.gif` | Brief post-reply cheer |
| `deep-eureka.gif` | Search / long-research finish outro |
| `deep-think.gif` | Composer has draft text |
| `deep-speak.gif` | Assistant streaming / TTS base mouth loop |
| `deep-listen.gif` | Dictate mic listening |
| `deep-concern.gif` | Session error / apologetic |
| `deep-bow.gif` | Polite thanks / greeting |
| `deep-fist.gif` | Fist pump / hype |
| `deep-wave.gif` | Hello / goodbye |
| `deep-nod.gif` | Soft agreement |
| `deep-relieved.gif` | Hard problem solved |
| `deep-sleepy.gif` | Long wait / late-night |
| `deep-bust.png` | Reduced-motion / poster still |
| `intro.mp4` | Fullscreen enter intro (boy + girl) |
| `intro-poster.jpg` | Intro buffer still |
| `vo/{mood}.mp3` | Character voice line for fullscreen demos |

Shared SFX: `sfx/{mood}.mp3` (whoosh / cheer / hype beds under the pop).

**Do not** put character-bible `deep-sheet.png` (or other multi‑MB generation sources) in `public/chat-avatar/`. VitePWA `injectManifest` precaches `*.png` and rejects files over 2 MiB (broke prod after #796). Keep sheets outside the web public tree; `vite.config.ts` also glob-ignores `**/chat-avatar/**/deep-sheet.png` as a belt-and-suspenders guard. Intro `*.mp4` / `intro-poster.*` are similarly excluded from the SW precache — runtime-fetch only.

Performance moods (`bow` / `fist` / `wave` / `nod` / `relieved` / `sleepy`) currently ship as closest-clip stand-ins until dedicated Higgsfield regenerations replace them. Runtime stem fallbacks remain in `chatDeepAvatarMoodAssetStem` if a file is missing.

## Enter intro (`ChatDeepAvatarIntro.tsx`)

On `#/chat` (AUI shell), play `intro.mp4` for the selected companion once per character until dismissed (localStorage `yue-deepseek-chat-avatar-intro-seen-v1`). Tap / Esc / video end fades the black overlay into chat chrome. `prefers-reduced-motion` skips the clip (brief black wash only). Tries unmuted playback; shows **Tap for sound** if autoplay is blocked.

## Persona / tools

- Rename, trait, notes, and Sound toggle live in Inbox settings → Companion (cloud-synced when signed in).
- System prompt injects first-person companion identity + animation catalog.
- Tools: `avatar_list`, `avatar_play` (fullscreen + SFX/VO), `avatar_react` (soft or high-energy).
- Client sentiment heuristic fills in when the model skips `avatar_react`.

## Quality bar

Mood loops are **720×720** transparent GIFs (≈ **3×** hero CSS `min(15rem)`, well above bubble). Prefer regenerating at ≥720 rather than stretching soft ≤360 sources. Poster stills ≥1024² when available. Mood GIFs may exceed 2 MiB — that is fine for runtime fetch; they are **not** in the SW precache glob (no `gif` in `globPatterns`).

## Mood state machine (`ChatDeepAvatar.tsx`)

Priority high → low:

1. **concern** — session error banner  
2. **listen** — composer dictate mic live  
3. **speak** — `thread.isRunning` **or** Azure / DeepSeek chat TTS playing  
4. **outro / play / react** — celebrate / proud / eureka / performance moods  
5. **think** — engaged + composer draft  
6. **idle** — otherwise  

**Celebrate fullscreen** (Inbox settings → Celebrate): Every success · Deep finishes · Frame only. Forced demos (`avatar_play` / high-energy reacts) always fullscreen (unless reduced-motion) and play SFX + character VO when Sound is on.

## TTS lips

While TTS or companion VO plays, a CSS mouth oval scales with a synthetic amplitude / vowel envelope (`getChatDeepAvatarLipLevel`). Not phoneme sync. `prefers-reduced-motion` hides lips and uses the static bust.
