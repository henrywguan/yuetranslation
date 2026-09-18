# Harbor Quest — Anime Cel Shader Foundation

**Purpose:** Genshin-like / wuxia cel look for cinematic GLB characters & props, without replacing the RS-like procedural craft bible for docks/world.

**Stack:** Three.js WebGL → **GLSL** (not Unity HLSL). Same lighting math ports later if needed.

---

## What shipped

| Module | Role |
| --- | --- |
| [`harborCelMaterial.ts`](../../apps/web/src/landing/learn/harborCelMaterial.ts) | Step ramp (`MeshToonMaterial` + gradient map), sharp shadow tint, Fresnel rim contour |
| [`harborGlbAssets.ts`](../../apps/web/src/landing/learn/harborGlbAssets.ts) | Generic GLB loader under `/assets/harbor-quest/` + optional cel apply |
| [`harborProtagonistGlb.ts`](../../apps/web/src/landing/learn/harborProtagonistGlb.ts) | Scout Meshy GLBs get cel on normalize |

**Defaults**

- `HARBOR_CEL_SHADE_ENABLED = true` for imported Scout / GLB props
- Procedural RS craft (`hqMat` / Lambert world) stays era-faithful until Henry opts world over to cel
- Rim: cool mist `#a8d8ff`; stronger at night via `applyHarborCelNightRim`

---

## Shader model (agent command fulfilled)

1. **Step lighting** — nearest-filter 1×N gradient map → discrete shade bands  
2. **Sharp shadow ramp** — fragment mixes cool `uShadowTint` below `uShadowThreshold`  
3. **Outer rim-light contour** — view Fresnel `pow(1 - N·V, power) * strength`

Tune constants at top of `harborCelMaterial.ts` (`HARBOR_CEL_RAMP_STEPS`, `HARBOR_CEL_RIM_*`, …).

---

## game-asset MCP (not connected yet)

Cloud Agents currently have **Higgsfield** MCP, not `game-asset-mcp`.

**Henry setup**

1. Cursor → **Settings → MCP** → add the game-asset MCP server (per its package README)  
2. Restart / re-auth so Cloud Agents list the namespace  
3. Generate or fetch GLB/OBJ → save into:

```text
apps/web/public/assets/harbor-quest/<name>.glb
```

4. Load in world / UI:

```ts
import { loadHarborGlb } from './harborGlbAssets'
const prop = await loadHarborGlb('lantern-wuxia.glb', { targetHeight: 1.2 })
```

Cel applies automatically. Higgsfield `generate_3d` can also drop GLBs into the same folder.

---

## Parallel tracks (don’t mix casually)

| Track | Look | Materials |
| --- | --- | --- |
| **RS craft bible** | Chunky Lambert, face color, soft textures | `hqMat` / `hqMatSmooth` |
| **Anime cel** | Step light + rim | `createHarborCelMaterial` / `applyHarborCelToObject` |

Use cel for **Scout GLB + future anime props**. Keep procedural river / Guan architecture on craft materials unless art direction flips.

---

## Next steps (when Henry asks)

1. Connect game-asset MCP and smoke one prop GLB through `loadHarborGlb`  
2. Optional: night rim hook from `harborWorld` weather tick  
3. Optional: wardrobe `lookColors` path for cel Scout parts (needs mesh name → part map)
