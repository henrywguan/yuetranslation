# JyutTranslate design system / 粤译设计系统

Brand tokens for matching the marketing site and translator when building **Bricks** (or any WordPress) pages.

品牌变量，用于在 **Bricks**（或任意 WordPress）页面中对齐营销站与翻译器。

**Visual swatches / 色板：** open [`brand/index.html`](./brand/index.html) locally, or enable GitHub Pages:

本地打开 [`brand/index.html`](./brand/index.html)，或启用 GitHub Pages：

1. Repo **Settings → Pages** / 仓库 **Settings → Pages**
2. Source: **Deploy from a branch** / 来源：**从分支部署**
3. Branch: `main`, folder: **`/docs`** / 分支：`main`，文件夹： **`/docs`**
4. After deploy, open `https://<user>.github.io/<repo>/brand/`  
   部署后打开 `https://<user>.github.io/<repo>/brand/`

> **Privacy:** Publishing `/docs` on Pages also exposes `docs/agents/**` and `docs/social/**` (campaign / social-ops briefs). Prefer opening `brand/index.html` locally, or use a Pages site that only serves `docs/brand/` if you keep the repo public.

> **隐私：** 将整个 `/docs` 发布到 Pages 也会公开 `docs/agents/**` 与 `docs/social/**`（社媒运营文案）。仓库公开时建议本地打开 `brand/index.html`，或只托管 `docs/brand/`。

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

## Typography / 字体

- Display / UI: **Syne** / 标题与界面：**Syne**
- Cantonese body: **Noto Sans HK** / 粤语正文：**Noto Sans HK**

Implementations: `apps/web/src/index.css` (CSS variables) · `docs/brand/index.html` (swatches).

实现：`apps/web/src/index.css`（CSS 变量）· `docs/brand/index.html`（色板）。
