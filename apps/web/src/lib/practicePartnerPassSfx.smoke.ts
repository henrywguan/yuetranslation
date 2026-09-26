/**
 * Offline smoke for the Practice Partner pass chime (no AudioContext required).
 */
import assert from 'node:assert/strict'
import {
  PRACTICE_PARTNER_PASS_SFX_DURATION_MS,
  PRACTICE_PARTNER_PASS_SFX_NOTES,
  practicePartnerPassSfxDurationMs,
} from './practicePartnerPassSfx.ts'

assert.ok(PRACTICE_PARTNER_PASS_SFX_NOTES.length >= 3, 'sparkle has at least three notes')
assert.ok(
  PRACTICE_PARTNER_PASS_SFX_DURATION_MS >= 350 && PRACTICE_PARTNER_PASS_SFX_DURATION_MS <= 900,
  'chime stays short so TTS is not delayed',
)
const span = practicePartnerPassSfxDurationMs()
assert.ok(span >= 350 && span <= 900, `scheduled span ${span}ms stays under 1s`)
assert.ok(
  PRACTICE_PARTNER_PASS_SFX_NOTES.every((n) => n.freq > 100 && n.dur > 0),
  'notes are audible and positive',
)

console.log('practicePartnerPassSfx.smoke: ok')
