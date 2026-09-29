# HarborRPG mounts · free assets

All rideable GLBs under `apps/web/public/assets/harbor-quest/mounts/` are **CC0 / public domain** (commercial OK). Harbor does not claim authorship of these meshes.

## Included packs

| Folder | Source | Licence | Notes |
|---|---|---|---|
| `quaternius/` | [Quaternius Ultimate Animated Animal Pack](https://quaternius.com/packs/ultimateanimatedanimals.html) (redistributed via [AnimaSim](https://github.com/danwahl/animasim) wheel assets) | CC0 | Horse, Deer, Donkey, Stag, Fox, Husky, Shiba, Wolf, Alpaca, Bull, Cow + Idle/Walk/Gallop clips |
| `farm/` | Quaternius-lineage farm animals (via [godotcraft](https://github.com/afarber/godotcraft) `models/animals`) | CC0 | Horse, Dog, Pig, Sheep, Wolf, Cat, Chicken, Raccoon, Chick |
| `gobkit/` | [Gobkit Free Animal Pack](https://gobkit.com/freebies) | CC0 | Corgi, Goat, Boar, Rhino, Hippo, Platypus, Red, Duck, Owl, Seal |
| `oga-source/` | [OpenGameArt Pony](https://opengameart.org/content/pony) + [Horse](https://opengameart.org/content/horse) | CC0 | **Source only** (`.blend` + textures). No Blender in CI — not wired as rideables until exported to GLB. |

## Not shipped

| Source | Why |
|---|---|
| [BlendSwap Horse Rigged All Gaits](https://blendswap.com/blend/28627) | Download returned HTTP 403 from this environment. Quaternius horse covers the same gait set (Walk/Gallop). |

## Runtime

Catalogue: `apps/web/src/landing/learn/harborRpgMounts.ts`  
Loader + mixer: `harborRpgMountRuntime.ts`  
Town interact: Ferry Stable (`rpg-stable`)
