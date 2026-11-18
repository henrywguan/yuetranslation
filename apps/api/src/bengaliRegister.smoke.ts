import assert from 'node:assert/strict'
import { inferBengaliRegister, hasBengaliScript } from './bengaliRegister.js'

assert.equal(inferBengaliRegister('Hey, how are you?'), 'colloquial')
assert.equal(inferBengaliRegister('where is the station?'), 'colloquial')
assert.equal(inferBengaliRegister('Please be advised that your application for leave is approved.'), 'formal')
assert.equal(inferBengaliRegister('Dear Sir, kindly submit the medical certificate.'), 'formal')
assert.equal(inferBengaliRegister('To whom it may concern'), 'formal')
assert.equal(inferBengaliRegister(''), 'colloquial')

assert.equal(hasBengaliScript('নমস্কার, কেমন আছেন?'), true)
assert.equal(hasBengaliScript('nomoshkar'), false)
assert.equal(hasBengaliScript('नमस्ते'), false)
assert.equal(hasBengaliScript('你好'), false)

console.log('bengaliRegister.smoke: ok')
