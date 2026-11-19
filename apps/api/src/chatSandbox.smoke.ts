/**
 * Offline smoke: Chat Inbox sandbox stub driver (Phase C) — no Fly, no paid APIs.
 * Run: npx tsx apps/api/src/chatSandbox.smoke.ts
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  __resetSandboxSessionsForTests,
  flyConfigured,
  resolveSandboxDriver,
  resolveSandboxPath,
  SANDBOX_STUB_BINARIES,
} from './chatSandbox.js'
import { createSandboxSession, execSandbox, listSandboxFs, readSandboxFs, writeSandboxFs } from './chatSandboxService.js'
import { createStubSandbox, destroyStubSandbox, stubExec } from './chatSandboxStub.js'
import { resolveFlyCreds, saveChatPluginCredentials } from './deepseekChatPluginKeys.js'

__resetSandboxSessionsForTests()

assert.equal(resolveSandboxDriver('stub'), 'stub')
assert.equal(resolveSandboxDriver('fly'), 'fly')
assert.equal(resolveSandboxDriver(''), 'stub')
assert.equal(typeof flyConfigured(), 'boolean')

const root = '/tmp/yue-sandbox-test-root'
assert.equal(resolveSandboxPath(root, '../etc/passwd'), null)
assert.equal(resolveSandboxPath(root, 'ok/file.txt')?.endsWith(`${path.sep}ok${path.sep}file.txt`), true)

const session = await createStubSandbox({ userId: 'user_test', title: 'Smoke sandbox' })
assert.equal(session.driver, 'stub')
assert.equal(session.status, 'ready')
assert.ok(session.rootDir)

await writeSandboxFs(session, 'src/hi.js', 'console.log("hi")\n')
const text = await readSandboxFs(session, 'src/hi.js')
assert.match(text, /console\.log/)

const entries = await listSandboxFs(session, '.')
assert.ok(entries.some((e) => e.path === 'src/hi.js' || e.path.endsWith('hi.js')))

const blocked = await stubExec(session, ['curl', 'https://example.com'])
assert.equal(blocked.ok, false)
assert.match(blocked.stderr, /not allowlisted/i)

const pwd = await execSandbox(session, ['pwd'])
assert.equal(pwd.ok, true)
assert.ok(pwd.stdout.includes(session.rootDir!))

assert.ok(SANDBOX_STUB_BINARIES.has('node'))

const { session: viaFacade, fallbackFromFly } = await createSandboxSession({
  userId: 'user_test',
  driver: 'fly',
  title: 'Should fall back',
})
assert.equal(viaFacade.driver, 'stub')
assert.equal(fallbackFromFly, true)

await destroyStubSandbox(session)

const src = readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), 'chatSandboxRoutes.ts'), 'utf8')
assert.match(src, /Family or Business/)
assert.match(src, /postChatSandboxExec/)

const app = readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), 'app.ts'), 'utf8')
assert.match(app, /\/api\/chat\/sandbox/)

const tools = readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), 'deepseekChatTools.ts'), 'utf8')
assert.match(tools, /sandbox_exec/)
assert.match(tools, /DEEPSEEK_CHAT_SANDBOX_TOOLS/)

const envEx = readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), '../.env.example'), 'utf8')
assert.match(envEx, /YUE_SANDBOX_DRIVER/)
assert.match(envEx, /FLY_API_TOKEN/)
assert.match(envEx, /fly_app/)

const byoFly = await saveChatPluginCredentials('smoke-fly-byo', {
  fly: 'fo1_smoke_token',
  fly_app: 'smoke-app',
})
const flyRes = resolveFlyCreds(byoFly)
assert.ok(flyRes)
assert.equal(flyRes?.source, 'byo')
assert.equal(flyConfigured(byoFly), true)

const keysSrc = readFileSync(
  path.join(path.dirname(fileURLToPath(import.meta.url)), 'deepseekChatPluginKeys.ts'),
  'utf8',
)
assert.match(keysSrc, /'fly'/)
assert.match(keysSrc, /'fly_app'/)

console.log('chatSandbox.smoke: ok')
