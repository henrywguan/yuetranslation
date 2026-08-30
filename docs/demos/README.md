# UI snapshots / 界面截图

Static PNGs for the README and design docs. Regenerate after major UI changes:

重大界面改动后请重新截图：

```bash
npm run docs:screenshots
```

Requires local `dev:web` (and usually `dev:api`) on the default ports. Cloud agents should not burn paid APIs while capturing.

需要本地默认端口上的 `dev:web`（通常还有 `dev:api`）。云端代理截图时勿消耗付费 API。

| File | Subject |
| --- | --- |
| `01-landing-dark.png` | Landing (dark) — orbital marketing background |
| `02-landing-light.png` | Landing (light) |
| `03-pricing-*.png` | Pricing / plans |
| `04-app-solo-*.png` | Solo translator |
| `05–08` | Conversation / other app chrome (see script) |

Cam choice (AR / Upload / Documents) and admin screens are not in the default set — add captures in `scripts/capture-docs-screenshots.mjs` if needed.

相机选择与管理后台默认不截 — 需要时在截图脚本中追加。
