/**
 * Offline smoke: assistant-ui #/chat shell wiring (cutover default ON).
 * Run: npx tsx apps/web/src/lib/chatAui.smoke.ts
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { convertChatMessage } from '../pages/chat/aui/convertChatMessage'
import type { ChatMessage } from './chatHistory'
import { CHAT_AUI_FLAG_KEY, isChatAuiEnabled, setChatAuiEnabled } from './chatAuiFlag'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..')

const flagSrc = readFileSync(join(here, 'chatAuiFlag.ts'), 'utf8')
assert.match(flagSrc, /yue-chat-aui-v1/, 'flag key constant')
assert.equal(CHAT_AUI_FLAG_KEY, 'yue-chat-aui-v1')
assert.match(flagSrc, /!== '0'/, 'cutover defaults ON unless explicit opt-out')
assert.match(flagSrc, /Stock shadcn/, 'stock look deferred note')

// Node has no localStorage — polyfill for default-ON cutover.
const mem = new Map<string, string>()
;(globalThis as { localStorage?: Storage }).localStorage = {
  getItem: (k) => (mem.has(k) ? mem.get(k)! : null),
  setItem: (k, v) => {
    mem.set(k, String(v))
  },
  removeItem: (k) => {
    mem.delete(k)
  },
  clear: () => mem.clear(),
  key: () => null,
  get length() {
    return mem.size
  },
} as Storage

mem.clear()
assert.equal(isChatAuiEnabled(), true, 'missing key → AUI on')
setChatAuiEnabled(false)
assert.equal(isChatAuiEnabled(), false, 'explicit 0 → classic')
setChatAuiEnabled(true)
assert.equal(isChatAuiEnabled(), true, 'explicit 1 → AUI')

const app = readFileSync(join(root, 'App.tsx'), 'utf8')
assert.match(app, /isChatAuiEnabled/, 'App gates chat on AUI flag')
assert.match(app, /ChatAuiPage/, 'App lazy-loads ChatAuiPage')

const classic = readFileSync(join(root, 'pages/ChatPage.tsx'), 'utf8')
assert.match(classic, /Back to new chat UI/, 'classic can return to AUI after opt-out')
assert.match(classic, /setChatAuiEnabled\(true\)/, 'classic re-enables AUI flag')

const page = readFileSync(join(root, 'pages/chat/aui/ChatAuiPage.tsx'), 'utf8')
assert.match(page, /ChatAuiRuntimeProvider/, 'AUI page wraps runtime')
assert.match(page, /canUseDeepseekChat/, 'AUI page keeps Family gate')
assert.match(page, /Classic chat UI/, 'AUI page can flip back to classic')
assert.match(page, /ds-chat-top-brand/, 'AUI uses classic centered brand classes')
// Header must be nested under main — a header sibling of main under row-flex
// .ds-chat vertically centered the chrome and hid the composer on iPhone.
const auiShellFn = page.slice(page.indexOf('function AuiShell'), page.indexOf('function GateShell'))
assert.match(
  auiShellFn,
  /ds-chat-main aui-main[\s\S]*<header className="ds-chat-top"[\s\S]*ChatAuiThread/,
  'top bar lives inside ds-chat-main (mobile layout)',
)
assert.doesNotMatch(
  auiShellFn,
  /<header className="ds-chat-top"[\s\S]*ds-chat-main aui-main/,
  'top bar must not precede ds-chat-main in AuiShell',
)
// History drawer flush left: classic absolute sidebar + absolute backdrop under
// `.ds-chat` — never an unstyled in-flow scrim (that shoved main right).
assert.match(auiShellFn, /ds-chat-sidebar-backdrop/, 'mobile history uses classic absolute backdrop')
assert.doesNotMatch(auiShellFn, /ds-chat-sidebar-scrim/, 'no unstyled in-flow scrim')
assert.match(
  auiShellFn,
  /ds-chat-sidebar[\s\S]*ds-chat-main aui-main/,
  'sidebar is a sibling of main under ds-chat (flush left)',
)
assert.match(auiShellFn, /ChatAuiSidebar/, 'thread list lives in shell sidebar')

const auiCss = readFileSync(join(root, 'pages/chat/aui/ChatAui.css'), 'utf8')
assert.match(auiCss, /\.ds-chat\.aui-chat/, 'AUI shell scoped under .aui-chat')
assert.match(
  auiCss,
  /Top bar must live inside|never becomes a full-height row sibling|flex-row sibling/i,
  'CSS documents the iPhone layout invariant',
)
assert.doesNotMatch(
  auiCss,
  /\.aui-layout\.is-sidebar-open \.aui-sidebar/,
  'no nested absolute aui-sidebar under aui-layout (left gap)',
)

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
assert.match(thread, /renderChatMarkdown\(text,\s*\{\s*sources\s*\}\)/, 'citation chips get source hrefs')
assert.match(thread, /ChatSourcesList/, 'collapsible sources list under assistant')
assert.match(thread, /is-streaming/, 'streaming markdown caret class')
assert.doesNotMatch(thread, /WebSpeechSynthesisAdapter|speechSynthesis\.speak/, 'no browser TTS adapter')
assert.doesNotMatch(
  thread,
  /streaming \|\| !rich \?[\s\S]*ds-chat-plain/,
  'AUI does not use classic plain-while-streaming gate',
)
assert.doesNotMatch(thread, /aui-source/, 'no always-on inline source chip spam')

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

// Citation rewriter: bare [n] → <a class="ds-md-cite" href=…> when sources[n-1] exists.
const mdSrc = readFileSync(join(here, 'renderChatMarkdown.tsx'), 'utf8')
assert.match(
  mdSrc,
  /citationChipHtml[\s\S]*class="ds-md-cite"[\s\S]*sources\[n - 1\]/,
  'markdown maps [n] chips to source URLs',
)

console.log('chatAui.smoke: ok')
