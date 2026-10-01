import assert from 'node:assert/strict'
import { noteBetterLine, notePartnerLine, noteYouSaid } from './practicePartnerThread.ts'

const opened = notePartnerLine([], { zh: '你好', en: 'hello' })
assert.equal(opened[0]?.partnerZh, '你好')
const answered = noteYouSaid(opened, 'hello')
assert.equal(answered[0]?.you, 'hello')
const better = noteBetterLine(answered, '你好')
assert.equal(better[0]?.betterZh, '你好')
const reply = notePartnerLine(better, { zh: '飲茶', en: 'yum cha' })
assert.equal(reply.length, 2)
assert.equal(reply[0]?.you, 'hello')
assert.equal(reply[1]?.partnerZh, '飲茶')

console.log('practicePartnerThread.smoke: ok')
