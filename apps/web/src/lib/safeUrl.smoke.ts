import assert from 'node:assert/strict'
import {
  isSafeAppUrl,
  sanitizeApiBase,
  sanitizeLeaveUrl,
  sanitizePushNavigateUrl,
} from './safeUrl.ts'

const origin = 'https://www.jyuttranslate.com'

assert.equal(sanitizeApiBase(null, '/api', origin), '/api')
assert.equal(sanitizeApiBase('/api', '/api', origin), '/api')
assert.equal(sanitizeApiBase('/api/v2', '/api', origin), '/api/v2')
assert.equal(sanitizeApiBase('https://evil.example/api', '/api', origin), '/api')
assert.equal(sanitizeApiBase('//evil.example/api', '/api', origin), '/api')
assert.equal(sanitizeApiBase('https://www.jyuttranslate.com/api', '/api', origin), '/api')
assert.equal(sanitizeApiBase('http://evil.example', '/api', origin), '/api')

assert.equal(sanitizeLeaveUrl('https://evil.example/phish', origin), null)
assert.ok(sanitizeLeaveUrl('/pricing', origin) === '/pricing')
assert.ok(sanitizeLeaveUrl('https://www.jyuttranslate.com/pricing', origin)?.includes('jyuttranslate.com'))

assert.equal(sanitizePushNavigateUrl('https://evil.example/', origin), '#/app')
assert.equal(sanitizePushNavigateUrl('#/learn', origin), '#/learn')
assert.equal(sanitizePushNavigateUrl('/app', origin), '/app')
assert.equal(isSafeAppUrl('https://evil.example/', origin), false)
assert.equal(isSafeAppUrl('#/admin', origin), true)

console.log('safeUrl.smoke: ok')
