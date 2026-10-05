import assert from 'node:assert/strict'
import { romanizeKorean } from './koreanRomanization.ts'
import {
  detectKoreanSpeechLevel,
  koreanSpeechLevelChip,
  KOREAN_HONESTY_NOTE,
} from './koreanSpeechLevel.ts'

assert.equal(romanizeKorean('안녕하세요'), 'annyeonghaseyo')
assert.equal(romanizeKorean('감사합니다'), 'gamsahamnida')
assert.equal(romanizeKorean('사랑해요'), 'saranghaeyo')
assert.equal(romanizeKorean('한국'), 'hanguk')
assert.equal(romanizeKorean('학교'), 'hakkyo')
assert.equal(romanizeKorean('친구'), 'chingu')
assert.equal(romanizeKorean('물'), 'mul')
assert.equal(romanizeKorean('hello'), null)

assert.equal(detectKoreanSpeechLevel('안녕하세요'), 'haeyo')
assert.equal(detectKoreanSpeechLevel('감사합니다'), 'hamnida')
assert.equal(detectKoreanSpeechLevel('사랑해요'), 'haeyo')
assert.equal(detectKoreanSpeechLevel('먹자'), 'hae')
assert.equal(koreanSpeechLevelChip('haeyo'), '해요')
assert.ok(KOREAN_HONESTY_NOTE.includes('batchim'))

console.log('korean.smoke ok')
