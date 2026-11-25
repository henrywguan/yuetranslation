import assert from 'node:assert/strict'
import { emptyThread } from './chatHistory.js'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { unzipSync, zipSync } from 'fflate'
import {
  CHAT_PROMOTED_WS_REF_PREFIX,
  parsePromotedWorkspaceRef,
  promotedWorkspaceRef,
  suggestPromotedWorkspaceTitle,
} from './chatPromotedWorkspace.js'
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

assert.equal(
  suggestPromotedWorkspaceTitle({
    files: [
      { id: '1', path: 'Rainmeter Splash/preview.html', updatedAt: 1, text: '<h1/>' },
      { id: '2', path: 'Rainmeter Splash/skin.ini', updatedAt: 1, text: 'x' },
      { id: '3', path: 'Rainmeter Splash/notes.md', updatedAt: 1, text: 'y' },
    ],
    updatedAt: 1,
  }),
  'Rainmeter Splash',
)

assert.equal(promotedWorkspaceRef('ws_abc'), `${CHAT_PROMOTED_WS_REF_PREFIX}ws_abc`)
assert.equal(parsePromotedWorkspaceRef('files:ws_abc'), 'ws_abc')
assert.equal(parsePromotedWorkspaceRef('sbx_1'), null)

const enc = new TextEncoder()
const zipped = zipSync({
  'a/hello.txt': enc.encode('hi'),
  'a/bye.txt': enc.encode('bye'),
})
const unzipped = unzipSync(zipped)
assert.equal(new TextDecoder().decode(unzipped['a/hello.txt']!), 'hi')

const here = dirname(fileURLToPath(import.meta.url))
const panel = readFileSync(join(here, '../components/ChatWorkspacePanel.tsx'), 'utf8')
assert.match(panel, /Download all as zip|IcZip|aria-label=\{label\}/, 'panel icon toolbar')
assert.match(panel, /Save to Workspaces/, 'panel promote to Inbox Workspaces')
assert.match(panel, /ds-chat-workspace-resize/, 'panel resize handle')
assert.match(panel, /Expand preview|IcExpand/, 'HTML fullscreen preview')
assert.match(panel, /htmlNeedsOptInPreview|Render HTML preview|agentBusy/, 'large HTML defer iframe')
assert.match(panel, /HTML_AUTO_PREVIEW_MAX_CHARS|showHtmlIframe/, 'scripted HTML not auto-iframe')
assert.match(panel, /previewMime[\s\S]*markdown|showMarkdownRendered/, 'md previewMime + rendered branch')
assert.match(panel, /renderChatMarkdown/, 'workspace md uses chat markdown pipeline')
assert.match(panel, /mdShowSource|Edit source|Show preview/, 'md source/preview toggle')
assert.match(panel, /ds-chat-workspace-md/, 'md preview container class')
assert.match(panel, /enablePlanTasks/, 'Plan/Tasks tabs gated')
assert.match(panel, /is-readonly/, 'path is read-only text')
assert.match(panel, /is-riced|Riced desktop/, 'riced desktop files view')
assert.match(panel, /scheduleOpen|Scheduled/, 'collapsible schedule')
assert.match(panel, /ds-chat-workspace-tasks/, 'Tasks tab')
assert.match(panel, /ds-chat-workspace-plan/, 'Plan tab')

const css = readFileSync(join(here, '../pages/ChatPage.css'), 'utf8')
assert.match(css, /--ds-workspace-w/, 'resizable workspace CSS var')
assert.match(css, /\.ds-chat-workspace-resize/, 'workspace resize styles')
assert.match(css, /preview-overlay/, 'fullscreen HTML overlay')
assert.match(css, /\.ds-chat-workspace-md/, 'workspace markdown preview styles')
assert.match(css, /\.ds-chat-workspace-tabs/, 'workspace tab strip')
assert.match(css, /\.ds-chat-workspace-icon-btn/, 'icon toolbar styles')
assert.match(css, /\.ds-chat-workspace-files\.is-riced/, 'riced desktop styles')
assert.match(css, /\.ds-chat-workspace-schedule-toggle/, 'collapsible schedule styles')

console.log('chatWorkspace.smoke: ok')
