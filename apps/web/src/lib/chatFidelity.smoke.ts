/**
 * Offline guards for chat fidelity Pass 1:
 * inline citations, image-search cards, rich layout, primaryLang metadata.
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const chat = readFileSync(join(here, '../pages/ChatPage.tsx'), 'utf8')
const api = readFileSync(join(here, './api.ts'), 'utf8')
const history = readFileSync(join(here, './chatHistory.ts'), 'utf8')

assert.match(chat, /onContentReplace/, 'Chat applies citation content_replace')
assert.match(chat, /primaryLang:\s*primaryLanguage/, 'Chat sends Account Hub primaryLang')
assert.match(chat, /richLayout/, 'Rich layout toggle present')
assert.match(chat, /preferRichLayout:\s*richLayout/, 'Uploads honor rich layout')
assert.match(chat, /ds-chat-image-results/, 'Image search gallery in SearchStepsList')
assert.match(api, /contentReplace/, 'Stream client parses contentReplace')
assert.match(api, /primaryLang/, 'Stream client sends primaryLang')
assert.match(api, /rich_layout_recognition/, 'Upload can request rich layout')
assert.match(api, /function resolveChatFilePurpose/, 'resolveChatFilePurpose helper exported')
assert.match(history, /images\?:/, 'Search steps persist image cards')

console.log('chatFidelity.smoke: ok')
