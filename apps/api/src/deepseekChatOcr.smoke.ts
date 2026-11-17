import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { formatOcrPages } from './deepseekChatOcr.js'

assert.equal(
  formatOcrPages([
    { index: 0, text: 'Hello' },
    { index: 1, text: 'World' },
  ]),
  '— Page 1 —\nHello\n\n— Page 2 —\nWorld',
)
assert.equal(formatOcrPages([{ index: 0, text: '  ' }]), '')

const src = readFileSync(
  path.resolve(path.dirname(fileURLToPath(import.meta.url)), './deepseekChatOcr.ts'),
  'utf8',
)
assert.match(src, /\/v1\/tools\/ocr/, 'OCR hits DeepSeek tools OCR')
assert.match(src, /rich_layout_recognition/, 'OCR supports rich layout')
assert.match(src, /canUseDeepseekChat/, 'OCR gated to Family/Business')

const app = readFileSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), './app.ts'), 'utf8')
assert.match(app, /postDeepseekChatOcr/, 'app registers chat OCR')

console.log('deepseekChatOcr.smoke: ok')
