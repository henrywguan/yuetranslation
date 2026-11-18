/**
 * Offline smoke: missing `allowed` must not throw on chat/PlanChip paths.
 * Run: npx tsx apps/web/src/lib/normalizeEntitlement.smoke.ts
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { canShowMetric } from '../components/planChipHelpers'
import { normalizeEntitlement } from './normalizeEntitlement'
import type { Entitlement } from './types'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..')

const base = {
  loggedIn: true,
  requireLogin: true,
  plan: 'family' as const,
  isAdmin: true,
  limits: {
    plan: 'family',
    live_minutes: 480,
    tts_chars: 0,
    auto_speak: true,
    can_live: true,
    text_translate: true,
  },
  usage: { month: '2026-11', liveSeconds: 0, ttsChars: 0, translateCount: 0 },
  remaining: { liveSeconds: 999, ttsChars: -1 },
  upgradeUrl: '/',
  loginUrl: '/',
  reason: null,
}

const missing = { ...base } as Entitlement
assert.equal(missing.allowed, undefined)

const normalized = normalizeEntitlement(missing)
assert.ok(normalized.allowed)
assert.equal(normalized.allowed.chat, true)
assert.equal(normalized.allowed.live, true)
assert.equal(normalized.allowed.autoSpeak, true)

assert.doesNotThrow(() => canShowMetric('live', missing, false), 'PlanChip canShowMetric tolerates missing allowed')
assert.equal(canShowMetric('live', missing, false), true)

const speak = readFileSync(join(root, 'components/SpeakButton.tsx'), 'utf8')
assert.match(speak, /entitlement\.allowed\?\.tts/, 'SpeakButton optional-chains allowed.tts')
assert.doesNotMatch(speak, /entitlement\.allowed\.tts/, 'SpeakButton must not bare-read allowed.tts')

const helpers = readFileSync(join(root, 'components/planChipHelpers.ts'), 'utf8')
assert.match(helpers, /entitlement\.allowed\?\.live/, 'canShowMetric optional-chains allowed.live')

const store = readFileSync(join(here, 'store.ts'), 'utf8')
assert.match(store, /normalizeEntitlement/, 'bootstrap normalizes entitlement')

const meter = readFileSync(join(here, 'storeLiveMeter.ts'), 'utf8')
assert.match(meter, /ctl\?\.get\(\)\.entitlement/, 'live meter catch optional-chains ctl (Vercel tsc)')

const main = readFileSync(join(root, 'main.tsx'), 'utf8')
assert.match(main, /AppErrorBoundary/, 'root wraps AppErrorBoundary so throws do not empty #root')

const thread = readFileSync(join(root, 'pages/chat/aui/ChatAuiThread.tsx'), 'utf8')
assert.match(thread, /EMPTY_SOURCES/, 'AUI sources selector uses stable empty array')

console.log('normalizeEntitlement.smoke: ok')
