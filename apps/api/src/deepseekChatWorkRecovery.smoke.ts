/**
 * Offline smoke for empty-final recovery when Agent tools already wrote files.
 * Run: npx tsx apps/api/src/deepseekChatWorkRecovery.smoke.ts
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  isNoSummaryAgentStub,
  looksLikeBuildOrViewRequest,
  normalizeWorkRecoveryPaths,
  pathFromSandboxActivity,
  summarizeEmptyContinueRecovery,
  summarizeHarnessToolWork,
} from './deepseekChatWorkRecovery.js'

assert.deepEqual(normalizeWorkRecoveryPaths(['a.md', 'a.md', ' ./b.md ']), ['a.md', 'b.md'])

const rainmeter = summarizeHarnessToolWork({
  workspacePaths: [
    'ws Splash/Notes/Notes.ini',
    'wallpaper.svg',
    'preview.html',
    'Notes.txt',
  ],
  toolsUsed: true,
})
assert.match(rainmeter, /Done — wrote 4 workspace files/)
assert.match(rainmeter, /wallpaper\.svg/)
assert.match(rainmeter, /Diffs \/ Workspace/)
assert.equal(
  summarizeHarnessToolWork({ workspacePaths: [], toolsUsed: false }),
  '',
  'no work → no recovery text',
)
assert.match(
  summarizeHarnessToolWork({ imageCount: 2, toolsUsed: true }),
  /generated 2 images/,
)
assert.match(
  summarizeHarnessToolWork({ toolsUsed: true }),
  /no final summary/,
)

assert.equal(
  pathFromSandboxActivity({ kind: 'diff', path: './splash/index.html', source: 'sandbox' }),
  'splash/index.html',
)
assert.equal(pathFromSandboxActivity({ kind: 'pr', reviewUrl: 'https://x' }), null)

assert.equal(
  isNoSummaryAgentStub(
    'Done — tools finished this turn, but the model returned no final summary. Ask me to continue or describe what you want next.',
  ),
  true,
)
assert.equal(
  looksLikeBuildOrViewRequest('continue and build out the website so I can view it'),
  true,
)
assert.equal(looksLikeBuildOrViewRequest('open the settings page'), false)
assert.match(
  summarizeEmptyContinueRecovery({ userAskedBuildOrView: true }),
  /index\.html/,
)

const harnessSrc = readFileSync(
  path.resolve(path.dirname(fileURLToPath(import.meta.url)), './deepseekChatHarness.ts'),
  'utf8',
)
assert.match(harnessSrc, /summarizeHarnessToolWork/, 'Harness synthesizes empty-final recovery')
assert.match(harnessSrc, /writtenWorkspacePaths/, 'Harness tracks workspace writes for recovery')
assert.match(harnessSrc, /pathFromSandboxActivity/, 'Harness records sandbox write paths')
assert.match(harnessSrc, /EMPTY_BUILD_VIEW_NUDGE|empty-build-view/, 'Harness nudges build/view writes')
assert.match(
  harnessSrc,
  /summarizeEmptyContinueRecovery/,
  'Harness recovers Continue empty before throw',
)
assert.match(
  harnessSrc,
  /summarizeHarnessToolWork[\s\S]*Empty model reply/,
  'generateDeepseekChatHarnessReply recovers before Empty model reply throw',
)

const routes = readFileSync(
  path.resolve(path.dirname(fileURLToPath(import.meta.url)), './deepseekChatRoutes.ts'),
  'utf8',
)
assert.match(routes, /summarizeHarnessToolWork/, 'Routes recover empty full when tools landed')
assert.match(routes, /workspacePathsSeen/, 'Routes track workspace SSE for empty recovery')
assert.match(routes, /pathFromSandboxActivity/, 'Routes record sandbox paths into recovery')
assert.match(routes, /summarizeEmptyContinueRecovery/, 'Routes recover Continue empty')
const emptyIdx = routes.indexOf("error: 'Empty model reply.'")
const recoveryIdx = routes.indexOf('summarizeHarnessToolWork')
assert.ok(recoveryIdx >= 0 && emptyIdx > recoveryIdx, 'Work recovery runs before Empty model reply error')

console.log('deepseekChatWorkRecovery.smoke: ok')
