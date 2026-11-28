/**
 * Static guards for #/chat sign-in gate + quiet chord unlock (no paid APIs).
 */
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(fileURLToPath(import.meta.url))

const gate = readFileSync(join(root, '../components/ChatSignInGate.tsx'), 'utf8')
assert.match(gate, /Continue with Google/, 'gate shows Google CTA')
assert.match(gate, /signInWithGoogle/, 'gate uses existing Google OAuth helper')
assert.match(gate, /openAuthScreen/, 'email path keeps openAuthScreen')
assert.match(gate, /attachChatGateChord/, 'gate attaches quiet chord listener')
assert.match(gate, /tabIndex=\{-1\}/, 'gate root is focusable for chord keys')
assert.match(gate, /onResult/, 'gate surfaces unlock fail/success')
assert.doesNotMatch(gate, /\bkonami\b/i, 'no konami string in gate UI')

const chord = readFileSync(join(root, './chatGateChord.ts'), 'utf8')
assert.match(chord, /CHUNKS/, 'sequence is chunked')
assert.match(chord, /document\.addEventListener\('keydown'/, 'chord listens on document')
assert.match(chord, /ev\.repeat/, 'chord ignores key repeat')
assert.doesNotMatch(chord, /ArrowUp/, 'no plaintext ArrowUp in chord source')
assert.doesNotMatch(chord, /\bkonami\b/i, 'no konami string in chord source')

const redeem = readFileSync(join(root, './chatGateRedeem.ts'), 'utf8')
assert.match(redeem, /challenge\.s/, 'redeem echoes signed challenge')
assert.match(redeem, /chat_gate_misconfigured/, 'redeem maps misconfigured secret')
assert.match(redeem, /ChatGateRedeemResult/, 'redeem returns typed result')

const session = readFileSync(join(root, './chatGateSession.ts'), 'utf8')
assert.match(session, /X-Yue-Chat-Gate/, 'session exposes gate header')
assert.doesNotMatch(session, /grantFamily|familyUnlocked|isFamily/i, 'no plaintext Family grant flag name')

const access = readFileSync(join(root, './chatAccess.ts'), 'utf8')
assert.match(access, /hasChatGateSession/, 'chat access honors gate session')

const page = readFileSync(join(root, '../pages/ChatPage.tsx'), 'utf8')
assert.match(page, /ChatSignInGate/, 'classic chat uses shared gate')
assert.match(page, /useChatGateUnlocked/, 'classic chat reacts to unlock')

const aui = readFileSync(join(root, '../pages/chat/aui/ChatAuiPage.tsx'), 'utf8')
assert.match(aui, /ChatSignInGate/, 'AUI chat uses shared gate')

const xorKey = [0x5a, 0x3c, 0x91, 0xe2, 0x17, 0xb4, 0x6d, 0x08]
const chunks = [
  'G07jjWDhHXQbTuONYOEddBtO441g8AJ/',
  'NEDQkGXbGkw1S/+eVsYfZy1w9IRjyCx6',
  'KFPmsH7TBXwmfeOQeMMhbTxI7aNlxgJ/',
  'CFX2imPIJm0jfu2pcs0sdBFZ6KBr/whxGw==',
]
const bytes = Buffer.concat(chunks.map((c) => Buffer.from(c, 'base64')))
const plain = Buffer.from(bytes.map((b, i) => b ^ xorKey[i % xorKey.length]!)).toString('utf8')
const expected =
  'ArrowUp|ArrowUp|ArrowDown|ArrowDown|ArrowLeft|ArrowRight|ArrowLeft|ArrowRight|KeyB|KeyA|KeyB|KeyA'
assert.equal(plain, expected, 'chunk decode reconstructs quiet chord')
assert.equal(
  createHash('sha256').update(plain).digest('hex'),
  'd22a4df7b8813bec0669fb233dafee7bc7abe426c9281e8f7ea873263072537c',
  'decoded chord matches server digest',
)

console.log('chatGate.smoke: ok')
