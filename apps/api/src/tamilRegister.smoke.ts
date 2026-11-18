import assert from 'node:assert/strict'
import { inferTamilRegister, hasTamilScript } from './tamilRegister.js'

assert.equal(inferTamilRegister('Hey, how are you?'), 'colloquial')
assert.equal(inferTamilRegister('where is the bus stand?'), 'colloquial')
assert.equal(inferTamilRegister('Please be advised that your application for leave is approved.'), 'formal')
assert.equal(inferTamilRegister('Dear Sir, kindly submit the medical certificate.'), 'formal')
assert.equal(inferTamilRegister('To whom it may concern'), 'formal')
assert.equal(inferTamilRegister(''), 'colloquial')

assert.equal(hasTamilScript('வணக்கம், எப்படி இருக்கீங்க?'), true)
assert.equal(hasTamilScript('vanakkam'), false)
assert.equal(hasTamilScript('नमस्ते'), false)
assert.equal(hasTamilScript('你好'), false)

console.log('tamilRegister.smoke: ok')
