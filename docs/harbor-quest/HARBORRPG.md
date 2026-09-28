# HarborRPG · Separate adventure game (soft Realtime multiplayer)

**Status:** v2 systems — ClaudeCraft-closer (soft trust)  
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

Persistence may nest under `harbor_quest_progress.progress.rpg` for one blob — storage only, not shared meters.

## Soft trust (Henry 2026-09-28)

Henry accepted **no dedicated anti-cheat**. HarborRPG may use:

1. Client-authoritative combat, loot rolls, professions, market posts.
2. **Supabase Realtime** for shared presence, parties, contested need/greed, market broadcast.
3. API sanitize soft-caps bag fields (chars, gold, XP, inventory, bank, listings).
4. No DeepSeek / Azure required.

A dedicated game host remains optional later for fairness; it is **not** a ship gate.

## v2 shipping now

1. **Zones:** Meadow · Pinewood · Ruins · Marsh · Crossroads Town + **Ash Crypt** instance
2. **Combat depth:** auto-swing + ability bar (GCD), threat table, party threat share
3. **Classes & skills (v2.1):** six Harbor-original kits — Tideblade · Reedshadow · Lanternmancer · Jadeheart · Ashbound · Starferry — with skill ranks 1–10, three talent trees (Offense / Ward / Voyage), passives, prestige ★ after level 50
4. **Itemization:** rarities, multi-slot gear (weapon/offhand/head/chest/legs/feet/ring/trinket), bank
5. **Content volume:** more monster kinds, denser spawn packs, more quests
6. **Instances:** Ash Crypt (boss + adds), enter from Ruins
7. **Professions + market:** herbalism / mining gather · alchemy / smithing craft · town World Market listings
8. **Realtime social:** `harbor-rpg-realm` presence · real party invite · contested need/greed loot
9. **Isolated HUD:** voyage chrome hidden while `realm === 'rpg'`

## Explicitly deferred

- Dedicated authoritative sim / anti-cheat server
- Full WoW-style 9-class + 27-spec parity (Harbor ships 6 original classes)
- Ranked PvP ladders
- KayKit mesh preload on mount
- ClaudeCraft guilds / deeds (Harbor Quest social packet, not this game)

## Feel bar

Ability casts, loot rolls, party invites, zone/instance portals, and market posts must feel immediate. Flag Henry before any lean-pipeline cut that hurts polish (`AGENTS.md`).
