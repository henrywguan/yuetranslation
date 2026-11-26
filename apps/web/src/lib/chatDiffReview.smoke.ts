/**
 * Offline smoke: Diff Keep / Reject / Commit helpers + Diffs panel wiring.
 * Run: npx tsx apps/web/src/lib/chatDiffReview.smoke.ts
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  applyHunkDecisionsToPatch,
  clearDiffDecision,
  countDiffDecisions,
  decisionLabel,
  diffDecisionFor,
  gitAddArgv,
  gitCheckoutHeadArgv,
  gitCommitArgv,
  gitRestoreArgv,
  gitStatusPathArgv,
  isNewFilePatch,
  looksLikeUnifiedDiff,
  pathsToStageForCommit,
  pendingDiffs,
  keptDiffs,
  rejectArgvAttempts,
  removeDiffPath,
  rmPathArgv,
  sanitizeCommitMessage,
  setDiffDecision,
  splitPatchHunks,
} from './chatDiffReview.js'
import {
  applySandboxActivity,
  emptyReviewActivity,
  mergeGitDiffs,
} from './chatReviewActivity.js'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..')

let act = emptyReviewActivity()
act = applySandboxActivity(act, {
  kind: 'diff',
  path: 'src/a.ts',
  text: 'export const a = 1\n',
  source: 'sandbox',
})
act = applySandboxActivity(act, {
  kind: 'diff',
  path: 'src/b.ts',
  text: 'export const b = 2\n',
  source: 'sandbox',
})
assert.equal(diffDecisionFor(act, 'src/a.ts'), 'pending')
assert.equal(countDiffDecisions(act).pending, 2)

act = setDiffDecision(act, 'src/a.ts', 'kept')
assert.equal(diffDecisionFor(act, 'src/a.ts'), 'kept')
assert.equal(decisionLabel('kept'), 'Kept')
assert.equal(keptDiffs(act).length, 1)
assert.equal(pendingDiffs(act).length, 1)
assert.deepEqual(pathsToStageForCommit(act), ['src/a.ts'])

act = setDiffDecision(act, 'src/b.ts', 'rejected')
assert.equal(countDiffDecisions(act).rejected, 1)
act = removeDiffPath(act, 'src/b.ts')
assert.ok(!act.diffs.some((d) => d.path === 'src/b.ts'))
assert.equal(act.decisions?.['src/b.ts'], undefined)

act = clearDiffDecision(act, 'src/a.ts')
assert.equal(diffDecisionFor(act, 'src/a.ts'), 'pending')

// Fresh write resets decision.
act = setDiffDecision(act, 'src/a.ts', 'kept')
act = applySandboxActivity(act, {
  kind: 'diff',
  path: 'src/a.ts',
  text: 'export const a = 9\n',
  source: 'sandbox',
})
assert.equal(diffDecisionFor(act, 'src/a.ts'), 'pending', 'rewrite clears Keep')

const unified =
  'diff --git a/foo.ts b/foo.ts\n' +
  '--- a/foo.ts\n' +
  '+++ b/foo.ts\n' +
  '@@ -1,2 +1,3 @@\n' +
  ' line1\n' +
  '-old\n' +
  '+new\n' +
  '+extra\n' +
  '@@ -10,1 +11,1 @@\n' +
  '-gone\n' +
  '+kept2\n'
assert.equal(looksLikeUnifiedDiff(unified), true)
assert.equal(looksLikeUnifiedDiff('+just a snapshot line'), false)
const hunks = splitPatchHunks(unified)
assert.equal(hunks.length, 2)
assert.match(hunks[0]!.header, /^@@/)

const bothKept = applyHunkDecisionsToPatch({ patch: unified, rejectIndexes: [] })
assert.equal(bothKept.ok, true)
if (bothKept.ok) {
  assert.match(bothKept.text, /new/)
  assert.match(bothKept.text, /extra/)
  assert.match(bothKept.text, /kept2/)
  assert.doesNotMatch(bothKept.text, /^old$/m)
}

const rejectFirst = applyHunkDecisionsToPatch({ patch: unified, rejectIndexes: [0] })
assert.equal(rejectFirst.ok, true)
if (rejectFirst.ok) {
  assert.match(rejectFirst.text, /old/)
  assert.doesNotMatch(rejectFirst.text, /^new$/m)
  assert.match(rejectFirst.text, /kept2/)
}

assert.equal(isNewFilePatch('--- /dev/null\n+++ b/x.ts\n@@\n+hi\n'), true)
assert.equal(isNewFilePatch(unified), false)

assert.deepEqual(gitAddArgv('a.ts'), ['git', 'add', '--', 'a.ts'])
assert.deepEqual(gitRestoreArgv('a.ts')[1], 'restore')
assert.deepEqual(gitCheckoutHeadArgv('a.ts').slice(0, 3), ['git', 'checkout', 'HEAD'])
assert.deepEqual(rmPathArgv('a.ts'), ['rm', '-f', '--', 'a.ts'])
assert.ok(gitCommitArgv('fix stuff').includes('-m'))
assert.ok(gitCommitArgv('fix stuff').includes('fix stuff'))
assert.deepEqual(gitStatusPathArgv('a.ts'), ['git', 'status', '--porcelain', '--', 'a.ts'])

const newAttempts = rejectArgvAttempts({
  path: 'new.ts',
  patchText: '--- /dev/null\n+++ b/new.ts\n',
})
assert.equal(newAttempts[0]![0], 'rm')

const modAttempts = rejectArgvAttempts({ path: 'old.ts', statusPorcelain: ' M old.ts' })
assert.equal(modAttempts[0]![1], 'restore')

assert.equal(sanitizeCommitMessage('  hello\r\nworld  '), 'hello\nworld')
assert.equal(sanitizeCommitMessage('x'.repeat(600)).length, 500)

// git refresh clears decisions for rewritten paths
act = setDiffDecision(emptyReviewActivity(), 'foo.ts', 'kept')
act = {
  ...act,
  diffs: [
    {
      id: 'd1',
      path: 'foo.ts',
      text: 'old',
      source: 'git',
      at: 1,
    },
  ],
}
act = mergeGitDiffs(
  act,
  'diff --git a/foo.ts b/foo.ts\n--- a/foo.ts\n+++ b/foo.ts\n@@\n+new\n',
)
assert.equal(diffDecisionFor(act, 'foo.ts'), 'pending', 'mergeGitDiffs clears Keep')

const diffsPanel = readFileSync(join(root, 'pages/chat/aui/ChatDiffsPanel.tsx'), 'utf8')
assert.match(diffsPanel, /onKeep|Keep/, 'Diffs panel exposes Keep')
assert.match(diffsPanel, /onReject|Reject/, 'Diffs panel exposes Reject')
assert.match(diffsPanel, /onCommit|Commit kept/, 'Diffs panel exposes Commit chrome')
assert.match(diffsPanel, /onRejectHunks|Apply hunk picks/, 'hunk picks wired')
assert.match(diffsPanel, /aui-diffs-commit/, 'commit form classes')

const rail = readFileSync(join(root, 'pages/chat/aui/ChatReviewRail.tsx'), 'utf8')
assert.match(rail, /onKeep=\{onKeep\}/, 'rail forwards Keep')
assert.match(rail, /onCommit=\{onCommit\}/, 'rail forwards Commit')

const runtime = readFileSync(join(root, 'pages/chat/aui/ChatAuiRuntime.tsx'), 'utf8')
assert.match(runtime, /keepDiff|rejectDiff|commitKeptDiffs/, 'runtime review actions')
assert.match(runtime, /rejectArgvAttempts|gitCommitArgv/, 'runtime uses review argv helpers')
assert.match(runtime, /diffReviewBusy/, 'runtime exposes review busy')

const page = readFileSync(join(root, 'pages/chat/aui/ChatAuiPage.tsx'), 'utf8')
assert.match(page, /onKeep=\{|keepDiff/, 'page wires Keep into rail')
assert.match(page, /commitKeptDiffs/, 'page wires Commit')

const api = readFileSync(join(here, 'api.ts'), 'utf8')
assert.match(api, /writeChatSandboxFile/, 'sandbox write available for hunk apply')
assert.match(api, /readChatSandboxFile/, 'sandbox read available')

const css = readFileSync(join(root, 'pages/chat/aui/ChatAui.css'), 'utf8')
assert.match(css, /\.aui-diffs-keep/, 'Keep button styles')
assert.match(css, /\.aui-diffs-reject/, 'Reject button styles')
assert.match(css, /\.aui-diffs-commit/, 'Commit chrome styles')
assert.match(css, /\.aui-diffs-hunk/, 'hunk chip styles')

console.log('chatDiffReview.smoke: ok')
