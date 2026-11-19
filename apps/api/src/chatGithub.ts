/**
 * Chat Inbox GitHub integration (Phase E).
 * Prefer GitHub App (installation token). Without secrets → NEEDS_HUMAN.
 *
 * Required env:
 *   GITHUB_APP_ID
 *   GITHUB_APP_PRIVATE_KEY  (PEM, newlines as \n ok)
 *   GITHUB_APP_INSTALLATION_ID
 */
import { createPrivateKey, createSign, randomUUID } from 'node:crypto'
import { env } from './env.js'

export class GithubNotConfiguredError extends Error {
  readonly code = 'github_not_configured'
  readonly fixability = 'NEEDS_HUMAN' as const
  constructor() {
    super(
      'GitHub App not configured. Henry must create a GitHub App and set GITHUB_APP_ID, GITHUB_APP_PRIVATE_KEY, GITHUB_APP_INSTALLATION_ID.',
    )
    this.name = 'GithubNotConfiguredError'
  }
}

export function githubConfigured(): boolean {
  return Boolean(env.githubAppId && env.githubAppPrivateKey && env.githubAppInstallationId)
}

export function githubStatus() {
  return {
    configured: githubConfigured(),
    prefer: 'github_app' as const,
    needsHuman: !githubConfigured(),
    message: githubConfigured()
      ? 'GitHub App ready.'
      : 'NEEDS_HUMAN: create a GitHub App with Contents + Pull requests permissions; set GITHUB_APP_ID, GITHUB_APP_PRIVATE_KEY, GITHUB_APP_INSTALLATION_ID.',
  }
}

function pemKey(): string {
  return env.githubAppPrivateKey.replace(/\\n/g, '\n')
}

/** GitHub App JWT (RS256), valid ~9 minutes. */
export function createGithubAppJwt(): string {
  if (!githubConfigured()) throw new GithubNotConfiguredError()
  const now = Math.floor(Date.now() / 1000)
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url')
  const payload = Buffer.from(
    JSON.stringify({
      iat: now - 60,
      exp: now + 9 * 60,
      iss: env.githubAppId,
    }),
  ).toString('base64url')
  const data = `${header}.${payload}`
  const key = createPrivateKey(pemKey())
  const sign = createSign('RSA-SHA256')
  sign.update(data)
  sign.end()
  const sig = sign.sign(key).toString('base64url')
  return `${data}.${sig}`
}

let cachedInstallToken: { token: string; expiresAt: number } | null = null

export async function getGithubInstallationToken(): Promise<string> {
  if (!githubConfigured()) throw new GithubNotConfiguredError()
  if (cachedInstallToken && cachedInstallToken.expiresAt > Date.now() + 60_000) {
    return cachedInstallToken.token
  }
  const jwt = createGithubAppJwt()
  const res = await fetch(
    `https://api.github.com/app/installations/${encodeURIComponent(env.githubAppInstallationId)}/access_tokens`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${jwt}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'jyuttranslate-chat-inbox',
      },
    },
  )
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`GitHub installation token failed (${res.status}): ${text.slice(0, 400)}`)
  }
  const json = (await res.json()) as { token: string; expires_at: string }
  cachedInstallToken = {
    token: json.token,
    expiresAt: Date.parse(json.expires_at) || Date.now() + 50 * 60_000,
  }
  return json.token
}

async function ghFetch(path: string, init?: RequestInit): Promise<Response> {
  const token = await getGithubInstallationToken()
  return fetch(`https://api.github.com${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'jyuttranslate-chat-inbox',
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  })
}

export type GithubRepoSummary = {
  fullName: string
  private: boolean
  defaultBranch: string
  htmlUrl: string
}

export async function listGithubRepos(limit = 30): Promise<GithubRepoSummary[]> {
  const res = await ghFetch(
    `/installation/repositories?per_page=${Math.min(Math.max(limit, 1), 50)}`,
  )
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`List repos failed (${res.status}): ${text.slice(0, 400)}`)
  }
  const json = (await res.json()) as {
    repositories?: Array<{
      full_name: string
      private: boolean
      default_branch: string
      html_url: string
    }>
  }
  return (json.repositories || []).map((r) => ({
    fullName: r.full_name,
    private: r.private,
    defaultBranch: r.default_branch,
    htmlUrl: r.html_url,
  }))
}

export type OpenPullRequestInput = {
  owner: string
  repo: string
  title: string
  body?: string
  head: string
  base?: string
}

export async function openGithubPullRequest(input: OpenPullRequestInput): Promise<{
  number: number
  htmlUrl: string
  title: string
}> {
  const base = input.base || 'main'
  const res = await ghFetch(`/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/pulls`, {
    method: 'POST',
    body: JSON.stringify({
      title: input.title,
      head: input.head,
      base,
      body: input.body || '',
    }),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Open PR failed (${res.status}): ${text.slice(0, 500)}`)
  }
  const json = (await res.json()) as { number: number; html_url: string; title: string }
  return { number: json.number, htmlUrl: json.html_url, title: json.title }
}

/** Suggest a chat branch name. */
export function suggestChatBranch(prefix = 'chat'): string {
  return `${prefix}/${randomUUID().replace(/-/g, '').slice(0, 10)}`
}

/** Parse owner/repo from full name or URL. */
export function parseGithubRepo(fullOrUrl: string): { owner: string; repo: string } | null {
  const s = String(fullOrUrl || '').trim()
  const m =
    s.match(/^([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)$/) ||
    s.match(/github\.com[/:]([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+?)(?:\.git)?\/?$/)
  if (!m) return null
  return { owner: m[1]!, repo: m[2]! }
}
