# JyutTranslate social templates

**Master index of named creative templates.** Say a **template name** to recall that look.

When adding a new template: create its canon doc under `docs/social/` (or `ig-posts/`), then **add a row here** and update Studio brief / `.cursor/rules/social-media-manager.mdc`. Do not ship a new named template without listing it in this file.

| Template name (say this) | Kind | When to use | Canon |
| --- | --- | --- | --- |
| **instructional night/dark mode post** | Static IG (feed / portrait) | Product education: Meet app, Jyutping + Chao tones, Why switch, brand splash, feature grids. Harbor night field, jade accents, rounded instructional cards, HTML→`render.mjs`. | [`ig-posts/INSTRUCTIONAL-NIGHT-MODE.md`](./ig-posts/INSTRUCTIONAL-NIGHT-MODE.md) · design [`ig-posts/DESIGN.md`](./ig-posts/DESIGN.md) · refs [`ig-posts/references/`](./ig-posts/references/) |
| **Drops-style motion** | Motion / Reels | Playful Flat 2.0 vector game-UI bounce (spring icons, kinetic type, dashed paths) on Harbor/Jade + **real** product UI overlay. Not lifestyle B-roll; not Drops purple. | [`DROPS-STYLE-MOTION.md`](./DROPS-STYLE-MOTION.md) |
| **Studio feature tour** | Motion / Stories | Apple/Google-style product demo (~10–12s): Harbor/Jade lock + real Solo → Conversation → Cam UI + Seed Audio VO. No fake app UI. | [`story-feature-tour/BRIEF.md`](./story-feature-tour/BRIEF.md) |

## Aliases (quick lookup)

| You might say | Means |
| --- | --- |
| night instructional · dark mode IG post · Harbor instructional | **instructional night/dark mode post** |
| Flat 2.0 edutainment · vector game-UI motion · Drops motion | **Drops-style motion** |
| studio hybrid · feature tour Story · Apple demo tour | **Studio feature tour** |

## Shared rules (all templates)

- Brand: Harbor `#07131f` · Jade `#3dcfb6` · Ink `#e8f4ff` · Syne + Noto Sans HK  
- Logo: **`docs/brand/favicon.png` only** — never regenerate  
- **End CTA / brand lockup (REQUIRED):** use the **real** favicon chop + **JyutTranslate** set in **Syne** (self-hosted / composited HTML or FFmpeg overlay). Never AI-invented wordmarks, metallic 3D type, wrong casing (`Jyuttranslate`), or regenerated logos. In Higgsfield/Seedance prompts: leave the end card as a clean Harbor field (or soft hold) and say explicitly **“no logo, no brand wordmark, no CTA type — composited in post.”** Then composite `docs/brand/favicon.png` + Syne wordmark + URL/`Launch translator` in edit.  
- Emotional Reels: **variety of cast / scenes / locations by default**; cast-lock **only within one Reel or Story**  
- Prefer real JyutTranslate UI overlays; ask Henry before Higgsfield video credit spend  
- **Hashtags: always exactly 5** on every post (see Studio brief)  
- Full Studio brief: [`docs/agents/social-media-manager.md`](../agents/social-media-manager.md)

## Related (not named templates)

| Asset | Notes |
| --- | --- |
| [`COMPETITOR-AD-CLONE-PROMPTS.md`](./COMPETITOR-AD-CLONE-PROMPTS.md) | High-end peer ad grammars + paste-ready Higgsfield/Studio clone prompts (Drops / Jumpspeak / Speak / Pingo / Google-utility / Timekettle / SaaS UGC) |
| [`campaign-clips-1-3-higgsfield.md`](./campaign-clips-1-3-higgsfield.md) | Early campaign / Higgsfield clip briefs |
| [`reel-dinner/`](./reel-dinner/) | Dinner Reel shotlist + higgsedit project |
| [`ig-posts/out/`](./ig-posts/out/) | Rendered PNG outs + captions |
