/**
 * Offline smoke: local folder bind helpers (Phase D).
 * Run: npx tsx apps/web/src/lib/chatLocalFolder.smoke.ts
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { unzipSync, zipSync } from 'fflate'
import {
  collectFromZipBytes,
  LOCAL_FOLDER_DB,
  localFolderCapabilities,
} from './chatLocalFolder'

const here = dirname(fileURLToPath(import.meta.url))
assert.equal(LOCAL_FOLDER_DB, 'yue-chat-local-folder-v1')

// Node has no window — capabilities should be falsey without throwing.
assert.deepEqual(localFolderCapabilities(), {
  showDirectoryPicker: false,
  webkitDirectory: false,
})

const zipped = zipSync({
  'README.md': new TextEncoder().encode('# hello'),
  'src/app.ts': new TextEncoder().encode('export const x = 1\n'),
  'node_modules/skip.js': new TextEncoder().encode('nope'),
  'bin/tool': new Uint8Array([0, 1, 2, 3]),
})
const files = collectFromZipBytes(zipped)
assert.ok(files.some((f) => f.path === 'README.md'))
assert.ok(files.some((f) => f.path === 'src/app.ts'))
assert.ok(!files.some((f) => f.path.includes('node_modules')))
assert.ok(!files.some((f) => f.path === 'bin/tool'))

// Round-trip sanity for fflate in this environment.
assert.ok(Object.keys(unzipSync(zipped)).includes('README.md'))

const root = join(here, '..')
const shell = readFileSync(join(root, 'pages/chat/inbox/InboxShell.tsx'), 'utf8')
assert.match(shell, /LocalFolderBind/, 'Inbox mounts local folder bind UI')
assert.match(shell, /kind === 'local'/, 'local workspace opens bind flow')

const bind = readFileSync(join(root, 'pages/chat/inbox/LocalFolderBind.tsx'), 'utf8')
assert.match(bind, /showDirectoryPicker|Choose folder/)
assert.match(bind, /Upload \.zip mirror/)
assert.match(bind, /webkitdirectory/)
// Empty folders must still bind (Agent write target) — soft tip only, no hard reject.
assert.doesNotMatch(
  bind,
  /if\s*\(\s*!files\.length\s*\)\s*\{[^}]*return/,
  'empty mirror must not early-return before onBound',
)
assert.match(bind, /Folder is empty|still connecting/, 'soft tip when nothing to mirror')
assert.match(
  bind,
  /empty folder ready for Agent writes|files show in Diffs/,
  'empty bind note does not stick as “0 files” forever',
)
assert.match(bind, /onBound\(/, 'bind completes via onBound')

assert.match(
  shell,
  /sandboxNoteIsEmptyBind|Agent wrote/,
  'Inbox clears empty-folder tip once Diffs/Workspace have files',
)

const api = readFileSync(join(here, 'api.ts'), 'utf8')
assert.match(api, /writeChatSandboxFile/, 'mirror writes via sandbox FS API')

console.log('chatLocalFolder.smoke: ok')
