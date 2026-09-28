# HarborRPG · Separate adventure game (soft Realtime multiplayer)

**Status:** v3 systems — shared world tick · 9×3 specs · trade windows  
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

1. Client-authoritative combat, loot rolls, professions, market posts, trades.
2. **Supabase Realtime** for shared presence, parties, contested need/greed, market, **world tick**, **trade windows**.
3. API sanitize soft-caps bag fields (chars, gold, XP, inventory, bank, listings, class/spec).
4. No DeepSeek / Azure required.

A dedicated game host remains optional later for fairness; it is **not** a ship gate.

## Shared world tick

- Zone **host** = lexicographically lowest `userId` present in the zone.
- Host broadcasts monster snapshots at ~5 Hz (`harbor-rpg-world`).
- Non-hosts apply host snaps for position/HP so everyone sees the same pack.

## v3 shipping now

1. **Zones:** Meadow · Pinewood · Ruins · Marsh · Crossroads Town + **Ash Crypt** instance
2. **Combat depth:** GCD kit · threat · **MP / resource** · **hit / miss / crit** · DoTs · party contested loot
3. **Classes & specs (v3):** **9 classes × 3 specs = 27** — Tideblade · Reedshadow · Lanternmancer · Jadeheart · Ashbound · Starferry · **Ironoar** · **Mistweaver** · **Chopwright** — skill ranks 1–10, spec-gated talent trees, spellbook UI with tooltips + cast pulse, prestige ★ after level 50
4. **Itemization / economy:** rarities through **legendary**, denser vendor/boss loot (Tidebrand, Jade Plate, Tide Coin, Mist Flask…), bank, World Market
5. **Trading:** 6-slot trade windows over Realtime (`harbor-rpg-trade`) — offer / lock / accept / cancel
6. **Instances:** Ash Crypt (boss + adds), enter from Ruins
7. **Professions + market:** herbalism / mining · alchemy / smithing · town World Market
8. **Realtime social:** presence · party · contested need/greed · world tick · trade
9. **Isolated HUD:** voyage chrome hidden while `realm === 'rpg'`

## Explicitly deferred

- Dedicated authoritative sim / anti-cheat server
- Ranked PvP ladders
- KayKit mesh preload on mount
- ClaudeCraft guilds / deeds (Harbor Quest social packet, not this game)

## Feel bar

Ability casts, spellbook tooltips, loot rolls, party invites, zone/instance portals, market posts, and trade locks must feel immediate. Flag Henry before any lean-pipeline cut that hurts polish (`AGENTS.md`).
