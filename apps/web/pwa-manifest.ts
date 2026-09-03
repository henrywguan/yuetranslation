/** Web app manifest fields for PWA Builder / Play Store TWA packaging. */

const PWA_DESCRIPTION =
  'Live English ↔ Cantonese translator with jyutping, voice, camera OCR, and document translation.'

/** Shared icon entries for shortcuts (relative to public/). */
const shortcutIcon = { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' as const }

/**
 * Web app manifest tuned for PWA Builder / Play Store TWA packaging.
 * Keep start_url aligned with vite base path.
 */
export function createPwaManifest(base: string) {
  const root = base.replace(/\/?$/, '/')
  const startUrl = `${root}#/app`

  return {
    name: 'JyutTranslate — English ↔ Cantonese',
    short_name: 'JyutTranslate',
    description: PWA_DESCRIPTION,
    id: root,
    lang: 'en',
    dir: 'ltr',
    theme_color: '#07131f',
    background_color: '#07131f',
    display: 'standalone',
    display_override: ['standalone', 'minimal-ui'],
    orientation: 'any',
    categories: ['education', 'utilities', 'productivity'],
    prefer_related_applications: false,
    // Empty until Play listing exists; field presence satisfies PWA Builder.
    related_applications: [] as { platform: string; url: string; id?: string }[],
    start_url: startUrl,
    scope: root,
    launch_handler: {
      client_mode: 'navigate-existing',
    },
    edge_side_panel: {
      preferred_width: 480,
    },
    protocol_handlers: [
      {
        protocol: 'web+jyuttranslate',
        url: `${root}?q=%s`,
      },
    ],
    icons: [
      { src: 'pwa-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: 'pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: 'pwa-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      { src: 'apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    shortcuts: [
      {
        name: 'Translate',
        short_name: 'Translate',
        description: 'Open the live translator',
        url: `${root}#/app`,
        icons: [shortcutIcon],
      },
      {
        name: 'Camera',
        short_name: 'Camera',
        description: 'Translate text from photos or documents',
        url: `${root}#/app?cam=1`,
        icons: [shortcutIcon],
      },
      {
        name: 'Pricing',
        short_name: 'Plans',
        description: 'View plans and upgrade options',
        url: `${root}#/pricing`,
        icons: [shortcutIcon],
      },
    ],
    screenshots: [
      {
        src: 'pwa-screenshots/mobile-app-narrow.png',
        sizes: '390x844',
        type: 'image/png',
        form_factor: 'narrow',
        label: 'JyutTranslate translator on mobile',
      },
      {
        src: 'pwa-screenshots/desktop-app-wide.png',
        sizes: '1440x900',
        type: 'image/png',
        form_factor: 'wide',
        label: 'JyutTranslate translator on desktop',
      },
    ],
    share_target: {
      action: root,
      method: 'GET',
      enctype: 'application/x-www-form-urlencoded',
      params: {
        title: 'title',
        text: 'text',
        url: 'url',
      },
    },
    file_handlers: [
      {
        action: root,
        accept: {
          'image/*': ['.png', '.jpg', '.jpeg', '.webp', '.heic', '.gif'],
          'application/pdf': ['.pdf'],
        },
      },
    ],
  }
}

export { PWA_DESCRIPTION }
