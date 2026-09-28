# HarborRPG · Separate adventure game (soft Realtime multiplayer)

**Status:** v5 — quest density · Heroic · Tide raid · finder roles  
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

## Shared world tick

Zone **host** = lowest `userId` in zone; ~5 Hz monster snaps (`harbor-rpg-world`).

## Realtime presence (wired)

- Remotes in RPG zones render as foot sailors; pose broadcast applies live.
- Party invites end-to-end on Party tab (invite remotes → accept/decline dialog → broadcast party state).
- Trade windows + contested loot remain soft-trust.

## v5 surface

1. **10 zones** (5 overworld + Town + 4 story instances + Tide Remembers raid)
2. **Combat:** GCD · MP · hit/miss/crit · threat · **boss phases** · Heroic scale
3. **9×3 classes/specs** · spellbook · trade · market · bank · professions
4. **Quest density** · finder roles · companion fill
5. **Art/SFX:** curated dungeon/raid props + boss meshes; soft WebAudio stings

## Feel bar

Boss phase transitions and dungeon enters must feel immediate. Flag Henry before cutting phase FX.
