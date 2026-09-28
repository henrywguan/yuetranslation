# HarborRPG · Separate adventure game (no dedicated host)

**Status:** v1 systems slice — multi-zone soft RPG  
**Branch:** `cursor/harborrpg-safe-impl-d66b`  
**Audience:** Henry + engineering agents  

## Doctrine (locked)

HarborRPG is a **completely different game** that is only *entered* from Harbor Quest (Chart teleport). It must **not share** pedagogy or voyage systems:

| Keep separate | Never share with Harbor Quest |
|---|---|
| Soft XP / gold / inventory / gear | Sailor XP, ferry coins, arena gold, pier clears |
| RPG characters (max 2) | River Scout create / look / beauty / showoff |
| RPG zones, combat, loot, quests | Curriculum, trainers, fishing, Capes / Cantonese skills |
| RPG HUD while in-realm | Chapter bar, delve, outfitter, arena, chat pedagogy |
| Presence (later) | `harbor-quest-river` poses |

Persistence may still nest under `harbor_quest_progress.progress.rpg` for one blob — that is storage only, not shared meters.

## Soft trust (no dedicated host)

1. Client-authoritative world, combat, loot, quests.
2. API sanitize soft-caps bag fields (chars, gold, XP, inventory size).
3. Soft party / finder = local companion hire + ephemeral party UI (no contested PvP).
4. No DeepSeek / Azure required.

## v1 shipping now

1. **Zones:** Meadow · Pinewood · Ruins · Crossroads Town (portals between)
2. **Dense craft:** flora, fauna, rocks, buildings, monster packs (procedural, no KayKit preload)
3. **Combat:** HP, aggro chase, player attack, monster hit, death → soft respawn
4. **Loot / inventory / gear:** drops into RPG bag; equip weapon / armor (soft stats)
5. **Quests + vendor:** kill / gather turn-ins; town shop buy/sell
6. **Soft party / finder:** hire companion (damage share) + local party panel
7. **Isolated HUD:** when `realm === 'rpg'`, hide voyage chips / delve / chapter pedagogy chrome

## Explicitly deferred

- Authoritative multiplayer / Realtime RPG presence
- True contested PvP economy
- KayKit/Quaternius mesh preload on mount
- ClaudeCraft guilds / deeds / Study Finder queues (those map to Harbor Quest social packet, not this game)

## Feel bar

Combat hits, loot pops, zone portal reveals, and companion assist must feel immediate. Flag Henry before any lean-pipeline cut that hurts polish (`AGENTS.md`).
