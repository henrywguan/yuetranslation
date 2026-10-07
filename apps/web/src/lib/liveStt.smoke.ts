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
assert.equal(appleNeedsAzureStt('id'), false, 'id stays on Web Speech on iPhone')
assert.equal(appleLiveUsesWebSpeech('id'), true, 'id mic on iPhone uses Web Speech')
assert.equal(appleNeedsAzureStt('ms'), false, 'ms stays on Web Speech on iPhone')
assert.equal(appleLiveUsesWebSpeech('ms'), true, 'ms mic on iPhone uses Web Speech')
assert.equal(appleNeedsAzureStt('pt'), false, 'pt stays on Web Speech on iPhone')
assert.equal(appleLiveUsesWebSpeech('pt'), true, 'pt mic on iPhone uses Web Speech')
assert.equal(appleNeedsAzureStt('fr'), false, 'fr stays on Web Speech on iPhone')
assert.equal(appleLiveUsesWebSpeech('fr'), true, 'fr mic on iPhone uses Web Speech')
assert.equal(appleNeedsAzureStt('hi'), false, 'hi stays on Web Speech on iPhone')
assert.equal(appleLiveUsesWebSpeech('hi'), true, 'hi mic on iPhone uses Web Speech')
assert.equal(appleNeedsAzureStt('km'), false, 'km stays on Web Speech on iPhone')
assert.equal(appleLiveUsesWebSpeech('km'), true, 'km mic on iPhone uses Web Speech')
assert.equal(appleNeedsAzureStt('my'), false, 'my stays on Web Speech on iPhone')
assert.equal(appleLiveUsesWebSpeech('my'), true, 'my mic on iPhone uses Web Speech')
assert.equal(appleNeedsAzureStt('jv'), false, 'jv stays on Web Speech on iPhone')
assert.equal(appleLiveUsesWebSpeech('jv'), true, 'jv mic on iPhone uses Web Speech')
assert.equal(appleNeedsAzureStt('it'), false, 'it stays on Web Speech on iPhone')
assert.equal(appleLiveUsesWebSpeech('it'), true, 'it mic on iPhone uses Web Speech')
assert.equal(appleNeedsAzureStt('de'), false, 'de stays on Web Speech on iPhone')
assert.equal(appleLiveUsesWebSpeech('de'), true, 'de mic on iPhone uses Web Speech')
assert.equal(appleNeedsAzureStt('nl'), false, 'nl stays on Web Speech on iPhone')
assert.equal(appleLiveUsesWebSpeech('nl'), true, 'nl mic on iPhone uses Web Speech')
assert.equal(appleNeedsAzureStt('ja'), false, 'ja stays on Web Speech on iPhone')
assert.equal(appleLiveUsesWebSpeech('ja'), true, 'ja mic on iPhone uses Web Speech')
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
