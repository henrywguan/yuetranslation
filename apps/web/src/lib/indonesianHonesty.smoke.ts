import assert from 'node:assert/strict'
import {
  INDONESIAN_HONESTY_NOTE,
  detectIndonesianRegisterCue,
  indonesianParticleHints,
  indonesianRegisterCueChip,
} from './indonesianHonesty.ts'

assert.equal(detectIndonesianRegisterCue('Makasih ya, kamu hebat banget'), 'informal')
assert.equal(detectIndonesianRegisterCue('Mohon Anda segera mengisi formulir ini'), 'formal')
assert.equal(detectIndonesianRegisterCue('Anda bisa coba dong'), 'mixed')
assert.equal(detectIndonesianRegisterCue('Halo'), null)
assert.equal(indonesianRegisterCueChip('informal'), 'Casual')
assert.deepEqual(indonesianParticleHints('Jangan gitu dong deh'), ['dong', 'deh'])
assert.ok(INDONESIAN_HONESTY_NOTE.includes('Jakarta'))
assert.ok(!INDONESIAN_HONESTY_NOTE.toLowerCase().includes('chao'))

console.log('indonesianHonesty.smoke ok')
