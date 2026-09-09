# JyutTranslate design system / 粤译设计系统

Brand tokens for the marketing site and translator UI.

品牌变量，用于对齐营销站与翻译器界面。

**Visual swatches / 色板：** open [`brand/index.html`](./brand/index.html) locally (preferred).

本地打开 [`brand/index.html`](./brand/index.html)（推荐）。

> **Privacy:** Do **not** enable GitHub Pages on the whole `/docs` folder — that would also publish `docs/agents/**` and `docs/social/**`. See [`.github/README.md`](../.github/README.md). If you need a public brand page, host **only** `docs/brand/`.
>
> **隐私：** **不要**把整个 `/docs` 挂到 GitHub Pages（会公开 `docs/agents/**` 与 `docs/social/**`）。见 [`.github/README.md`](../.github/README.md)。若要公开品牌页，只托管 `docs/brand/`。

**Product UI snapshots / 产品界面截图：** [demos/](./demos/)

<p>
  <img src="./demos/04-app-solo-dark.png" alt="Solo translator dark theme / 独白翻译器深色主题" width="640" />
</p>

## Themes / 主题

| Theme / 主题 | Primary surface / 主表面 | Text / 文字 | Accent / 强调 |
| --- | --- | --- | --- |
| **Dark** (default) / **深色**（默认） | Harbor `#07131f` | Ink `#e8f4ff` | Jade `#3dcfb6` |
| **Light** / **浅色** | Mist `#eef5f8` | Harbor `#07131f` | Jade `#1f9f8a` |

Toggle lives in the marketing nav and translator header. Preference is stored as `localStorage.yue-theme` and respects `prefers-color-scheme` on first visit.

切换开关在营销导航与翻译器页头。偏好保存在 `localStorage.yue-theme`，首次访问遵循 `prefers-color-scheme`。

**Marketing / pricing backgrounds:** fixed **orbital** sphere + soft wash (`MarketingPageShell` `background="orbital"`). Foreground content scrolls over a stationary atmosphere.

**营销／定价背景：** 固定 **orbital** 球体与柔和洗色（`MarketingPageShell` `background="orbital"`）。前景滚动，氛围层静止。

**Translator app:** cloth / glass field accents mixed from Harbor / Jade / Ink (not the marketing orbital).

**翻译器：** Harbor / Jade / Ink 织物质感／玻璃场（与营销 orbital 不同）。

## Brand hierarchy / 品牌层级

| Role / 角色 | Name / 名称 | Hex | Use / 用途 |
| --- | --- | --- | --- |
| **Primary / 主色** | Harbor | `#07131f` | Page background, chrome, PWA theme / 页面背景、边框、PWA 主题色 |
| **Secondary / 辅色** | Jade | `#3dcfb6` | CTAs, brand mark, links, focus, 3D accent / 按钮、品牌标、链接、焦点、立体强调 |
| **Tertiary / 第三色** | Ink | `#e8f4ff` | Primary body text on dark surfaces / 深色表面上的正文 |
| **Usage (Family)** | `--usage-family` | `#8ec8f0` (dark) / `#5a9fd0` (light) | Family-plan usage meter accent / 家庭档用量条强调色 |

Supporting tokens (surfaces, glass, danger, mint) live in `apps/web/src/index.css` and are shown on the brand swatch page.

## Typography / 字体

Loaded in `apps/web/index.html` (Google Fonts): **Syne**, **Noto Sans**, **Noto Sans HK**.

| CSS variable / 变量 | Family / 字体族 | Role / 用途 |
| --- | --- | --- |
| `--font-display` | **Syne** → Noto Sans | Headlines, buttons, brand lockup / 标题、按钮、品牌字标 |
| `--font-english` | **Noto Sans** | Latin UI + Latin-script languages / 拉丁界面与拉丁语种 |
| `--font-body` | **Noto Sans HK** → Noto Sans | Han body + bilingual chrome / 汉字正文与双语界面 |

Weights: Syne **500–800** · Noto Sans / Noto Sans HK **400–700**.

### Language → font map / 语种与字体

Product `Lang`: `en` · `yue` · `cmn` · `wuu` · `tl` · `es` · `vi`.

| Script / langs / 文字与语种 | Font / 字体 | Notes / 说明 |
| --- | --- | --- |
| Display / brand UI | **Syne** | Latin display only; Han never set in Syne |
| English (`en`) | **Noto Sans** (`--font-english`) | Default Latin stack |
| Tagalog (`tl`) | **Noto Sans** | Stress pedagogy chips; Latin orthography |
| Spanish MX (`es`) | **Noto Sans** | Accented MX Spanish; stress / register chips in Learn |
| Vietnamese (`vi`) | **Noto Sans** | Full Vietnamese diacritics; tone chips in Learn |
| Cantonese (`yue`) | **Noto Sans HK** (`--font-body`) | Jyutping pedagogy under Han |
| Mandarin (`cmn`) | **Noto Sans HK** | Pinyin pedagogy; same Han face as Yue |
| Shanghainese (`wuu`) | **Noto Sans HK** | Wugniu romanization; Han via HK face |

**No extra Google Fonts** for SC / JP / Vietnamese / Tagalog / Spanish — Latin langs share Noto Sans; all Han langs share Noto Sans HK. Do not add Noto Sans SC/JP/TC to the marketing load unless product CSS changes first.

**Cam / PDF paint fallbacks** (canvas / PDF, not the web load): `"Noto Sans HK", "Noto Sans TC", "PingFang TC", "Segoe UI", sans-serif` — see `overlayPaint.ts` / `pdfDocTranslate.ts`.

实现：`apps/web/src/index.css`（CSS 变量）· `docs/brand/index.html`（色板与字样）。

## Product surfaces / 产品界面

| Surface / 界面 | Notes / 说明 |
| --- | --- |
| **Solo** | Hold-to-talk + text; multi-lang pairs; text mode folded into Solo |
| **Conversation** | Two-sided live; same glass chrome as Solo |
| **Cam** | AR / Upload / Documents chooser; Documents still require sign-in for guests |
| **Account Hub** | Plan, meters, auto-speak, **primary language** |
| **Marketing** | Landing, pricing, tones — orbital shell |
| **Legal** | `#/privacy`, `#/terms`, `#/delete-account` — Harbor/Jade, no orbital |

**Primary language gloss:** Account Hub `primaryLang` can replace the Chinese line in `BiText` for `tl` / `es` / `vi` / `wuu` (Tagalog, Spanish MX, Vietnamese, Shanghainese). Mandarin (`cmn`) and Cantonese (`yue`) keep Chinese chrome. Source: `primaryUiGloss` + `uiCopy`.

**Pedagogy (Learn / detail panel):** Jyutping · Pinyin · Wugniu · Tagalog stress chips · Vietnamese tone chips · MX Spanish stress/register — all use the language font map above (chips inherit `--font-english` / body; Han stays `--font-body`).

**Motion bar:** fluid, dynamic, modern, interactive, responsive, luxury — do not ship changes that strip interim STT preview or polish without Henry’s OK (see `AGENTS.md`).

## Assets / 资源

| Asset | Path | Rule |
| --- | --- | --- |
| Chop favicon | `docs/brand/favicon.png` (+ `.svg`) | Never regenerate; glass jade 粵 mark |
| PWA icons | `docs/brand/pwa-192.png` etc. | Same chop family |
| Social stills | `docs/social/ig-posts/` | Instructional night/dark Harbor look |

## Social / IG stills

Named template: [`social/ig-posts/INSTRUCTIONAL-NIGHT-MODE.md`](./social/ig-posts/INSTRUCTIONAL-NIGHT-MODE.md) · canon [`social/ig-posts/DESIGN.md`](./social/ig-posts/DESIGN.md). Fonts stay **Syne + Noto Sans HK** (+ Noto Sans when Latin body is needed). Logo: **`docs/brand/favicon.png` only**.
