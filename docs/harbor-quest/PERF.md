# Harbor Quest · Performance

**Goal:** Keep voyage / Guan feeling fluid on phones without stripping motion polish.

## Already shipped

| Lever | Where | Why |
|---|---|---|
| DPR cap `≤ 1.25` | `harborWorld.ts` | Cuts fill-rate on retina phones |
| `antialias: false` + ACES | renderer setup | Cheaper MSAA; filmic tone without SSAO |
| Fog + camera far `180` | weather look | Avoid rendering empty horizon |
| River chunk window | `ACTIVE = 4`, ±2 around sailor | Stream scenery instead of one giant mesh |
| Cached lantern / anim lists | `rebuildFxIndex` | No full `scene.traverse` each frame |
| Pause when chart/splash / tab hidden | `setPaused` / `document.hidden` | Zero sim when UI owns the screen |
| Reduced motion | `setReducedMotion` | Honors `prefers-reduced-motion` |
| No realtime shadow maps | lights + GLB flags | Shadows are the usual mobile killer |

## Dynamic light (no shadow maps)

| Lever | Detail |
|---|---|
| Weather key vs fill | Lower ambient / stronger sun + darker hemi ground → longer cel bands |
| Angled directional sun | Not straight-down noon — form reads while sailing |
| Fake contact discs | Soft dark circles under Scout / canoe / NPCs / remotes (`harborContactShadow.ts`) |
| Lantern pool pulse | Intensity + distance breathe; night/rain ranges longer |
| Cel preset punch | Higher thresholds / deeper shadowLift on character & terrain |

**Still avoided:** realtime `PCFSoftShadowMap` / cast+receive on voyage meshes (mobile killer).

## Grass / nature

| Lever | Detail |
|---|---|
| Shared blade `ConeGeometry` | `harborGrass.ts` — every tuft reuses one buffer |
| Shared blade materials | Color-keyed Lambert cache |
| Chunk dispose skip | `userData.sharedGrassGeo` — never dispose the shared cone |
| Habitat patches | Dirt mound + lime rim + dark leaves + tan stalks (original craft) |

## Frame-loop trims (this pass)

| Lever | Detail |
|---|---|
| Rain budget `400` | Was `700`; frustum cull on |
| Far anim skip | Fauna / petals beyond ~48 units from camera idle |

## Next candidates (not yet)

1. **`InstancedMesh` grass banks** — biggest draw-call win; needs instance matrices + ground Y
2. **LOD remotes** — billboard / simplified Scout past N players
3. **Stagger V2 mounts** — avoid chunk-stream spikes when many willows resolve together
4. **DEV FPS overlay** — optional; do not ship in production chrome

## Smell tests

1. Rainy voyage still looks wet, not sparse
2. Grass underfoot on forest / village / reeds banks
3. Guan tuft names (`guan-grass-tuft`, `guan-tall-grass`) still smoke
4. No white / missing blades after sailing past several chunks (shared geo not disposed)
