import { cameraAccess, voiceAccess } from './entitlements.js'

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg)
}

const free = voiceAccess(30000, 0, false)
assert(free.tts === true, 'free tap-to-play should be on')
assert(free.autoSpeak === false, 'free auto-speak stays off')
assert(free.ttsRemaining === 30000, `free remaining ${free.ttsRemaining}`)
assert(free.unlimited === false, 'free is limited')

const exhausted = voiceAccess(30000, 30000, false)
assert(exhausted.tts === false, 'exhausted free quota should lock speaker')
assert(exhausted.autoSpeak === false, 'exhausted free quota should lock auto-speak')

const pro = voiceAccess(0, 10, true, true)
assert(pro.tts === true, 'pro unlimited tap-to-play should be on')
assert(pro.autoSpeak === true, 'pro auto-speak should be on')
assert(pro.unlimited === true, 'pro is unlimited')
assert(pro.ttsRemaining === -1, 'pro remaining sentinel is -1')

const heavyPro = voiceAccess(0, 9_999_999, true, true)
assert(heavyPro.tts === true, 'pro stays on after heavy usage')

const guest = voiceAccess(0, 0, false)
assert(guest.tts === false, 'zero limit without unlimited locks speaker')

const camFree = cameraAccess(5 * 60, 0, false)
assert(camFree.camera === true, 'free camera should be on')
assert(camFree.cameraRemaining === 300, 'free camera remaining 300s')

const camExhausted = cameraAccess(5 * 60, 5 * 60, false)
assert(camExhausted.camera === false, 'exhausted camera should lock')

const camPro = cameraAccess(0, 999, true)
assert(camPro.camera === true, 'pro camera unlimited')
assert(camPro.cameraRemaining === -1, 'pro camera remaining sentinel')

console.log(
  JSON.stringify({ ok: true, free, pro, exhausted, heavyPro, guest, camFree, camExhausted, camPro }),
)
