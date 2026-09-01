import type { Response } from 'express'
import { requireAuth, type AuthedRequest } from './auth.js'
import { resolveEntitlement } from './entitlements.js'
import {
  acceptHouseholdInvite,
  createHouseholdInvite,
  getHouseholdSummary,
  removeHouseholdMember,
  revokeHouseholdInvite,
  type HouseholdPlan,
} from './household.js'
import { getProfile } from './supabase.js'

function paidPlan(plan: string | null | undefined): HouseholdPlan | null {
  if (plan === 'family' || plan === 'max') return plan
  return null
}

export async function getHousehold(req: AuthedRequest, res: Response) {
  const auth = requireAuth(req, res)
  if (!auth) return
  const summary = await getHouseholdSummary(auth.userId)
  res.json({ household: summary })
}

export async function postHouseholdInvite(req: AuthedRequest, res: Response) {
  const auth = requireAuth(req, res)
  if (!auth) return

  const entitlement = await resolveEntitlement(auth)
  const plan = paidPlan(entitlement.plan)
  if (!plan) {
    res.status(403).json({
      code: 'plan_required',
      message: 'Upgrade to Family or Max to invite household members.',
    })
    return
  }
  if (entitlement.household && entitlement.household.role !== 'owner') {
    res.status(403).json({
      code: 'forbidden',
      message: 'Only the plan owner can send invites.',
    })
    return
  }

  const email = typeof req.body?.email === 'string' ? req.body.email : ''
  const result = await createHouseholdInvite({
    ownerUserId: auth.userId,
    ownerEmail: auth.email,
    ownerPlan: plan,
    email,
  })
  if (!result.ok) {
    const status = result.code === 'seats_full' || result.code === 'already_invited' ? 409 : 400
    res.status(status).json({ code: result.code, message: result.message })
    return
  }

  res.status(201).json({
    ok: true,
    inviteSent: true,
    emailed: result.emailed,
    acceptUrl: result.acceptUrl,
    invite: {
      id: result.invite.id,
      email: result.invite.email,
      createdAt: result.invite.created_at,
      expiresAt: result.invite.expires_at,
    },
    household: result.summary,
    entitlement: await resolveEntitlement(auth),
  })
}

export async function deleteHouseholdInvite(req: AuthedRequest, res: Response) {
  const auth = requireAuth(req, res)
  if (!auth) return
  const inviteId = String(req.params.inviteId || '')
  const result = await revokeHouseholdInvite({ ownerUserId: auth.userId, inviteId })
  if (!result.ok) {
    res.status(result.code === 'forbidden' ? 403 : 404).json({
      code: result.code,
      message: result.message,
    })
    return
  }
  res.json({
    ok: true,
    household: result.summary,
    entitlement: await resolveEntitlement(auth),
  })
}

export async function deleteHouseholdMember(req: AuthedRequest, res: Response) {
  const auth = requireAuth(req, res)
  if (!auth) return
  const memberUserId = String(req.params.userId || '')
  const result = await removeHouseholdMember({
    ownerUserId: auth.userId,
    memberUserId,
  })
  if (!result.ok) {
    res.status(result.code === 'forbidden' ? 403 : 400).json({
      code: result.code,
      message: result.message,
    })
    return
  }
  res.json({
    ok: true,
    household: result.summary,
    entitlement: await resolveEntitlement(auth),
  })
}

export async function postHouseholdAccept(req: AuthedRequest, res: Response) {
  const auth = requireAuth(req, res)
  if (!auth) return
  const token = typeof req.body?.token === 'string' ? req.body.token.trim() : ''
  if (!token) {
    res.status(400).json({ code: 'missing_token', message: 'Invite token is required.' })
    return
  }
  // Prefer live auth email; fall back to profile lookup only if needed.
  const email = auth.email ?? (await getProfile(auth.userId))?.id ?? null
  const result = await acceptHouseholdInvite({
    userId: auth.userId,
    email: auth.email,
    token,
  })
  if (!result.ok) {
    const status =
      result.code === 'email_mismatch' || result.code === 'already_in_household' ? 409 : 400
    res.status(status).json({ code: result.code, message: result.message })
    return
  }
  void email
  res.json({
    ok: true,
    household: result.summary,
    entitlement: await resolveEntitlement(auth),
  })
}
