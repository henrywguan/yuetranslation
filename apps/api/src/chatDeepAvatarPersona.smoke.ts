/**
 * Offline smoke for server companion persona + mood tools helpers.
 * Run: npx tsx apps/api/src/chatDeepAvatarPersona.smoke.ts
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  CHAT_DEEP_AVATAR_SHOWCASE,
  buildChatDeepAvatarPersonaPromptBlock,
  isChatDeepAvatarMoodId,
  normalizeChatDeepAvatarMoodId,
} from './chatDeepAvatarPersona.js'

assert.ok(CHAT_DEEP_AVATAR_SHOWCASE.length >= 15)
assert.equal(isChatDeepAvatarMoodId('fist'), true)
assert.equal(isChatDeepAvatarMoodId('nope'), false)
assert.equal(normalizeChatDeepAvatarMoodId('BOW'), 'bow')
assert.equal(normalizeChatDeepAvatarMoodId('???'), 'celebrate')

const block = buildChatDeepAvatarPersonaPromptBlock({
  character: 'boy',
  name: 'Scout',
  trait: 'coach',
})
assert.match(block, /Scout/)
assert.match(block, /avatar_list/)

const here = dirname(fileURLToPath(import.meta.url))
const tools = readFileSync(join(here, 'deepseekChatTools.ts'), 'utf8')
assert.match(tools, /name: 'avatar_list'/)
assert.match(tools, /name: 'avatar_play'/)
assert.match(tools, /name: 'avatar_react'/)
assert.match(tools, /case 'avatar_play'/)

const prompt = readFileSync(join(here, 'deepseekChatPrompt.ts'), 'utf8')
assert.match(prompt, /buildChatDeepAvatarPersonaPromptBlock/)

const harness = readFileSync(join(here, 'deepseekChatHarness.ts'), 'utf8')
assert.match(harness, /kind: 'avatar'/)
assert.match(harness, /onAvatar/)

console.log('chatDeepAvatarPersona.smoke (api): ok')
