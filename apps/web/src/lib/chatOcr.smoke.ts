import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const chat = readFileSync(join(here, '../pages/ChatPage.tsx'), 'utf8')
const api = readFileSync(join(here, './api.ts'), 'utf8')

assert.match(chat, /ocrDeepseekChatFile/, 'ChatPage uses OCR helper')
assert.match(chat, /onPickOcr/, 'OCR picker wired')
assert.match(chat, /ds-chat-ocr/, 'OCR button in composer')
assert.match(api, /\/chat\/ocr/, 'Client hits chat OCR proxy')

console.log('chatOcr.smoke: ok')
