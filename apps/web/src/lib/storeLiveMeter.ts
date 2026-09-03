import { postHeartbeat } from './api'
import type { Entitlement } from './types'

/** Minimal store surface used by live metering. */
export type LiveMeterState = {
  entitlement: Entitlement | null
  stopLive: () => Promise<void>
}

type Get = () => LiveMeterState
type Set = (p: Partial<{ entitlement: Entitlement | null; error: string | null }>) => void

let heartbeatTimer: ReturnType<typeof setInterval> | null = null
/** Wall-clock start of the current live meter window (ms). */
let liveMeterStartedAt = 0
/** Seconds already reported to /usage/heartbeat for this window. */
let liveMeterReportedSec = 0
/** Store accessors for async meter callbacks. */
let liveMeterCtl: {
  get: Get
  set: Set
} | null = null

function flushLiveMeter() {
  if (!liveMeterStartedAt) return
  const startedAt = liveMeterStartedAt
  const elapsedSec = Math.max(0, Math.floor((Date.now() - startedAt) / 1000))
  const delta = Math.min(120, elapsedSec - liveMeterReportedSec)
  if (delta <= 0) return
  liveMeterReportedSec += delta
  const ctl = liveMeterCtl
  void postHeartbeat(delta)
    .then((ent) => {
      ctl?.set({ entitlement: ent })
      if (!ent.allowed.live) {
        void ctl?.get().stopLive()
        ctl?.set({ error: 'Live minutes exhausted for this month.' })
      }
    })
    .catch((err) => {
      if (liveMeterStartedAt === startedAt) {
        liveMeterReportedSec = Math.max(0, liveMeterReportedSec - delta)
      }
      if (err?.code === 401 || err?.code === 402) {
        void ctl?.get().stopLive()
        ctl?.set({
          error: err.message,
          entitlement: err.entitlement || ctl.get().entitlement,
        })
      }
    })
}

export function startHeartbeat(get: Get, set: Set) {
  stopHeartbeat()
  liveMeterCtl = { get, set }
  liveMeterStartedAt = Date.now()
  liveMeterReportedSec = 0
  heartbeatTimer = setInterval(() => {
    flushLiveMeter()
  }, 15000)
}

export function stopHeartbeat() {
  // Charge remaining seconds before clearing — short hold/tap sessions never
  // reached the 15s interval, so live usage previously stayed at 0.
  flushLiveMeter()
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer)
    heartbeatTimer = null
  }
  liveMeterStartedAt = 0
  liveMeterReportedSec = 0
}
