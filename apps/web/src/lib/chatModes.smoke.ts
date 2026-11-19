/**
 * Offline smoke: Agent / Ask / Plan mode prefs + @ mentions + Plan→Build copy.
 * Run: npx tsx apps/web/src/lib/chatModes.smoke.ts
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  applyMentionInsert,
  buildChatMentionItems,
  buildPlanBuildPrompt,
  detectAtQuery,
} from './chatComposerContext.js'
import {
  CHAT_COMPOSER_MODE_LABEL,
  CHAT_COMPOSER_MODES,
  CHAT_MODE_KEY,
  normalizeChatComposerMode,
  readChatComposerMode,
  writeChatComposerMode,
} from './chatUiPrefs.js'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..')

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

assert.equal(CHAT_MODE_KEY, 'yue-deepseek-chat-mode-v1')
assert.deepEqual([...CHAT_COMPOSER_MODES], ['agent', 'ask', 'plan'])
assert.equal(CHAT_COMPOSER_MODE_LABEL.agent, 'Agent')
assert.equal(normalizeChatComposerMode('ASK'), 'ask')
assert.equal(normalizeChatComposerMode('nope'), 'agent')

mem.clear()
assert.equal(readChatComposerMode('agent'), 'agent')
writeChatComposerMode('plan')
assert.equal(readChatComposerMode(), 'plan')
writeChatComposerMode('ask')
assert.equal(localStorage.getItem(CHAT_MODE_KEY), 'ask')

assert.deepEqual(detectAtQuery('hello @note'), { start: 6, query: 'note' })
assert.equal(detectAtQuery('no mention'), null)
assert.equal(applyMentionInsert('see @fi', 4, '@file:notes/a.md'), 'see @file:notes/a.md ')

const mentions = buildChatMentionItems({
  workspace: {
    files: [{ id: '1', path: 'notes/plan.md', updatedAt: 1 }],
    updatedAt: 1,
  },
  workspaces: [
    {
      id: 'ws1',
      kind: 'github',
      title: 'yuetranslation',
      ref: 'henry/yuetranslation',
      createdAt: 1,
      updatedAt: 1,
    },
  ],
  threads: [
    { id: 't1', title: 'Prior research' },
    { id: 't2', title: 'Active', archived: false },
  ],
  agents: [
    {
      id: 'a1',
      projectId: 'p1',
      title: 'Overseer',
      status: 'idle',
      role: 'overseer',
      threadId: 't-ov',
      updatedAt: 1,
    },
  ],
  activeThreadId: 't2',
  query: '',
})
assert.ok(mentions.some((m) => m.kind === 'file' && m.label === 'notes/plan.md'))
assert.ok(mentions.some((m) => m.kind === 'workspace' && /yuetranslation/.test(m.label)))
assert.ok(mentions.some((m) => m.kind === 'chat' && m.insert === '@chat:t1'))
assert.ok(mentions.some((m) => m.insert === '@chat:t-ov'))
assert.ok(!mentions.some((m) => m.insert === '@chat:t2'), 'active thread excluded')

const buildInProject = buildPlanBuildPrompt('## Steps\n1. Nest', true)
assert.match(buildInProject, /Project Overseer/)
assert.match(buildInProject, /project_create_agent/)
assert.match(buildInProject, /## Approved plan/)
assert.match(buildInProject, /## Steps/)
assert.doesNotMatch(buildPlanBuildPrompt('x', false), /Project Overseer/)

const thread = readFileSync(join(root, 'pages/chat/aui/ChatAuiThread.tsx'), 'utf8')
assert.match(thread, /CHAT_COMPOSER_MODES/, 'mode picker in AUI composer')
assert.match(thread, /aui-composer-modes/, 'mode row class')
assert.match(thread, /ProjectAgentStrip/, 'in-thread project agent strip')
assert.match(thread, /AtMentionMenu|aui-at-menu/, '@ context menu')
assert.match(thread, /buildFromPlan/, 'Plan → Build handoff')
assert.match(thread, /aui-tools-label/, 'DeepThink/Search nested under Tools')
assert.match(thread, /ChatDictateButton/, 'dictate preserved')

const runtime = readFileSync(join(root, 'pages/chat/aui/ChatAuiRuntime.tsx'), 'utf8')
assert.match(runtime, /chatMode: composerModeRef/, 'mode forwarded to SSE')
assert.match(runtime, /writeChatComposerMode/, 'mode persisted')
assert.match(runtime, /buildPlanBuildPrompt/, 'Build uses Overseer-leaning prompt')

const prefs = readFileSync(join(here, 'chatUiPrefs.ts'), 'utf8')
assert.match(prefs, /CHAT_MODE_KEY/, 'mode key in shared prefs')

const api = readFileSync(join(here, 'api.ts'), 'utf8')
assert.match(api, /chatMode/, 'client API sends chatMode')

console.log('chatModes.smoke: ok')
