/**
 * Offline checks for the Begin-drill VHS handoff curve.
 */
import assert from 'node:assert/strict'
import {
  VHS_HANDOFF_FROM,
  VHS_HANDOFF_TO,
  VHS_TRANSITION_MS,
  easeOutCubic,
  mixVhsOptions,
} from './vhsEase.ts'

assert.equal(easeOutCubic(0), 0)
assert.equal(easeOutCubic(1), 1)
assert.ok(easeOutCubic(0.5) > 0.5)

const start = mixVhsOptions(VHS_HANDOFF_FROM, VHS_HANDOFF_TO, 0)
assert.equal(start.wave, VHS_HANDOFF_FROM.wave)
assert.equal(start.exposure, VHS_HANDOFF_FROM.exposure)
assert.equal(start.jitter, VHS_HANDOFF_FROM.jitter)

const end = mixVhsOptions(VHS_HANDOFF_FROM, VHS_HANDOFF_TO, 1)
assert.ok(Math.abs((end.wave ?? 0) - VHS_HANDOFF_TO.wave) < 1e-9)
assert.ok(Math.abs((end.exposure ?? 0) - VHS_HANDOFF_TO.exposure) < 1e-9)
assert.ok((end.exposure ?? 0) > (start.exposure ?? 0))
assert.ok((end.jitter ?? 1) < (start.jitter ?? 0))

const mid = mixVhsOptions(VHS_HANDOFF_FROM, VHS_HANDOFF_TO, 0.5)
assert.ok((mid.wave ?? 0) < (start.wave ?? 0))
assert.ok((mid.wave ?? 0) > (end.wave ?? 0))

assert.ok(VHS_TRANSITION_MS >= 1000 && VHS_TRANSITION_MS <= 1800)

console.log('vhsEase.smoke: ok')
