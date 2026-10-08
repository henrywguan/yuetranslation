import assert from 'node:assert/strict'
import { sayItBackMatches, sayItBackScore } from './sayItBackMatch.ts'

assert.equal(sayItBackScore('你好', '你好'), 1)
assert.equal(sayItBackMatches('你好嗎？', '你好嗎'), true)
assert.equal(sayItBackMatches('唔該晒', '唔該'), false)
assert.equal(sayItBackMatches('我想要一杯咖啡', '我想要一杯咖啡呀'), true)
assert.equal(sayItBackMatches('你好', 'hello'), false)
assert.equal(sayItBackMatches('', '你好'), false)
console.log('sayItBackMatch.smoke: ok')
