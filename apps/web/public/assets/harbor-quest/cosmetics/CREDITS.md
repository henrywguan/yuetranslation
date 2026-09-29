# HarborRPG cosmetics · free assets

All GLBs under `apps/web/public/assets/harbor-quest/cosmetics/` are **CC0 / public domain** (commercial OK). Harbor does not claim authorship of these meshes.

## Included packs

| Folder | Source | Licence | Notes |
|---|---|---|---|
| `quaternius/` | [Quaternius Modular Character Outfits — Fantasy](https://quaternius.com/packs/modularcharacteroutfitsfantasy.html) (itch Standard glTF, file dated 29 Jan 2026) | CC0 | Free Standard contains Ranger + Peasant only. Shipped: full outfits (M/F), dusk dye `T_Ranger_3`, field dye `T_Peasant_2`, Ranger hood (M/F), Ranger pauldron(s). Textures resized to 512 via glTF-Transform. Knight / Mage / Noble / Wizard are not in the free zip. |
| `quaternius/ual1.glb` · `ual2.glb` | [Universal Animation Library](https://quaternius.com/packs/universalanimationlibrary.html) + [Library 2](https://quaternius.com/packs/universalanimationlibrary2.html) Standard (in-place, not root-motion) | CC0 | Meshes stripped. Every clip except the T-pose is on the Perform menu. Idle / walk / sprint stay on the mixer. |

## Companion

Gobkit Free Minion `minion-a01.glb` (CC0) lives at `apps/web/public/assets/harbor-quest/companions/gobkit/`. Idle and attack clips are already split. See `companions/CREDITS.md`.

## Soft placeholders (no mesh)

Legacy bag ids `rpg-cloak-traveler`, `rpg-cloak-jade`, `rpg-helm-leather`, `rpg-helm-bronze`, `rpg-cape-ember` stay allowlisted for soft bag / sanitize — UI-only until meshes land.

## Runtime

Catalogue: `apps/web/src/landing/learn/harborRpgCosmetics.ts`  
Loader: `harborRpgCosmeticRuntime.ts`  
Wardrobe tab + Town outfitter (`rpg-vendor`) in `HarborRpgPanel.tsx`
