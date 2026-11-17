/**
 * Offline smoke: assistant-ui #/chat shell wiring.
 * Run: npx tsx apps/web/src/lib/chatAui.smoke.ts
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { convertChatMessage } from '../pages/chat/aui/convertChatMessage'
import type { ChatMessage } from './chatHistory'
import { CHAT_AUI_FLAG_KEY } from './chatAuiFlag'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..')

const flagSrc = readFileSync(join(here, 'chatAuiFlag.ts'), 'utf8')
assert.match(flagSrc, /yue-chat-aui-v1/, 'flag key constant')
assert.equal(CHAT_AUI_FLAG_KEY, 'yue-chat-aui-v1')

const app = readFileSync(join(root, 'App.tsx'), 'utf8')
assert.match(app, /isChatAuiEnabled/, 'App gates chat on AUI flag')
assert.match(app, /ChatAuiPage/, 'App lazy-loads ChatAuiPage')

const classic = readFileSync(join(root, 'pages/ChatPage.tsx'), 'utf8')
assert.match(classic, /Try new chat UI/, 'classic ChatPage can flip to AUI')
assert.match(classic, /setChatAuiEnabled\(true\)/, 'classic enables AUI flag')

const page = readFileSync(join(root, 'pages/chat/aui/ChatAuiPage.tsx'), 'utf8')
assert.match(page, /ChatAuiRuntimeProvider/, 'AUI page wraps runtime')
assert.match(page, /canUseDeepseekChat/, 'AUI page keeps Family gate')
assert.match(page, /Classic chat UI/, 'AUI page can flip back to classic')

const runtime = readFileSync(join(root, 'pages/chat/aui/ChatAuiRuntime.tsx'), 'utf8')
assert.match(runtime, /useExternalStoreRuntime/, 'ExternalStoreRuntime bridge')
assert.match(runtime, /streamDeepseekChat/, 'SSE still via streamDeepseekChat')
assert.match(runtime, /hydrateChatThreadsAsync/, 'device-local history hydrate')
assert.match(runtime, /adapters:\s*\{[\s\S]*threadList/, 'thread list adapter')
assert.match(runtime, /plugins: enabledPluginsRef/, 'plugins forwarded to SSE')
assert.match(runtime, /uploadDeepseekChatFile/, 'file attach upload')
assert.match(runtime, /ocrDeepseekChatFile/, 'OCR helper')

const thread = readFileSync(join(root, 'pages/chat/aui/ChatAuiThread.tsx'), 'utf8')
assert.match(thread, /ThreadPrimitive/, 'Thread primitives')
assert.match(thread, /ComposerPrimitive/, 'Composer primitives')
assert.match(thread, /ChatDictateButton/, 'keeps DeepSeek dictate')
assert.match(thread, /SpeakButton/, 'keeps SpeakButton')
assert.match(thread, /DeepThink/, 'DeepThink toggle chrome')
assert.match(thread, /ChatPluginKeysModal/, 'BYOK keys modal')
assert.match(thread, /Rich layout/, 'rich layout toggle')
assert.match(thread, /renderChatMarkdown\(text\)/, 'mid-stream markdown (not plain settle)')
assert.match(thread, /is-streaming/, 'streaming markdown caret class')
assert.doesNotMatch(thread, /WebSpeechSynthesisAdapter|speechSynthesis\.speak/, 'no browser TTS adapter')
assert.doesNotMatch(
  thread,
  /streaming \|\| !rich \?[\s\S]*ds-chat-plain/,
  'AUI does not use classic plain-while-streaming gate',
)

const pkg = JSON.parse(readFileSync(join(root, '../package.json'), 'utf8')) as {
  dependencies?: Record<string, string>
}
assert.ok(pkg.dependencies?.['@assistant-ui/react'], '@assistant-ui/react dependency')

const user: ChatMessage = {
  id: 'u1',
  role: 'user',
  content: '你好',
  createdAt: 1,
}
const assistant: ChatMessage = {
  id: 'a1',
  role: 'assistant',
  content: 'Hello',
  createdAt: 2,
  reasoning: 'think…',
  thoughtMs: 1200,
  sources: [{ url: 'https://example.com', title: 'Example' }],
}

const u = convertChatMessage(user)
assert.equal(u.role, 'user')
assert.ok(Array.isArray(u.content))

const a = convertChatMessage(assistant, { streamingId: null })
assert.equal(a.role, 'assistant')
assert.ok(Array.isArray(a.content))
const parts = a.content as Array<{ type: string }>
assert.ok(parts.some((p) => p.type === 'reasoning'))
assert.ok(parts.some((p) => p.type === 'text'))
assert.ok(parts.some((p) => p.type === 'source'))

const live = convertChatMessage(assistant, { streamingId: 'a1' })
assert.equal(live.status?.type, 'running')

console.log('chatAui.smoke: ok')
