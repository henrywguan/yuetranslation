import assert from 'node:assert/strict'
import {
  APPLE_LIVE_TURN_API,
  appleFallsBackToAzure,
  appleLiveUsesWebSpeech,
  appleNeedsAzureStt,
  applePrefetchesSpeechToken,
  azureUsesFixedLocale,
  shouldDeferTtsStopUntilSttStarts,
} from './liveStt.ts'

assert.equal(appleLiveUsesWebSpeech(), true, 'iOS Yue/En stay on Web Speech (no Azure LID)')
assert.equal(appleLiveUsesWebSpeech('yue'), true)
assert.equal(appleLiveUsesWebSpeech('en'), true)
assert.equal(applePrefetchesSpeechToken(), false, 'default iOS path must not prefetch speech-token')
assert.equal(appleFallsBackToAzure(), false, 'Yue/En must not fall through to Azure LID')
assert.equal(APPLE_LIVE_TURN_API.speechToken, false)
assert.equal(APPLE_LIVE_TURN_API.healthOnTeardown, false)
assert.equal(APPLE_LIVE_TURN_API.historyHydrateOnTeardown, false)
assert.equal(APPLE_LIVE_TURN_API.translate, true)
assert.equal(APPLE_LIVE_TURN_API.heartbeat, true)
assert.equal(azureUsesFixedLocale('yue'), true)
assert.equal(azureUsesFixedLocale('en'), true)
assert.equal(azureUsesFixedLocale(undefined), false)

assert.equal(appleNeedsAzureStt('tl'), true, 'Safari rejects fil-PH Web Speech')
assert.equal(appleNeedsAzureStt('wuu'), true)
assert.equal(appleNeedsAzureStt('sichuan'), true)
assert.equal(appleLiveUsesWebSpeech('tl'), false, 'Tagalog mic on iPhone uses Azure fixed locale')
assert.equal(appleLiveUsesWebSpeech('sichuan'), false, 'Sichuanese mic on iPhone uses Azure fixed locale')
assert.equal(appleFallsBackToAzure('tl'), true)
assert.equal(applePrefetchesSpeechToken('tl'), true, 'Tagalog may warm speech-token on Apple')
assert.equal(applePrefetchesSpeechToken('sichuan'), true)

assert.equal(
  shouldDeferTtsStopUntilSttStarts({ apple: true, webSpeechFirst: true, ttsPlaying: true }),
  true,
  'iPhone auto-speak barge-in must start Web Speech before pausing TTS',
)
assert.equal(
  shouldDeferTtsStopUntilSttStarts({ apple: true, webSpeechFirst: true, ttsPlaying: false }),
  false,
)
assert.equal(
  shouldDeferTtsStopUntilSttStarts({ apple: false, webSpeechFirst: false, ttsPlaying: true }),
  false,
  'desktop Azure may stop TTS first',
)
assert.equal(
  shouldDeferTtsStopUntilSttStarts({ apple: true, webSpeechFirst: false, ttsPlaying: true }),
  false,
  'Tagalog Azure path on iPhone may stop TTS before Azure start',
)

console.log('liveStt.smoke: ok')
