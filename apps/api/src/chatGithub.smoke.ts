/**
 * Offline smoke: GitHub App gate + parse helpers (Phase E) — no live GitHub calls.
 * Run: npx tsx apps/api/src/chatGithub.smoke.ts
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  githubConfigured,
  githubStatus,
  parseGithubPrUrl,
  parseGithubRepo,
  suggestChatBranch,
} from './chatGithub.js'
import {
  resolveGithubAppCreds,
  saveChatPluginCredentials,
} from './deepseekChatPluginKeys.js'

assert.equal(typeof githubConfigured(), 'boolean')
const status = githubStatus()
assert.equal(status.prefer, 'github_app')
assert.equal(status.needsHuman, !status.configured)
assert.match(status.message, /GitHub/)

assert.deepEqual(parseGithubRepo('henrywguan/yuetranslation'), {
  owner: 'henrywguan',
  repo: 'yuetranslation',
})
assert.deepEqual(parseGithubRepo('https://github.com/henrywguan/yuetranslation.git'), {
  owner: 'henrywguan',
  repo: 'yuetranslation',
})
assert.equal(parseGithubRepo('not a repo'), null)
assert.deepEqual(parseGithubPrUrl('https://github.com/henrywguan/yuetranslation/pull/800'), {
  owner: 'henrywguan',
  repo: 'yuetranslation',
  number: 800,
})
assert.equal(parseGithubPrUrl('nope'), null)
assert.match(suggestChatBranch('chat'), /^chat\//)

const byoGithub = await saveChatPluginCredentials('smoke-github-byo', {
  github_app_id: '111',
  github_app_private_key:
    '-----BEGIN RSA PRIVATE KEY-----\nMIIE\n-----END RSA PRIVATE KEY-----',
  github_app_installation_id: '222',
})
const resolvedByo = resolveGithubAppCreds(byoGithub)
assert.ok(resolvedByo)
assert.equal(resolvedByo?.source, 'byo')
assert.equal(githubConfigured(byoGithub), true)
assert.match(githubStatus(byoGithub).message, /byo/i)

const here = path.dirname(fileURLToPath(import.meta.url))
const routes = readFileSync(path.join(here, 'chatGithubRoutes.ts'), 'utf8')
assert.match(routes, /GithubNotConfiguredError/)
assert.match(routes, /fixability/)
assert.match(routes, /postChatGithubClone/)
assert.match(routes, /postChatGithubPr/)
assert.match(routes, /getChatGithubPrChecks/)
assert.match(routes, /loadChatPluginCredentials/)

const app = readFileSync(path.join(here, 'app.ts'), 'utf8')
assert.match(app, /\/api\/chat\/github\/status/)
assert.match(app, /\/api\/chat\/github\/pr-checks/)
assert.match(app, /\/api\/chat\/github\/pr/)

const tools = readFileSync(path.join(here, 'deepseekChatTools.ts'), 'utf8')
assert.match(tools, /github_open_pr/)

const keys = readFileSync(path.join(here, 'deepseekChatPluginKeys.ts'), 'utf8')
assert.match(keys, /github_app_id/)
assert.match(keys, /github_app_private_key/)
assert.match(keys, /github_app_installation_id/)

const envEx = readFileSync(path.join(here, '../.env.example'), 'utf8')
assert.match(envEx, /GITHUB_APP_ID/)
assert.match(envEx, /GITHUB_APP_PRIVATE_KEY/)
assert.match(envEx, /GITHUB_APP_INSTALLATION_ID/)
assert.match(envEx, /github_app_id/)

console.log('chatGithub.smoke: ok')
