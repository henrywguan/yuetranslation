/**
 * Offline smoke for empty-final recovery when Agent tools already wrote files.
 * Run: npx tsx apps/api/src/deepseekChatWorkRecovery.smoke.ts
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  normalizeWorkRecoveryPaths,
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

const harnessSrc = readFileSync(
  path.resolve(path.dirname(fileURLToPath(import.meta.url)), './deepseekChatHarness.ts'),
  'utf8',
)
assert.match(harnessSrc, /summarizeHarnessToolWork/, 'Harness synthesizes empty-final recovery')
assert.match(harnessSrc, /writtenWorkspacePaths/, 'Harness tracks workspace writes for recovery')

const routes = readFileSync(
  path.resolve(path.dirname(fileURLToPath(import.meta.url)), './deepseekChatRoutes.ts'),
  'utf8',
)
assert.match(routes, /summarizeHarnessToolWork/, 'Routes recover empty full when tools landed')
assert.match(routes, /workspacePathsSeen/, 'Routes track workspace SSE for empty recovery')
const emptyIdx = routes.indexOf("error: 'Empty model reply.'")
const recoveryIdx = routes.indexOf('summarizeHarnessToolWork')
assert.ok(recoveryIdx >= 0 && emptyIdx > recoveryIdx, 'Work recovery runs before Empty model reply error')

console.log('deepseekChatWorkRecovery.smoke: ok')
