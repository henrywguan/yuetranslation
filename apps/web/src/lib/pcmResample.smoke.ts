import assert from 'node:assert/strict'
import { AZURE_PCM_RATE, createLinearResampler, floatTo16BitPcm } from './pcmResample.ts'

const resample = createLinearResampler(48000, AZURE_PCM_RATE)
const chunk = new Float32Array(4800)
for (let i = 0; i < chunk.length; i++) chunk[i] = Math.sin((2 * Math.PI * 440 * i) / 48000)

const a = resample(chunk)
const b = resample(chunk)
assert.ok(a.length > 0 && b.length > 0, 'resampler emits samples')
assert.ok(Math.abs(a.length - 1600) <= 2, `48 kHz/100ms → ~1600 samples at 16 kHz, got ${a.length}`)

const pcm = floatTo16BitPcm(new Float32Array([0.5, -0.5, 0]))
const view = new DataView(pcm)
assert.equal(view.getInt16(0, true), Math.round(0.5 * 0x7fff))
assert.equal(view.getInt16(2, true), Math.round(-0.5 * 0x8000))
assert.equal(view.getInt16(4, true), 0)

const passthrough = createLinearResampler(16000, 16000)
const same = new Float32Array([1, 2, 3])
assert.equal(passthrough(same), same)

console.log('pcmResample.smoke: ok', { chunkA: a.length, chunkB: b.length })
