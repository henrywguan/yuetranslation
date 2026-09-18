/**
 * Offline smoke for minimap geography / place resolver.
 */
import assert from 'node:assert/strict'
import {
  MINIMAP_CARDINALS,
  buildMinimapGeoFeatures,
  resolveHarborMinimapPlace,
} from './harborMinimapGeo'
import { GUAN_LANDMARKS } from './harborGuanRealm'
import { GUAN_SATELLITE_ISLANDS } from './harborFishing'

assert.equal(MINIMAP_CARDINALS.length, 4)
assert.ok(MINIMAP_CARDINALS.some((c) => c.id === 'N'))

const musa = resolveHarborMinimapPlace(GUAN_LANDMARKS.musaPoint.x, GUAN_LANDMARKS.musaPoint.z, 'guan')
assert.match(musa.en, /Musa/)
assert.equal(musa.kind, 'land')

const sea = resolveHarborMinimapPlace(0, 28, 'guan')
assert.equal(sea.kind, 'sea')

const pearl = GUAN_SATELLITE_ISLANDS.find((s) => s.id === 'pearl-cay')!
const cay = resolveHarborMinimapPlace(pearl.x, pearl.z, 'guan')
assert.match(cay.en, /Pearl/)

const guanGeo = buildMinimapGeoFeatures('guan', 0)
assert.ok(guanGeo.some((f) => f.id === 'guan-main' && f.closed))
assert.ok(guanGeo.some((f) => f.id.startsWith('sat-')))
assert.ok(guanGeo.some((f) => f.kind === 'ash'))

const riverGeo = buildMinimapGeoFeatures('river', 20)
assert.ok(riverGeo.some((f) => f.id === 'river' && f.kind === 'water'))
assert.ok(riverGeo.some((f) => f.id === 'west-bank'))

const pier = resolveHarborMinimapPlace(5, 3.5, 'river')
assert.ok(pier.en.length > 0)

console.log('harborMinimapGeo.smoke: ok', guanGeo.length, 'guan features')
