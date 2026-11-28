/**
 * Offline smoke for #/chat owner-fallback gate (no paid APIs).
 */
import assert from 'node:assert/strict'
import { createHash, timingSafeEqual } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  SEQ_DIGEST_HEX,
  __testSignChallenge,
  __testSignGateToken,
  hasConfiguredChatGateSecret,
  resetChatGateStateForTests,
  verifyChatGateToken,
} from './chatGateUnlock.js'

const root = dirname(fileURLToPath(import.meta.url))

const seq =
  'ArrowUp|ArrowUp|ArrowDown|ArrowDown|ArrowLeft|ArrowRight|ArrowLeft|ArrowRight|KeyB|KeyA|KeyB|KeyA'
assert.equal(createHash('sha256').update(seq).digest('hex'), SEQ_DIGEST_HEX, 'sequence digest matches')

resetChatGateStateForTests()
const token = __testSignGateToken('g:test-guest', 120)
const payload = verifyChatGateToken(token)
assert.ok(payload, 'signed gate token verifies')
assert.equal(payload!.sub, 'g:test-guest')
assert.equal(payload!.scope, 'fc')

assert.equal(verifyChatGateToken('v1.bad.sig'), null, 'tampered token rejected')
assert.equal(verifyChatGateToken(__testSignGateToken('x', -10)), null, 'expired token rejected')

const nonce = 'test-nonce-abcdef'
const exp = Date.now() + 60_000
const sig = __testSignChallenge(nonce, exp)
assert.ok(sig.length >= 16, 'challenge sig produced')
const sig2 = __testSignChallenge(nonce, exp)
assert.ok(
  timingSafeEqual(Buffer.from(sig), Buffer.from(sig2)),
  'challenge sig is deterministic',
)
assert.notEqual(__testSignChallenge(nonce, exp + 1), sig, 'challenge sig binds exp')

const app = readFileSync(join(root, 'app.ts'), 'utf8')
assert.match(app, /getChatGateChallenge/, 'app registers gate challenge')
assert.match(app, /postChatGateUnlock/, 'app registers gate unlock')

const routes = readFileSync(join(root, 'deepseekChatRoutes.ts'), 'utf8')
assert.match(routes, /resolveChatCaller/, 'chat route accepts gate caller')
assert.doesNotMatch(routes, /\bkonami\b/i, 'no konami string in chat routes')

const gateSrc = readFileSync(join(root, 'chatGateUnlock.ts'), 'utf8')
assert.doesNotMatch(gateSrc, /\bkonami\b/i, 'no konami string in gate module')
assert.match(gateSrc, /timingSafeEqual/, 'unlock uses timing-safe compare')
assert.match(gateSrc, /X-Yue-Chat-Gate|x-yue-chat-gate/, 'gate header documented')
assert.match(gateSrc, /signChallenge|ch1:/, 'challenge is HMAC-signed (stateless)')
assert.doesNotMatch(gateSrc, /challenges\.set/, 'no in-memory challenge Map (serverless-safe)')
assert.match(gateSrc, /chat_gate_misconfigured/, 'misconfigured secret surfaces clear code')
assert.equal(typeof hasConfiguredChatGateSecret(), 'boolean')

console.log('chatGateUnlock.smoke: ok')
