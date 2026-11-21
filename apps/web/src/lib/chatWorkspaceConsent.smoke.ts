/**
 * Offline smoke: Agent workspace-write consent gate helpers + wiring.
 * Run: npx tsx apps/web/src/lib/chatWorkspaceConsent.smoke.ts
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  CHAT_WORKSPACE_CONSENT_CAPS_COPY,
  CHAT_WORKSPACE_CONSENT_FOLDER_KEY,
  CHAT_WORKSPACE_LS_CONSENT_KEY,
  evaluateWorkspaceBuildConsent,
  evaluateWorkspaceBuildConsentSync,
  isWorkspaceWriteCapableTurn,
  readWorkspaceLsConsent,
  writeWorkspaceLsConsent,
} from './chatWorkspaceConsent.js'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..')

assert.equal(CHAT_WORKSPACE_LS_CONSENT_KEY, 'yue-deepseek-chat-workspace-ls-consent-v1')
assert.equal(CHAT_WORKSPACE_CONSENT_FOLDER_KEY, 'workspace-build-consent-v1')
assert.match(CHAT_WORKSPACE_CONSENT_CAPS_COPY, /≤20 files/)
assert.match(CHAT_WORKSPACE_CONSENT_CAPS_COPY, /100KB/)
assert.match(CHAT_WORKSPACE_CONSENT_CAPS_COPY, /512KB/)

// Write-capable only for harness + Agent
assert.equal(
  isWorkspaceWriteCapableTurn({ harnessOn: true, composerMode: 'agent' }),
  true,
)
assert.equal(
  isWorkspaceWriteCapableTurn({ harnessOn: false, composerMode: 'agent' }),
  false,
  'Agent without harness is not write-capable',
)
assert.equal(
  isWorkspaceWriteCapableTurn({ harnessOn: true, composerMode: 'ask' }),
  false,
  'Ask stays read-only',
)
assert.equal(
  isWorkspaceWriteCapableTurn({ harnessOn: true, composerMode: 'plan' }),
  false,
  'Plan stays read-only',
)

// Sync consent states
assert.deepEqual(
  evaluateWorkspaceBuildConsentSync({
    harnessOn: true,
    composerMode: 'ask',
  }),
  { ok: true, via: 'not-write-capable' },
)

assert.deepEqual(
  evaluateWorkspaceBuildConsentSync({
    harnessOn: true,
    composerMode: 'agent',
    lsConsent: false,
  }),
  { ok: false, via: 'blocked' },
)

assert.deepEqual(
  evaluateWorkspaceBuildConsentSync({
    harnessOn: true,
    composerMode: 'agent',
    lsConsent: true,
  }),
  { ok: true, via: 'ls-consent' },
)

// localStorage round-trip (jsdom-less Node: provide a tiny shim)
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
}

writeWorkspaceLsConsent(false)
assert.equal(readWorkspaceLsConsent(), false)
assert.equal(localStorage.getItem(CHAT_WORKSPACE_LS_CONSENT_KEY), '0')
writeWorkspaceLsConsent(true)
assert.equal(readWorkspaceLsConsent(), true)
assert.equal(localStorage.getItem(CHAT_WORKSPACE_LS_CONSENT_KEY), '1')

const asyncOk = await evaluateWorkspaceBuildConsent({
  harnessOn: true,
  composerMode: 'agent',
})
assert.equal(asyncOk.ok, true)
assert.equal(asyncOk.via, 'ls-consent')

writeWorkspaceLsConsent(false)
const asyncBlocked = await evaluateWorkspaceBuildConsent({
  harnessOn: true,
  composerMode: 'agent',
  localWorkspaceIds: [],
})
assert.equal(asyncBlocked.ok, false)
assert.equal(asyncBlocked.via, 'blocked')

const askOk = await evaluateWorkspaceBuildConsent({
  harnessOn: true,
  composerMode: 'ask',
})
assert.equal(askOk.via, 'not-write-capable')

// Runtime / UI wiring
const runtime = readFileSync(join(root, 'pages/chat/aui/ChatAuiRuntime.tsx'), 'utf8')
assert.match(runtime, /ensureWorkspaceBuildConsent|evaluateWorkspaceBuildConsent/)
assert.match(runtime, /workspaceBuildConsentOpen/)
assert.match(runtime, /acceptWorkspaceLsConsent/)
assert.match(runtime, /notifyWorkspaceFolderBound/)
assert.match(
  runtime,
  /pendingAfterConsentRef[\s\S]*kind: 'build'/,
  'Build stores pending action until consent',
)
assert.match(
  runtime,
  /buildFromPlan[\s\S]*evaluateWorkspaceBuildConsent[\s\S]*harnessOn:\s*true/,
  'Build checks consent as Agent+harness',
)

const page = readFileSync(join(root, 'pages/chat/aui/ChatAuiPage.tsx'), 'utf8')
assert.match(page, /ChatWorkspaceBuildConsentGate/)
assert.match(page, /is-ws-consent-shake|is-ws-consent-pulse/)
assert.match(page, /consentHighlight/)

const gate = readFileSync(
  join(root, 'pages/chat/aui/ChatWorkspaceBuildConsentGate.tsx'),
  'utf8',
)
assert.match(gate, /Store in this browser \(localStorage\)/)
assert.match(gate, /Select local folder/)
assert.match(gate, /playChatDeepAvatarEmotionAudio/)
assert.match(gate, /mood:\s*'concern'/)
assert.match(gate, /soundEnabled:\s*true/, 'warning audible on first gate')
assert.match(gate, /CHAT_WORKSPACE_CONSENT_CAPS_COPY/)

const cssPage = readFileSync(join(root, 'pages/ChatPage.css'), 'utf8')
assert.match(cssPage, /ds-ws-consent-shake/)
assert.match(cssPage, /\.is-ws-consent-shake/)

const cssAui = readFileSync(join(root, 'pages/chat/aui/ChatAui.css'), 'utf8')
assert.match(cssAui, /\.aui-ws-consent-gate/)
assert.match(cssAui, /\.aui-ws-consent-gate-warning/)

const panel = readFileSync(join(root, 'components/ChatWorkspacePanel.tsx'), 'utf8')
assert.match(panel, /consentHighlight/)
assert.match(panel, /is-ws-consent-shake/)

console.log('chatWorkspaceConsent.smoke: ok')
