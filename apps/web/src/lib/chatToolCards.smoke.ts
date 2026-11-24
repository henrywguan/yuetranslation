/**
 * Offline smoke: inline tool cards + Wave A wiring.
 * Run: npx tsx apps/web/src/lib/chatToolCards.smoke.ts
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  buildToolCards,
  classifyToolStepKind,
  searchStepFromSandboxActivity,
  toolCardFromSearchStep,
  toolCardFromSandboxActivity,
} from './chatToolCards.js'
import { cycleChatComposerMode } from './chatUiPrefs.js'
import { diffsFromGitOutput, splitUnifiedDiffByPath, snapshotAsPatchPreview } from './chatReviewActivity.js'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..')

assert.equal(classifyToolStepKind('web_search'), 'search')
assert.equal(classifyToolStepKind('sandbox_write'), 'write')
assert.equal(classifyToolStepKind('sandbox_exec'), 'exec')

const searchCard = toolCardFromSearchStep(
  { kind: 'search', queries: ['jyutping tones'], snippet: 'tone 1 is high' },
  0,
)
assert.match(searchCard.label, /jyutping/)
assert.equal(searchCard.kind, 'search')

const writeCard = toolCardFromSandboxActivity(
  { kind: 'diff', path: 'apps/web/src/App.tsx', text: ' const x = 1\n', source: 'sandbox' },
  1,
)
assert.ok(writeCard)
assert.equal(writeCard!.kind, 'write')
assert.match(writeCard!.label, /App\.tsx/)

const step = searchStepFromSandboxActivity({
  kind: 'run',
  argv: ['git', 'status'],
  stdout: ' M App.tsx\n',
  exitCode: 0,
})
assert.ok(step)
assert.equal(step!.kind, 'sandbox_exec')

const cards = buildToolCards({
  searchSteps: [{ kind: 'search', queries: ['a'] }],
  streaming: true,
})
assert.equal(cards.length, 1)
assert.equal(cards[0]!.live, true)

assert.equal(cycleChatComposerMode('agent'), 'ask')
assert.equal(cycleChatComposerMode('ask'), 'plan')
assert.equal(cycleChatComposerMode('plan'), 'agent')

const unified = `diff --git a/foo.ts b/foo.ts
index 111..222 100644
--- a/foo.ts
+++ b/foo.ts
@@ -1 +1 @@
-old
+new
diff --git a/bar.ts b/bar.ts
--- a/bar.ts
+++ b/bar.ts
@@ -1 +1 @@
-a
+b
`
const split = splitUnifiedDiffByPath(unified)
assert.equal(split.size, 2)
assert.match(split.get('foo.ts') || '', /\+new/)
assert.match(split.get('bar.ts') || '', /\+b/)
assert.doesNotMatch(split.get('foo.ts') || '', /\+b/, 'per-file patches stay isolated')

const gitEntries = diffsFromGitOutput(unified)
assert.equal(gitEntries.length, 2)
assert.match(gitEntries.find((e) => e.path === 'foo.ts')?.text || '', /\+new/)
assert.doesNotMatch(gitEntries.find((e) => e.path === 'foo.ts')?.text || '', /\+b/)

assert.match(snapshotAsPatchPreview('notes.md', 'hello\n'), /\+hello/)

const thread = readFileSync(join(root, 'pages/chat/aui/ChatAuiThread.tsx'), 'utf8')
assert.match(thread, /ToolActivityCards|aui-tool-cards/, 'inline tool cards in thread')
assert.match(thread, /cycleChatComposerMode|Shift\+Tab/, 'Shift+Tab mode cycle')
assert.match(thread, /followUpQueue|queueFollowUp|aui-followups/, 'follow-up queue UI')
assert.match(thread, /is-queue|Queue/, 'Queue button while running')
assert.match(thread, /Queue a follow-up/, 'composer placeholder while busy')
assert.match(
  thread,
  /className=\{`aui-mode is-\$\{mode\}[\s\S]*?`\}\s*\n\s*aria-pressed=\{composerMode === mode\}\s*\n\s*title=\{/,
  'mode pills omit disabled={busy} (stay clickable while running)',
)

const runtime = readFileSync(join(root, 'pages/chat/aui/ChatAuiRuntime.tsx'), 'utf8')
assert.match(runtime, /searchStepFromSandboxActivity/, 'sandbox mirrored into tool cards')
assert.match(runtime, /followUpQueue|queueFollowUp/, 'runtime exposes follow-up queue')
assert.match(
  runtime,
  /busyRef\.current[\s\S]*queueFollowUp/,
  'onNew queues when a turn is already running',
)
assert.match(
  runtime,
  /Stop does not clear the queue|sends after this reply|auto-send/i,
  'queue behavior documented in session type or flush',
)
assert.match(
  runtime,
  /Claim before await|followUpQueueRef\.current = rest/,
  'follow-up flush claims head before send (no double-send)',
)
assert.match(
  runtime,
  /never mirror from render|Keep in sync only via queue helpers/,
  'follow-up ref is not overwritten each render',
)
assert.match(
  runtime,
  /Do NOT abort|background project\/thread streams must keep running/,
  'selectThread must not abort background project streams',
)
assert.match(
  runtime,
  /Switching threads keeps other threads|UI filters to active/,
  'switching threads keeps other threads’ follow-up queues',
)
assert.match(
  runtime,
  /abortByThreadRef|busyThreadIdsRef/,
  'per-thread AbortController + busy set for concurrent project runs',
)
assert.match(
  runtime,
  /threadId[\s\S]*enqueuePrompt\(head\.text, head\.threadId\)|enqueuePrompt\(head\.text, head\.threadId\)/,
  'flush sends to the queued item threadId (not whatever is active later)',
)
assert.match(
  runtime,
  /activeIdRef\.current !== head\.threadId/,
  'flush drops in-flight item if user left the thread',
)
assert.match(
  runtime,
  /followUpQueue\.filter\(\(x\) => x\.threadId === activeId\)/,
  'session exposes only active-thread follow-ups in UI',
)
assert.match(
  thread,
  /submitMode=\{busy \? 'none' : 'enter'\}|onKeyDown[\s\S]*queueFollowUp/,
  'Enter while busy queues via composer keydown',
)
assert.match(
  thread,
  /ds-chat-dictate[\s\S]*return|Mic \/ dictate/,
  'Shift+Tab skips mic/dictate',
)

const diffs = readFileSync(join(root, 'pages/chat/aui/ChatDiffsPanel.tsx'), 'utf8')
assert.match(diffs, /DiffPreview|aui-diff-line|snapshotAsPatchPreview/, 'diffs show real patch preview')
assert.match(
  diffs,
  /\{line \|\| ' '\}|\{show\.map/,
  'diff preview uses React text children (escaped)',
)

const runs = readFileSync(join(root, 'pages/chat/aui/ChatRunsPanel.tsx'), 'utf8')
assert.match(runs, /aui-run-toggle|No stdout/, 'runs expand with output substance')
assert.match(runs, /\{run\.stdout\}|\{run\.stderr\}/, 'runs stdout/stderr are React text (escaped)')
assert.doesNotMatch(diffs + runs, /dangerouslySetInnerHTML/, 'no raw HTML injection in Diffs/Runs')

const auiCss = readFileSync(join(root, 'pages/chat/aui/ChatAui.css'), 'utf8')
assert.match(auiCss, /\.aui-tool-card\b/, 'tool card styles')
assert.match(auiCss, /\.aui-followups\b/, 'follow-up queue styles')
assert.match(auiCss, /Phone soak|4\.5rem/, 'phone soak portrait shrink')
assert.match(auiCss, /max-height:\s*700px/, 'short desktop soak')
assert.match(auiCss, /\.aui-diff-line\.is-add/, 'diff add coloring')

console.log('chatToolCards.smoke: ok')
