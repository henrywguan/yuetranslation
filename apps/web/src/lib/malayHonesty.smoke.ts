import assert from 'node:assert/strict'
import {
  MALAY_HONESTY_NOTE,
  detectMalayRegisterCue,
  malayParticleHints,
  malayRegisterCueChip,
} from './malayHonesty.ts'

assert.equal(detectMalayRegisterCue('Terima kasih lah, kau hebat'), 'informal')
assert.equal(detectMalayRegisterCue('Mohon anda segera mengisi borang ini'), 'formal')
assert.equal(detectMalayRegisterCue('Anda boleh cuba je'), 'mixed')
assert.equal(detectMalayRegisterCue('Hai'), null)
assert.equal(malayRegisterCueChip('informal'), 'Casual')
assert.deepEqual(malayParticleHints('Jangan buat macam tu lah je'), ['tu', 'lah', 'je'])
assert.ok(MALAY_HONESTY_NOTE.includes('Malaysia'))
assert.ok(MALAY_HONESTY_NOTE.toLowerCase().includes('not indonesian'))
assert.ok(!MALAY_HONESTY_NOTE.toLowerCase().includes('chao'))

console.log('malayHonesty.smoke ok')
