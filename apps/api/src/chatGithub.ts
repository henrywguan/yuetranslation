/**
 * Chat Inbox GitHub integration (Phase E + BYO keys).
 * Prefer per-user Plugin API keys, then server env GitHub App secrets.
 *
 * Plugin key IDs: github_app_id, github_app_private_key, github_app_installation_id
 * Env fallback: GITHUB_APP_ID, GITHUB_APP_PRIVATE_KEY, GITHUB_APP_INSTALLATION_ID
 */
import { createPrivateKey, createSign, randomUUID } from 'node:crypto'
import {
  resolveGithubAppCreds,
  type ChatPluginCredentials,
} from './deepseekChatPluginKeys.js'

export class GithubNotConfiguredError extends Error {
  readonly code = 'github_not_configured'
  readonly fixability = 'NEEDS_HUMAN' as const
  constructor() {
    super(
      'GitHub App not configured. Add github_app_id, github_app_private_key, and github_app_installation_id under Plugins → API keys (or set the matching server env vars).',
    )
    this.name = 'GithubNotConfiguredError'
  }
}

export type GithubResolvedCreds = NonNullable<ReturnType<typeof resolveGithubAppCreds>>

export function githubConfigured(creds?: ChatPluginCredentials | null): boolean {
  return Boolean(resolveGithubAppCreds(creds))
}

export function githubStatus(creds?: ChatPluginCredentials | null) {
  const resolved = resolveGithubAppCreds(creds)
  return {
    configured: Boolean(resolved),
    prefer: 'github_app' as const,
    source: resolved?.source ?? null,
    needsHuman: !resolved,
    message: resolved
      ? `GitHub App ready (${resolved.source}).`
      : 'Add GitHub App credentials under Plugins → API keys (github_app_id, github_app_private_key, github_app_installation_id), or set server GITHUB_APP_* env.',
  }
}

function pemKey(privateKey: string): string {
  return privateKey.replace(/\\n/g, '\n')
}

/** GitHub App JWT (RS256), valid ~9 minutes. */
export function createGithubAppJwt(creds?: ChatPluginCredentials | null): string {
  const resolved = resolveGithubAppCreds(creds)
  if (!resolved) throw new GithubNotConfiguredError()
  const now = Math.floor(Date.now() / 1000)
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url')
  const payload = Buffer.from(
    JSON.stringify({
      iat: now - 60,
      exp: now + 9 * 60,
      iss: resolved.appId,
    }),
  ).toString('base64url')
  const data = `${header}.${payload}`
  const key = createPrivateKey(pemKey(resolved.privateKey))
  const sign = createSign('RSA-SHA256')
  sign.update(data)
  sign.end()
  const sig = sign.sign(key).toString('base64url')
  return `${data}.${sig}`
}

const cachedInstallTokens = new Map<string, { token: string; expiresAt: number }>()

export async function getGithubInstallationToken(
  creds?: ChatPluginCredentials | null,
): Promise<string> {
  const resolved = resolveGithubAppCreds(creds)
  if (!resolved) throw new GithubNotConfiguredError()
  const cacheKey = `${resolved.appId}:${resolved.installationId}`
  const cached = cachedInstallTokens.get(cacheKey)
  if (cached && cached.expiresAt > Date.now() + 60_000) {
    return cached.token
  }
  const jwt = createGithubAppJwt(creds)
  const res = await fetch(
    `https://api.github.com/app/installations/${encodeURIComponent(resolved.installationId)}/access_tokens`,
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
  cachedInstallTokens.set(cacheKey, {
    token: json.token,
    expiresAt: Date.parse(json.expires_at) || Date.now() + 50 * 60_000,
  })
  return json.token
}

async function ghFetch(
  path: string,
  init?: RequestInit,
  creds?: ChatPluginCredentials | null,
): Promise<Response> {
  const token = await getGithubInstallationToken(creds)
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

export async function listGithubRepos(
  limit = 30,
  creds?: ChatPluginCredentials | null,
): Promise<GithubRepoSummary[]> {
  const res = await ghFetch(
    `/installation/repositories?per_page=${Math.min(Math.max(limit, 1), 50)}`,
    undefined,
    creds,
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
  creds?: ChatPluginCredentials | null
}

export async function openGithubPullRequest(input: OpenPullRequestInput): Promise<{
  number: number
  htmlUrl: string
  title: string
}> {
  const base = input.base || 'main'
  const res = await ghFetch(
    `/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/pulls`,
    {
      method: 'POST',
      body: JSON.stringify({
        title: input.title,
        head: input.head,
        base,
        body: input.body || '',
      }),
    },
    input.creds,
  )
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
