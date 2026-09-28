# HarborRPG cosmetics · free assets

All GLBs under `apps/web/public/assets/harbor-quest/cosmetics/` are **CC0 / public domain** (commercial OK). Harbor does not claim authorship of these meshes.

## Included packs

| Folder | Source | Licence | Notes |
|---|---|---|---|
| `quaternius/` | [Quaternius Modular Character Outfits — Fantasy](https://quaternius.com/packs/modularcharacteroutfitsfantasy.html) (itch Standard glTF) | CC0 | Curated first ship: Male/Female Ranger + Peasant full outfits · Ranger hood (M/F) · Ranger pauldron(s) (M/F). Textures resized to 512 via glTF-Transform. |

## Soft placeholders (no mesh)

Legacy bag ids `rpg-cloak-traveler`, `rpg-cloak-jade`, `rpg-helm-leather`, `rpg-helm-bronze`, `rpg-cape-ember` stay allowlisted for soft bag / sanitize — UI-only until meshes land.

## Runtime

Catalogue: `apps/web/src/landing/learn/harborRpgCosmetics.ts`  
Loader: `harborRpgCosmeticRuntime.ts`  
Wardrobe tab + Town outfitter (`rpg-vendor`) in `HarborRpgPanel.tsx`
