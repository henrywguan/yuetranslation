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
      const message = err instanceof Error ? err.message : String(err)
      if (
        message.toLowerCase().includes('household') ||
        message.toLowerCase().includes('schema cache')
      ) {
        console.error(
          '[startup] household usage backfill skipped — apply ' +
            'supabase/migrations/apply_011_through_015_household.sql in Supabase SQL Editor first. ' +
            message,
        )
        return
      }
      console.error('[startup] household usage backfill failed', message)
    })
}
