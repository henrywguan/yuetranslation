import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { readVisualViewportHeight, safeShellViewportHeight } from './visualViewportHeight'

assert.equal(safeShellViewportHeight(120), null, 'no window → null (below min)')
assert.equal(readVisualViewportHeight(), 0, 'no window → 0')

const root = dirname(fileURLToPath(import.meta.url))
const chat = readFileSync(join(root, '../pages/ChatPage.tsx'), 'utf8')
assert.match(chat, /safeShellViewportHeight/, 'ChatPage rejects zero visualViewport heights')
assert.match(chat, /BOOT_THREAD/, 'ChatPage first paint skips localStorage history')
assert.match(chat, /MAX_RENDER_MESSAGES/, 'ChatPage caps DOM messages on open')
assert.match(chat, /HYDRATE_BATCH/, 'ChatPage paints history in idle batches')
assert.match(chat, /hydrateChatThreadsAsync/, 'ChatPage hydrates history off the first paint')
assert.match(chat, /open \|\| streaming \?/, 'Collapsed DeepThink traces stay out of the DOM')
assert.match(chat, /schedulePaint/, 'Stream tokens coalesce React paints')
assert.match(chat, /paintThread/, 'Live stream skips localStorage per token')
assert.doesNotMatch(
  chat,
  /visualViewport\?\.addEventListener\('scroll'/,
  'ChatPage does not listen to visualViewport scroll (desktop hang risk)',
)

const css = readFileSync(join(root, '../pages/ChatPage.css'), 'utf8')
assert.match(css, /min-height:\s*100dvh/, '.ds-chat keeps a dvh floor if --ds-chat-vh is bad')

console.log('visualViewportHeight.smoke: ok')
