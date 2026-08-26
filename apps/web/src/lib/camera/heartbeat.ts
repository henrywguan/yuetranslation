import { postCameraHeartbeat } from '../api'
import type { Entitlement } from '../types'

type HeartbeatCtl = {
  start: () => void
  stop: () => Promise<void>
}

/**
 * Meters cameraSeconds while an AR or upload session is active.
 * Flushes on stop so short sessions still count.
 */
export function createCameraHeartbeat(
  onEntitlement: (ent: Entitlement) => void,
  onBlocked?: (message: string, ent?: Entitlement) => void,
): HeartbeatCtl {
  let timer: ReturnType<typeof setInterval> | null = null
  let startedAt = 0
  let reported = 0
  let active = false

  const flush = async () => {
    if (!active || !startedAt) return
    const elapsed = Math.floor((Date.now() - startedAt) / 1000)
    const delta = Math.max(0, elapsed - reported)
    if (delta <= 0) return
    reported = elapsed
    try {
      const ent = await postCameraHeartbeat(Math.min(120, delta))
      onEntitlement(ent)
      if (!ent.allowed.camera) {
        onBlocked?.('Camera minutes exhausted for this month.', ent)
      }
    } catch (e) {
      const err = e as { message?: string; entitlement?: Entitlement }
      if (err.entitlement) onEntitlement(err.entitlement)
      onBlocked?.(err.message || 'Camera metering failed', err.entitlement)
    }
  }

  return {
    start() {
      if (active) return
      active = true
      startedAt = Date.now()
      reported = 0
      timer = setInterval(() => {
        void flush()
      }, 15000)
    },
    async stop() {
      if (!active) return
      if (timer) {
        clearInterval(timer)
        timer = null
      }
      await flush()
      active = false
      startedAt = 0
      reported = 0
    },
  }
}
