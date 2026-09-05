# Campaign clips #1–#3 — Full Higgsfield production briefs

Series: **Real Cantonese** · `Google fails, we don't`  
Format: Instagram Reel · **9:16** · **22s** · burned-in captions  
Brand: Harbor `#07131f` · Jade `#3dcfb6` · Ink `#e8f4ff` · Syne + Noto Sans HK  

**Production pattern (all three):**
1. **Job A** — Higgsfield B-roll (`generate_video`)
2. **Job B** — Screen record JyutTranslate UI (Henry, local)
3. **Job C** — Composite in `video-editing` / higgsedit (text beats + UI insert + end card)

---

## Clip #1 — Dinner call

**English input:** Are you coming home for dinner?  
**Most apps:** 你回家吃晚飯嗎？  
**JyutTranslate:** 你返屋企食飯未呀？  
**Jyutping:** nei5 faan1 uk1 kei2 sik6 faan6 mei6 aa3?

### Reel script (22s)

| Time | Visual | On-screen text | Audio |
|------|--------|----------------|-------|
| 0:00–0:02 | Warm HK apartment dinner table, dishes, steam | **Most apps translate Chinese.** | Soft room tone |
| 0:02–0:05 | Hands pick up phone, speakerphone glow | **Not Cantonese.** | — |
| 0:05–0:09 | Phone screen area (composite UI later) | **你回家吃晚飯嗎？** *(grey, crossed feel)* | — |
| 0:09–0:14 | Same hands, jade UI glow | **Real Cantonese:** **你返屋企食飯未呀？** | — |
| 0:14–0:17 | Jyutping line under 粵 | **nei5 faan1 uk1 kei2 sik6 faan6 mei6 aa3?** | — |
| 0:17–0:20 | Conversation mode tease (split phone) | **One phone. Two languages.** | — |
| 0:20–0:22 | End card | **JyutTranslate · jyuttranslate.com** | — |

### Caption
Dinner with 婆婆 isn’t a grammar test.  
Most apps give you textbook Chinese — **你回家吃晚飯嗎？**  
Real Hong Kong Cantonese: **你返屋企食飯未呀？**  
Jyutping on every line. Try Conversation mode → link in bio.

### Hashtags
`#Cantonese #粵語 #Jyutping #CantoneseAmerican #JyutTranslate`

### Higgsfield Job A — B-roll

```json
{
  "model": "cinematic_studio_video_v2",
  "prompt": "Intimate premium lifestyle commercial, Hong Kong family dinner table at night, traditional home cooking on lazy susan, warm practical tungsten light, shallow depth of field, steam rising from dishes, elderly woman's hands visible at edge of frame but face not shown, young adult hands reach for smartphone on wooden table, slow cinematic push-in, luxury tech ad pacing, calm and emotional not chaotic, color grade dark harbor blue shadows with subtle jade green accent light on phone screen area, leave center of phone screen clean and dark for UI composite, photorealistic, no logos, no readable text on props",
  "aspect_ratio": "9:16",
  "duration": 10,
  "genre": "intimate",
  "sound": "off",
  "mode": "pro"
}
```

**Alt model:** `seedance_2_5` if credits are tight (same prompt, 9:16, 10s).

### Higgsfield Job C — Composite beats (higgsedit)

```text
BEATS:
  hook_table     2.0s  B-roll 0:00-2.0
  wrong_line     4.0s  B-roll 2.0-6.0 + text 你回家吃晚飯嗎？
  right_line     5.0s  UI insert + text 你返屋企食飯未呀？
  jyutping       3.0s  Jyutping overlay
  cta            2.0s  End card jade on harbor
```

**UI insert:** Screen record Solo mode — type English phrase → show 粵 + Jyutping result.

### Story cut (3 frames)
1. Poll: *「返屋企食飯未？」係咪你屋企咁讲？* Yes / 係呀  
2. Wrong vs right text card  
3. Link sticker → jyuttranslate.com  

---

## Clip #2 — I miss you

**English input:** I miss you  
**Most apps:** 我想你  
**JyutTranslate:** 我掛住你  
**Jyutping:** ngo5 gwaa3 zyu6 nei5

### Reel script (22s)

| Time | Visual | On-screen text | Audio |
|------|--------|----------------|-------|
| 0:00–0:02 | Teen on bed, city night through window | **Three words.** | Ambient night |
| 0:02–0:05 | Close-up thumbs typing iMessage-style (generic UI) | **Most apps:** 我想你 | — |
| 0:05–0:10 | Phone lifts, soft jade glow on screen | **Real Cantonese:** 我掛住你 | — |
| 0:10–0:13 | Jyutping + tap breakdown hint | **ngo5 gwaa3 zyu6 nei5** · 掛 = really miss | — |
| 0:13–0:17 | Split: English message / 粵 reply | **Distance is hard. Words matter.** | — |
| 0:17–0:20 | Character breakdown UI insert | **Tap any word to learn** | — |
| 0:20–0:22 | End card | **JyutTranslate · For my ABC's** | — |

### Caption
「我想你」 isn’t wrong — it’s just not how we say it.  
When you miss someone you love: **我掛住你** · ngo5 gwaa3 zyu6 nei5  
Jyutping + character breakdown on every line. Free to try → link in bio.

### Hashtags
`#Cantonese #Jyutping #ABC #CantoneseAmerican #JyutTranslate`

### Higgsfield Job A — B-roll

```json
{
  "model": "cinematic_studio_video_v2",
  "prompt": "Premium emotional youth lifestyle scene, Cantonese American teenager in cozy bedroom at night, soft city bokeh through window, holding smartphone with both hands, close-up on thumbs above screen, gentle jade green screen glow reflecting on face, minimal clutter, Syne-adjacent modern aesthetic, dark harbor blue room tones, slow subtle handheld drift, intimate not melodramatic, phone screen center kept dark and clean for UI composite, no brand logos, no legible fake app text, photorealistic cinematic",
  "aspect_ratio": "9:16",
  "duration": 10,
  "genre": "intimate",
  "sound": "off",
  "mode": "pro"
}
```

### Higgsfield Job C — Composite beats

```text
BEATS:
  hook_bed       2.0s  B-roll
  wrong_text     3.0s  kinetic type 我想你 (muted grey)
  right_reveal   5.0s  UI insert + 我掛住你 (jade)
  jyutping       3.0s  ngo5 gwaa3 zyu6 nei5 + 掛 gloss
  breakdown      3.0s  char breakdown screen record
  cta            2.0s  end card
```

**UI insert:** Solo translate "I miss you" + tap 掛 in breakdown panel.

### Story cut
1. *Which do you say?* 我想你 vs 我掛住你 (slider poll)  
2. Jyutping card full screen  
3. *Phrase of the day* sticker + link  

---

## Clip #3 — Don't worry

**English input:** Don't worry  
**Most apps:** 不要擔心  
**JyutTranslate:** 唔使擔心  
**Jyutping:** m4 sai2 daam1 sam1

### Reel script (22s)

| Time | Visual | On-screen text | Audio |
|------|--------|----------------|-------|
| 0:00–0:02 | Kitchen / homework table, mom + kid silhouette | **Calm down, they said…** | Soft domestic |
| 0:02–0:05 | Worried kid, phone in hand | **不要擔心** *(stiff, 書面)* | — |
| 0:05–0:09 | Mom hand on shoulder, phone shows Conversation mode | **唔使擔心** *(natural)* | — |
| 0:09–0:12 | Particle callout | **唔** not 不 · **使** = needn't | — |
| 0:12–0:17 | Split-screen Conversation mode UI (180° 粵 pane) | **One phone. Two languages.** | — |
| 0:17–0:20 | Family plan tease | **Family plan · 4 seats** | — |
| 0:20–0:22 | End card | **jyuttranslate.com** | — |

### Caption
Reassuring your kid in Cantonese isn’t 「不要擔心」.  
It's **唔使擔心** — m4 sai2 daam1 sam1.  
Conversation mode: one phone, English ↔ 粵, Jyutping on every line.  
Family plan — 4 seats for the people who actually need to talk.

### Hashtags
`#Cantonese #粵語 #CantoneseFamily #Jyutping #JyutTranslate`

### Higgsfield Job A — B-roll

```json
{
  "model": "cinematic_studio_video_v2",
  "prompt": "Warm premium family moment, Hong Kong mother reassuring child at kitchen table after school, gentle hand on shoulder, smartphone on table showing soft jade glow, split-screen phone conversation implied but screen kept clean for UI composite, natural window light mixed with warm interior, emotional but calm, dark harbor blue shadows jade accent highlights, slow push-in, faces partially visible or over-shoulder only, authentic diaspora home not stock photo generic, photorealistic cinematic, no logos no readable text",
  "aspect_ratio": "9:16",
  "duration": 10,
  "genre": "drama",
  "sound": "off",
  "mode": "pro"
}
```

**Optional second clip for Conversation tease:** 5s B-roll of two people across small table with one phone standing between them (faces optional, hands visible).

### Higgsfield Job C — Composite beats

```text
BEATS:
  hook_kitchen   2.0s  B-roll
  wrong_line     3.0s  不要擔心
  right_line     4.0s  唔使擔心 + UI
  particle       3.0s  唔 vs 不 callout (jade box)
  conversation   5.0s  Conversation mode screen record
  family_cta     3.0s  Family plan + end card
```

**UI insert:** Conversation mode — EN pane "Don't worry" → 粵 pane 唔使擔心 + Jyutping.

### Story cut
1. Quiz: *唔* = ? (A 不 B 不是 C 不要)  
2. Side-by-side 不要擔心 / 唔使擔心  
3. *Try Conversation mode* link  

---

## Shared post-production spec

### Typography (higgsedit / compose)
- Display: **Syne** 700 · hook lines 72–88px @ 1080×1920  
- Cantonese: **Noto Sans HK** 600 · 48–56px  
- Jyutping: Noto Sans HK 400 · 36px · jade `#3dcfb6`  
- “Most apps” lines: Ink at 60% opacity or `#929294`  
- “Real Cantonese” lines: Ink `#e8f4ff` + jade underline  

### Safe zones
- Top 14% / bottom 20% clear for IG UI  
- End card: composite **real** `docs/brand/favicon.png` + **JyutTranslate** in **Syne** + URL in bottom third above safe zone — never AI-drawn logo/wordmark  

### Music (optional, royalty-free)
- Clip #1: soft guzheng + room tone, 72 BPM  
- Clip #2: minimal piano, 68 BPM  
- Clip #3: warm strings pad, 70 BPM  
*(Or silent + rely on captions for accessibility)*  

### Preflight before Higgsfield
```json
{ "model": "cinematic_studio_video_v2", "get_cost": true, ... }
```
Run **3× Job A** (one per clip). Confirm credits with Henry before submit.

### File naming
`real-cantonese-01-dinner-broll.mp4`  
`real-cantonese-02-miss-you-broll.mp4`  
`real-cantonese-03-dont-worry-broll.mp4`  
`real-cantonese-0X-final.mp4`

---

*JyutTranslate Studio · Campaign launch batch*
