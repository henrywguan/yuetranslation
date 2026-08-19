import type { Request, Response, NextFunction } from 'express'
import { getUserFromJwt } from './supabase.js'

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
