import assert from 'node:assert/strict'
import { buildLocalScriptBreakdown, isScriptDetailLang } from './localScriptBreakdown'

assert.equal(isScriptDetailLang('ta'), true)
assert.equal(isScriptDetailLang('bn'), true)
assert.equal(isScriptDetailLang('ptpt'), false)
assert.equal(isScriptDetailLang('tr'), false)
assert.equal(isScriptDetailLang('hi'), false)

const ta = buildLocalScriptBreakdown('வணக்கம்!', 'ta', { phraseGloss: 'Hello' })
assert.equal(ta.length, 2)
assert.equal(ta[0]?.char, 'வணக்கம்')
assert.equal(ta[0]?.meaning, 'Hello')
assert.equal(ta[1]?.meaning, 'exclamation mark')

const bn = buildLocalScriptBreakdown('নমস্কার।', 'bn')
assert.ok(bn.some((r) => r.char === 'নমস্কার'))
assert.equal(bn.find((r) => r.char === '।')?.meaning, 'full stop')

const multi = buildLocalScriptBreakdown('நீங்கள் எப்படி?', 'ta', { phraseGloss: 'How are you?' })
assert.ok(multi.length >= 2)
assert.equal(multi.find((r) => r.char === 'நீங்கள்')?.meaning, '', 'multi-token keeps empty gloss offline')

console.log('localScriptBreakdown.smoke: ok')
