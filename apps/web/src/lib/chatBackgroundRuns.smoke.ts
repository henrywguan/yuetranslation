/**
 * Offline smoke: #/chat project/thread streams keep running when the view switches.
 * Run: npx tsx apps/web/src/lib/chatBackgroundRuns.smoke.ts
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const runtime = readFileSync(join(here, '../pages/chat/aui/ChatAuiRuntime.tsx'), 'utf8')

assert.match(
  runtime,
  /abortByThreadRef\s*=\s*useRef<Map<string,\s*AbortController>>/,
  'per-thread AbortController map',
)
assert.match(
  runtime,
  /busyThreadIdsRef\s*=\s*useRef<Set<string>>/,
  'per-thread busy set for concurrent runs',
)
assert.match(
  runtime,
  /streamUiByThreadRef/,
  'per-thread stream chrome so Working/progress restores on return',
)

const selectFn = runtime.slice(runtime.indexOf('const selectThread = useCallback'))
assert.match(
  selectFn,
  /Do NOT abort|background project\/thread streams must keep running/,
  'selectThread documents no-abort on switch',
)
assert.doesNotMatch(
  selectFn.slice(0, selectFn.indexOf('const removeThread')),
  /stopGeneration\(/,
  'selectThread must not call stopGeneration',
)

assert.match(
  runtime,
  /stopGeneration\s*=\s*useCallback\(\s*\(threadId\?: string\)/,
  'stopGeneration accepts optional threadId (Stop targets correct thread)',
)

const startNew = runtime.slice(runtime.indexOf('const startNewChat = useCallback'))
assert.match(
  startNew.slice(0, startNew.indexOf('const selectThread')),
  /stopGeneration\(prevId\)|Abort-of-self only/,
  'New chat aborts previous active thread only',
)

const removeFn = runtime.slice(runtime.indexOf('const removeThread = useCallback'))
assert.match(
  removeFn.slice(0, removeFn.indexOf('const archiveThread')),
  /stopGeneration\(id\)/,
  'delete-thread aborts that thread only',
)

assert.match(
  runtime,
  /overseerTid && busyThreadIdsRef\.current\.has\(overseerTid\)/,
  'project-message flush waits on Overseer thread busy, not active tab',
)
assert.match(
  runtime,
  /busyEpoch/,
  'any-thread settle wakes project flush / busy epoch',
)

const flushBlock = runtime.slice(
  runtime.indexOf('// Flush Overseer project_message'),
  runtime.indexOf('const onNew = useCallback'),
)
assert.match(
  flushBlock,
  /pendingProjectMsgsRef\.current\[0\]/,
  'flush peeks head — does not shift before send succeeds',
)
assert.match(
  flushBlock,
  /if \(isThreadBusy\(threadId\)\) break/,
  'flush waits when worker thread is busy (no dropped messages)',
)
assert.match(
  flushBlock,
  /if \(sent\)[\s\S]*shift\(\)[\s\S]*continue[\s\S]*leave the head for the next busyEpoch/,
  'flush only shifts on success; failed send keeps head unless consent owns it',
)
assert.match(
  flushBlock,
  /settleIfIdle:\s*pendingProjectMsgsRef\.current\.length === 0/,
  'chain settle only when flush queue is empty',
)

assert.match(
  runtime,
  /isThreadBusy\(targetThreadId\)[\s\S]*Wait for the current reply to finish, then Build/,
  'Build gates on target Overseer thread busy, not only active tab',
)

console.log('chatBackgroundRuns.smoke: ok')
