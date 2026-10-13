# MAX-LEVEL MOTION PROMPT — JyutTranslate.com

Paste-ready director brief for motionmaxxing (or any motion agent). Goal: **captivate**, not catalogue.

---

## PAGE
| | |
|---|---|
| **P** | English speakers can’t *say* Hong Kong Cantonese in the moment — apps give Mandarin-ish Chinese or mute romanization. |
| **A** | Social / landing, often muted first; bilingual HK diaspora, learners, travelers who need *口語*. |
| **G** | Belief → open the app and try one line (Solo → feel Conversation / Cam waiting). |
| **E** | “Another translator” scepticism → visceral relief: *I can hear myself be understood.* |

## ONE IDEA (cover-the-logo must still say JyutTranslate)
**One English sentence becomes sayable Cantonese — and the same meaning takes three bodies: Solo, Conversation, Cam.**

Not a feature tour. The sentence is the protagonist. Modes are costumes it wears.
- Competitor-swap fail test: strip Jyutping tone colors + colloquial 粵語 particles → film collapses into “generic translator.”
- Discarded ideas: floating 粵 characters; “AI that speaks”; transformation chain into the logo; left-headline feature checklist.

## BRAND INVENTORY (keep literal)
- Mark: official 粵 chop (`pwa-512`) + Syne wordmark — never redrawn
- Type: **Syne** display · **Noto Sans HK** Han/body
- Palette: harbor ground `#eef5f8` / `#e1f1ee`, ink `#07131f`, jade accent `#1c9683` = **“understood / landed”**
- Material: bilingual Solo card, face-to-face Conversation panes, Cam AR overlay
- Verb: type / speak → be understood
- Voice: warm, bilingual, practical (site phrasing: “Ready to be understood?” / 準備好俾人聽明未？)
- Never: Mandarin presented as Cantonese, HUD chrome, PPT decks, vibe-coded zinc cards, web-footer end cards >1.4s

## SENTENCE (the film’s case)
English: **“Where is the MTR?”**  
Cantonese: **「地鐵喺邊？」**  
Jyutping (tone-colored): **dei6 tit3 hai2 bin1**  
(Illustrative but plausible colloquial HK; declare in NOTE.md.)

## FILM SHAPE · 30s · 1920×1080 · 30fps · hybrid VO
`hook → proof Solo → proof Conversation → proof Cam → resolve`

| Beat | t | Role | Buys | Picture (text covered) | Importance |
|---|---|---|---|---|---|
| 1 | 0–4s | Hook | This is about *saying* Cantonese | Giant Syne: “Say it.” / cut mid-motion into Solo | 2 |
| 2 | 4–12s | Proof | Solo makes it sayable | Magnified Solo: type EN → Han + tone Jyutping land; jade underline; camera dives on Han | **3** |
| 3 | 12–19s | Proof | Same meaning, two faces | Hard cut: Conversation split panes — YOU / THEIR SIDE; carried Han line; cursor/press optional | **3** |
| 4 | 19–28s | Proof | The world gets the line | Cam AR plate: street/sign fragment + floating 「地鐵喺邊？」 overlay; shutter breath into cut | **3** |
| 5 | 28–30s | Resolve | Brand lands smaller | Chop crashes from ~3.5× + wordmark; accelerating contraction; end hold ≤1.4s mid-motion | 2 |

**Screenshot-worthy hero:** Conversation split with tone-colored Jyutping under colloquial Han — or Cam AR Han hanging in air.

**Handoffs (physical cause):**
- Hook scale accelerates → Solo card already rising
- Jade tone chips from Solo become Conversation pane accent bars
- Han glyphs from Convo become Cam AR stickers (same glyphs, new space)
- Cam overlay collapses into chop mark

**World (one system):** light harbor mint ground + faint arcs; soft overhead light; white product surfaces; jade = understood. No swatch flips. No corner labels / counters / kickers.

## VO — ENGLISH + CANTONESE (not captions of the screen)
Budget ~2.5 w/s content · 1.4 w/s sign-off. Lines land 0–2f after on-screen words. Alternate languages; leave silence over typing/clicks.

| t | Lang | Line |
|---|---|---|
| 0.3s | EN | Hear Cantonese as it is spoken. |
| 1.8s | Yue | 聽得明，先講得出。 |
| 8.5s | EN | Type a line — Jyutping lands with it. |
| 14.0s | Yue | 對面傾偈，一部手機就夠。 |
| 20.5s | EN | Point the camera. The street answers back. |
| 26.5s | Yue | 準備好俾人聽明未？ |
| 28.0s | EN | JyutTranslate. |

## MOTIONMAXXING HARD RULES (non-negotiable)
1. No page chrome, deck layouts, letter-typed headlines, vibe UI cards, invented stats, web-footer endings.
2. Seek-safe GSAP only (`Motion.*`); every frame = f(t).
3. Measured eases; cut on motion; almost nothing fades between scenes.
4. Real product grammar for UI; declare illustrative copy in NOTE.md.
5. Run `look.py` + `lint.mjs`; quote G0–G5; never self-certify.
6. Hero beat gets hardest craft (camera dive, dense Solo/Convo comp, AR depth). Optional: hero3d chop on close.
7. No standalone Higgsfield music — VO + designed silence / light UI ticks only unless another music source is approved.

## SUCCESS CRITERIA
- Mute test: story still reads (Say it → Solo → two faces → camera → mark).
- Cover logo: still uniquely JyutTranslate (Jyutping tones + 口語).
- One screenshot from beat 3 or 4 could run as a still ad.
- Viewer emotion: *I want to type one line right now.*

## SOURCE
- Brand: https://www.jyuttranslate.com + live app `#/app` Solo / Conversation / Cam captures
- Skill: motionmaxxing protocol (`SKILL.md` steps 0–9)
- Deliver: `final.mp4`, `index.html`, `STORYBOARD.md`, `NOTE.md`
