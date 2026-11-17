import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { splitSpeakableChunks } from './deepseekChatVoice.js'

const { ready, rest } = splitSpeakableChunks(
  'Hello there, friend. How are you today? More coming',
)
assert.ok(ready.length >= 1)
assert.match(ready[0]!, /Hello/)
assert.match(rest, /More coming/)

const cjk = splitSpeakableChunks('你好世界。下一段还没完')
assert.equal(cjk.ready[0], '你好世界。')
assert.match(cjk.rest, /下一段/)

const src = readFileSync(
  path.resolve(path.dirname(fileURLToPath(import.meta.url)), './deepseekChatVoice.ts'),
  'utf8',
)
assert.match(src, /\/v1\/tools\/tts/, 'TTS hits DeepSeek tools TTS')
assert.match(src, /\/v1\/tools\/asr/, 'ASR hits DeepSeek tools ASR')
assert.match(src, /canUseDeepseekChat/, 'Voice routes stay Family/Business')
assert.doesNotMatch(src, /safety_check/, 'Voice routes do not enable safety_check')

const app = readFileSync(
  path.resolve(path.dirname(fileURLToPath(import.meta.url)), './app.ts'),
  'utf8',
)
assert.match(app, /postDeepseekChatTts/, 'app registers chat TTS')
assert.match(app, /postDeepseekChatAsr/, 'app registers chat ASR')

console.log('deepseekChatVoice.smoke: ok')
