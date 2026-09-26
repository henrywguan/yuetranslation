/**
 * Offline smoke for the Practice Partner fail buzz (no AudioContext required).
 */
import assert from 'node:assert/strict'
import {
  PRACTICE_PARTNER_FAIL_SFX_DURATION_MS,
  PRACTICE_PARTNER_FAIL_SFX_NOTES,
  practicePartnerFailSfxDurationMs,
} from './practicePartnerFailSfx.ts'

assert.ok(PRACTICE_PARTNER_FAIL_SFX_NOTES.length >= 3, 'buzz has at least three notes')
assert.ok(
  PRACTICE_PARTNER_FAIL_SFX_DURATION_MS >= 300 && PRACTICE_PARTNER_FAIL_SFX_DURATION_MS <= 900,
  'buzz stays short so TTS is not delayed',
)
const span = practicePartnerFailSfxDurationMs()
assert.ok(span >= 300 && span <= 900, `scheduled span ${span}ms stays under 1s`)
assert.ok(
  PRACTICE_PARTNER_FAIL_SFX_NOTES.every((n) => n.freq > 80 && n.dur > 0),
  'notes are audible and positive',
)
assert.ok(
  PRACTICE_PARTNER_FAIL_SFX_NOTES[0].freq > PRACTICE_PARTNER_FAIL_SFX_NOTES[2].freq,
  'fail cue descends',
)

console.log('practicePartnerFailSfx.smoke: ok')
