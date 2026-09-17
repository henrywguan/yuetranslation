# Harbor Quest · MMO Social + Skills + Skillcapes (v1)

**Status:** Planning packet (no implementation yet)  
**Audience:** Henry + engineering agents  
**Inspiration (systems only):** [World of ClaudeCraft](https://github.com/levy-street/world-of-claudecraft) — parties, guilds, deeds, finder, prestige, town minigames. **Do not** copy their meshes, icons, HUD chrome, zone layouts, or combat formulas. Harbor stays original Harbor/Jade + RS-like craft principles ([RS-LIKE-CRAFT-BIBLE.md](./RS-LIKE-CRAFT-BIBLE.md)); never Jagex skillcape art or trademarks.

**Product north star:** Keep sailors on JyutTranslate because **other sailors are here**, while every pier / skill grind remains **soloable**. Group content is optional glue, never a gate.

### Locked decisions (2026-09-17 · Henry)

| Decision | Lock |
|---|---|
| First skills ship | **4 trainers:** `tones`, `initials`, `finals`, `jyutping` |
| Speaking skill | **No** — not in roster (no mic/STT skill track) |
| 99 pacing | **Completable in ~1 week** of focused daily play (tune XP curve + daily board) |
| Cape slot | **Yes** — 8th gear slot: hat / top / bottom / shoes / hand / boat / lantern / **cape** |
| Trim cape | **99 → base cape; pay 10k ferry coins** at Cape Loom to trim (per cape, cosmetic only) |

---

## 0. What we already have

| Live today | Gap this packet closes |
|---|---|
| Supabase Realtime presence + ~10 Hz pose (`harborPresence.ts`) | Friends, whispers, AFK, crew blips |
| Public chat + overhead say | Party / fleet channels |
| Remote sailors + profile modal | Invite / challenge actions |
| Gear slots + VIP sets + coins/XP | `cape` slot + skill XP + deeds cosmetics |
| Global leaderboard (XP → gold → casts → piers) | Prestige rank + skill total level board |
| Pier curriculum + Match Definition arena | Skill trainers + Study Finder queues |
| Family **4** / Business **10** household seats | Seed Fleet membership from household |

---

## 1. Design dogma (non-negotiable)

1. **Solo-first.** Every Sounds / Life 0 pier and every skill trainer works alone. Finding a crew is never required for story or skill XP.
2. **Cosmetic power only.** Skills, deeds, capes, titles, and trades never buy correct answers, skip pedagogy, or inflate learning meters that bypass practice.
3. **Original IP.** Motifs: ferry lanterns, pier stones, bamboo, jade chop, Chao tone curves, sampans — not ClaudeCraft towns, not OSRS skillcape stripes.
4. **Showoff is pedagogy.** Capes, dances, and poses celebrate real Cantonese skills the sailor actually ground.
5. **Authoritative for contested social.** Presence may stay Realtime; invites, fleet ranks, trades, queues, and skill XP awards that affect leaderboards resolve server-side.
6. **Feel bar.** Do not strip live feedback, motion, or polish to “lean the pipeline” — flag Henry first (see `AGENTS.md`).

---

## 2. Social systems (ClaudeCraft → Harbor remaps)

### 2.1 Phase A — Social glue (ship first)

| Harbor name | ClaudeCraft analogue | Behavior |
|---|---|---|
| **Friends** | Friends list | Persist `friend_user_ids[]`; online dots on minimap; profile → Add Friend |
| **Whispers** | `/w` | Private `harbor-whisper` Realtime event; 80-char same as public chat |
| **Away** | `/afk` | Presence flag `away: true`; auto-reply once per whisperer per session |
| **Emotes** | Emotes | Wave / bow / clap / lantern raise — short local animations visible to remotes |

**Data (new tables, sketch):**

```text
harbor_friends(user_id, friend_id, created_at)  -- bidirectional accept flow
harbor_friend_requests(from_id, to_id, status, created_at)
```

Presence packet gains optional `away?: boolean`, `titleId?: string`, `capeId?: string`.

### 2.2 Phase B — Crews (party)

Temporary **Crew** of 2–5 sailors.

- Invite from remote profile or `/crew invite <name>`
- Shared: crew chat channel, minimap crew blips, optional “studying” pose
- Optional co-op: Match Definition duo rounds (both must answer; both earn gold; no answer sharing)
- XP / pier credit stays **per sailor** (no leech grief)
- Disbands on logout or leave; no shared bank

**Data:** ephemeral Realtime channel `harbor-crew-{crewId}` + short-lived row in `harbor_crews` (TTL / empty cleanup).

### 2.3 Phase C — Fleets (guild)

Persistent **Fleet** (pier house / study guild).

| Seed | Members |
|---|---|
| Family household | Auto-offer Fleet of up to 4 (owner = admiral) |
| Business household | Up to 10 |
| Public Fleets | Soft cap ~40; charter name screened |

Features v1: MOTD at enter-world, roster + tenure badges (New / Seasoned / Elder), fleet chat, optional fleet cape trim (cosmetic).  
Defer: fleet bank, dues, wars.

**Data:**

```text
harbor_fleets(id, name, motto, motd, owner_id, created_at)
harbor_fleet_members(fleet_id, user_id, rank, joined_at)
```

### 2.4 Phase D — Study Finder

Dungeon Finder remixed for learning:

| Queue | What happens |
|---|---|
| Tone Spar | 60s tone pick race (2–4 sailors) |
| Jyutping Build | Shared build-step race |
| Arena Duo | Match Definition co-op |
| Review Pier | Same cleared pier practice together |

**Always** offer **AI companion fallback** (Practice Partner / local drill bot) so queue wait never blocks. ClaudeCraft’s “Tessa in delves” pattern — Harbor’s coach is Cantonese, not combat.

### 2.5 Phase E — Book of Deeds + Reliquary

Achievement journal paying **cosmetic only**: titles on nametag, chat badge borders, Reliquary shelves (Voyage / Arena / Social / Skills).

Examples:

- First whisper · First crew · Clear all Sounds piers · Arena 100 gold · Any skill 50 · Any skillcape earned

HUD tracker for 1–3 pinned deeds. Lifetime Renown feeds a secondary leaderboard column later.

### 2.6 Prestige

After curriculum + soft sailor level soft-cap, lifetime XP continues → **Prestige rank** on leaderboard (ClaudeCraft post-cap pattern). Does not wipe skills, gear, or capes.

---

## 3. Cantonese skills (grind + showoff)

OSRS-shaped **skill levels 1–99** with a Harbor XP curve, but every action is a real Cantonese drill. Skills are **orthogonal** to pier campaign progress: piers teach the voyage; skills are the endless dockside grind.

### 3.1 Skill roster

**Ship first (locked):** four trainers.

| Id | Skill | EN / 粵 | What you grind | Primary loop |
|---|---|---|---|---|
| `tones` | Tones | Tones / 聲調 | Six tones + Chao letters | Hear clip → pick tone # or Chao contour |
| `initials` | Initials | Initials / 聲母 | Aspiration + place | Minimal-pair pick (b/p, d/t, g/k…) |
| `finals` | Finals | Finals / 韻母 | aa/a, ng endings, diphthongs | Hear / build final |
| `jyutping` | Jyutping | Jyutping / 粵拼 | Syllable literacy | Parse / type / order slots |

**Later skills (after the four + first cape land) — still no Speaking:**

| Id | Skill | EN / 粵 | Why it’s sticky |
|---|---|---|---|
| `listening` | Listening | Listening / 聽力 | TTS → gloss or Jyutping |
| `reading` | Reading | Reading / 識字 | Traditional Han ↔ Jyutping |
| `lexicon` | Lexicon | Lexicon / 詞彙 | Match Definition + vocab bank |
| `colloquial` | Colloquial | Colloquial / 口語 | Particles, classifiers, 口語 vs 書面 |
| `particles` | Particles | Particles / 助詞 | 啦嘅喎咋囉 — optional split from colloquial |
| `classifiers` | Classifiers | Classifiers / 量詞 | 個隻條件… optional split |
| `sandhi` | Tone sandhi | Sandhi / 變調 | Advanced prestige grind |
| `calligraphy` | Brush | Brush / 寫字 | Stroke-order minigame — pure showoff |

**Cancelled:** `speaking` / 開口 — Henry lock 2026-09-17. Mic practice stays in Live Solo / Conversation, not a Harbor skill.

### 3.2 How XP is earned (no empty grind)

Every skill action must teach:

1. **Trainer NPC** on the pier (e.g. Tone Keeper, Initials Dockhand) opens a drill modal.
2. Correct → skill XP + small coins; wrong → short teach beat (same as pier `explain`).
3. **Daily board** (3 rotating tasks) grants bonus skill XP — habit without combat seasons.
4. Pier steps **also drip** small XP into the matching skill (e.g. tone pick step → `tones`) so voyage and grind reinforce each other.
5. Repeat pier clears keep half mission XP (existing) **and** a small skill drip so veterans still grind.

**Anti-cheat / fairness:** server validates skill XP awards from known drill result tokens; client may preview. No buyable skill XP.

### 3.3 Soft level curve (locked pacing)

**Target:** a focused sailor can hit **one skill 99 in about one week** (~45–90 min/day of trainers + dailies), not a month-long slog and not a same-day binge.

Sketch to tune in implementation (numbers are starting points — smoke-test against the week target):

```text
xp_to_reach(level) ≈ 40 * level^2        // softer than classic OSRS
daily board bonus ≈ 1.5–2× normal drills for pinned skill
pier drip          small but constant so voyage helps
```

Display: skill panel (4 tiles first) + total level on profile. Capes still gate on 99 only.

### 3.4 Progress blob extension

```ts
// HarborProgress additions (monotonic merge)
skills: Record<HarborSkillId, { xp: number }>  // sanitize floor/cap
pinnedDeeds: string[]                          // max 3
titleId: string | null
prestige: number                               // cosmetic rank
```

Leaderboard later: optional `total_skill_level` column; keep XP-first for voyage unless Henry flips priority.

---

## 4. Skillcapes, poses, and dances

### 4.1 Unlock

At **skill level 99**, the sailor unlocks that skill’s **Skillcape** (new gear slot `cape`) from the **Cape Loom** NPC / Reliquary claim — **not** purchased with VIP cash. Coins may cover a symbolic loom fee; the gate is the 99.

| Cape | Motif (original) | Idle pose | Dance / emote |
|---|---|---|---|
| Tones 99 | Six jade chevrons / Chao-curve trim | Head tilt tracking a floating tone curve | **Tone Wave** — arms draw ˥ ˧˥ ˧ ˨˩ ˩˧ ˨ in sequence |
| Initials 99 | Twin aspirated puffs (cloth streamers) | Hands at lips, soft exhale VFX | **Aspiration Snap** — sharp clap + streamer burst |
| Finals 99 | Open-mouth ring / vowel halo | Wide stance, halo pulse | **Final Spin** — slow turn with halo pitches |
| Jyutping 99 | Syllable beads (onset·nucleus·coda) | Counting beads | **Parse Step** — three stomps (initial / final / tone) |
| Listening 99 | Ear-shell lantern | Hand cupping ear toward river | **Echo Bow** — bow as ripples expand |
| Reading 99 | Open scroll cape | Holding scroll open | **Ruby Unfurl** — scroll rolls; Han→Jyutping flash |
| Lexicon 99 | Market-stall ribbon cape | Vendor presentational stance | **Gloss Shuffle** — card-fan hand dance |
| Colloquial 99 | Neon night pier lights | Casual lean on invisible rail | **Particle Pop** — 啦／嘅／喎 subtitle bursts |

**Other showoff layers (later, separate from trim):**

- **Voyage cape** — all Sounds (+ Life 0) piers cleared (quest-cape analogue)
- **Fleet edge** — optional fleet color on nametag / cape hem only

### 4.2 Trim (locked · pay-to-flex)

At **99**, the sailor claims the **base skillcape** free (or symbolic loom fee only if we add one later).

They may then spend **10,000 ferry coins** at the Cape Loom to **trim** that cape:

| | Base 99 | Trimmed |
|---|---|---|
| Unlock | Skill level 99 | Own base cape for that skill + **10k coins** |
| Look | Standard skill motif | Gold/jade edge + richer cloth detail |
| Dance | Standard 3–5s emote | Same emote, slightly longer / one extra flourish |
| Power | None | None — cosmetic only |

Rules:

- Trim is **per cape** (Tones trim does not auto-trim Initials).
- Spend is coins already earned in Harbor (outfitter / arena / drills) — not a real-money SKU; VIP cash does not bypass the 99 gate.
- Trim is permanent for that cape once paid (no refund); bank/equip like any gear.
- If the sailor cannot afford 10k yet, they keep the base cape and grind coins — no other skill-level gate.

This replaces the soft/hard “broadly maxed” trim ideas from classic MMOs.

### 4.3 Animation system

- Capes are `HarborGearSlot = 'cape'` meshes on the protagonist + remotes.
- **Idle pose** swaps when cape equipped and sailor is standing still ≥1.5s.
- **Dance** keybind / emote wheel (e.g. `J` or Emote button) plays 3–5s clip; remotes see pose packets (`emoteId`, `t`).
- Prefer **procedural / keyframed Three.js** bone or group transforms (Harbor craft style) over heavy mocap files.
- Mobile: large Emote FAB; dances must read at explore-camera distance.

### 4.4 Showoff surfaces

- Nametag: title + optional small cape icon
- Profile modal: equipped cape + “Play dance” preview
- Leaderboard: badge for any 99 / trim
- Pier plaza: invisible “dance floor” near Cape Loom so sailors gather (social magnet)

---

## 5. Scope cuts (v1 vs later)

### In scope for first implementation track

1. Friends + whispers + away  
2. Crew invite + crew chat  
3. Skills blob + **4 trainers** (`tones`, `initials`, `finals`, `jyutping`) + skill panel  
4. Deeds stubs (5–10) + title equip  
5. **`cape` as 8th gear slot** + mesh pipeline + **one** 99 cape (Tones) as proof + **10k coin trim** purchase at Cape Loom  
6. Study Finder stub (Tone Spar only) + AI fallback  
7. XP curve tuned so **one 99 ≈ one focused week**

### Explicitly out

- Speaking / mic skill (cancelled)  
- Soft/hard “all skills high” trim gates (replaced by 10k coin trim)  
- Listening / Reading / Lexicon / Colloquial trainers (later wave)  
- Full combat / PvP / Honor  
- Guild bank, marketplace with power items, web3  
- Authoritative movement server (Realtime presence stays)

---

## 6. Suggested build order

```text
PR1  Presence flags (away, titleId) + whispers + friends tables
PR2  Crew channels + invites
PR3  skills{} on progress + Tone trainer drill + skill panel UI
PR4  Initials / Finals / Jyutping trainers (shared drill shell)
PR5  Book of Deeds v0 + titles on nametag
PR6  cape slot + Tones skillcape mesh + Tone Wave dance + 10k trim purchase
PR7  Study Finder · Tone Spar + AI fallback
PR8  Fleet from Family household + MOTD
PR9  Remaining skills + capes + Reliquary shelves
PR10 Prestige + total-level board column
```

---

## 7. API / storage sketch

| Surface | Approach |
|---|---|
| Progress skills / title / prestige | Extend `harbor_quest_progress.progress` JSONB + sanitize/merge |
| Cape trim flags | `owned` includes `cape-tones` / `cape-tones-trim` (or `look.cape` + owned ids); deduct 10k coins server-side on trim |
| Friends / fleets / requests | New Supabase tables + RLS (own rows / membership) |
| Leaderboard | Keep XP primary; add `prestige`, later `total_skill_level` |
| Whispers / crew chat | Realtime broadcast (rate-limit + sanitize like public chat) |
| Study Finder | API matchmaker (`POST /api/harbor-quest/finder`) → room id → Realtime |
| Skill XP awards | `POST /api/harbor-quest/skill-xp` with signed drill result / server recompute |

Migrations follow existing Harbor style (`028`…`031`): additive columns, monotonic merge, backfill from blob when needed.

---

## 8. Pedagogy & product links

- Skills reinforce Open Cantonese order (initials / finals / tones) without replacing pier chapters.
- Lexicon skill wraps Match Definition so arena gold and skill XP both reward vocab.
- Colloquial skill is the brand wedge (口語-first) — good Creators / social clip bait when dances ship.
- Family plan: household Fleet + shared “dock” presence keeps seats sticky beyond translate minutes.

---

## 9. Open questions for Henry

1. **Public Fleets** moderation — reuse chat sanitize + offensive-name screen?  
2. Base 99 claim: completely free, or a small symbolic loom fee *plus* the separate 10k trim?  
3. 10k trim — confirm currency is **ferry coins** (not arena gold)?

---

## 10. Success metrics (when live)

- D1 / D7 return of sailors who entered `#/learn`  
- % of sessions with ≥1 other remote visible  
- Crew or whisper used ≥1× per week among actives  
- Skill panel opens / trainer drills per DAU  
- Time-to-first-99 and % who equip cape + play dance in public pier  

---

## 11. References

- ClaudeCraft social highlights: parties, guilds, Dungeon Finder, Book of Deeds, Reliquary, prestige, soloable quests — systems inspiration only  
- Harbor craft & IP posture: [RS-LIKE-CRAFT-BIBLE.md](./RS-LIKE-CRAFT-BIBLE.md)  
- Live mic / STT constraints: `AGENTS.md` + `.cursor/skills/live-mic-invariants/SKILL.md`  
- Existing progress: `apps/web/src/landing/learn/progressMerge.ts`, `xpRewards.ts`, `harborPresence.ts`
