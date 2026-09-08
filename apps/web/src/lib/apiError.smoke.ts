import assert from 'node:assert/strict'
import {
  SECURITY_CHECKPOINT_MESSAGE,
  humanizeThrownError,
  isHtmlOrCheckpoint,
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

console.log('apiError.smoke: ok')
