import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { CHAT_DEFERRED_FEATURES } from './chatDeferred.js'
import { CHAT_SKILLS } from './chatSkills.js'

assert.ok(!CHAT_DEFERRED_FEATURES.includes('mcp_plugin_marketplace' as never))
assert.ok(!CHAT_DEFERRED_FEATURES.includes('image_generation' as never))
assert.ok(CHAT_SKILLS.some((s) => s.slash === '/image'))

const here = dirname(fileURLToPath(import.meta.url))
const md = readFileSync(join(here, './renderChatMarkdown.tsx'), 'utf8')
assert.match(md, /safeImageSrc|ds-md-img/, 'Markdown renders images')
assert.match(md, /type: 'image'/, 'Standalone image blocks parsed')

const api = readFileSync(join(here, './api.ts'), 'utf8')
assert.match(api, /fetchDeepseekChatPlugins/, 'Client loads plugin catalog')
assert.match(api, /onImage/, 'Client handles image SSE')
assert.match(api, /plugins/, 'Client sends plugins in chat body')

const page = readFileSync(join(here, '../pages/ChatPage.tsx'), 'utf8')
assert.match(page, /enabledPlugins/, 'ChatPage plugin toggles')
assert.match(page, /ds-chat-plugins/, 'Plugins panel markup')
assert.match(page, /onImage:/, 'ChatPage appends image markdown')

console.log('chatMcpImage.smoke: ok')
