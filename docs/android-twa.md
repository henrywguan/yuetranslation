# Android TWA via PWA Builder

Checklist for packaging **https://www.jyuttranslate.com** with [PWA Builder](https://www.pwabuilder.com) and Google Play.

## Repo prep (automated)

The web manifest in `apps/web/pwa-manifest.ts` includes:

- `description`, stable `id`, `dir`, `orientation`, `categories`
- Maskable + any-purpose icons (`pwa-512-maskable.png`)
- Shortcuts (Translate, Camera, Pricing)
- Manifest screenshots (narrow + wide) — pixel sizes must match `sizes`
- `share_target` (share text into Solo translate)
- `file_handlers` (open images → Cam upload, PDF → Documents)
- `launch_handler` (`navigate-existing`)
- `prefer_related_applications: false` + empty `related_applications` (fill after Play listing)
- `protocol_handlers` (`web+jyuttranslate:`)
- `edge_side_panel` (Edge sidebar preferred width)

### Dual PWAs (translator + DeepSeek chat)

Chromium can install **two** origin PWAs when manifests differ by `id` / `name` / `start_url` / icons:

| Surface | Manifest | `id` | `start_url` | Icons |
| --- | --- | --- | --- | --- |
| Translator | `/manifest.webmanifest` (VitePWA) | `/` | `/#/app` | `pwa-192` / `pwa-512` (粵 chop) |
| DeepSeek chat | `/manifest-chat.webmanifest` | `/chat` | `/chat` → `#/chat` | `pwa-chat-192` / `pwa-chat-512` |

`App` swaps `<link rel="manifest">` on `#/chat` so Install / Add to Home Screen targets the chat package. Play TWA packaging still uses the **translator** manifest.

**Everyday chat URL:** always **`https://www.jyuttranslate.com/#/chat`** (hash on the site root). Do **not** share or leave the address bar on `/chat#/chat` — that was an overcorrection from dual-PWA work.

**iOS Add to Home Screen:** Safari bookmarks the document URL and often **strips the hash**. From bare `/#/chat`, a stripped bookmark becomes `/` and standalone boot opens `#/app`. Tradeoff: everyday browsing stays `/#/chat`; the chat iOS tip briefly latches pathname `/chat` (`setChatHomescreenPathLatch`) so Add to Home Screen survives as `/chat` → `#/chat`. Chromium Install uses manifest `start_url: /chat` and does not need the latch. Re-add the chat icon if an older bookmark still opens the translator or shows `/chat#/chat`.

**How users get each icon**

| App | Where to install | Opens |
| --- | --- | --- |
| JyutTranslate | `#/app` (Account Hub Home Screen panel, landing iOS tip, Chromium Install) | `/#/app` |
| DeepSeek Chat | `/#/chat` (chat header Install / iOS tip latches `/chat` for A2HS; Hub “Open DeepSeek Chat to install…”) | Chromium: `/chat` → `#/chat`; iOS tip A2HS: `/chat` → `#/chat`; browser/share: `/#/chat` |

Add the second icon from a **browser tab**, not from an already-installed PWA window.

Service worker: Workbox offline shell + **inline** registration in `index.html` (so PWA Builder HTML/Puppeteer scanners can find `/sw.js`).

Launch handling: `apps/web/src/lib/pwaLaunch.ts`.

## Before PWA Builder

1. Deploy this branch to production (Vercel).
2. Re-run PWA Builder on `https://www.jyuttranslate.com` and confirm improved report.
3. Optional: regenerate assets locally:
   ```bash
   npm run icons
   npm run dev:web    # terminal 1
   npm run pwa:screenshots   # terminal 2 — needs Chrome
   ```

## PWA Builder (you)

1. Open [pwabuilder.com](https://www.pwabuilder.com) → enter `https://www.jyuttranslate.com`
2. **Package for stores** → Android
3. Suggested settings:
   - Package ID: `com.jyuttranslate.app`
   - Start URL: `https://www.jyuttranslate.com/#/app`
   - Theme / background: `#07131f`
4. Download zip (`.apk` + `.aab` + optional source)
5. Back up keystore + passwords

## Digital Asset Links (you)

1. Copy SHA-256 fingerprint from PWA Builder signing step (or Play Console → App signing after first upload).
2. Replace placeholder in `apps/web/public/.well-known/assetlinks.json`:
   ```bash
   curl -s https://www.jyuttranslate.com/.well-known/assetlinks.json
   ```
3. Re-deploy. Install APK — **no URL bar** = verified.

If Play App Signing re-signs the app, use the **upload key** fingerprint from Play Console, not only the local dev key.

## Supabase redirects (you)

In Supabase → Authentication → URL configuration, ensure:

- Site URL: `https://www.jyuttranslate.com`
- Redirect URLs include:
  - `https://www.jyuttranslate.com/**`
  - `https://jyuttranslate.com/**` (if bare domain redirects)

## Play Console (you)

1. Developer account ($25)
2. Upload `.aab` → Internal testing
3. Store listing: screenshots, feature graphic, privacy policy URL (`https://www.jyuttranslate.com/privacy`)
4. Data safety: declare microphone + camera; **Delete account URL** = `https://www.jyuttranslate.com/delete-account`
5. Content rating questionnaire
6. After publish: add `related_applications` to manifest (optional) with Play Store ID

## Device testing (you)

On a physical Android phone:

- [ ] Full-screen TWA (no browser chrome)
- [ ] Opens `#/app` translator
- [ ] Share text from another app → JyutTranslate → translates
- [ ] Open image/PDF with JyutTranslate → Cam/Docs flow
- [ ] Sign in (Google / email)
- [ ] Live mic + Cam AR
- [ ] Stripe upgrade return

## Target SDK 36

Play requires **targetSdkVersion 36+** (2026). If PWA Builder’s AAB is rejected, download the Android source from the zip, set `targetSdkVersion 36` in `app/build.gradle`, and rebuild in Android Studio.

## Still optional (not required to package)

| Item | Why skipped |
| --- | --- |
| Push notifications | Web Push + VAPID already on Vercel PWA (`docs/admin.md`); native FCM for TWA still optional |
| Background / periodic sync | Needs backend jobs |
| Widgets | Windows-only adaptive cards |
| Window Controls Overlay / Tabbed display | Desktop chrome features not used by the translator UI |
| Note taking | Not a notes app |
| `iarc_rating_id` | Assigned after Play content rating |
| `related_applications` Play Store URL/id | Fill after the listing exists |
| `scope_extensions` | Only if TWA navigates to other domains |
