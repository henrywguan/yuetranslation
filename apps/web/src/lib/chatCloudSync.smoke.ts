/**
 * Offline smoke: cloud project snapshot / merge helpers.
 * Run: npx tsx apps/web/src/lib/chatCloudSync.smoke.ts
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  buildCloudProjectSnapshot,
  mergeCloudThreadsIntoHistory,
} from './chatCloudSync.js'
import { createProject, emptyInboxState, setWorkspaceRef, createWorkspace } from './chatInbox.js'
import { CHAT_DEFERRED_FEATURES } from './chatDeferred.js'
import type { ChatThread } from './chatHistory.js'

const here = dirname(fileURLToPath(import.meta.url))

let { state, project } = createProject(emptyInboxState(), 'Cloud me')
state = {
  ...state,
  projects: state.projects.map((p) =>
    p.id === project.id ? { ...p, threadIds: ['t1', 't2'] } : p,
  ),
}
const { state: withWs, workspace } = createWorkspace(state, 'local', 'Disk', project.id)
state = setWorkspaceRef(withWs, workspace.id, 'fs-handle-opaque')

const threads: ChatThread[] = [
  {
    id: 't1',
    title: 'One',
    updatedAt: 10,
    messages: [{ id: 'u', role: 'user', content: 'hi', createdAt: 1 }],
  },
  {
    id: 't2',
    title: 'Two',
    updatedAt: 20,
    messages: [{ id: 'u2', role: 'user', content: 'yo', createdAt: 2 }],
  },
  {
    id: 'loose',
    title: 'Loose',
    updatedAt: 5,
    messages: [],
  },
]

const snap = buildCloudProjectSnapshot(state, project.id, threads)
assert.ok(snap)
assert.equal(snap!.threads.length, 2)
assert.ok(!snap!.threads.some((t) => t.id === 'loose'))
const localWs = snap!.workspaces.find((w) => w.id === workspace.id)
assert.equal(localWs?.ref, undefined, 'local folder refs stripped from snapshot')

const { threads: merged, changed } = mergeCloudThreadsIntoHistory(threads, [
  {
    id: 't1',
    title: 'One (newer)',
    updatedAt: 99,
    messages: [
      { id: 'u', role: 'user', content: 'hi', createdAt: 1 },
      { id: 'a', role: 'assistant', content: 'hello', createdAt: 2 },
    ],
  },
  {
    id: 't3',
    title: 'New from cloud',
    updatedAt: 50,
    messages: [],
  },
])
assert.equal(changed, true)
assert.equal(merged.find((t) => t.id === 't1')?.title, 'One (newer)')
assert.ok(merged.some((t) => t.id === 't3'))
assert.equal(merged.find((t) => t.id === 't2')?.title, 'Two')

// Stale remote must not overwrite newer local.
const { threads: kept } = mergeCloudThreadsIntoHistory(
  [{ id: 't1', title: 'Local new', updatedAt: 200, messages: [] }],
  [{ id: 't1', title: 'Remote old', updatedAt: 50, messages: [] }],
)
assert.equal(kept[0]?.title, 'Local new')

assert.ok(
  CHAT_DEFERRED_FEATURES.includes('supabase_cloud_thread_sync'),
  'full loose-thread sync still deferred',
)

const deferred = readFileSync(join(here, 'chatDeferred.ts'), 'utf8')
assert.match(deferred, /Project-scoped cloud move/, 'deferred note mentions project cloud sync')

const historyHdr = readFileSync(join(here, 'chatHistory.ts'), 'utf8')
assert.match(historyHdr, /Move project to cloud|chatCloudSync/, 'history header notes cloud move')

const syncSrc = readFileSync(join(here, 'chatCloudSync.ts'), 'utf8')
assert.match(syncSrc, /schedulePushCloudProject/)
assert.match(syncSrc, /startChatCloudProjectSync/)
assert.match(syncSrc, /hydrateChatCloudProjects/)

console.log('chatCloudSync.smoke: ok')
