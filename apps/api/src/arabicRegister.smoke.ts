import assert from 'node:assert/strict'
import { hasArabicScript, inferArabicRegister } from './arabicRegister.js'

assert.equal(inferArabicRegister('where is the metro?'), 'colloquial')
assert.equal(inferArabicRegister('Please be advised that your application for leave is approved.'), 'formal')
assert.equal(inferArabicRegister('Dear Sir, kindly submit the medical certificate.'), 'formal')
assert.equal(inferArabicRegister(''), 'colloquial')

assert.equal(hasArabicScript('إزيك عامل إيه؟'), true)
assert.equal(hasArabicScript('كيف حالك؟'), true)
assert.equal(hasArabicScript('ezayak 3amel eh'), false)
assert.equal(hasArabicScript('你好'), false)

console.log('arabicRegister.smoke ok')
