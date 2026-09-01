import { randomBytes } from 'node:crypto'
import { Resend } from 'resend'
import { env } from './env.js'
import { getAdmin } from './supabase.js'
import { currentMonthKey, emptyUsage, type UsageSnapshot } from './usage.js'

export type HouseholdPlan = 'family' | 'max'
export type MemberRole = 'owner' | 'member'

export type HouseholdRow = {
  id: string
  owner_user_id: string
  plan: HouseholdPlan
  seat_limit: number
  created_at: string
  updated_at: string
}

export type MemberRow = {
  household_id: string
  user_id: string
  member_role: MemberRole
  joined_at: string
}

export type InviteRow = {
  id: string
  household_id: string
  email: string
  token: string
  status: 'pending' | 'accepted' | 'revoked' | 'expired'
  invited_by: string
  created_at: string
  expires_at: string
  accepted_user_id: string | null
}

export type HouseholdSummary = {
  id: string
  plan: HouseholdPlan
  seatLimit: number
  seatUsed: number
  role: MemberRole
  pooled: true
  members: Array<{
    userId: string
    role: MemberRole
    email: string | null
    joinedAt: string
  }>
  pendingInvites: Array<{
    id: string
    email: string
    createdAt: string
    expiresAt: string
  }>
}

export function seatLimitForPlan(plan: HouseholdPlan): number {
  return plan === 'max' ? 10 : 4
}

function asInt(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

function looksLikeEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function newInviteToken(): string {
  return randomBytes(24).toString('base64url')
}

function inviteAcceptUrl(token: string): string {
  const base = env.appUrl || 'https://jyuttranslate.com'
  return `${base}/?invite=${encodeURIComponent(token)}#/app`
}

function usageFromRow(row: Record<string, unknown> | null | undefined, month: string): UsageSnapshot {
  if (!row) return emptyUsage(month)
  return {
    month,
    liveSeconds: asInt(row.live_seconds),
    ttsChars: asInt(row.tts_chars),
    translateCount: asInt(row.translate_count),
    cameraSeconds: asInt(row.camera_seconds),
    cameraTranslateCount: asInt(row.camera_translate_count),
    docsPages: asInt(row.docs_pages),
    aiVisionCount: asInt(row.ai_vision_count),
  }
}

export async function getMembershipForUser(userId: string): Promise<{
  household: HouseholdRow
  membership: MemberRow
} | null> {
  const client = getAdmin()
  if (!client) return null

  const { data: membership, error } = await client
    .from('household_members')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) {
    console.error('[household] membership lookup failed', error.message)
    return null
  }
  if (!membership) return null

  const { data: household, error: hErr } = await client
    .from('households')
    .select('*')
    .eq('id', (membership as MemberRow).household_id)
    .maybeSingle()
  if (hErr || !household) {
    if (hErr) console.error('[household] household lookup failed', hErr.message)
    return null
  }

  return {
    household: household as HouseholdRow,
    membership: membership as MemberRow,
  }
}

export async function getHouseholdUsage(
  householdId: string,
  month = currentMonthKey(),
): Promise<UsageSnapshot> {
  const client = getAdmin()
  if (!client) return emptyUsage(month)
  const { data, error } = await client
    .from('household_usage_months')
    .select('*')
    .eq('household_id', householdId)
    .eq('month', month)
    .maybeSingle()
  if (error) {
    console.error('[household] usage lookup failed', error.message)
    return emptyUsage(month)
  }
  return usageFromRow(data as Record<string, unknown> | null, month)
}

export async function incrementHouseholdUsage(
  householdId: string,
  delta: {
    liveSeconds?: number
    ttsChars?: number
    translateCount?: number
    cameraSeconds?: number
    cameraTranslateCount?: number
    docsPages?: number
    aiVisionCount?: number
  },
) {
  const client = getAdmin()
  if (!client) return

  const liveSeconds = asInt(delta.liveSeconds)
  const ttsChars = asInt(delta.ttsChars)
  const translateCount = asInt(delta.translateCount)
  const cameraSeconds = asInt(delta.cameraSeconds)
  const cameraTranslateCount = asInt(delta.cameraTranslateCount)
  const docsPages = asInt(delta.docsPages)
  const aiVisionCount = asInt(delta.aiVisionCount)
  if (
    liveSeconds +
      ttsChars +
      translateCount +
      cameraSeconds +
      cameraTranslateCount +
      docsPages +
      aiVisionCount <=
    0
  ) {
    return
  }

  const month = currentMonthKey()
  const { error: rpcError } = await client.rpc('increment_household_usage', {
    p_household_id: householdId,
    p_month: month,
    p_live_seconds: liveSeconds,
    p_tts_chars: ttsChars,
    p_translate_count: translateCount,
    p_camera_seconds: cameraSeconds,
    p_camera_translate_count: cameraTranslateCount,
    p_docs_pages: docsPages,
    p_ai_vision_count: aiVisionCount,
  })
  if (!rpcError) return

  console.warn('[household] increment RPC unavailable, upserting:', rpcError.message)
  const usage = await getHouseholdUsage(householdId, month)
  const { error } = await client.from('household_usage_months').upsert(
    {
      household_id: householdId,
      month,
      live_seconds: usage.liveSeconds + liveSeconds,
      tts_chars: usage.ttsChars + ttsChars,
      translate_count: usage.translateCount + translateCount,
      camera_seconds: usage.cameraSeconds + cameraSeconds,
      camera_translate_count: usage.cameraTranslateCount + cameraTranslateCount,
      docs_pages: usage.docsPages + docsPages,
      ai_vision_count: usage.aiVisionCount + aiVisionCount,
    },
    { onConflict: 'household_id,month' },
  )
  if (error) console.error('[household] usage upsert failed', error.message)
}

/** Create (or sync) a household for a paid plan owner. */
export async function ensureOwnerHousehold(
  ownerUserId: string,
  plan: HouseholdPlan,
): Promise<HouseholdRow | null> {
  const client = getAdmin()
  if (!client) return null
  const seatLimit = seatLimitForPlan(plan)

  const existing = await getMembershipForUser(ownerUserId)
  if (existing) {
    if (existing.membership.member_role !== 'owner') return null
    if (existing.household.plan === plan && existing.household.seat_limit === seatLimit) {
      return existing.household
    }
    const { data, error } = await client
      .from('households')
      .update({ plan, seat_limit: seatLimit, updated_at: new Date().toISOString() })
      .eq('id', existing.household.id)
      .select('*')
      .maybeSingle()
    if (error) {
      console.error('[household] plan sync failed', error.message)
      return existing.household
    }
    return (data as HouseholdRow) ?? existing.household
  }

  await client.from('profiles').upsert(
    { id: ownerUserId, plan },
    { onConflict: 'id', ignoreDuplicates: true },
  )

  const { data: created, error } = await client
    .from('households')
    .insert({
      owner_user_id: ownerUserId,
      plan,
      seat_limit: seatLimit,
    })
    .select('*')
    .maybeSingle()

  if (error || !created) {
    const raced = await getMembershipForUser(ownerUserId)
    if (raced?.membership.member_role === 'owner') return raced.household
    console.error('[household] create failed', error?.message)
    return null
  }

  const household = created as HouseholdRow
  const { error: memErr } = await client.from('household_members').insert({
    household_id: household.id,
    user_id: ownerUserId,
    member_role: 'owner',
  })
  if (memErr) console.error('[household] owner member insert failed', memErr.message)
  return household
}

async function countOccupiedSeats(householdId: string): Promise<number> {
  const client = getAdmin()
  if (!client) return 0
  const [{ count: members }, { count: invites }] = await Promise.all([
    client
      .from('household_members')
      .select('*', { count: 'exact', head: true })
      .eq('household_id', householdId),
    client
      .from('household_invites')
      .select('*', { count: 'exact', head: true })
      .eq('household_id', householdId)
      .eq('status', 'pending'),
  ])
  return (members ?? 0) + (invites ?? 0)
}

async function listMembers(householdId: string): Promise<HouseholdSummary['members']> {
  const client = getAdmin()
  if (!client) return []
  const { data, error } = await client
    .from('household_members')
    .select('user_id, member_role, joined_at')
    .eq('household_id', householdId)
    .order('joined_at', { ascending: true })
  if (error || !data) {
    if (error) console.error('[household] list members failed', error.message)
    return []
  }

  const emailById = new Map<string, string | null>()
  try {
    const { data: users } = await client.auth.admin.listUsers({ page: 1, perPage: 1000 })
    for (const user of users?.users ?? []) {
      emailById.set(user.id, user.email ?? null)
    }
  } catch (e) {
    console.warn('[household] auth listUsers failed', e)
  }

  return data.map((row) => ({
    userId: row.user_id as string,
    role: row.member_role as MemberRole,
    email: emailById.get(row.user_id as string) ?? null,
    joinedAt: row.joined_at as string,
  }))
}

async function listPendingInvites(
  householdId: string,
): Promise<HouseholdSummary['pendingInvites']> {
  const client = getAdmin()
  if (!client) return []
  const { data, error } = await client
    .from('household_invites')
    .select('id, email, created_at, expires_at')
    .eq('household_id', householdId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
  if (error || !data) {
    if (error) console.error('[household] list invites failed', error.message)
    return []
  }
  return data.map((row) => ({
    id: row.id as string,
    email: row.email as string,
    createdAt: row.created_at as string,
    expiresAt: row.expires_at as string,
  }))
}

export async function getHouseholdSummary(userId: string): Promise<HouseholdSummary | null> {
  const found = await getMembershipForUser(userId)
  if (!found) return null
  const [members, pendingInvites] = await Promise.all([
    listMembers(found.household.id),
    listPendingInvites(found.household.id),
  ])
  return {
    id: found.household.id,
    plan: found.household.plan,
    seatLimit: found.household.seat_limit,
    seatUsed: members.length + pendingInvites.length,
    role: found.membership.member_role,
    pooled: true,
    members,
    pendingInvites,
  }
}

async function sendInviteEmail(input: {
  to: string
  inviterEmail: string | null
  plan: HouseholdPlan
  acceptUrl: string
}): Promise<boolean> {
  if (!env.resendApiKey || !env.notifyFromEmail) {
    console.warn('[household] invite email skipped — Resend not configured')
    return false
  }
  const resend = new Resend(env.resendApiKey)
  const planLabel = input.plan === 'max' ? 'Max' : 'Family'
  const who = input.inviterEmail || 'A JyutTranslate member'
  const { error } = await resend.emails.send({
    from: env.notifyFromEmail,
    to: input.to,
    subject: `${who} invited you to JyutTranslate ${planLabel}`,
    html: `
      <div style="font-family:system-ui,sans-serif;line-height:1.5;color:#102018">
        <p><strong>${who}</strong> invited you to share a <strong>${planLabel}</strong> plan on JyutTranslate.</p>
        <p>Live mic, camera, and document usage is <strong>pooled</strong> — your household shares one monthly allowance.</p>
        <p>
          <a href="${input.acceptUrl}"
             style="display:inline-block;padding:10px 16px;border-radius:999px;background:#0f6b4c;color:#fff;text-decoration:none">
            Accept invite
          </a>
        </p>
        <p style="color:#5a6b62;font-size:13px">Or open: ${input.acceptUrl}</p>
      </div>
    `,
  })
  if (error) {
    console.error('[household] invite email failed', error.message)
    return false
  }
  return true
}

export async function createHouseholdInvite(input: {
  ownerUserId: string
  ownerEmail: string | null
  ownerPlan: HouseholdPlan
  email: string
}): Promise<
  | {
      ok: true
      invite: InviteRow
      emailed: boolean
      acceptUrl: string
      summary: HouseholdSummary
    }
  | { ok: false; code: string; message: string }
> {
  const email = normalizeEmail(input.email)
  if (!looksLikeEmail(email)) {
    return { ok: false, code: 'invalid_email', message: 'Enter a valid email address.' }
  }
  if (input.ownerEmail && normalizeEmail(input.ownerEmail) === email) {
    return { ok: false, code: 'self_invite', message: 'You are already on this plan.' }
  }

  const household = await ensureOwnerHousehold(input.ownerUserId, input.ownerPlan)
  if (!household) {
    return {
      ok: false,
      code: 'no_household',
      message: 'Upgrade to Family or Max before inviting people.',
    }
  }

  const occupied = await countOccupiedSeats(household.id)
  if (occupied >= household.seat_limit) {
    return {
      ok: false,
      code: 'seats_full',
      message: `All ${household.seat_limit} seats are used (including pending invites).`,
    }
  }

  const client = getAdmin()
  if (!client) {
    return { ok: false, code: 'unavailable', message: 'Household invites are unavailable.' }
  }

  await client
    .from('household_invites')
    .update({ status: 'expired' })
    .eq('household_id', household.id)
    .eq('status', 'pending')
    .lt('expires_at', new Date().toISOString())

  const token = newInviteToken()
  const { data, error } = await client
    .from('household_invites')
    .insert({
      household_id: household.id,
      email,
      token,
      status: 'pending',
      invited_by: input.ownerUserId,
    })
    .select('*')
    .maybeSingle()

  if (error || !data) {
    if (error?.code === '23505' || error?.message?.toLowerCase().includes('duplicate')) {
      return {
        ok: false,
        code: 'already_invited',
        message: 'An invite is already pending for that email.',
      }
    }
    console.error('[household] create invite failed', error?.message)
    return { ok: false, code: 'create_failed', message: 'Could not create invite.' }
  }

  const invite = data as InviteRow
  const acceptUrl = inviteAcceptUrl(invite.token)
  const emailed = await sendInviteEmail({
    to: email,
    inviterEmail: input.ownerEmail,
    plan: household.plan,
    acceptUrl,
  })
  const summary = await getHouseholdSummary(input.ownerUserId)
  return { ok: true, invite, emailed, acceptUrl, summary: summary! }
}

export async function revokeHouseholdInvite(input: {
  ownerUserId: string
  inviteId: string
}): Promise<{ ok: true; summary: HouseholdSummary } | { ok: false; code: string; message: string }> {
  const found = await getMembershipForUser(input.ownerUserId)
  if (!found || found.membership.member_role !== 'owner') {
    return { ok: false, code: 'forbidden', message: 'Only the plan owner can revoke invites.' }
  }
  const client = getAdmin()
  if (!client) return { ok: false, code: 'unavailable', message: 'Unavailable.' }

  const { data, error } = await client
    .from('household_invites')
    .update({ status: 'revoked' })
    .eq('id', input.inviteId)
    .eq('household_id', found.household.id)
    .eq('status', 'pending')
    .select('id')
    .maybeSingle()
  if (error || !data) {
    return { ok: false, code: 'not_found', message: 'Invite not found.' }
  }
  return { ok: true, summary: (await getHouseholdSummary(input.ownerUserId))! }
}

export async function removeHouseholdMember(input: {
  ownerUserId: string
  memberUserId: string
}): Promise<{ ok: true; summary: HouseholdSummary } | { ok: false; code: string; message: string }> {
  if (input.ownerUserId === input.memberUserId) {
    return { ok: false, code: 'cannot_remove_owner', message: 'You cannot remove yourself as owner.' }
  }
  const found = await getMembershipForUser(input.ownerUserId)
  if (!found || found.membership.member_role !== 'owner') {
    return { ok: false, code: 'forbidden', message: 'Only the plan owner can remove members.' }
  }
  const client = getAdmin()
  if (!client) return { ok: false, code: 'unavailable', message: 'Unavailable.' }

  const { error } = await client
    .from('household_members')
    .delete()
    .eq('household_id', found.household.id)
    .eq('user_id', input.memberUserId)
    .eq('member_role', 'member')
  if (error) {
    console.error('[household] remove member failed', error.message)
    return { ok: false, code: 'remove_failed', message: 'Could not remove member.' }
  }
  return { ok: true, summary: (await getHouseholdSummary(input.ownerUserId))! }
}

export async function acceptHouseholdInvite(input: {
  userId: string
  email: string | null
  token: string
}): Promise<{ ok: true; summary: HouseholdSummary } | { ok: false; code: string; message: string }> {
  const client = getAdmin()
  if (!client) return { ok: false, code: 'unavailable', message: 'Unavailable.' }

  const { data: invite, error } = await client
    .from('household_invites')
    .select('*')
    .eq('token', input.token)
    .maybeSingle()
  if (error || !invite) {
    return { ok: false, code: 'invalid_token', message: 'This invite link is invalid.' }
  }

  const row = invite as InviteRow
  if (row.status !== 'pending') {
    return { ok: false, code: 'not_pending', message: 'This invite is no longer active.' }
  }
  if (new Date(row.expires_at).getTime() < Date.now()) {
    await client.from('household_invites').update({ status: 'expired' }).eq('id', row.id)
    return { ok: false, code: 'expired', message: 'This invite has expired.' }
  }
  if (input.email && normalizeEmail(input.email) !== normalizeEmail(row.email)) {
    return {
      ok: false,
      code: 'email_mismatch',
      message: `Sign in as ${row.email} to accept this invite.`,
    }
  }

  const already = await getMembershipForUser(input.userId)
  if (already) {
    if (already.household.id === row.household_id) {
      return { ok: true, summary: (await getHouseholdSummary(input.userId))! }
    }
    return {
      ok: false,
      code: 'already_in_household',
      message: 'Leave your current household before accepting another invite.',
    }
  }

  const { data: household, error: hErr } = await client
    .from('households')
    .select('*')
    .eq('id', row.household_id)
    .maybeSingle()
  if (hErr || !household) {
    return { ok: false, code: 'missing_household', message: 'Household no longer exists.' }
  }

  const hh = household as HouseholdRow
  const { count: memberCount } = await client
    .from('household_members')
    .select('*', { count: 'exact', head: true })
    .eq('household_id', hh.id)
  if ((memberCount ?? 0) >= hh.seat_limit) {
    return { ok: false, code: 'seats_full', message: 'This household has no open seats.' }
  }

  await client.from('profiles').upsert(
    { id: input.userId, plan: 'free' },
    { onConflict: 'id', ignoreDuplicates: true },
  )

  const { error: memErr } = await client.from('household_members').insert({
    household_id: row.household_id,
    user_id: input.userId,
    member_role: 'member',
  })
  if (memErr) {
    console.error('[household] accept membership failed', memErr.message)
    return { ok: false, code: 'accept_failed', message: 'Could not join household.' }
  }

  await client
    .from('household_invites')
    .update({ status: 'accepted', accepted_user_id: input.userId })
    .eq('id', row.id)

  return { ok: true, summary: (await getHouseholdSummary(input.userId))! }
}
