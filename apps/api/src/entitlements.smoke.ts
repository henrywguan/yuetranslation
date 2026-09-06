import { aiVisionAccess, cameraAccess, voiceAccess } from './entitlements.js'

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

const camGuest = cameraAccess(30, 0, false)
assert(camGuest.camera === true, 'guest camera scans should be on')
assert(camGuest.cameraRemaining === 30, 'guest camera remaining 30 scans')

const camFree = cameraAccess(120, 0, false)
assert(camFree.camera === true, 'free camera should be on')
assert(camFree.cameraRemaining === 120, 'free camera remaining 120 scans')

const camExhausted = cameraAccess(120, 120, false)
assert(camExhausted.camera === false, 'exhausted camera scans should lock')

const camFamily = cameraAccess(800, 100, false)
assert(camFamily.camera === true, 'family camera within 800 scan cap')
assert(camFamily.cameraRemaining === 700, 'family camera remaining')

const camFamilyExhausted = cameraAccess(800, 800, false)
assert(camFamilyExhausted.camera === false, 'family camera exhausted at 800 scans')

const camBusiness = cameraAccess(0, 999, true)
assert(camBusiness.camera === true, 'business camera unlimited')
assert(camBusiness.cameraRemaining === -1, 'business camera remaining sentinel')

const aiOk = aiVisionAccess(200, 0)
assert(aiOk.aiVision === true, 'ai vision within cap')
assert(aiOk.aiVisionRemaining === 200, 'ai vision remaining')
const aiDone = aiVisionAccess(200, 200)
assert(aiDone.aiVision === false, 'ai vision exhausted')
assert(aiDone.aiVisionRemaining === 0, 'ai vision remaining 0')
const aiBiz = aiVisionAccess(10000, 9999)
assert(aiBiz.aiVision === true, 'business ai vision near cap still on')

console.log(
  JSON.stringify({
    ok: true,
    free,
    family,
    exhausted,
    heavyFamily,
    guest,
    camGuest,
    camFree,
    camExhausted,
    camFamily,
    camFamilyExhausted,
    camBusiness,
    aiOk,
    aiDone,
    aiBiz,
  }),
)
