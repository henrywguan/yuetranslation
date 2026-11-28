# Chat 3D companion — office / house environment

Runtime diorama for Inbox → Companion → **3D companion**. When docked, the avatar
frame becomes this virtual workspace (walls, floor, carpet, windows, desk, sofa…).

| File | Role |
| --- | --- |
| `office-env.glb` | Higgsfield **3D Jutsu** room shell + procedural furniture (~166 KiB) |
| `props/` | Optional Meshy image→3D hero props (same art direction; not required) |

**Snap markers** (authored as empties in Jutsu; runtime uses the constants in
`apps/web/src/lib/chatDeepAvatar3dEnv.ts`):

- `SNAP_desk` / `SNAP_chair` — Study / Work / DeskNap
- `SNAP_snack` — Eat
- `SNAP_sofa` — Idle sit
- `PATH_a` / `PATH_b` / `PATH_c` — Walk wander

PWA: `*.glb` under `chat-avatar/` stay SW-excluded (runtime fetch only).

Source scene: Higgsfield project **Chat companion office env**
(`4bdb8bd4-125a-40bc-9a05-298c9d576dca`).
