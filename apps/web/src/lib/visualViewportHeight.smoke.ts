import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { readVisualViewportHeight, safeShellViewportHeight } from './visualViewportHeight'

assert.equal(safeShellViewportHeight(120), null, 'no window → null (below min)')
assert.equal(readVisualViewportHeight(), 0, 'no window → 0')

const chat = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../pages/ChatPage.tsx'), 'utf8')
assert.match(chat, /safeShellViewportHeight/, 'ChatPage rejects zero visualViewport heights')

const css = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../pages/ChatPage.css'), 'utf8')
assert.match(css, /min-height:\s*100dvh/, '.ds-chat keeps a dvh floor if --ds-chat-vh is bad')

console.log('visualViewportHeight.smoke: ok')
