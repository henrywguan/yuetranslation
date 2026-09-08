import assert from 'node:assert/strict'
import {
  APPLE_LIVE_TURN_API,
  appleFallsBackToAzure,
  appleLiveUsesWebSpeech,
  applePrefetchesSpeechToken,
  azureUsesFixedLocale,
} from './liveStt.ts'

assert.equal(appleLiveUsesWebSpeech(), true, 'iOS must not divert later taps to Azure LID')
assert.equal(applePrefetchesSpeechToken(), false, 'iOS must not prefetch /api/speech-token')
assert.equal(appleFallsBackToAzure(), false, 'iOS must not mint Azure when Web Speech fails')
assert.equal(APPLE_LIVE_TURN_API.speechToken, false)
assert.equal(APPLE_LIVE_TURN_API.healthOnTeardown, false)
assert.equal(APPLE_LIVE_TURN_API.historyHydrateOnTeardown, false)
assert.equal(APPLE_LIVE_TURN_API.translate, true)
assert.equal(APPLE_LIVE_TURN_API.heartbeat, true)
assert.equal(azureUsesFixedLocale('yue'), true)
assert.equal(azureUsesFixedLocale('en'), true)
assert.equal(azureUsesFixedLocale(undefined), false)

console.log('liveStt.smoke: ok')
