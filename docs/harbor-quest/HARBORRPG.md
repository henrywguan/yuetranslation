# HarborRPG · Separate adventure game (soft Realtime multiplayer)

**Status:** v4 — story dungeons · boss phases · live remotes/party  
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

Bosses advance phases on HP thresholds (toast + SFX + glow).

## Shared world tick

Zone **host** = lowest `userId` in zone; ~5 Hz monster snaps (`harbor-rpg-world`).

## Realtime presence (wired)

- Remotes in RPG zones render as foot sailors; pose broadcast applies live.
- Party invites end-to-end on Party tab (invite remotes → accept/decline dialog → broadcast party state).
- Trade windows + contested loot remain soft-trust.

## v4 surface

1. **9 overworld/town zones + 4 instances** (Ash Crypt · Black Tide Hollow · Chronicle Vault · Echo Isle)
2. **Combat:** GCD · MP · hit/miss/crit · threat · **boss phases**
3. **9×3 classes/specs** · spellbook · trade · market · bank · professions
4. **Art/SFX:** curated dungeon props + boss meshes; soft WebAudio dungeon/phase/party stings

## Feel bar

Boss phase transitions and dungeon enters must feel immediate. Flag Henry before cutting phase FX.
