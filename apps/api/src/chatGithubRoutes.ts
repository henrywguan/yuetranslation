/**
 * Chat Inbox GitHub REST — Family/Business; App secrets via BYO plugin keys or server env.
 */
import type { Response } from 'express'
import type { AuthedRequest } from './auth.js'
import { canUseDeepseekChat } from './deepseekChat.js'
import { env } from './env.js'
import { resolveEntitlement } from './entitlements.js'
import { allowUserRateOrReject } from './guestRateLimit.js'
import {
  GithubNotConfiguredError,
  githubStatus,
  listGithubRepos,
  openGithubPullRequest,
  parseGithubRepo,
  suggestChatBranch,
  getGithubInstallationToken,
} from './chatGithub.js'
import { requireUserSession } from './chatSandboxService.js'
import { execSandbox } from './chatSandboxService.js'
import { loadChatPluginCredentials } from './deepseekChatPluginKeys.js'

async function gate(req: AuthedRequest, res: Response): Promise<{ userId: string } | null> {
  const auth = req.auth
  if (!auth?.userId) {
    res.status(401).json({ message: 'Sign in required.', code: 'auth_required' })
    return null
  }
  if (!allowUserRateOrReject(res, auth.userId, 'chatGithub', env.chatRlPerMin)) return null
  const entitlement = await resolveEntitlement(auth)
  if (entitlement.disabled) {
    res.status(403).json({ message: 'Account disabled.', code: 'account_disabled' })
    return null
  }
  if (!canUseDeepseekChat(entitlement.plan, entitlement.isAdmin)) {
    res.status(403).json({
      message: 'GitHub from chat requires Family or Business.',
      code: 'chat_plan_required',
      upgradeUrl: entitlement.upgradeUrl,
    })
    return null
  }
  return { userId: auth.userId }
}

/** GET /api/chat/github/status */
export async function getChatGithubStatus(req: AuthedRequest, res: Response) {
  const g = await gate(req, res)
  if (!g) return
  const creds = await loadChatPluginCredentials(g.userId)
  res.json({ ok: true, ...githubStatus(creds) })
}

/** GET /api/chat/github/repos */
export async function getChatGithubRepos(req: AuthedRequest, res: Response) {
  const g = await gate(req, res)
  if (!g) return
  try {
    const creds = await loadChatPluginCredentials(g.userId)
    const repos = await listGithubRepos(40, creds)
    res.json({ ok: true, repos })
  } catch (err) {
    if (err instanceof GithubNotConfiguredError) {
      res.status(501).json({
        message: err.message,
        code: err.code,
        fixability: err.fixability,
      })
      return
    }
    res.status(502).json({
      message: err instanceof Error ? err.message : 'List repos failed',
      code: 'github_list_failed',
    })
  }
}

/**
 * POST /api/chat/github/clone
 * Clone a repo into an existing sandbox (git must be allowlisted — stub includes git).
 */
export async function postChatGithubClone(req: AuthedRequest, res: Response) {
  const g = await gate(req, res)
  if (!g) return
  const body = (req.body || {}) as {
    sandboxSessionId?: string
    repo?: string
    branch?: string
  }
  const parsed = parseGithubRepo(String(body.repo || ''))
  if (!parsed) {
    res.status(400).json({ message: 'repo required as owner/name', code: 'invalid_repo' })
    return
  }
  if (!body.sandboxSessionId) {
    res.status(400).json({ message: 'sandboxSessionId required', code: 'invalid_sandbox' })
    return
  }
  try {
    const session = requireUserSession(body.sandboxSessionId, g.userId)
    const creds = await loadChatPluginCredentials(g.userId)
    const token = await getGithubInstallationToken(creds)
    const url = `https://x-access-token:${token}@github.com/${parsed.owner}/${parsed.repo}.git`
    const branch = typeof body.branch === 'string' && body.branch.trim() ? body.branch.trim() : undefined
    const argv = branch
      ? ['git', 'clone', '--depth', '1', '--branch', branch, url, '.']
      : ['git', 'clone', '--depth', '1', url, '.']
    const result = await execSandbox(session, argv)
    // Never echo the tokenized URL back.
    const safe = {
      ...result,
      argv: result.argv.map((a) => (a.includes('x-access-token:') ? 'https://github.com/…' : a)),
      stderr: result.stderr.replace(/x-access-token:[^@\s]+@/g, 'x-access-token:***@'),
      stdout: result.stdout.replace(/x-access-token:[^@\s]+@/g, 'x-access-token:***@'),
    }
    res.json({
      ok: safe.ok,
      result: safe,
      repo: `${parsed.owner}/${parsed.repo}`,
      suggestedBranch: suggestChatBranch('chat'),
    })
  } catch (err) {
    if (err instanceof GithubNotConfiguredError) {
      res.status(501).json({
        message: err.message,
        code: err.code,
        fixability: err.fixability,
      })
      return
    }
    const status = (err as { status?: number }).status || 502
    res.status(status).json({
      message: err instanceof Error ? err.message : 'Clone failed',
      code: 'github_clone_failed',
    })
  }
}

/** POST /api/chat/github/pr — open a pull request */
export async function postChatGithubPr(req: AuthedRequest, res: Response) {
  const g = await gate(req, res)
  if (!g) return
  const body = (req.body || {}) as {
    repo?: string
    title?: string
    body?: string
    head?: string
    base?: string
  }
  const parsed = parseGithubRepo(String(body.repo || ''))
  if (!parsed || !body.title?.trim() || !body.head?.trim()) {
    res.status(400).json({
      message: 'repo, title, and head required',
      code: 'invalid_pr',
    })
    return
  }
  try {
    const creds = await loadChatPluginCredentials(g.userId)
    const pr = await openGithubPullRequest({
      owner: parsed.owner,
      repo: parsed.repo,
      title: body.title.trim(),
      body: typeof body.body === 'string' ? body.body : undefined,
      head: body.head.trim(),
      base: typeof body.base === 'string' ? body.base : undefined,
      creds,
    })
    res.status(201).json({ ok: true, pr })
  } catch (err) {
    if (err instanceof GithubNotConfiguredError) {
      res.status(501).json({
        message: err.message,
        code: err.code,
        fixability: err.fixability,
      })
      return
    }
    res.status(502).json({
      message: err instanceof Error ? err.message : 'Open PR failed',
      code: 'github_pr_failed',
    })
  }
}
