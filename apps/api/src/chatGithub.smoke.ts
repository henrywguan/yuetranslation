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
  parseGithubRepo,
  suggestChatBranch,
} from './chatGithub.js'

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
assert.match(suggestChatBranch('chat'), /^chat\//)

const here = path.dirname(fileURLToPath(import.meta.url))
const routes = readFileSync(path.join(here, 'chatGithubRoutes.ts'), 'utf8')
assert.match(routes, /NEEDS_HUMAN|github_not_configured/)
assert.match(routes, /postChatGithubClone/)
assert.match(routes, /postChatGithubPr/)

const app = readFileSync(path.join(here, 'app.ts'), 'utf8')
assert.match(app, /\/api\/chat\/github\/status/)
assert.match(app, /\/api\/chat\/github\/pr/)

const tools = readFileSync(path.join(here, 'deepseekChatTools.ts'), 'utf8')
assert.match(tools, /github_open_pr/)

const envEx = readFileSync(path.join(here, '../.env.example'), 'utf8')
assert.match(envEx, /GITHUB_APP_ID/)
assert.match(envEx, /GITHUB_APP_PRIVATE_KEY/)
assert.match(envEx, /GITHUB_APP_INSTALLATION_ID/)

console.log('chatGithub.smoke: ok')
