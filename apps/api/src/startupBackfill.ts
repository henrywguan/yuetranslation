import { env } from './env.js'
import { backfillHouseholdUsageFromLegacy } from './household.js'

let scheduled = false

/** Idempotent: fold legacy per-user usage into household pools on cold start when enabled. */
export function scheduleHouseholdUsageBackfillOnStartup(): void {
  if (scheduled || !env.runHouseholdUsageBackfill) return
  scheduled = true
  void backfillHouseholdUsageFromLegacy()
    .then((result) => {
      console.log('[startup] household usage backfill complete', result)
    })
    .catch((err) => {
      console.error(
        '[startup] household usage backfill failed',
        err instanceof Error ? err.message : err,
      )
    })
}
