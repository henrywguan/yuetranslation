# Reel pack — Drops-style Cam quiz (stop sign)

**Status:** **Assembled** · Flat 2.0 local stills + stagger motion + live Cam capture + Azure TTS  
**Output:** [`out/reel-cam-quiz-stop.mp4`](out/reel-cam-quiz-stop.mp4) · **22s** · **9:16**  
**Template:** [`../DROPS-STYLE-MOTION.md`](../DROPS-STYLE-MOTION.md)  
**Palette:** Harbor `#07131f` · Jade `#3dcfb6` · Ink `#e8f4ff`  
**Logo:** `docs/brand/favicon.png` only  

**Rebuild:**

```bash
python3 scripts/make-reel-cam-quiz-stills.py   # if stills need regen
NODE_PATH=/workspace/node_modules node scripts/record-reel-cam-quiz-stop.mjs
node scripts/build-reel-cam-quiz-stop.mjs
```

---

## 1. Full Reel script (on-screen + timing)

| Time | Beat | Visual | On-screen text | Audio |
| --- | --- | --- | --- | --- |
| **0:00–0:03** | Hook | Harbor field + soft jade glow. Stop-sign locks in (spring settle). Flat 2.0 jade dashed ring. | **What’s the right 粵?** / **邊個啱？** (kinetic pop) | Soft bed in |
| **0:03–0:08** | Quiz | Three Flat 2.0 option pills stagger-pop (spring overshoot). | **A** 停車 · `ting4 ce1` · **B** 停止 · `ting2 zi2` · **C** 唔好行 · `m4 hou2 haang4` | Bed continues |
| **0:08–0:16** | Demo | **Real Cam UI** (screen capture — never AI-fake). Cam → Upload image → stop-sign → **Translate all** → OCR overlay. | Product chrome; tip implied by modal | Bed ducks |
| **0:16–0:20** | Reveal | Quiz return. **A 停車** fills Jade / check; B & C soft. | **停車** · `ting4 ce1` ✓ | **粵 TTS:** 停車 |
| **0:20–0:22** | CTA | Quiet Harbor end card · favicon · URL | **Cam it in the app** · **jyuttranslate.com** | Bed resolve / TTS tail |

### Quiz options (locked)

| | Chinese | Jyutping | Note |
| --- | --- | --- | --- |
| ✅ | 停車 | ting4 ce1 | Correct HK spoken |
| ❌ | 停止 | ting2 zi2 | Mandarin-leaning trap |
| ❌ | 唔好行 | m4 hou2 haang4 | Vague / wrong register |

### Cam Vision note (live capture)

Real `/api/camera/scan` on the stop-sign asset currently returns **STOP → 停止** (literal / Mandarin-leaning). That is **kept on purpose** — never fake product UI. The reveal + caption teach **停車** as the HK street answer and call out **停止** as the trap. If a future model/lexicon lands 停車 on Cam, even better; either way the teaching beat holds.

---

## 2. Flat 2.0 stills

Generated **locally** (Harbor/Jade) via `scripts/make-reel-cam-quiz-stills.py` — no Higgsfield this pass (MCP session expired in cloud; reconnect in Cursor desktop if you want Soul/Flux still upgrades).

| File | Role |
| --- | --- |
| `source/01-hook.jpg` + `01-hook-type.png` | Hook field + kinetic type layer |
| `source/02-quiz.jpg` | Three option pills |
| `source/03-reveal.jpg` | 停車 check reveal |
| `source/04-end.jpg` | End card + favicon |
| `source/stop-sign.png` | Cam upload input |

Shared negative / Higgsfield prompts remain below for optional upgrades.

### Shared negative prompt

```
purple, violet, magenta, gold coins, Language Drops branding, watercolor, clay 3D,
photoreal face, stock lifestyle b-roll, cyberpunk neon, lens flare spam,
fake phone UI, fake JyutTranslate screens, Inter font, cream pastel language-app aesthetic,
heavy texture, paper grain, cinematic shallow DOF on UI chrome, cartoon mascot spam
```

### Still A — Hook field + stop sign frame

```
Flat 2.0 game-UI still, vertical 9:16, deep Harbor background #07131f with soft jade #3dcfb6 radial glow,
centered photoreal red octagonal STOP sign photo in a clean rounded jade-outline frame,
minimal Flat vector chrome corners, no people, no fake app UI, premium language-learning game aesthetic remapped to teal jade not purple,
solid fills soft gradient only, empty space above for kinetic typography
```

### Still B — Three option pills (quiz chrome)

```
Flat 2.0 vertical 9:16 quiz UI on Harbor #07131f, three stacked rounded option pills with solid Ink #e8f4ff text areas and thin jade #3dcfb6 borders,
soft jade glow behind pills, dashed jade progress path optional on left, no photos, no faces, no phone mockup,
clean vector game interface Language Drops style remapped away from purple/gold to harbor teal,
leave pill interiors mostly blank for later typography (Chinese + Jyutping), springy playful but premium
```

### Still C — Correct reveal chrome

```
Flat 2.0 9:16 Harbor #07131f quiz reveal, one option pill glowing solid jade #3dcfb6 fill with white check mark,
two dimmed faded pills below, soft jade particle dots not neon, no faces, no fake UI screenshots,
clean vector language-learning game chrome, solid fills only
```

### Still D — Quiet end card

```
Minimal Harbor #07131f 9:16 end card, soft centered jade glow, large empty center for logo placement,
clean Flat 2.0, no text baked in, no purple, no gold, no lifestyle photo
```

**Logo:** composite `docs/brand/favicon.png` in edit — never bake a regenerated chop into the still.

---

## 3. Shot list — real Cam upload capture

Device: 9:16 Chrome CDP screencast · dark Harbor · Family entitlements · open mode.

| # | Action | Notes |
| --- | --- | --- |
| 1 | Open app → dock **Cam** | Choice modal |
| 2 | Tap **Upload image** / **上載相片** | |
| 3 | Pick `source/stop-sign.png` | |
| 4 | Tap **Translate all** / **全部翻譯** | Auto OCR + translate (box Translate stays disabled until boxes exist) |
| 5 | Hold OCR overlay + RESULTS | Real Vision — currently **停止** |

Script: `scripts/record-reel-cam-quiz-stop.mjs` → `source/live/cam-upload-1080.mp4`

---

## 4. Caption · hashtags · Story teaser

### Caption

Most apps guess Mandarin.  
Street signs need **Hong Kong 粵**.

What’s the right 粵 for a stop sign?  
✅ **停車** · ting4 ce1  
(Not 停止. Not a vague 唔好行.)

Cam it in the app — upload the photo, hear it spoken.  
→ jyuttranslate.com

### Hashtags (5)

`#Cantonese` `#粵語` `#Jyutping` `#JyutTranslate` `#LearnCantonese`

### Story teaser (poll)

**Got it?** ✅ / **Missed it** 😅  
Sticker poll on a freeze of the three pills (before reveal).

---

## 5. Credits used (this pass)

| Step | Tool | Cost |
| --- | --- | --- |
| Flat 2.0 stills A–D | Local Pillow (`make-reel-cam-quiz-stills.py`) | **$0** |
| Stagger / zoompan | ffmpeg (`build-reel-cam-quiz-stop.mjs`) | **$0** |
| Cam screen capture | CDP Puppeteer + Vision scan | **Azure Vision** (Henry OK’d quiz pack) |
| Soft bed | ffmpeg sine/noise lavfi | **$0** |
| 粵 TTS 「停車」 | Azure `/api/tts` | **Azure Speech** (Henry OK’d) |
| Higgsfield stills / video | — | **Skipped** (MCP expired — reconnect desktop to upgrade Flat chrome later) |

---

## Approval log

- Henry: OK on quiz · Drops-style motion · Higgsfield OK if it helps the reel  
- Cloud: Higgsfield MCP session expired → shipped local Flat 2.0 + live Cam + TTS
