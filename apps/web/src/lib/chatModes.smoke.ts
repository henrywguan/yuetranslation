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
  CHAT_PLAN_WORKSPACE_PATH,
  detectAtQuery,
  extractPlanArtifactText,
} from './chatComposerContext.js'
import { parseGithubPrUrl, summarizePrChecks } from './chatPrChecks.js'
import {
  CHAT_COMPOSER_MODE_LABEL,
  CHAT_COMPOSER_MODES,
  CHAT_MODE_KEY,
  CHAT_TOOLS_EXPANDED_KEY,
  cycleChatComposerMode,
  normalizeChatComposerMode,
  readChatComposerMode,
  readChatToolsExpanded,
  writeChatComposerMode,
  writeChatToolsExpanded,
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
    { id: 't-proj', title: 'Project chat' },
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
  projectId: 'p1',
  projectThreadIds: ['t-proj', 't-ov'],
  githubBound: true,
  defaultBranch: 'main',
  lastRun: { argv: ['npm', 'run', 'smoke:canto'] },
  query: '',
})
assert.ok(mentions.some((m) => m.kind === 'file' && m.label === 'notes/plan.md'))
assert.ok(mentions.some((m) => m.kind === 'workspace' && /yuetranslation/.test(m.label)))
assert.ok(mentions.some((m) => m.kind === 'chat' && m.insert === '@chat:t1'))
assert.ok(mentions.some((m) => m.insert === '@chat:t-ov'))
assert.ok(mentions.some((m) => m.insert === '@chat:t-proj' && /Project/.test(m.hint || '')))
assert.ok(mentions.some((m) => m.kind === 'diff' && m.insert === '@diff:main'))
assert.ok(mentions.some((m) => m.kind === 'run' && m.insert === '@run:last'))
assert.ok(!mentions.some((m) => m.insert === '@chat:t2'), 'active thread excluded')

assert.equal(CHAT_PLAN_WORKSPACE_PATH, 'plans/latest.md')
assert.match(extractPlanArtifactText('```plan\n## Steps\n```'), /## Steps/)
assert.equal(
  extractPlanArtifactText('Intro\n```ts\nconst x = 1\n```\nDone'),
  'Intro\n```ts\nconst x = 1\n```\nDone',
  'unlabeled fences are not stolen as the plan',
)
assert.equal(extractPlanArtifactText('plain plan'), 'plain plan')
assert.match(
  readFileSync(join(root, 'pages/chat/aui/ChatDiffsPanel.tsx'), 'utf8'),
  /setSummary\(null\)[\s\S]*setLoading\(true\)/,
  'PR checks clear stale summary before refetch',
)

const prRef = parseGithubPrUrl('https://github.com/henrywguan/yuetranslation/pull/800')
assert.deepEqual(prRef, { owner: 'henrywguan', repo: 'yuetranslation', number: 800 })
assert.equal(parseGithubPrUrl('nope'), null)
assert.match(summarizePrChecks({ state: 'success', total: 3, success: 3 }).label, /3\/3/)

const buildInProject = buildPlanBuildPrompt('## Steps\n1. Nest', true)
assert.match(buildInProject, /Project Overseer/)
assert.match(buildInProject, /project_create_agent/)
assert.match(buildInProject, /## Approved plan/)
assert.match(buildInProject, /## Steps/)
assert.doesNotMatch(buildPlanBuildPrompt('x', false), /Project Overseer/)

mem.clear()
assert.equal(CHAT_TOOLS_EXPANDED_KEY, 'yue-deepseek-chat-tools-expanded-v1')
writeChatToolsExpanded(false)
assert.equal(localStorage.getItem(CHAT_TOOLS_EXPANDED_KEY), '0')
assert.equal(readChatToolsExpanded(), false)
writeChatToolsExpanded(true)
assert.equal(readChatToolsExpanded(), true)

const thread = readFileSync(join(root, 'pages/chat/aui/ChatAuiThread.tsx'), 'utf8')
assert.match(thread, /CHAT_COMPOSER_MODES/, 'mode picker in AUI composer')
assert.match(thread, /aui-composer-modes/, 'mode row class')
assert.match(thread, /AgentModeIcon|AskModeIcon|PlanModeIcon/, 'mode icons beside labels')
assert.match(thread, /cycleChatComposerMode/, 'Shift+Tab mode cycle helper wired')
assert.match(thread, /Shift\+Tab/, 'Shift+Tab mentioned in titles/handler')
assert.match(thread, /aui-tools-toggle|toolsExpanded/, 'Tools row collapsible')
assert.match(thread, /writeChatToolsExpanded/, 'Tools expand state persisted')
assert.match(thread, /ProjectAgentStrip/, 'in-thread project agent strip')
assert.match(thread, /AtMentionMenu|aui-at-menu/, '@ context menu from typed @')
assert.match(thread, /detectAtQuery/, 'typed @ opens mention picker')
assert.doesNotMatch(
  thread,
  /title="Insert @ context/,
  'no dedicated @ attach button in composer toolbar',
)
assert.match(thread, /aui-composer-toolbar/, 'toolbar row under full-width input')
assert.match(thread, /buildFromPlan/, 'Plan → Build handoff')
assert.match(thread, /planDraft|aui-plan-artifact/, 'editable Plan artifact')
assert.match(thread, /savePlanToWorkspace/, 'Save plan to workspace')
assert.match(thread, /onPaste|onDrop|takeImageFromDataTransfer/, 'paste/drop image into composer')
assert.match(thread, /types\]\.some\(\(t\) => t === 'Files'\)/, 'dragover only claims Files')
assert.match(thread, /githubBound|@diff:|lastRun/, 'richer @ diff/run wiring')
assert.match(
  thread,
  /disabled=\{busy \|\| !planDraft\.trim\(\)\}/,
  'Build disabled while busy or empty plan',
)
assert.match(thread, /Wait for reply/, 'Plan busy shows wait-for-reply status')
assert.match(
  thread,
  /Wait for the current reply to finish, then Build|Plan is empty/,
  'Build title explains wait / empty plan',
)
assert.match(thread, /aui-tools-label/, 'DeepThink/Search nested under Tools')
assert.match(thread, /ChatDictateButton/, 'dictate preserved')
assert.match(thread, /followUpQueue|queueFollowUp/, 'follow-up queue while Agent runs')

assert.equal(cycleChatComposerMode('agent'), 'ask')
assert.equal(cycleChatComposerMode('ask'), 'plan')
assert.equal(cycleChatComposerMode('plan'), 'agent')

const css = readFileSync(join(root, 'pages/chat/aui/ChatAui.css'), 'utf8')
assert.match(css, /\.aui-mode\.is-agent\.is-on/, 'Agent mode distinct active color')
assert.match(css, /\.aui-mode\.is-ask\.is-on/, 'Ask mode distinct active color')
assert.match(css, /\.aui-mode\.is-plan\.is-on/, 'Plan mode distinct active color')
assert.match(css, /\.aui-composer-toolbar/, 'composer toolbar CSS')
assert.match(css, /\.aui-composer-input[\s\S]*width:\s*100%/, 'input full width')

const runtime = readFileSync(join(root, 'pages/chat/aui/ChatAuiRuntime.tsx'), 'utf8')
assert.match(runtime, /chatMode: composerModeRef/, 'mode forwarded to SSE')
assert.match(runtime, /writeChatComposerMode/, 'mode persisted')
assert.match(runtime, /buildPlanBuildPrompt/, 'Build uses Overseer-leaning prompt')
assert.match(runtime, /planDraft|savePlanToWorkspace|CHAT_PLAN_WORKSPACE_PATH/, 'Plan artifact session APIs')
assert.match(runtime, /planDraftsByThreadRef|planSeedByThreadRef/, 'Plan drafts keyed per thread')
assert.match(
  runtime,
  /Plan is empty — write or restore a plan before Build/,
  'Build refuses empty plan (no silent fallback to last assistant)',
)
assert.match(
  runtime,
  /Wait for the current reply to finish, then Build/,
  'buildFromPlan busy path sets wait-for-reply error (keeps Plan)',
)
assert.match(runtime, /if \(busyRef\.current\) \{\s*setError/, 'busy Build is not a silent no-op')

assert.match(css, /\.aui-plan-artifact/, 'plan artifact CSS')
assert.match(css, /\.aui-composer\.is-drag-over/, 'composer drop affordance')
assert.match(css, /\.aui-at-kind\.is-diff/, 'diff mention kind style')

const prefs = readFileSync(join(here, 'chatUiPrefs.ts'), 'utf8')
assert.match(prefs, /CHAT_MODE_KEY/, 'mode key in shared prefs')
assert.match(prefs, /CHAT_TOOLS_EXPANDED_KEY/, 'tools expand key in shared prefs')

const api = readFileSync(join(here, 'api.ts'), 'utf8')
assert.match(api, /chatMode/, 'client API sends chatMode')

console.log('chatModes.smoke: ok')
