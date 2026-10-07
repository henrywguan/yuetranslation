import assert from 'node:assert/strict'
import { inferJapaneseRegister, looksLikeJapaneseOutput } from './japaneseRegister.js'

assert.equal(inferJapaneseRegister('hello'), 'colloquial')
assert.equal(inferJapaneseRegister('How are you?'), 'colloquial')
assert.equal(inferJapaneseRegister('Please be advised that your application for employment is under review.'), 'formal')
assert.equal(inferJapaneseRegister('Dear Sir, kindly submit the medical certificate.'), 'formal')
assert.equal(inferJapaneseRegister(''), 'colloquial')

assert.equal(looksLikeJapaneseOutput('こんにちは'), true)
assert.equal(looksLikeJapaneseOutput('東京'), true)
assert.equal(looksLikeJapaneseOutput('出口'), true)
assert.equal(looksLikeJapaneseOutput('行きます'), true)
assert.equal(looksLikeJapaneseOutput('hello'), false)
assert.equal(looksLikeJapaneseOutput('这是一个很长的中文句子没有假名'), false)

console.log('japaneseRegister.smoke ok')
