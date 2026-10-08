import assert from 'node:assert/strict'
import { getOfflinePack, offlinePackManifest, OFFLINE_PACK_VERSION } from './offlinePack.ts'

const manifest = offlinePackManifest()
assert.equal(manifest.version, OFFLINE_PACK_VERSION)
assert.equal(manifest.packs.length, 2)
assert.ok(manifest.packs.every((p) => p.approxBytes > 1000))

const essentials = getOfflinePack('essentials')
assert.equal(essentials.id, 'essentials')
assert.ok(essentials.phrases.length >= 100)
assert.ok(essentials.seed['唔該'])
assert.equal(essentials.glossEntries, undefined)

const full = getOfflinePack('full')
assert.equal(full.id, 'full')
assert.ok(full.glossEntries)
assert.ok(Object.keys(full.glossEntries!).length > 1000)
assert.ok(full.attribution.some((a) => /CC-Canto|cccanto|Pleco/i.test(a)))

console.log('offlinePack.smoke: ok', {
  essentialsBytes: Buffer.byteLength(JSON.stringify(essentials), 'utf8'),
  fullBytes: Buffer.byteLength(JSON.stringify(full), 'utf8'),
  phrases: essentials.phrases.length,
  gloss: Object.keys(full.glossEntries || {}).length,
})
