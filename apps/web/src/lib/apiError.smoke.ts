import assert from 'node:assert/strict'
import {
  CHAT_STREAM_NETWORK_MESSAGE,
  SECURITY_CHECKPOINT_MESSAGE,
  humanizeThrownError,
  isHtmlOrCheckpoint,
  isTransientChatNetworkError,
  messageFromApiBody,
  sanitizeErrorMessage,
} from './apiError.ts'

const checkpoint = `<!DOCTYPE html><html lang="en"><head><title>Vercel Security Checkpoint</title></head><body><p>We're verifying your browser</p></body></html>`

assert.equal(isHtmlOrCheckpoint(checkpoint), true)
assert.equal(messageFromApiBody(403, checkpoint), SECURITY_CHECKPOINT_MESSAGE)
assert.equal(sanitizeErrorMessage(`Error: ${checkpoint}`), SECURITY_CHECKPOINT_MESSAGE)
assert.equal(
  humanizeThrownError(new Error(checkpoint)),
  SECURITY_CHECKPOINT_MESSAGE,
)
assert.equal(
  sanitizeErrorMessage("Unexpected token '<' at position 0"),
  SECURITY_CHECKPOINT_MESSAGE,
)

assert.equal(messageFromApiBody(402, '{"message":"Quota exceeded"}'), 'Quota exceeded')
assert.equal(messageFromApiBody(500, ''), 'Request failed (500)')
assert.equal(messageFromApiBody(400, 'too loud'), 'too loud')

const long = 'x'.repeat(400)
assert.ok(sanitizeErrorMessage(long).endsWith('…'))
assert.ok(sanitizeErrorMessage(long).length < 230)

assert.equal(isTransientChatNetworkError('Loading failed'), true)
assert.equal(isTransientChatNetworkError('Load failed'), true)
assert.equal(isTransientChatNetworkError('Failed to fetch'), true)
assert.equal(isTransientChatNetworkError('Quota exceeded'), false)
assert.equal(sanitizeErrorMessage('Loading failed'), CHAT_STREAM_NETWORK_MESSAGE)
assert.equal(humanizeThrownError(new Error('Load failed')), CHAT_STREAM_NETWORK_MESSAGE)
assert.match(CHAT_STREAM_NETWORK_MESSAGE, /Search \/ DeepThink/i)

console.log('apiError.smoke: ok')
