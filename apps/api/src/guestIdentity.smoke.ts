/**
 * Offline smoke: device id wins across IP change; IP registry survives cookie wipe.
 */
import assert from 'node:assert/strict'
import type { Request } from 'express'
import {
  GUEST_DEVICE_HEADER,
  resetGuestIdentityMemoryForTests,
  resolveGuestIdentity,
} from './guestId.js'

function fakeReq(opts: { ip: string; device?: string }): Request {
  return {
    headers: {
      'x-forwarded-for': opts.ip,
      ...(opts.device ? { [GUEST_DEVICE_HEADER]: opts.device } : {}),
    },
    socket: { remoteAddress: opts.ip },
  } as unknown as Request
}

async function main() {
  resetGuestIdentityMemoryForTests()

  const deviceA = '11111111-1111-4111-8111-111111111111'
  const first = await resolveGuestIdentity(fakeReq({ ip: '203.0.113.10', device: deviceA }))
  assert.ok(first.guestId)

  // Same device, new IP (VPN) → same guest id
  const vpn = await resolveGuestIdentity(fakeReq({ ip: '198.51.100.20', device: deviceA }))
  assert.equal(vpn.guestId, first.guestId, 'device should survive IP/VPN change')

  // Cookie wipe simulation: no device header, original IP → same guest via network registry
  const wipe = await resolveGuestIdentity(fakeReq({ ip: '203.0.113.10' }))
  assert.equal(wipe.guestId, first.guestId, 'IP registry should survive cookie/device wipe on same network')

  // New device on a fresh IP → different guest
  resetGuestIdentityMemoryForTests()
  const other = await resolveGuestIdentity(
    fakeReq({ ip: '192.0.2.50', device: '22222222-2222-4222-8222-222222222222' }),
  )
  assert.notEqual(other.guestId, first.guestId)

  console.log(JSON.stringify({ ok: true, guestId: first.guestId, vpnSame: true, wipeSame: true }))
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
