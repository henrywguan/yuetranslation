/**
 * Offline smoke: empty Agent reply recovery when workspace/tools already landed.
 * Run: npx tsx apps/web/src/lib/chatAgentWorkRecovery.smoke.ts
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  agentTurnHadUsefulWork,
  isEmptyAgentReplyRecoverableError,
  isEmptyModelReplyError,
  isNoSummaryAgentStub,
  looksLikeBuildOrViewRequest,
  normalizeAgentWorkRecoveryPaths,
  pathFromSandboxActivity,
  summarizeAgentToolWork,
  summarizeEmptyContinueRecovery,
} from './chatAgentWorkRecovery.js'

const here = dirname(fileURLToPath(import.meta.url))

assert.deepEqual(normalizeAgentWorkRecoveryPaths(['a.md', 'a.md', './b.md']), ['a.md', 'b.md'])

const henry = summarizeAgentToolWork({
  workspacePaths: [
    'ws Splash/Notes/Notes.ini',
    'wallpaper.svg',
    'preview.html',
    'Notes.txt',
  ],
})
assert.match(henry, /Done — wrote 4 workspace files/)
assert.match(henry, /Notes\.ini/)
assert.equal(agentTurnHadUsefulWork({ workspacePaths: ['a.md'] }), true)
assert.equal(agentTurnHadUsefulWork({}), false)

assert.equal(
  pathFromSandboxActivity({ kind: 'diff', path: 'index.html', source: 'sandbox' }),
  'index.html',
)
assert.equal(pathFromSandboxActivity({ kind: 'run', argv: ['ls'] }), null)

assert.equal(
  isNoSummaryAgentStub(
    'Done — tools finished this turn, but the model returned no final summary. Ask me to continue…',
  ),
  true,
)
assert.equal(isNoSummaryAgentStub('Done — wrote 1 workspace file'), false)

assert.equal(
  looksLikeBuildOrViewRequest('continue and build the website so he can view it'),
  true,
)
assert.equal(looksLikeBuildOrViewRequest('what is the weather?'), false)
assert.equal(
  looksLikeBuildOrViewRequest('open the settings page'),
  false,
  'ordinary open+page must not trigger build/view recovery',
)

const continueBubble = summarizeEmptyContinueRecovery({
  priorWasNoSummaryStub: true,
  userAskedBuildOrView: true,
})
assert.match(continueBubble, /empty completion/i)
assert.match(continueBubble, /index\.html/)

assert.equal(isEmptyAgentReplyRecoverableError('Empty model reply.'), true)
assert.equal(isEmptyAgentReplyRecoverableError('No reply — try again.'), true)
assert.equal(
  isEmptyAgentReplyRecoverableError(
    'Reply stalled (no progress for too long — often Image / tools). Tap Stop working, then Send again or Continue.',
  ),
  true,
)
assert.equal(isEmptyAgentReplyRecoverableError('Rate limited'), false)
assert.equal(isEmptyModelReplyError('Empty model reply.'), true)
assert.equal(
  isEmptyModelReplyError(
    'Reply stalled (no progress for too long — often Image / tools). Tap Stop working, then Send again or Continue.',
  ),
  false,
  'stall banners must not be replaced by Continue bubbles',
)

const runtime = readFileSync(join(here, '../pages/chat/aui/ChatAuiRuntime.tsx'), 'utf8')
assert.match(runtime, /summarizeAgentToolWork/, 'AUI recovers empty reply when tools landed')
assert.match(runtime, /workspacePathsThisTurn/, 'AUI tracks workspace writes this turn')
assert.match(runtime, /pathFromSandboxActivity/, 'AUI records sandbox write paths for recovery')
assert.match(runtime, /summarizeEmptyContinueRecovery/, 'AUI recovers empty Continue after stub')
assert.match(
  runtime,
  /summarizeAgentToolWork[\s\S]*No reply/,
  'AUI prefers work recovery before No reply',
)
assert.match(runtime, /isEmptyModelReplyError/, 'AUI gates Continue bubbles vs stall banners')
assert.match(
  runtime,
  /priorWasNoSummaryStub \|\| userAskedBuildOrView/,
  'AUI last-resort Continue uses real prior/build flags (not hardcoded stub)',
)

const classic = readFileSync(join(here, '../pages/ChatPage.tsx'), 'utf8')
assert.match(classic, /summarizeAgentToolWork/, 'Classic recovers empty reply when tools landed')
assert.match(classic, /workspacePathsThisTurn/, 'Classic tracks workspace writes this turn')
assert.match(classic, /pathFromSandboxActivity/, 'Classic records sandbox write paths')
assert.match(classic, /summarizeEmptyContinueRecovery/, 'Classic recovers empty Continue')

const streamSmoke = readFileSync(join(here, 'chatStream.smoke.ts'), 'utf8')
assert.match(
  streamSmoke,
  /summarizeAgentToolWork|recoverEmptyFromWork|workspacePathsThisTurn/,
  'Stream smoke aware of recovery path',
)

console.log('chatAgentWorkRecovery.smoke: ok')
