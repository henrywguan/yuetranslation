# Android TWA via PWA Builder

Checklist for packaging **https://www.jyuttranslate.com** with [PWA Builder](https://www.pwabuilder.com) and Google Play.

## Repo prep (automated)

The web manifest in `apps/web/pwa-manifest.ts` includes:

- `description`, stable `id`, `dir`, `orientation`, `categories`
- Maskable + any-purpose icons (`pwa-512-maskable.png`)
- Shortcuts (Translate, Camera, Pricing)
- Manifest screenshots (narrow + wide)
- `share_target` (share text into Solo translate)
- `file_handlers` (open images → Cam upload, PDF → Documents)
- `launch_handler` (`navigate-existing`)
- `prefer_related_applications: false`

Service worker offline shell: `index.html` navigation fallback via Workbox.

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
3. Store listing: screenshots, feature graphic, privacy policy URL
4. Data safety: declare microphone + camera
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
| Push notifications | Needs FCM + backend |
| Background / periodic sync | Needs backend jobs |
| Protocol handlers | No custom URL scheme yet |
| Widgets / Edge side panel | Platform-specific, low ROI |
| `iarc_rating_id` | Assigned after Play content rating |
| `related_applications` | Add after Play listing exists |
