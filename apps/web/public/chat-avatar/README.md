# DeepSeek Chat companion avatars

Higgsfield `gpt_image_2_6` assets for `#/chat` AUI (Muse / Grokbot-style).

Characters (user-selectable, persisted as `yue-deepseek-chat-avatar-character-v1`; cloud blob `profiles.chat_deep_avatar`):

| Folder | Default label |
| --- | --- |
| `boy/` | **DS Boy** (renameable) |
| `girl/` | **DS Girl** (renameable) |
| `both/` | **Both** — always dual side-by-side solos in the portrait; pair GIFs for high-energy popups |

**Both mode:** Companion radio Boy | Girl | Both. Both always mounts Boy + Girl solo tiles (never Overseer→one / Worker→other). Soft moods stay dual-solo in-frame; collaboration / high-energy popups prefer `both/pair-*.gif` via the play bus, with graceful dual-solo fallback if a pair file is missing. Names stay per-solo (`boy` / `girl` maps); Both nameplate shows `BoyName & GirlName`.

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
| `vo/{mood}.mp3` | Character voice line for fullscreen demos (**Higgsfield personal voice**, not Azure) |

Shared SFX: `sfx/{mood}.mp3` (whoosh / cheer / hype beds under the pop).

### Both pair clips (`both/`)

Higgsfield `gpt_image_2_6` duo GIFs (720×720, transparent, same recipe as solo moods). Runtime paths:

| File | Beat |
| --- | --- |
| `pair-idle.gif` | Resting duo presence |
| `pair-highfive.gif` | High five |
| `pair-handshake.gif` | Handshake |
| `pair-handoff.gif` | Handing over paper / plan |
| `pair-celebrate.gif` | Joint win |
| `pair-think.gif` | Heads-together think |
| `pair-wave.gif` | Dual wave |

Plan→Build / Overseer settle latches `handoff` (pair clip in Both; solo stems to celebrate). VO for Both staggers Archie + Pixie lines (or SFX-led for true pair frames) — still never Azure / `/api/tts`.

**Do not** put character-bible `deep-sheet.png` (or other multi‑MB generation sources) in `public/chat-avatar/`. VitePWA `injectManifest` precaches `*.png` and rejects files over 2 MiB (broke prod after #796). Keep sheets outside the web public tree; `vite.config.ts` also glob-ignores `**/chat-avatar/**/deep-sheet.png` as a belt-and-suspenders guard. Intro `*.mp4` / `intro-poster.*` and companion `*.glb` are similarly excluded from the SW precache — runtime-fetch only.

### 3D companion (`deep.glb`)

Inbox settings → Companion → **3D companion** toggles floating three.js characters (`ChatDeepAvatar3D`). Default remains GIF moods. With 3D on:

- Runtime meshes: `{boy,girl}/deep.glb` (Higgsfield Meshy image→3D from bust refs; SW-excluded). Procedural stub if a GLB fails to load.
- Mood play-bus → `AnimationMixer` clip names (`Idle` / `Sit` / `Wave` / `Think` + ambient `Walk` / `Interact` / `Study` / `Work`). Missing clip → idle bob; celebrate / pair fullscreen stay on the 2D GIF path.
- **Ambient idle AI:** when play-bus mood is resting, companions undock and wander on `.ds-chat`, picking study / work / walk / idle dwells. Speak / wave / celebrate (etc.) still override briefly.
- **Both + 3D:** two independent draggable GLBs (boy + girl), default docked side-by-side on the composer; each can chill or collaborate anywhere on `.ds-chat`. When near each other they prefer **Interact**. Poses persist per solo.
- Drag anywhere over `#/chat` (inbox / workspace / composer / empty chrome); soft-snap home to the bar/stage dock
- `prefers-reduced-motion` and WebGL failure fall back to GIF; mic / composer controls stay interactive (handle-only pointer events)
- Stays on three.js GLB / procedural mesh (no Live2D / Cubism; no Azure VO for the avatar)

Performance moods (`bow` / `fist` / `wave` / `nod` / `relieved` / `sleepy`) ship dedicated 720×720 Higgsfield `gpt_image_2_6` GIFs (same recipe as proud/eureka). Runtime stem fallbacks remain in `chatDeepAvatarMoodAssetStem` if a file is missing.

### Personal voices (locked — never Azure)

Avatar VO is pre-baked Higgsfield `text2speech_v2` (ElevenLabs variant) with **one locked preset per character**. Runtime playback only loads `public/…/vo/*.mp3` — it must **never** call `/api/tts` or Azure Speech for companion lines.

| Character | Preset | `voice_id` |
| --- | --- | --- |
| DS Boy | **Archie** (cute anime boy) | `bd072316-f77c-588b-b6e5-e46b9b03d008` |
| DS Girl | **Pixie** (cute chibi anime girl) | `0178ef57-ada4-43d9-992b-8d9221045bb4` |

VO copy (same words, distinct takes): idle `Hey.` · think `Hmm.` · listen `I am listening.` · speak `Okay.` · happy `Nice!` · proud `Done.` · celebrate `Hooray!` · eureka `Got it!` · concern `Oh no.` · bow `Thank you!` · fist `Let's go!` · wave `Hi!` · nod `Yes.` · relieved `Phew.` · sleepy `Zzz.`

## Enter intro (`ChatDeepAvatarIntro.tsx`)

On `#/chat` (AUI shell), play `intro.mp4` for the selected companion **every time** the route mounts (including return from another hash route). Tap / Esc / video end fades the black overlay into chat chrome for that visit only — no persistent “seen” latch. `prefers-reduced-motion` soft-skips the clip (brief black wash only). Companion Sound defaults **on** (unmuted); Mute silences this visit; Sound-off in settings stays silent. Chat-open clicks prime unmuted play in-gesture. Overlay video uses JS pixel **cover** so every viewport fills (no letterbox / half-screen).

## Persona / tools

- Rename, trait, notes, and Sound toggle live in Inbox settings → Companion (cloud-synced when signed in).
- System prompt injects first-person companion identity + animation catalog.
- Tools: `avatar_list`, `avatar_play` (fullscreen + SFX/VO), `avatar_react` (soft or high-energy).
- Client sentiment heuristic fills in when the model skips `avatar_react`.
- Mood routing: each showcase id maps to its own `deep-{id}.gif` + `vo/{id}.mp3`. Soft demos (sleepy / bow / …) beat speak/TTS on the portrait and skip celebrate stars; high-energy keeps cheer wash. SFX beds use energy class (`soft` / `cheer` / `hype`) so eureka does not share the celebrate whoosh. `avatar_play` / `avatar_react` suppress the automatic post-run celebrate latch for that turn.

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
