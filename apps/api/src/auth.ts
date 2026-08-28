import type { Request, Response, NextFunction } from 'express'
import { isAdminEmail } from './env.js'
import { getProfile, getUserFromJwt } from './supabase.js'

export type UserRole = 'admin' | 'family'

export type AuthContext = {
  userId: string
  email: string | null
}

export type AuthedRequest = Request & {
  auth?: AuthContext
}

/** Optional Bearer JWT — attaches auth when Supabase is configured. */
export async function attachAuth(req: AuthedRequest, _res: Response, next: NextFunction) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    next()
    return
  }
  const token = header.slice('Bearer '.length).trim()
  if (!token) {
    next()
    return
  }
  try {
    const user = await getUserFromJwt(token)
    if (user) {
      req.auth = { userId: user.id, email: user.email ?? null }
    }
  } catch {
    // Invalid token — treat as guest.
  }
  next()
}

export function requireAuth(req: AuthedRequest, res: Response): AuthContext | null {
  if (!req.auth?.userId) {
    res.status(401).json({ message: 'Sign in required.' })
    return null
  }
  return req.auth
}

/** True when the user may access the admin panel (allowlist or assigned admin role). */
export async function userHasAdminAccess(
  userId: string,
  email: string | null | undefined,
): Promise<boolean> {
  if (isAdminEmail(email)) return true
  const profile = await getProfile(userId)
  return profile?.role === 'admin'
}

/** Require signed-in user with admin panel access. */
export async function requireAdmin(req: AuthedRequest, res: Response): Promise<AuthContext | null> {
  const auth = requireAuth(req, res)
  if (!auth) return null
  if (await userHasAdminAccess(auth.userId, auth.email)) return auth
  res.status(403).json({ message: 'Admin access required.' })
  return null
}
