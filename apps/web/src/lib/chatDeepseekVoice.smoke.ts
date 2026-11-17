import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const voice = readFileSync(join(here, './chatDeepseekVoice.ts'), 'utf8')
const api = readFileSync(join(here, './api.ts'), 'utf8')

assert.match(voice, /splitSpeakableChunks/, 'Streaming TTS sentence splitter')
assert.match(voice, /StreamingDeepseekChatTts/, 'Streaming TTS class')
assert.match(voice, /this\.stopped/, 'Streaming TTS stop is sticky')
assert.match(voice, /encodeWavFromAudioBuffer|mediaBlobToWav/, 'WAV encoder for ASR')
assert.match(voice, /fetchDeepseekChatTtsAudio/, 'Client uses api TTS helper')
assert.match(voice, /transcribeDeepseekChatAudio/, 'Client uses api ASR helper')
assert.match(api, /\/chat\/tts/, 'api exposes chat TTS')
assert.match(api, /\/chat\/asr/, 'api exposes chat ASR')
assert.match(voice, /\[。！？\]/, 'CJK sentence enders supported')

console.log('chatDeepseekVoice.smoke: ok')
