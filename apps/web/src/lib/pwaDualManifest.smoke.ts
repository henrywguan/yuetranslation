/**
 * Dual PWA manifests: translator keeps `#/app`; chat installs as a second app at `#/chat`.
 * Run: npx tsx apps/web/src/lib/pwaDualManifest.smoke.ts
 */
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createPwaManifest } from '../../pwa-manifest.js'
import {
  pwaManifestHref,
  pwaManifestVariantForRoute,
} from './pwaManifestLink.js'

const here = dirname(fileURLToPath(import.meta.url))
const webRoot = join(here, '../..')
const publicDir = join(webRoot, 'public')

const app = createPwaManifest('/', 'app')
const chat = createPwaManifest('/', 'chat')

assert.equal(app.start_url, '/#/app', 'translator start_url')
assert.equal(app.id, '/', 'translator id stays root')
assert.match(app.short_name, /JyutTranslate/)
assert.ok(
  app.icons.some((i) => i.src === 'pwa-192.png'),
  'translator uses chop icons',
)
assert.ok(
  !app.icons.some((i) => String(i.src).includes('pwa-chat')),
  'translator does not use chat icons',
)

assert.equal(chat.start_url, '/chat', 'chat start_url is path /chat (→ #/chat)')
assert.equal(chat.id, '/chat', 'chat id distinct from translator')
assert.match(chat.short_name, /DeepSeek Chat|Chat/)
assert.notEqual(app.id, chat.id, 'OS can treat as two PWAs')
assert.notEqual(app.start_url, chat.start_url, 'start URLs differ')
assert.ok(
  chat.icons.every((i) => String(i.src).includes('chat') || String(i.src).includes('pwa-chat')),
  'chat icons are chat-named',
)
assert.ok(
  chat.icons.some((i) => i.src === 'pwa-chat-192.png'),
  'chat 192 icon',
)
assert.ok(
  chat.icons.some((i) => i.src === 'pwa-chat-512.png'),
  'chat 512 icon',
)

assert.equal(pwaManifestHref('app'), '/manifest.webmanifest')
assert.equal(pwaManifestHref('chat'), '/manifest-chat.webmanifest')
assert.equal(pwaManifestVariantForRoute('chat'), 'chat')
assert.equal(pwaManifestVariantForRoute('app'), 'app')
assert.equal(pwaManifestVariantForRoute('home'), 'app')

for (const name of [
  'pwa-chat-192.png',
  'pwa-chat-512.png',
  'pwa-chat-512-maskable.png',
  'apple-touch-icon-chat.png',
]) {
  assert.ok(existsSync(join(publicDir, name)), `public/${name} present`)
}

const indexHtml = readFileSync(join(webRoot, 'index.html'), 'utf8')
assert.match(indexHtml, /'\/chat':\s*'#\/chat'/, 'path /chat maps to hash route')
assert.match(indexHtml, /manifest\.webmanifest/, 'default link is translator manifest')

const vite = readFileSync(join(webRoot, 'vite.config.ts'), 'utf8')
assert.match(vite, /emit-chat-pwa-manifest|manifest-chat\.webmanifest/, 'vite emits chat manifest')
assert.match(vite, /createPwaManifest\(base,\s*'app'\)/, 'VitePWA keeps app manifest')

const vercel = readFileSync(join(webRoot, '../../vercel.json'), 'utf8')
assert.ok(
  vercel.includes('manifest-chat'),
  'vercel rewrite excludes chat manifest',
)

const appTsx = readFileSync(join(webRoot, 'src/App.tsx'), 'utf8')
assert.match(appTsx, /syncPwaManifestLink/, 'App swaps manifest by route')

const installBtn = readFileSync(join(webRoot, 'src/components/PwaInstallButton.tsx'), 'utf8')
assert.match(installBtn, /pwaInstallChat/, 'Install button labels chat package')

const hub = readFileSync(join(webRoot, 'src/components/PwaCapabilitiesPanel.tsx'), 'utf8')
assert.match(hub, /pwaOpenChatToInstall/, 'Account Hub links chat install surface')
assert.match(hub, /openDeepseekChat/, 'Hub navigates to #/chat for chat PWA')
assert.match(hub, /pwa-chat-192\.png/, 'Hub shows chat icon')
assert.match(hub, /pwa-192\.png/, 'Hub shows translator icon')

const ios = readFileSync(join(webRoot, 'src/components/IosHomescreenGuide.tsx'), 'utf8')
assert.match(ios, /iosHomescreenTipTitleChat/, 'iOS tip has chat copy')
assert.match(ios, /apple-touch-icon-chat\.png/, 'iOS preview uses chat icon')

const copy = readFileSync(join(webRoot, 'src/lib/uiCopy.ts'), 'utf8')
assert.match(copy, /pwaInstallChat:/, 'uiCopy has chat install string')
assert.match(copy, /pwaCapabilitiesHint:[\s\S]*two Home Screen apps/, 'hub hint mentions two PWAs')

console.log('pwaDualManifest.smoke: ok')
