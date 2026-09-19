import assert from 'node:assert/strict'
import type { Response } from 'express'
import {
  allowGuestIpOrReject,
  allowIpRateOrReject,
  allowUserRateOrReject,
  resetGuestRateLimitWindowsForTests,
} from './guestRateLimit.js'
import type { AuthedRequest } from './auth.js'
import { env } from './env.js'

function mockRes() {
  const headers: Record<string, string> = {}
  let statusCode = 200
  let body: unknown = null
  const res = {
    setHeader(k: string, v: string) {
      headers[k] = v
      return res
    },
    status(code: number) {
      statusCode = code
      return res
    },
    json(payload: unknown) {
      body = payload
      return res
    },
    get statusCode() {
      return statusCode
    },
    get body() {
      return body
    },
    get headers() {
      return headers
    },
  }
  return res as unknown as Response & {
    statusCode: number
    body: unknown
    headers: Record<string, string>
  }
}

resetGuestRateLimitWindowsForTests()

const guestReq = {
  auth: undefined,
  headers: { 'x-forwarded-for': '203.0.113.50' },
  socket: { remoteAddress: '127.0.0.1' },
} as unknown as AuthedRequest

const limit = env.guestRlTranslatePerMin
assert.ok(limit > 0, 'guest translate RL should be enabled by default')

for (let i = 0; i < limit; i++) {
  const res = mockRes()
  assert.equal(
    allowGuestIpOrReject(guestReq, res, 'translate'),
    true,
    `request ${i + 1} should be allowed`,
  )
}

const blocked = mockRes()
assert.equal(allowGuestIpOrReject(guestReq, blocked, 'translate'), false)
assert.equal(blocked.statusCode, 429)

const signedIn = {
  auth: { userId: 'user-1', email: 'a@b.c' },
  headers: { 'x-forwarded-for': '203.0.113.50' },
  socket: { remoteAddress: '127.0.0.1' },
} as unknown as AuthedRequest
const signedRes = mockRes()
assert.equal(allowGuestIpOrReject(signedIn, signedRes, 'translate'), true)

resetGuestRateLimitWindowsForTests()
const pushLimit = Math.min(3, env.pushSubscribeRlPerMin || 3)
assert.ok(env.pushSubscribeRlPerMin > 0)
for (let i = 0; i < pushLimit; i++) {
  assert.equal(allowIpRateOrReject(guestReq, mockRes(), 'pushSubscribe', pushLimit), true)
}
const pushBlocked = mockRes()
assert.equal(allowIpRateOrReject(guestReq, pushBlocked, 'pushSubscribe', pushLimit), false)
assert.equal(pushBlocked.statusCode, 429)

resetGuestRateLimitWindowsForTests()
const harborLimit = Math.min(3, env.harborGiftRlPerMin || 3)
for (let i = 0; i < harborLimit; i++) {
  assert.equal(allowUserRateOrReject(mockRes(), 'user-1', 'harborGift', harborLimit), true)
}
const harborBlocked = mockRes()
assert.equal(allowUserRateOrReject(harborBlocked, 'user-1', 'harborGift', harborLimit), false)
assert.equal(harborBlocked.statusCode, 429)
// Different user still allowed
assert.equal(allowUserRateOrReject(mockRes(), 'user-2', 'harborGift', harborLimit), true)

console.log(
  JSON.stringify({
    ok: true,
    guestRlTranslatePerMin: limit,
    guestRlBreakdownPerMin: env.guestRlBreakdownPerMin,
    guestRlSpeechTokenPerMin: env.guestRlSpeechTokenPerMin,
    guestRlCameraScanPerMin: env.guestRlCameraScanPerMin,
    pushSubscribeRlPerMin: env.pushSubscribeRlPerMin,
    harborPutRlPerMin: env.harborPutRlPerMin,
    harborGiftRlPerMin: env.harborGiftRlPerMin,
  }),
)
