import { voiceAccess } from './entitlements.js'

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg)
}

const free = voiceAccess(30000, 0, false)
assert(free.tts === true, 'free tap-to-play should be on')
assert(free.autoSpeak === false, 'free auto-speak stays off')
assert(free.ttsRemaining === 30000, `free remaining ${free.ttsRemaining}`)

const exhausted = voiceAccess(30000, 30000, false)
assert(exhausted.tts === true, 'tap-to-play stays free even when metered chars are exhausted')
assert(exhausted.autoSpeak === false, 'exhausted free plan still has no auto-speak')

const pro = voiceAccess(200000, 10, true)
assert(pro.tts === true, 'pro tap-to-play should be on')
assert(pro.autoSpeak === true, 'pro auto-speak should be on')

const guest = voiceAccess(0, 0, false)
assert(guest.tts === true, 'guests get free tap-to-play')
assert(guest.autoSpeak === false, 'guests do not get auto-speak')

console.log(JSON.stringify({ ok: true, free, pro, exhausted, guest }))
