import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const lab = readFileSync(join(here, '../components/AdminPracticePartnerLab.tsx'), 'utf8')

assert.match(lab, /unlockMicrophone/, 'Desktop Talk primes getUserMedia like Solo')
assert.match(lab, /stopMediaStream\(primed\)/, 'Release gUM before Web Speech (exclusive lock)')
assert.match(lab, /shouldForceReleaseMicOnBackground/, 'Desktop skips hide during mic permission handshake')
assert.match(lab, /bindMicBackgroundRelease/, 'Background privacy uses shared micPrivacy helper')
assert.match(lab, /startingMicRef/, 'Handshake flag so permission UI does not abort start')
assert.match(
  lab,
  /if \(!apple\)/,
  'Apple skips gUM before recognition.start (barge-in invariant)',
)
assert.doesNotMatch(
  lab,
  /document\.addEventListener\('visibilitychange',\s*onHide\)/,
  'Do not raw-stop on every visibilitychange (Solo #605 desktop bug)',
)

console.log('practicePartnerMic.smoke: ok')
