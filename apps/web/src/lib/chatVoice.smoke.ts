import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chatDictateLang, chatSpeakLang, mergeDictateText } from './chatVoice.js'

assert.equal(chatDictateLang('en-US'), 'en')
assert.equal(chatDictateLang('zh-HK'), 'yue')
assert.equal(chatDictateLang('zh-CN'), 'cmn')
assert.equal(chatDictateLang('es-MX'), 'es')

assert.equal(chatSpeakLang('Hello, how can I help?'), 'en')
assert.equal(chatSpeakLang('你好，今天天气怎么样？我们可以一起聊聊。'), 'cmn')

assert.equal(mergeDictateText('', 'hello'), 'hello')
assert.equal(mergeDictateText('Hi', 'there'), 'Hi there')
assert.equal(mergeDictateText('Hi ', 'there'), 'Hi there')
assert.equal(mergeDictateText('Hi', ','), 'Hi,')

const root = dirname(fileURLToPath(import.meta.url))
const chat = readFileSync(join(root, '../pages/ChatPage.tsx'), 'utf8')
assert.match(chat, /SpeakButton/, 'ChatPage speaks assistant replies')
assert.match(chat, /ChatDictateButton/, 'ChatPage has mic dictation')
assert.match(chat, /chatSpeakLang/, 'TTS lang from bubble text')

const dictate = readFileSync(join(root, '../components/ChatDictateButton.tsx'), 'utf8')
assert.match(dictate, /createWebSpeechSession/, 'Dictation uses Web Speech helper')
assert.match(dictate, /preserveSession/, 'Barge-in pauses TTS after STT starts')
assert.doesNotMatch(dictate, /\.startHold\b|startHold\(/, 'Chat dictation must not call Solo live hold')

console.log('chatVoice.smoke: ok')
