# JyutTranslate web app / 粤译网页应用

React + Vite PWA for the marketing site and translator UI. Run from the **repo root**.

营销站与翻译界面的 React + Vite 渐进式网页应用。请从**仓库根目录**运行。

| Command / 命令 | Result / 结果 |
| --- | --- |
| `npm run dev:web` | [http://localhost:5173](http://localhost:5173) |
| `?view=app` / `#/app` | Translator embed / 嵌入翻译器 |
| `npm run build:web:wp` | WordPress plugin assets / WordPress 插件资源 |
| `npm run build:web:marketing` | Static marketing build / 静态营销站构建 |

See the [root README](../../README.md) for API keys, phone testing, and quality bots.

密钥、手机测试与质量机器人见[仓库根目录 README](../../README.md)。

## Modes / 模式

| Mode / 模式 | Store id | Notes / 说明 |
| --- | --- | --- |
| Solo / 独白 | `solo` | One phone, EN↔粵 panes / 一部手机，英↔粤对照 |
| Conversation / 对话 | `conversation` | Two cards; 粵 pane rotated 180° / 两张卡片，粤语一面旋转 180° |
| Text / 文字 | `text` | Typed translate + Jyutping / 打字翻译 + 粤拼 |
| Cam / 相机 | `camera` | Fullscreen AR capture + upload boxes (EN ↔ written Chinese) / 全屏 AR 拍摄 + 上载画框（英 ↔ 书面中文） |

Live mic translates **once after capture ends** (no interim MT). Camera OCR runs **once per shutter tap** (no continuous polling).

实时麦克风在**采集结束后翻译一次**（没有中间机器翻译）。相机 OCR 在**每次快门**时运行一次（不会持续轮询）。

Details: [docs/camera.md](../../docs/camera.md).
