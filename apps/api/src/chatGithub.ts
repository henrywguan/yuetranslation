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

/** Parse owner/repo/number from a github.com pull request URL. */
export function parseGithubPrUrl(raw: string): {
  owner: string
  repo: string
  number: number
} | null {
  const s = String(raw || '').trim()
  const m =
    /github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)\/pull\/(\d+)/i.exec(s) ||
    /^([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)#(\d+)$/.exec(s)
  if (!m) return null
  const number = Number(m[3])
  if (!Number.isFinite(number) || number < 1) return null
  return { owner: m[1]!, repo: m[2]!, number }
}

export type GithubPrChecksSummary = {
  state: 'success' | 'pending' | 'failure' | 'error' | 'unknown'
  total: number
  success: number
  failure: number
  pending: number
  headSha?: string
  detail?: string
}

/** Max pages for check-runs / statuses (50 per page → up to 250). */
export const GITHUB_PR_CHECKS_MAX_PAGES = 5

/** Parse `rel="next"` URL from a GitHub Link response header. */
export function githubLinkNextUrl(linkHeader: string | null | undefined): string | null {
  const raw = String(linkHeader || '')
  if (!raw) return null
  for (const part of raw.split(',')) {
    const m = /<([^>]+)>\s*;\s*rel="?next"?/i.exec(part.trim())
    if (m?.[1]) return m[1]
  }
  return null
}

/** Turn an absolute api.github.com URL into a path+query for `ghFetch`. */
export function githubApiPathFromUrl(url: string): string | null {
  try {
    const u = new URL(url)
    if (!/api\.github\.com$/i.test(u.host)) return null
    return `${u.pathname}${u.search}`
  } catch {
    return null
  }
}

type CheckRunRow = {
  name?: string
  status?: string
  conclusion?: string | null
}

function tallyCheckRun(
  run: CheckRunRow,
  acc: { success: number; failure: number; pending: number; total: number; names: string[] },
) {
  acc.total += 1
  const status = String(run.status || '').toLowerCase()
  const conclusion = String(run.conclusion || '').toLowerCase()
  if (run.name) acc.names.push(run.name)
  if (status !== 'completed') {
    acc.pending += 1
    return
  }
  if (
    conclusion === 'success' ||
    conclusion === 'neutral' ||
    conclusion === 'skipped' ||
    conclusion === 'stale'
  ) {
    acc.success += 1
  } else {
    acc.failure += 1
  }
}

/**
 * Combined check-runs + legacy status for a pull request head.
 * Paginates check-runs (and statuses) so later-page failures are not hidden.
 * Read-only — no paid APIs beyond GitHub App rate limits.
 */
export async function fetchGithubPrChecks(input: {
  owner: string
  repo: string
  number: number
  creds?: ChatPluginCredentials | null
}): Promise<GithubPrChecksSummary> {
  const prRes = await ghFetch(
    `/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/pulls/${input.number}`,
    undefined,
    input.creds,
  )
  if (!prRes.ok) {
    const text = await prRes.text().catch(() => '')
    throw new Error(`PR fetch failed (${prRes.status}): ${text.slice(0, 400)}`)
  }
  const pr = (await prRes.json()) as { head?: { sha?: string }; html_url?: string }
  const headSha = typeof pr.head?.sha === 'string' ? pr.head.sha : ''
  if (!headSha) {
    return {
      state: 'unknown',
      total: 0,
      success: 0,
      failure: 0,
      pending: 0,
      detail: 'No head SHA on pull request',
    }
  }

  const acc = { success: 0, failure: 0, pending: 0, total: 0, names: [] as string[] }
  const checksBase = `/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/commits/${encodeURIComponent(headSha)}/check-runs?per_page=50`
  let checksPath: string | null = `${checksBase}&page=1`
  let checksPages = 0
  let checksOk = false

  while (checksPath && checksPages < GITHUB_PR_CHECKS_MAX_PAGES) {
    checksPages += 1
    const checksRes = await ghFetch(checksPath, undefined, input.creds)
    if (!checksRes.ok) break
    checksOk = true
    const json = (await checksRes.json()) as {
      total_count?: number
      check_runs?: CheckRunRow[]
    }
    const runs = json.check_runs || []
    for (const run of runs) tallyCheckRun(run, acc)
    if (!runs.length) break
    if (typeof json.total_count === 'number' && acc.total >= json.total_count) break
    if (runs.length < 50) break
    const nextAbs = githubLinkNextUrl(checksRes.headers.get('link'))
    checksPath = nextAbs ? githubApiPathFromUrl(nextAbs) : `${checksBase}&page=${checksPages + 1}`
    if (!checksPath) break
  }

  // Legacy combined status as a fallback signal when check-runs empty / unavailable.
  if (!checksOk || acc.total === 0) {
    const statusBase = `/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/commits/${encodeURIComponent(headSha)}/status?per_page=100`
    let statusPath: string | null = `${statusBase}&page=1`
    let statusPages = 0
    let sawStatusPayload = false
    while (statusPath && statusPages < GITHUB_PR_CHECKS_MAX_PAGES) {
      statusPages += 1
      const statusRes = await ghFetch(statusPath, undefined, input.creds)
      if (!statusRes.ok) break
      const st = (await statusRes.json()) as {
        state?: string
        statuses?: Array<{ state?: string; context?: string }>
      }
      sawStatusPayload = true
      const statuses = st.statuses || []
      for (const s of statuses) {
        acc.total += 1
        const state = String(s.state || '').toLowerCase()
        if (s.context) acc.names.push(s.context)
        if (state === 'success') acc.success += 1
        else if (state === 'pending') acc.pending += 1
        else acc.failure += 1
      }
      if (!statuses.length || statuses.length < 100) {
        if (!acc.total) {
          const combined = String(st.state || '').toLowerCase()
          if (combined === 'success') {
            return {
              state: 'success',
              total: 0,
              success: 0,
              failure: 0,
              pending: 0,
              headSha,
              detail: 'Combined status success (no discrete checks)',
            }
          }
          if (combined === 'pending') {
            return {
              state: 'pending',
              total: 0,
              success: 0,
              failure: 0,
              pending: 0,
              headSha,
              detail: 'Combined status pending',
            }
          }
          if (combined === 'failure' || combined === 'error') {
            return {
              state: combined === 'error' ? 'error' : 'failure',
              total: 0,
              success: 0,
              failure: 0,
              pending: 0,
              headSha,
              detail: `Combined status ${combined}`,
            }
          }
        }
        break
      }
      const nextAbs = githubLinkNextUrl(statusRes.headers.get('link'))
      statusPath = nextAbs ? githubApiPathFromUrl(nextAbs) : `${statusBase}&page=${statusPages + 1}`
      if (!statusPath) break
    }
    if (!sawStatusPayload && !checksOk) {
      return {
        state: 'unknown',
        total: 0,
        success: 0,
        failure: 0,
        pending: 0,
        headSha,
        detail: 'Checks unavailable',
      }
    }
  }

  let state: GithubPrChecksSummary['state'] = 'unknown'
  if (acc.failure > 0) state = 'failure'
  else if (acc.pending > 0) state = 'pending'
  else if (acc.total > 0 && acc.success === acc.total) state = 'success'
  else if (acc.total === 0) state = 'unknown'

  return {
    state,
    total: acc.total,
    success: acc.success,
    failure: acc.failure,
    pending: acc.pending,
    headSha,
    detail: acc.names.length ? acc.names.slice(0, 8).join(' · ') : undefined,
  }
}
