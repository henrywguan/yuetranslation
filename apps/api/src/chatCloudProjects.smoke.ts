/**
 * Offline smoke: chat cloud project sanitize / prune helpers.
 * Run: npx tsx apps/api/src/chatCloudProjects.smoke.ts
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { sanitizeCloudThread, sanitizeMoveBody } from './chatCloudProjects.js'

const here = dirname(fileURLToPath(import.meta.url))

const long = 'x'.repeat(20_000)
const thread = sanitizeCloudThread({
  id: 't1',
  title: 'Hello',
  updatedAt: 100,
  messages: [
    { id: 'u1', role: 'user', content: long, createdAt: 1 },
    {
      id: 'a1',
      role: 'assistant',
      content: 'hi',
      createdAt: 2,
      reasoning: 'think '.repeat(20_000),
      searchSteps: [{ kind: 'search' }],
    },
  ],
  workspace: { files: [{ id: 'f', path: 'a.ts', text: 'secret' }], updatedAt: 1 },
})
assert.ok(thread)
assert.equal(thread!.id, 't1')
assert.ok(thread!.messages[0]!.content.length <= 12_000 + 10)
assert.equal(thread!.workspace, undefined, 'harness workspace blobs stay device-local')
assert.ok(thread!.messages[1]!.reasoning, 'newest assistant keeps reasoning')

const stale = sanitizeCloudThread({
  id: 't2',
  title: 'Old',
  updatedAt: 1,
  messages: [
    ...Array.from({ length: 10 }, (_, i) => ({
      id: `a${i}`,
      role: 'assistant' as const,
      content: `m${i}`,
      createdAt: i,
      reasoning: `old-${i}`,
    })),
  ],
})
assert.ok(stale)
const withReasoning = stale!.messages.filter((m) => m.reasoning)
assert.ok(withReasoning.length <= 4, 'only newest assistants keep reasoning')

const bad = sanitizeMoveBody('proj_a', { project: { id: 'proj_b', title: 'X' }, threads: [] })
assert.ok('error' in bad)

const ok = sanitizeMoveBody('proj_a', {
  project: {
    id: 'proj_a',
    title: 'Harbor',
    memory: 'rules',
    threadIds: ['t1'],
    createdAt: 1,
    updatedAt: 2,
    overseerAgentId: 'agent_o',
  },
  agents: [
    {
      id: 'agent_o',
      projectId: 'proj_a',
      title: 'Overseer',
      status: 'idle',
      role: 'overseer',
      threadId: 't1',
      updatedAt: 2,
    },
  ],
  workspaces: [
    {
      id: 'ws1',
      kind: 'local',
      title: 'Disk',
      projectId: 'proj_a',
      createdAt: 1,
      updatedAt: 1,
      ref: 'should-not-sync-handle',
    },
    {
      id: 'ws2',
      kind: 'github',
      title: 'Repo',
      projectId: 'proj_a',
      createdAt: 1,
      updatedAt: 1,
      ref: 'owner/repo',
    },
  ],
  threads: [
    {
      id: 't1',
      title: 'Chat',
      updatedAt: 3,
      messages: [{ id: 'u', role: 'user', content: 'hi', createdAt: 1 }],
    },
  ],
})
assert.ok(!('error' in ok))
if (!('error' in ok)) {
  assert.equal(ok.project.title, 'Harbor')
  assert.equal(ok.threads.length, 1)
  const localWs = ok.payload.workspaces.find((w) => w.id === 'ws1')
  assert.equal(localWs?.ref, undefined, 'local folder handles are stripped')
  const gh = ok.payload.workspaces.find((w) => w.id === 'ws2')
  assert.equal(gh?.ref, 'owner/repo')
}

const routes = readFileSync(join(here, 'app.ts'), 'utf8')
assert.match(routes, /getChatCloudProjects/)
assert.match(routes, /postChatCloudProjectMove/)
assert.match(routes, /\/api\/chat\/cloud\/projects/)

const migration = readFileSync(
  join(here, '../../../supabase/migrations/049_chat_cloud_projects.sql'),
  'utf8',
)
assert.match(migration, /chat_cloud_projects/)
assert.match(migration, /chat_cloud_threads/)
assert.match(migration, /enable row level security/)
assert.match(migration, /auth\.uid\(\) = user_id/)

console.log('chatCloudProjects.smoke: ok')
