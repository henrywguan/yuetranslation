# JyutTranslate — Language Expansion (Higgsfield MAX)

**Goal:** Showcase the wave of new voice languages (12 + Arabic pair + existing) with **native bed music, UI SFX, and multilingual VO** — maximizing what Higgsfield can do in one pipeline.

**Format:** Instagram Reel · **9:16** · **15s** · 1080p  
**Brand:** Harbor `#07131f` · Jade `#1c9683` / `#3dcfb6` · Ink `#e8f4ff` · Syne + Noto Sans HK  
**Logo:** leave end frame clean for real `favicon.png` composite — never invent a chop/wordmark  
**UI:** do **not** fake JyutTranslate screens — kinetic language type + lifestyle only (real UI can be overlaid later)

---

## Story (one idea)

**Cantonese stays the heart — the world around it just got much bigger.**

Not a feature checklist. One traveler/family moment; language names and short native confirmations land like constellation points.

### Languages to name on-screen / in VO (expansion wave)

**New 12:** Japanese · Indonesian · Malay · Portuguese (BR) · French · Hindi · Khmer · Burmese · Javanese · Italian · German · Dutch  

**Also spotlight:** Korean · Thai · Lao · Tagalog · Spanish (MX/ES) · Vietnamese · Egyptian Arabic · MSA  

**Anchor:** Cantonese + English

---

## Audio design (must be audible in the render)

Higgsfield **cannot** do standalone music/SFX outside game tools. Music + SFX must come from **video native audio** (`generate_audio: true` / `sound: on`). Separate `seed_audio` jobs = multilingual VO stems for montage.

| Layer | Spec |
|---|---|
| **Bed** | Soft modern ambient-electronic, warm harbor night, no lyrics, ~70–90 BPM, ducks under VO |
| **SFX** | Soft whooshes on language hits; subtle UI “tick / land” when a language name pops; distant city hush |
| **VO** | Multilingual — short confirmations in native scripts; EN + Yue bookends |

### VO stem script (for `generate_audio` / montage)

| # | Lang | Line |
|---|---|---|
| 1 | EN | Twenty-six languages. One phone. |
| 2 | Yue | 聽得明，先講得出。 |
| 3 | JA | 分かりました。 |
| 4 | KO | 알겠어요. |
| 5 | ES | Te entiendo. |
| 6 | FR | Je comprends. |
| 7 | HI | समझ गया। |
| 8 | AR (MSA) | أفهمك. |
| 9 | DE | Ich verstehe dich. |
| 10 | ID | Saya mengerti. |
| 11 | TH | เข้าใจแล้ว |
| 12 | EN | JyutTranslate. |

---

## Paste-ready Seedance 2.5 prompt (hero job)

```text
Premium Instagram Reel for JyutTranslate language expansion. Vertical 9:16, 15 seconds, cinematic lifestyle commercial with FULL NATIVE AUDIO TRACK.

AUDIO (mandatory — do not produce a silent cut):
- Continuous soft ambient-electronic background music, warm night harbor mood, no lyrics, gentle pulse ~80 BPM that ducks under spoken voice.
- Sound design: soft whoosh each time a language name appears; light UI tick/land clicks; distant city hush under music.
- Multilingual voiceover, clear and close-mic, alternating languages with short gaps:
  0.3s English (warm woman): "Twenty-six languages. One phone."
  3.0s Cantonese: "聽得明，先講得出。"
  5.0s Japanese: "分かりました。"
  6.5s Korean: "알겠어요."
  8.0s Spanish: "Te entiendo."
  9.5s French: "Je comprends."
  11.0s Hindi: "समझ गया।"
  12.5s Arabic: "أفهمك."
  13.8s English: "JyutTranslate."
Music stays under VO the whole time; never mute the bed.

PICTURE:
0–2s: Night Hong Kong ferry wake / harbor lights, slow push-in, cool blue shadows with a thin jade accent rim light. Giant kinetic Syne-style word "MORE" in white ink, then it fractures into glowing language chips.
2–12s: Rapid but elegant montage — young adults in travel / family / street moments across Asia and Europe (Tokyo neon alley, Seoul cafe, Bangkok night market, Paris metro, Cairo evening street, Jakarta street food, Berlin tram). Each beat: a language name appears as large kinetic type in its own script (日本語 · Bahasa · 한국어 · Español · Français · हिन्दी · العربية · Deutsch · ไทย · Tagalog · Tiếng Việt · 粵語) with jade underline flash, then exits. Faces optional, no readable fake app UI, no invented logos, no competitor names.
12–15s: Quiet harbor hold — empty dark phone silhouette (screen black for later UI composite), soft jade glow, music swell then settle. No logo, no URL, no tagline on screen.

Look: luxury tech ad, photoreal, shallow depth, Harbor night grade (#07131f shadows, jade #1c9683 accents, ink highlights). No purple gradients, no cartoon mascots, no PowerPoint layout, no fake JyutTranslate chrome.
```

### Higgsfield JSON

```json
{
  "model": "seedance_2_5",
  "mode": "t2v",
  "aspect_ratio": "9:16",
  "duration": 15,
  "resolution": "1080p",
  "generate_audio": true,
  "bitrate_mode": "high",
  "prompt": "(paste prompt above)"
}
```

**Cost note (preflight):** ~180 credits for this Seedance config (2026-10-14).

### Alt / maximize stack

1. **Hero video** — Seedance above (music + SFX + multi-lang VO baked in)  
2. **VO stems** — `generate_audio_batch` Seed Audio lines (table) for cleaner montage remix  
3. **Optional B** — Kling 3.0 9:16 10s `sound:on` same story, tighter cuts  
4. **Finish** — `video-montage` / higgsedit: duck music, lay clean VO stems, burn real chop + Syne wordmark last 1.2s

---

## Caption (publish later)

Twenty-six languages. Still built for real Cantonese.  
Japanese, Korean, Thai, Arabic, Hindi, French… and more — Solo, Conversation, Cam.  
Hear it. Say it. Be understood.  
→ jyuttranslate.com

Hashtags (5): `#JyutTranslate #Cantonese #粵語 #LanguageLearning #TravelHack`
