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

const family = voiceAccess(0, 10, true, true)
assert(family.tts === true, 'family unlimited tap-to-play should be on')
assert(family.autoSpeak === true, 'family auto-speak should be on')
assert(family.unlimited === true, 'family is unlimited')
assert(family.ttsRemaining === -1, 'family remaining sentinel is -1')

const heavyFamily = voiceAccess(0, 9_999_999, true, true)
assert(heavyFamily.tts === true, 'family stays on after heavy usage')

const guest = voiceAccess(0, 0, false)
assert(guest.tts === false, 'zero limit without unlimited locks speaker')

const camFree = cameraAccess(60 * 60, 0, false)
assert(camFree.camera === true, 'free camera should be on')
assert(camFree.cameraRemaining === 3600, 'free camera remaining 3600s')

const camExhausted = cameraAccess(60 * 60, 60 * 60, false)
assert(camExhausted.camera === false, 'exhausted camera should lock')

const camFamily = cameraAccess(8 * 60 * 60, 999, false)
assert(camFamily.camera === true, 'family camera within 8hr cap')
assert(camFamily.cameraRemaining === 8 * 60 * 60 - 999, 'family camera remaining')

const camFamilyExhausted = cameraAccess(8 * 60 * 60, 8 * 60 * 60, false)
assert(camFamilyExhausted.camera === false, 'family camera exhausted at 8hr')

const camBusiness = cameraAccess(0, 999, true)
assert(camBusiness.camera === true, 'business camera unlimited')
assert(camBusiness.cameraRemaining === -1, 'business camera remaining sentinel')

console.log(
  JSON.stringify({
    ok: true,
    free,
    family,
    exhausted,
    heavyFamily,
    guest,
    camFree,
    camExhausted,
    camFamily,
    camFamilyExhausted,
    camBusiness,
  }),
)
