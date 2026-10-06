import assert from 'node:assert/strict'
import { buildLocalLatinBreakdown, isLatinDetailLang } from './localLatinBreakdown'

assert.equal(isLatinDetailLang('en'), true)
assert.equal(isLatinDetailLang('it'), true)
assert.equal(isLatinDetailLang('bcl'), true)
assert.equal(isLatinDetailLang('ceb'), true)
assert.equal(isLatinDetailLang('ilo'), true)
assert.equal(isLatinDetailLang('yue'), false)

const ciao = buildLocalLatinBreakdown('Ciao !', { phraseGloss: 'Hi', lang: 'it' })
assert.ok(ciao.some((r) => r.char === 'Ciao'))
assert.equal(ciao.find((r) => r.char === '!')?.meaning, 'exclamation mark')

const apple = buildLocalLatinBreakdown('Apple', { phraseGloss: '蘋果', lang: 'en' })
assert.equal(apple.length, 1)
assert.equal(apple[0]?.char, 'Apple')
assert.equal(apple[0]?.meaning, '蘋果')

const phrase = buildLocalLatinBreakdown('Hello, world!', { phraseGloss: '你好世界' })
assert.ok(phrase.length >= 3)
assert.equal(phrase.find((r) => r.char === 'Hello')?.meaning, '')
assert.equal(phrase.find((r) => r.char === ',')?.meaning, 'comma')

console.log('localLatinBreakdown.smoke: ok')
