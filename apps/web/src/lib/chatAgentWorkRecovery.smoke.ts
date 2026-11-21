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
  normalizeAgentWorkRecoveryPaths,
  summarizeAgentToolWork,
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

assert.equal(isEmptyAgentReplyRecoverableError('Empty model reply.'), true)
assert.equal(isEmptyAgentReplyRecoverableError('No reply — try again.'), true)
assert.equal(
  isEmptyAgentReplyRecoverableError(
    'Reply stalled (no progress for too long — often Image / tools). Tap Stop working, then Send again or Continue.',
  ),
  true,
)
assert.equal(isEmptyAgentReplyRecoverableError('Rate limited'), false)

const runtime = readFileSync(join(here, '../pages/chat/aui/ChatAuiRuntime.tsx'), 'utf8')
assert.match(runtime, /summarizeAgentToolWork/, 'AUI recovers empty reply when tools landed')
assert.match(runtime, /workspacePathsThisTurn/, 'AUI tracks workspace writes this turn')
assert.match(
  runtime,
  /summarizeAgentToolWork[\s\S]*No reply/,
  'AUI prefers work recovery before No reply',
)

const classic = readFileSync(join(here, '../pages/ChatPage.tsx'), 'utf8')
assert.match(classic, /summarizeAgentToolWork/, 'Classic recovers empty reply when tools landed')
assert.match(classic, /workspacePathsThisTurn/, 'Classic tracks workspace writes this turn')

const streamSmoke = readFileSync(join(here, 'chatStream.smoke.ts'), 'utf8')
assert.match(
  streamSmoke,
  /summarizeAgentToolWork|recoverEmptyFromWork|workspacePathsThisTurn/,
  'Stream smoke aware of recovery path',
)

console.log('chatAgentWorkRecovery.smoke: ok')
