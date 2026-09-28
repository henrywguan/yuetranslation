# HarborRPG · Safe implementation packet (no dedicated host)

**Status:** Safe vertical slice implemented  
**Branch:** `cursor/harborrpg-safe-impl-d66b`  
**Audience:** Henry + engineering agents  

## Locked product decisions

| Decision | Lock |
|---|---|
| Chart continent | New realm id `rpg` — teleport like Guan, **not** Cantonese pier pedagogy |
| ClaudeCraft | Systems parity later; **v0** = continent + 2 chars + soft XP/combat + cosmetics/boosts scaffolding |
| Cantonese | **None** in HarborRPG copy, curriculum, or meters |
| Auth / storage | Same Supabase + `harbor_quest_progress` blob (nested `rpg` bag) |
| Characters | **Max 2** RPG slots (separate from River Scout create) |
| Cosmetics / boosts | Soft client fields; boost stamps can later gate on Family/Business entitlement |
| Game host | **No dedicated server ever** — client sim + soft API sanitize / rate limits |
| Assets | Free CC0 kit in `docs/harbor-quest/harborrpg-assets/` (LFS zips); v0 uses procedural craft so voyage phones stay light |

## Safe trust model

Without an always-on game process:

1. **Client-authoritative world** — movement, soft combat, shrine XP happen locally.
2. **Server soft checks** — `sanitizeHarborProgress` caps XP/gold/char count; no trust of absurd blobs.
3. **Separate meters** — `progress.rpg.*` does **not** inflate pedagogy leaderboard `xp` / pier clears.
4. **Separate presence** — RPG must not share `harbor-quest-river` poses (defer Realtime for v0).
5. **No paid APIs** required for the slice (no DeepSeek / Azure).

## Vertical slice (shipping now)

1. `HarborRealmId` includes `'rpg'`
2. `harborRpgRealm.ts` — flat low-poly meadow + shrine + training dummy
3. Teleport panel button **HarborRPG · Adventure** (always unlocked, beside Guan)
4. World remount on realm change (existing `HarborWorldCanvas` pattern)
5. Progress bag `rpg`: ≤2 characters, soft XP, gold, cosmetics list, boost expiry stamps
6. HUD: soft XP chip + character slot switcher while in RPG
7. Interact shrine → +XP; hit dummy → soft gold (client)
8. Smokes for realm id, teleport class, bag sanitize, scene name

## Explicitly deferred

- Full ClaudeCraft parties / guilds / deeds / finder
- Authoritative PvP / anti-cheat economy
- KayKit/Quaternius mesh preload on Learn mount (lazy later)
- Chart pier-list pedagogy coupling
- Ultimate Monsters Drive re-fetch

## Feel bar

Do **not** strip motion or live feedback for austerity. Soft combat and shrine should feel immediate. Flag Henry before any lean-pipeline cut that hurts polish (`AGENTS.md`).
