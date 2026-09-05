# Competitor ad clone prompts (Higgsfield / Studio)

**Purpose:** Paste-ready briefs so the Social Media agent can generate **near look-alike ad clones** of high-end peers — remapped to JyutTranslate features — without collapsing into generic “AI cinematic” mush.

**Why “copy this style” fails:** Style adjectives (`premium`, `modern`, `motion graphics`) do not encode **ad grammar** — beat timing, edit rhythm, who/what is on screen, what is *never* invented (real UI), and brand remaps. Clone the **structure**; swap the **product proof**.

**Hard rules (every clone):**
- Brand: Harbor `#07131f` · Jade `#3dcfb6` · Ink `#e8f4ff` · Syne + Noto Sans HK  
- Logo: `docs/brand/favicon.png` only — never regenerate  
- **End CTA:** composite real favicon + **JyutTranslate** in **Syne** (+ URL). Prompt AI for a clean Harbor hold with **no invented logo/wordmark**; never ship metallic/3D AI brand type  
- Product UI = **real screen record / Recordly** — never AI-fake JyutTranslate  
- Ask Henry before Higgsfield credit spend  
- Hashtags: exactly **5** on published captions  
- Never name competitors in public copy — use “most apps” / side-by-side without logos  

**JyutTranslate proof to swap in (pick 1–2 per ad):**
Solo colloquial 粵 · Jyutping+tones · Conversation mode (one phone, two langs) · character breakdown · Cam · Family plan (4 seats)

---

## Competitive set (high-end peers)

| Peer | Why they matter | Ad grammar to clone | Do **not** clone |
| --- | --- | --- | --- |
| **Language Drops** | Premium Flat 2.0 motion, icon-led edutainment | Spring icon pops, kinetic type, dashed paths, game-UI pacing | Purple/gold palette, their icons |
| **Jumpspeak** | High-volume Meta UA; conversation-first anti-tap apps | UGC face + screen-record proof; “could quiz, couldn’t speak” → now converse | Their logo, Duolingo-bash by name |
| **Speak.com** | Premium AI speaking tutor | Learn → Practice → Apply loop on camera; voice-first | Generic drill UI, other languages as hero |
| **Pingo AI** | App-demo-as-entertainment | Hook reaction → attempt → sharp feedback punchline | Fake AI chat bubbles |
| **Google Translate** (category rival) | Utility clarity; Conversation mode mental model | Split-screen live talk moment; travel/family utility | Their UI chrome, “100+ languages” claim |
| **Timekettle / Pocketalk** | Hardware translator luxury demos | Dual-ear / two-person live talk POV; travel friction → instant understand | Device product shots as hero (we’re software) |
| **Duolingo** | Cultural gravity only | — | Owl chaos / meme spam (conflicts with luxury studio bar) |

Existing canon: **Drops-style motion** → [`DROPS-STYLE-MOTION.md`](./DROPS-STYLE-MOTION.md). Emotional dinner/family B-roll → [`campaign-clips-1-3-higgsfield.md`](./campaign-clips-1-3-higgsfield.md).

---

## How to use these prompts

1. Copy one **PLUG-IN** block into the Social Media / Higgsfield agent chat.  
2. Fill `{BRACKETS}` (phrase, scene, duration).  
3. Agent must: expand to beat sheet + caption (5 hashtags) + Higgsfield JSON / workflow routing — **then wait for Henry’s credit OK** before generate.  
4. Prefer pipeline: **real UI record → Higgsfield B-roll/UGC → higgsedit composite**.

---

## 1) Drops motion clone → Flat 2.0 feature Reel

**Grammar:** solid field → big hook type → icon overshoot pops → path/streak → **real UI punch-in** → quiet CTA. 15–22s. No live-action.

### PLUG-IN

```
CLONE: Drops-style motion (Flat 2.0 game-UI), remapped Harbor/Jade — NOT Drops purple.
Read docs/social/DROPS-STYLE-MOTION.md and follow it exactly.

PRODUCT PROOF (real UI overlay, never AI-fake):
{FEATURE: Solo translate / Jyutping line / Conversation tease / Cam}

HOOK LINE (≤6 words, Syne energy): {HOOK e.g. "Not Mandarin. Cantonese."}
ICON BEATS (3–4 one-concept icons): {e.g. dinner plate · phone · 粵 particle · ear}
PHRASE TO TEACH: {EN} → {粵} · {jyutping}

DELIVER: 9:16 · 15–22s beat sheet + still keyframe prompt + motion prompt + negative prompt + higgsedit composite plan (UI insert timing). Ask before Higgsfield spend.
```

### Essence lock (if agent drifts)

```
Motion grammar only: spring bounce + stagger + kinetic type + dashed path.
Field = #07131f + soft jade glow. Accent = #3dcfb6. No photoreal, no lifestyle B-roll, no purple haze.
```

---

## 2) Jumpspeak clone → conversation-first UGC + screen record

**Grammar:** cold open problem (passive apps fail real talk) → face-cam proof → **real Conversation mode** insert → CTA. 20–30s. Meta/TikTok native, not polished film.

### PLUG-IN

```
CLONE: Jumpspeak-style Meta UA grammar (conversation-first, anti-passive-tapping) — remapped to JyutTranslate. Do NOT name Jumpspeak/Duolingo.

STRUCTURE (strict):
0–3s HOOK on-screen: "{HOOK e.g. I could translate words. I couldn't talk to 婆婆.}"
3–10s PROBLEM: face-cam diaspora creator, natural room light, phone selfie framing, US/HK-English accent OK
10–22s PROOF: REAL screen record of JyutTranslate Conversation mode — English pane ↔ 粵 pane + Jyutping. Slow deliberate taps. Lead with the wow result frame, not splash.
22–30s CTA: "One phone. Two languages. jyuttranslate.com" · Family plan tease optional

Higgsfield: ugc-review-video OR seedance talking-head B-roll ONLY for face segments; UI = Henry/Recordly screen capture composited in video-editing/higgsedit. Never AI-generate the app UI.
Ask before spend. Caption + exactly 5 hashtags.
```

### Essence lock

```
Native UGC texture > cinema. Hook without brand name. Product proof is Conversation mode live split, not feature list VO.
```

---

## 3) Speak.com clone → voice-first Learn / Practice / Apply

**Grammar:** three labeled beats on camera; speaking out loud is the hero; app reacts.

### PLUG-IN

```
CLONE: Speak.com "Learn → Practice → Apply" ad grammar for JyutTranslate. Do NOT name Speak.

9:16 · 18–25s · burned captions.

BEAT A LEARN (5s): On-screen card shows colloquial line {粵} + Jyutping {jp}. Creator reads it once.
BEAT B PRACTICE (7s): REAL Solo mode UI — tap-to-play TTS / mic practice. Jade Harbor UI only via screen record.
BEAT C APPLY (7s): REAL Conversation mode — say {EN situation} and show 粵 reply land. "This is how we'd actually say it at home."
CTA (3s): jyuttranslate.com

Hook ≤8 words: {e.g. "Stop reading Cantonese. Start saying it."}
Higgsfield: face clips only; composite real UI. Ask before spend.
```

---

## 4) Pingo clone → reaction → attempt → feedback punchline

**Grammar:** entertainment-first app demo; humor from wrong→right Cantonese.

### PLUG-IN

```
CLONE: Pingo-style "reaction → attempt → sharp feedback" Reel. Do NOT name Pingo.

0–2s REACTION face: "{HOOK e.g. Why does Google give me 書面語??}"
2–8s ATTEMPT: type/speak {EN phrase} — show MOST APPS result as grey crossed line: {WRONG_書面_or_Mandarinish}
8–16s FEEDBACK PUNCH: REAL JyutTranslate result snaps in jade: {RIGHT_口語} + Jyutping. Optional particle callout (唔/係/咗).
16–20s CTA: jyuttranslate.com

Tone: witty premium, not meme spam. No competitor logos.
Pipeline: kinetic type in higgsedit + real UI insert. Optional Higgsfield face B-roll only. Ask before spend.
```

---

## 5) Google Translate rival clone → utility Conversation moment

**Grammar:** clear problem → live two-way talk on one device → emotional relief. Quiet luxury, not hype.

### PLUG-IN

```
CLONE: Google-Translate-category utility demo grammar (Conversation / live talk) — product is JyutTranslate. Never show Google UI.

SCENE: {dinner table / FaceTime with 婆婆 / dim sum order / school pickup}
0–3s: friction visual (confused pause / stiff sentence on screen as text only)
3–12s: REAL Conversation mode — phone between two people OR split panes; English ↔ 粵 + Jyutping visible
12–18s: relief beat (smile / nod / steam / hands) — faces optional/over-shoulder OK
18–22s: end card Harbor/Jade · JyutTranslate · jyuttranslate.com

Higgsfield Job A: cinematic_studio_video_v2 or seedance_2_5 intimate B-roll; phone screen area LEFT DARK/CLEAN for UI composite.
Job B: real UI record. Job C: higgsedit. Ask before spend.
Use campaign-clips-1-3 pattern if phrase is dinner/miss you/don't worry.
```

---

## 6) Timekettle / Pocketalk clone → dual-talk luxury POV (software)

**Grammar:** travel/family friction → two people talking through a device → instant understanding. Hardware ads sell the *earbud*; we sell **one phone Conversation mode**.

### PLUG-IN

```
CLONE: Timekettle/Pocketalk dual-interpreter ad grammar — remapped to JyutTranslate Conversation mode (NO earbuds/hardware hero).

0–3s: travel/family friction POV {airport / hotel desk / grandparents' kitchen}
3–14s: ONE phone between two speakers; REAL Conversation mode UI composite; bilingual captions burn EN + 粵
14–20s: understanding click (handshake / laugh / order lands)
20–24s: "One phone. Two languages." · jyuttranslate.com · Family 4 seats optional

Look: premium travel/lifestyle commercial, Harbor shadows + jade phone glow, shallow DOF, slow push-in.
Higgsfield B-roll only; real UI insert. Ask before spend.
```

---

## 7) SaaS UGC website ad (Higgsfield workflow)

**When:** Henry wants a talking-head Meta/TikTok ad that shows the **site/app page** as overlay cards.

### PLUG-IN

```
Run Higgsfield workflow ugc-website-video for https://jyuttranslate.com
Duration: {15|30}s · caption_mode: Both
Angle: {ABC learner / family Conversation / Google-fails colloquial}
Creator: {gender / age vibe} diaspora-coded, natural iPhone selfie, US accent unless I say otherwise.
Monologue must name JyutTranslate in first body beat; hook ≤8 words, no pointing opener.
Cards from REAL page captures only — never AI UI.
Ask me before any generate_* credit spend.
```

---

## Universal “essence” preflight (paste above any clone)

```
Do NOT paraphrase into generic cinematic AI ads.
Lock: beat timings, who is on camera, real-UI-only proof, Harbor/Jade remap, end CTA = real favicon + Syne wordmark composited (no AI logo/wordmark), negative list (purple SaaS glow, cream serif, photoreal fake app, competitor logos, Duolingo meme owl, metallic 3D invented brand type).
Output: (1) 1-line thesis (2) timed beat sheet (3) on-screen text (4) caption+5 hashtags (5) exact Higgsfield prompts/JSON (6) composite plan. STOP for credit approval.
```

---

## Quick pick (Henry)

| I want… | Use prompt # |
| --- | --- |
| Playful icon motion like Drops | **1** |
| Performance Meta UA like Jumpspeak | **2** |
| Voice/speaking confidence | **3** |
| Funny wrong→right demo | **4** |
| Quiet family/utility proof | **5** |
| Travel dual-talk luxury | **6** |
| Talking-head + site cards | **7** |

---

*JyutTranslate Studio · Competitor ad clone kit*
