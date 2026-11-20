/**
 * Offline smoke: Phase 3 Diffs / Runs helpers + AUI review rail wiring.
 * Run: npx tsx apps/web/src/lib/chatReview.smoke.ts
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  applySandboxActivity,
  applyWorkspaceFilesToDiffs,
  diffsFromGitOutput,
  emptyReviewActivity,
  formatArgv,
  mergeGitDiffs,
  shouldShowReviewRail,
} from './chatReviewActivity.js'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..')

let act = emptyReviewActivity()
assert.equal(act.diffs.length, 0)
assert.equal(act.runs.length, 0)

act = applySandboxActivity(act, {
  kind: 'diff',
  path: 'apps/web/src/App.tsx',
  text: 'export const x = 1\n',
  source: 'sandbox',
})
assert.equal(act.diffs.length, 1)
assert.equal(act.diffs[0]?.path, 'apps/web/src/App.tsx')

act = applySandboxActivity(act, {
  kind: 'diff',
  path: 'apps/web/src/App.tsx',
  text: 'export const x = 2\n',
  source: 'sandbox',
})
assert.equal(act.diffs.length, 1, 'same path replaces prior diff')
assert.match(act.diffs[0]?.text || '', /x = 2/)

act = applySandboxActivity(act, {
  kind: 'run',
  argv: ['git', 'status', '--short'],
  stdout: ' M App.tsx\n',
  exitCode: 0,
  ok: true,
})
assert.equal(act.runs.length, 1)
assert.equal(formatArgv(['git', 'diff', 'my file.ts']), 'git diff "my file.ts"')

act = applySandboxActivity(act, {
  kind: 'pr',
  reviewUrl: 'https://github.com/henrywguan/yuetranslation/pull/784',
})
assert.match(act.reviewUrl || '', /pull\/784/)

act = applyWorkspaceFilesToDiffs(act, [{ path: 'notes.md', text: '# hi' }])
assert.ok(act.diffs.some((d) => d.path === 'notes.md' && d.source === 'workspace'))

const gitStdout =
  'diff --git a/foo.ts b/foo.ts\n+++ b/foo.ts\n--- a/foo.ts\n+const a = 1\n'
const gitDiffs = diffsFromGitOutput(gitStdout)
assert.ok(gitDiffs.some((d) => d.path === 'foo.ts' && d.source === 'git'))

act = mergeGitDiffs(emptyReviewActivity(), gitStdout)
assert.ok(act.diffs.length >= 1)

assert.equal(
  shouldShowReviewRail({
    activity: emptyReviewActivity(),
    hasBoundWorkspace: false,
    hasInReview: false,
  }),
  false,
)
assert.equal(
  shouldShowReviewRail({
    activity: emptyReviewActivity(),
    hasBoundWorkspace: true,
    hasInReview: false,
  }),
  true,
)
assert.equal(
  shouldShowReviewRail({
    activity: act,
    hasBoundWorkspace: false,
    hasInReview: false,
  }),
  true,
)

const page = readFileSync(join(root, 'pages/chat/aui/ChatAuiPage.tsx'), 'utf8')
assert.match(page, /ChatReviewRail/, 'AUI shell mounts review rail')
assert.match(page, /has-review/, 'shell marks review layout')
assert.match(page, /shouldShowReviewRail/, 'visibility gated on workspace/PR/activity')
assert.match(
  readFileSync(join(root, 'pages/chat/inbox/InboxSettingsMenu.tsx'), 'utf8'),
  /Classic chat UI/,
  'Classic toggle preserved in Inbox settings',
)

const rail = readFileSync(join(root, 'pages/chat/aui/ChatReviewRail.tsx'), 'utf8')
assert.match(rail, /ChatDiffsPanel/, 'rail hosts diffs')
assert.match(rail, /ChatRunsPanel/, 'rail hosts runs')

const diffs = readFileSync(join(root, 'pages/chat/aui/ChatDiffsPanel.tsx'), 'utf8')
assert.match(diffs, /Open PR|reviewUrl/, 'diffs surface PR CTA')
assert.match(diffs, /git diff/, 'diffs can refresh via git')

const runs = readFileSync(join(root, 'pages/chat/aui/ChatRunsPanel.tsx'), 'utf8')
assert.match(runs, /formatArgv|aui-run/, 'runs show exec argv')

const runtime = readFileSync(join(root, 'pages/chat/aui/ChatAuiRuntime.tsx'), 'utf8')
assert.match(runtime, /onSandbox/, 'runtime consumes sandbox SSE')
assert.match(runtime, /reviewActivity/, 'session exposes review activity')
assert.match(runtime, /refreshGitDiff|execChatSandbox/, 'git diff refresh wired')

const api = readFileSync(join(here, 'api.ts'), 'utf8')
assert.match(api, /onSandbox/, 'stream client handles sandbox events')
assert.match(api, /execChatSandbox/, 'web API can exec sandbox for review')

const harness = readFileSync(
  join(root, '../../api/src/deepseekChatHarness.ts'),
  'utf8',
)
assert.match(harness, /onSandboxActivity|kind: 'sandbox'/, 'harness yields sandbox events')

const tools = readFileSync(join(root, '../../api/src/deepseekChatTools.ts'), 'utf8')
assert.match(tools, /onSandboxActivity/, 'tools emit sandbox activity')

const auiCss = readFileSync(join(root, 'pages/chat/aui/ChatAui.css'), 'utf8')
assert.match(auiCss, /\.aui-review-rail/, 'review rail styles')
assert.match(auiCss, /aui-rail-in|aui-count-pop/, 'intentional review motions')
assert.match(
  auiCss,
  /\.aui-composer[\s\S]*linear-gradient/,
  'composer uses DeepSeek luxury gradient surface',
)
assert.doesNotMatch(auiCss, /is-stock|ChatAuiStock/, 'no stock chrome return')

const chatCss = readFileSync(join(root, 'pages/ChatPage.css'), 'utf8')
assert.match(chatCss, /--ds-chat-top-h/, 'topbar height token for sheet clearance')
assert.match(
  chatCss,
  /\.ds-chat-workspace\.is-sheet\s*\{[^}]*top:\s*var\(--ds-chat-top-h\)/s,
  'Harness is-sheet leaves topbar (Δ) uncovered',
)
assert.match(
  runtime,
  /if \(on\) setWorkspaceOpenState\(false\)/,
  'opening Diffs/Runs auto-closes Harness workspace',
)

const shell = readFileSync(join(root, 'pages/chat/inbox/InboxShell.tsx'), 'utf8')
assert.match(shell, /ProjectCreateWizard/, 'project create uses wizard')
assert.match(shell, /workspace.*internal|opts\.workspace/, 'wizard binds workspace')
assert.doesNotMatch(shell, /ProjectDraftPanel/, 'no name-only draft panel')

const wizard = readFileSync(join(root, 'pages/chat/inbox/ProjectCreateWizard.tsx'), 'utf8')
assert.match(wizard, /Internal sandbox|Local folder|GitHub repo/, 'wizard workspace choices')
assert.match(wizard, /Name/, 'wizard requires name')

console.log('chatReview.smoke: ok')
