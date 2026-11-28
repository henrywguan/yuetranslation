# Chat 3D companion — office / house environment

Runtime diorama for Inbox → Companion → **3D companion**. The avatar frame
(small undocked or big docked) is **one** shared office. Companion **Both** puts
boy + girl inside that same room — never a second env per character.

| File | Role |
| --- | --- |
| `office-env.glb` | Higgsfield **3D Jutsu** room shell + procedural stand-ins (~166 KiB) |
| `props/*.glb` | Meshy image→3D heroes, **locally compressed** (simplify + 256px WebP) — ~5 MiB total |

Raw Meshy exports were ~10 MiB each (~100 MiB set). Only compressed copies ship in `public/`. Runtime hides matching `PRP_*` stand-ins once a prop loads.

**Snap markers** (authored as empties in Jutsu; runtime uses the constants in
`apps/web/src/lib/chatDeepAvatar3dEnv.ts`):

- `SNAP_desk` / `SNAP_chair` — Study / Work / DeskNap
- `SNAP_snack` — Eat
- `SNAP_sofa` — Idle sit
- `PATH_a` / `PATH_b` / `PATH_c` — Walk wander

PWA: `*.glb` under `chat-avatar/` stay SW-excluded (runtime fetch only).

Source scene: Higgsfield project **Chat companion office env**
(`4bdb8bd4-125a-40bc-9a05-298c9d576dca`).
