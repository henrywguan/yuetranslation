import assert from 'node:assert/strict'
import {
  JAVANESE_HONESTY_NOTE,
  detectJavaneseSpeechLevel,
  javaneseSpeechLevelChip,
} from './javaneseHonesty.ts'

assert.equal(detectJavaneseSpeechLevel('Piye kabare, kowe wis mangan?'), 'ngoko')
assert.equal(detectJavaneseSpeechLevel('Sampeyan napa?'), 'madya')
assert.equal(detectJavaneseSpeechLevel('Matur nuwun, panjenengan sampun rawuh'), 'krama')
assert.equal(detectJavaneseSpeechLevel('Kula mboten ngerti, nanging kowe wis ngomong'), 'mixed')
assert.equal(detectJavaneseSpeechLevel('Halo'), null)
assert.equal(javaneseSpeechLevelChip('ngoko'), 'Ngoko')
assert.ok(JAVANESE_HONESTY_NOTE.toLowerCase().includes('undha-usuk') || JAVANESE_HONESTY_NOTE.includes('ngoko'))
assert.ok(!JAVANESE_HONESTY_NOTE.toLowerCase().includes('chao'))

console.log('javaneseHonesty.smoke ok')
