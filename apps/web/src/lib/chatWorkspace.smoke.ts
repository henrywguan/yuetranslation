import assert from 'node:assert/strict'
import { emptyThread } from './chatHistory.js'
import {
  CHAT_HARNESS_FLAG_KEY,
  CHAT_WORKSPACE_MAX_FILES,
  CHAT_WORKSPACE_MAX_TEXT_CHARS,
  ensureThreadWorkspace,
  normalizeWorkspacePath,
  pruneWorkspace,
  seedWorkspaceFromThread,
  upsertWorkspaceFile,
  workspaceWirePayload,
} from './chatWorkspace.js'

assert.equal(normalizeWorkspacePath('../etc/passwd'), '')
assert.equal(normalizeWorkspacePath('/notes/a.md'), 'notes/a.md')
assert.equal(normalizeWorkspacePath('./foo/bar.txt'), 'foo/bar.txt')

let ws = upsertWorkspaceFile(undefined, { path: 'notes/a.md', text: 'hello' })
assert.equal(ws.files.length, 1)
assert.equal(ws.files[0]!.text, 'hello')

const huge = 'x'.repeat(CHAT_WORKSPACE_MAX_TEXT_CHARS + 50)
ws = upsertWorkspaceFile(ws, { path: 'notes/a.md', text: huge })
assert.equal(ws.files[0]!.text!.length, CHAT_WORKSPACE_MAX_TEXT_CHARS)

for (let i = 0; i < CHAT_WORKSPACE_MAX_FILES + 5; i += 1) {
  ws = upsertWorkspaceFile(ws, { path: `f/${i}.txt`, text: `n${i}` })
}
const pruned = pruneWorkspace(ws)!
assert.ok(pruned.files.length <= CHAT_WORKSPACE_MAX_FILES)

const thread = emptyThread()
thread.messages = [
  {
    id: 'u1',
    role: 'user',
    content: 'hi',
    createdAt: 1,
    files: [{ fileId: 'file-api-1', filename: 'doc.txt', mime: 'text/plain' }],
  },
  {
    id: 'a1',
    role: 'assistant',
    content: 'Here\n\n```html\n<h1>Hi</h1>\n```\n',
    createdAt: 2,
  },
]
const seeded = seedWorkspaceFromThread(thread)
assert.ok(seeded.files.some((f) => f.path.startsWith('uploads/')))
assert.ok(seeded.files.some((f) => f.path.includes('artifacts')))

const ensured = ensureThreadWorkspace(emptyThread())
assert.ok(ensured.workspace)

const wire = workspaceWirePayload(seeded)
assert.ok(wire?.files.length)

assert.equal(CHAT_HARNESS_FLAG_KEY, 'yue-deepseek-chat-harness-v1')

console.log('chatWorkspace.smoke: ok')
