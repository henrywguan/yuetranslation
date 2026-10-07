import assert from 'node:assert/strict'
import { kanaToRomaji, detailReadingJapanese } from './japaneseReading.ts'
import {
  detectJapanesePoliteness,
  japanesePolitenessChip,
  JAPANESE_HONESTY_NOTE,
} from './japanesePoliteness.ts'

assert.equal(kanaToRomaji('こんにちは'), 'konnichiwa')
assert.equal(kanaToRomaji('ありがとう'), 'arigatou')
assert.equal(kanaToRomaji('しゃしん'), 'shashin')
assert.equal(kanaToRomaji('がっこう'), 'gakkou')
assert.equal(kanaToRomaji('hello'), null)

assert.equal(detailReadingJapanese('こんにちは'), 'konnichiwa')
assert.equal(detailReadingJapanese('ありがとうございます'), 'arigatou gozaimasu')
assert.equal(detailReadingJapanese('大丈夫'), 'daijoubu')
// Mixed kanji + kana without phrase map → no invented reading
assert.equal(detailReadingJapanese('行きます'), null)

assert.equal(detectJapanesePoliteness('ありがとうございます'), 'desu-masu')
assert.equal(detectJapanesePoliteness('わかりました'), 'desu-masu')
assert.equal(detectJapanesePoliteness('これは本です'), 'desu-masu')
assert.equal(detectJapanesePoliteness('行く'), 'plain')
assert.equal(detectJapanesePoliteness('いただきます'), 'keigo')
assert.equal(japanesePolitenessChip('desu-masu'), 'です・ます')
assert.ok(JAPANESE_HONESTY_NOTE.includes('です・ます'))

console.log('japanese.smoke ok')
