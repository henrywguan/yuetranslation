# HarborRPG · Separate adventure game (soft Realtime multiplayer)

**Status:** v6.6 — Quaternius dye kits + Universal Animation Library on outfits · v6.5 medium loops · soft polish v6.2  
**Branch:** `cursor/harborrpg-safe-impl-d66b`  
**Audience:** Henry + engineering agents  

## Doctrine (locked)

HarborRPG is a **completely different game** entered from Harbor Quest (Chart teleport). It must **not share** pedagogy or voyage systems:

| Keep separate | Never share with Harbor Quest |
|---|---|
| Soft XP / gold / inventory / gear / professions | Sailor XP, ferry coins, arena gold, pier clears |
| RPG characters (max 2) | River Scout create / look / beauty / showoff |
| RPG zones, combat, loot, quests, instances | Curriculum, trainers, fishing, Capes / Cantonese skills |
| RPG HUD while in-realm | Chapter bar, delve, outfitter, arena, chat pedagogy |
| Presence channel `harbor-rpg-realm` | `harbor-quest-river` poses |

Persistence may nest under `harbor_quest_progress.progress.rpg` for storage only — not shared meters.

## Soft trust (Henry 2026-09-28)

Henry accepted **no dedicated anti-cheat**. HarborRPG may use:

1. Client-authoritative combat, loot rolls, professions, market posts, trades, boss phases.
2. **Supabase Realtime** for presence, parties, contested loot, market, world tick, trade.
3. API sanitize soft-caps bag fields.
4. No DeepSeek / Azure required.

## Campaign · The Tide That Remembers

Original Harbor/Jade story (tone inspiration only: BDO · ESO · MapleStory). Full brief: [`HARBORRPG-LORE.md`](./HARBORRPG-LORE.md).

| Chapter | Dungeon | Boss (phased) |
|---|---|---|
| I Ash Remembers | `crypt` | Ash Warden |
| II Name Hunger | `tidehollow` (via Marsh) | Pearl Host |
| III Self-Writing | `chronicle` (via Town) | Ink Archivist |
| IV Who Keeps the Voyage | `echoisle` (via Pinewood) | Mirror Ferry |
| V Tide Remembers (raid) | `tideraid` (via Town) | Herald → Depth → Sovereign |

~40 hub + story quests with **chapter gating** (`requires`). Bosses advance phases on HP thresholds (toast + SFX + glow).

## Heroic

Bag `difficulty: 'normal' | 'heroic'`. Heroic instances scale HP/ATK/XP/gold and bonus loot (+ Heroic Ferry Seals on bosses). Toggle on Quests tab; remount the instance to apply.

## Dungeon Finder roles

Party tab: pick **tank / heal / dps** + dungeon → Looking. Presence carries LFG role/dungeon. Soft match invites complementary remotes; missing roles can be filled by companion hire.

## Mounts (v6)

Town **Ferry Stable** (`rpg-stable`) sells / summons CC0 rideables:

| Pack | Examples | Licence |
|---|---|---|
| Quaternius Ultimate Animated Animals | Tide Horse (starter), Pearl Horse, Deer, Wolf, … | CC0 |
| Farm (godotcraft / Quaternius lineage) | Farm Horse, Dog, Pig, Chicken, … | CC0 |
| Gobkit Free Animal Pack | Corgi, Goat, Rhino, Duck, … | CC0 |

Bag fields: `ownedMounts` (starter includes `horse`), `activeMountId`. Summon boards a GLB + Idle/Walk/Gallop mixer; walk speed uses `speedMult`. Dismount from Stable tab. Credits: `apps/web/public/assets/harbor-quest/mounts/CREDITS.md`. OGA `.blend` sources kept under `oga-source/` (not rideable until GLB export).

## Wardrobe cosmetics (v6.6)

Town outfitter (`rpg-vendor`) + **Wardrobe** tab sell / equip CC0 looks:

| Pack | Examples | Kind |
|---|---|---|
| Soft placeholders | Traveler Cloak (starter), Jade Cloak, helms, Ember Cape | Bag-only (no mesh yet) |
| Quaternius Modular Outfits Fantasy | Ranger / Peasant (M/F), Dusk Ranger, Field Peasant, Ranger hood, pauldrons | `outfit` replaces Scout · `attach` layers on Scout |

The free Standard zip (29 Jan 2026) is Ranger + Peasant plus two dye textures. Paid Source kits were not imported.

Full outfits play Quaternius **Universal Animation Library 1 + 2** in place (`ual1.glb`, `ual2.glb`): idle / walk / sprint from foot movement, Wave · Bow · Cheer · Toast, a Perform menu, `Sword_Attack` on a landed hit, `Hit_Chest` when struck, `Death01` at the shrine after the existing instant respawn. Pose packets carry the clip so remotes play it. Hoods and pauldrons stay on the bind pose.

Bag: `ownedCosmetics`, `equippedCosmetic` (one look at a time). Presence / pose carry `equippedCosmetic`. Credits: `apps/web/public/assets/harbor-quest/cosmetics/CREDITS.md`. Research backlog: [`HARBORRPG-FREE-COSMETICS.md`](./HARBORRPG-FREE-COSMETICS.md).

## Medium systems (v6.5)

Soft client slices. Still no anti-cheat. v6.5 deepens the v6.4 stubs and adds the loops that were still missing.

| System | Where |
|---|---|
| Friends online / AFK, whispers | Social tab · presence |
| Ravenpost delivery, including attached gold | Social tab · `harbor-rpg-social` broadcast |
| Fleet roster, ranks, shared bank, pledge board | Social tab |
| Duel (training post or another sailor, first to 0, no loot) | Social tab |
| Inspect a remote sailor (gear, title, fleet) | Social tab |
| Reliquary shelves | Frontiers tab · claim once, then the deed stays on the shelf |
| Tide Rift | Seeded pack each open · Frontiers tab |
| Lock Delve | Floor changes the pack · three-pin lock, not a coin flip |
| Mount race | Town start → mid → finish; under 45s while mounted pays 20g |
| World board | Three dailies + one weekly on the Quests tab · two-line tracker on Field |
| Tide charts | Draw a chart, dig the site, +12g |
| Buff strip | Might draught and Guard on the vitals row |
| Floating hits + death recap | Combat numbers in the world · last hits on the defeat toast |
| Second talent loadout | Class tab · save B / swap |
| Party ready check | Party tab |
| Ash Reach world boss + Moon Pier | Overworld portals from Town |
| Weather | Render-only, stable per zone (`harborRpgWeatherForZone`) |

## Wiki (v6.1)

In-game **HarborRPG Wiki** (Field → HarborRPG Wiki):

- Pages for **every** item, mount, monster, zone, quest, class, profession, and achievement
- Items always list **loot sources** (monster drop % + zones, vendor, craft inputs, gather nodes, starter, Heroic bonus)
- Mounts list Ferry Stable gold cost / free unlock
- Achievements show how-to-obtain copy + soft progress from the bag
- Greaves / Trail Boots now have craft recipes + ruin drops so every item has a source

## Soft polish (v6.2)

1. **Player-down** — toast + SFX; overworld soft shrine respawn; **instance wipe** reseeds packs
2. **Remote mounts** — presence / pose carry `activeMountId`; remotes render the same GLB ride
3. **Companion ally** — hired companion auto-swings nearby foes + follows as a soft fox mesh
4. **Deeds HUD** — Achievements tab with progress bars; unlock titles → pin on Field
5. **Professions** — 15 craft recipes · 11 gather nodes (mana / cloth / hood / wraps / sandals / tome / lantern)
6. **Ability depth** — 7 skills per class (mid + late unlocks); bar still caps at 5

Free animated cosmetics scout (Henry import): [`HARBORRPG-FREE-COSMETICS.md`](./HARBORRPG-FREE-COSMETICS.md). OGA mount `.blend` export stays Henry-owned. **Quaternius Modular Outfits first ship is live** (v6.3 Wardrobe).

## Shared world tick

Zone **host** = lowest `userId` in zone; ~5 Hz monster snaps (`harbor-rpg-world`).

## Realtime presence (wired)

- Remotes in RPG zones render as foot sailors; pose broadcast applies live.
- Party invites end-to-end on Party tab (invite remotes → accept/decline dialog → broadcast party state).
- Trade windows + contested loot remain soft-trust.

## v6 surface

1. **14 zones** (7 overworld including Town, Ash Reach, and Moon Pier + 5 story instances including Tide Remembers + Tide Rift + Lock Delve)
2. **Combat:** GCD · MP · hit/miss/crit · threat · **boss phases** · Heroic scale
3. **9×3 classes/specs** · spellbook · trade · market · bank · professions
4. **Quest density** · finder roles · companion fill
5. **Mounts:** 30+ CC0 animals · Ferry Stable · board/ride/dismount
6. **Wiki:** every entity page · loot sources · mount/achievement obtain
7. **Wardrobe:** Quaternius Ranger/Peasant + dusk/field dyes · UAL1/UAL2 on full outfits · hood/pauldron attaches · soft placeholders
7. **Art/SFX:** curated dungeon/raid props + boss meshes; soft WebAudio stings

## Feel bar

Boss phase transitions and dungeon enters must feel immediate. Flag Henry before cutting phase FX.
