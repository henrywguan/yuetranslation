import assert from 'node:assert/strict'
import { appleLiveUsesWebSpeech, azureUsesFixedLocale } from './liveStt.ts'

assert.equal(appleLiveUsesWebSpeech(), true, 'iOS must not divert later taps to Azure LID')
assert.equal(azureUsesFixedLocale('yue'), true)
assert.equal(azureUsesFixedLocale('en'), true)
assert.equal(azureUsesFixedLocale(undefined), false)

console.log('liveStt.smoke: ok')
