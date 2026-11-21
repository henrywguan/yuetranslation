/** Web app manifest fields for PWA Builder / Play Store TWA packaging. */

const PWA_DESCRIPTION =
  'AI language tool with live translation, voice, camera OCR, and document translation.'

const CHAT_PWA_DESCRIPTION =
  'DeepSeek general chat for JyutTranslate — research, coding, and agent work alongside the translator.'

/** Shared icon entries for shortcuts (relative to public/). */
const shortcutIcon = { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' as const }
const chatShortcutIcon = { src: 'pwa-chat-192.png', sizes: '192x192', type: 'image/png' as const }

export type PwaManifestVariant = 'app' | 'chat'

/**
 * Web app manifest tuned for PWA Builder / Play Store TWA packaging.
 * Keep start_url aligned with vite base path.
 *
 * Two installable PWAs share the origin:
 * - `app` → translator (`/#/app`), id `/`
 * - `chat` → DeepSeek chat (`/#/chat`), id `/chat` (distinct icon + name)
 */
export function createPwaManifest(base: string, variant: PwaManifestVariant = 'app') {
  const root = base.replace(/\/?$/, '/')
  if (variant === 'chat') {
    return createChatPwaManifest(root)
  }
  return createAppPwaManifest(root)
}

function createAppPwaManifest(root: string) {
  const startUrl = `${root}#/app`

  return {
    name: 'JyutTranslate — AI Language Tool',
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
        name: 'Conversation',
        short_name: 'Talk',
        description: 'Open face-to-face conversation mode',
        url: `${root}#/app?mode=conversation`,
        icons: [shortcutIcon],
      },
      {
        name: 'Harbor Quest',
        short_name: 'Harbor',
        description: 'Open Harbor Quest (Jyutping voyage)',
        url: `${root}#/learn`,
        icons: [shortcutIcon],
      },
      {
        name: 'DeepSeek Chat',
        short_name: 'Chat',
        description: 'Open DeepSeek general chat',
        url: `${root}#/chat`,
        icons: [chatShortcutIcon],
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

function createChatPwaManifest(root: string) {
  // Distinct id so Chromium installs a second Home Screen / desktop icon.
  // Path-style start_url survives fragment stripping; index.html maps /chat → #/chat.
  const startUrl = `${root}chat`

  return {
    name: 'DeepSeek Chat — JyutTranslate',
    short_name: 'DeepSeek Chat',
    description: CHAT_PWA_DESCRIPTION,
    id: `${root}chat`,
    lang: 'en',
    dir: 'ltr',
    theme_color: '#07131f',
    background_color: '#07131f',
    display: 'standalone',
    display_override: ['standalone', 'minimal-ui'],
    orientation: 'any',
    categories: ['education', 'utilities', 'productivity'],
    prefer_related_applications: false,
    related_applications: [] as { platform: string; url: string; id?: string }[],
    start_url: startUrl,
    scope: root,
    launch_handler: {
      client_mode: 'navigate-existing',
    },
    edge_side_panel: {
      preferred_width: 480,
    },
    icons: [
      { src: 'pwa-chat-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: 'pwa-chat-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      {
        src: 'pwa-chat-512-maskable.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
      { src: 'apple-touch-icon-chat.png', sizes: '180x180', type: 'image/png' },
    ],
    shortcuts: [
      {
        name: 'New chat',
        short_name: 'Chat',
        description: 'Open DeepSeek general chat',
        url: `${root}#/chat`,
        icons: [chatShortcutIcon],
      },
      {
        name: 'Translator',
        short_name: 'Translate',
        description: 'Open the JyutTranslate translator',
        url: `${root}#/app`,
        icons: [shortcutIcon],
      },
    ],
  }
}

export { PWA_DESCRIPTION, CHAT_PWA_DESCRIPTION }
