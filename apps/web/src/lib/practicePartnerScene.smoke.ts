/**
 * Offline smoke for the section scene (no model).
 */
import assert from 'node:assert/strict'
import { sceneLineAt, scenePlaceFor, sceneTurnCount } from './practicePartnerScene.ts'

assert.equal(sceneTurnCount(0), 0)
assert.equal(sceneTurnCount(1), 4)
assert.equal(sceneTurnCount(5), 5)
assert.equal(sceneTurnCount(12), 6)

const lines = ['一', '二', '三']
assert.equal(sceneLineAt(lines, 0), '一')
assert.equal(sceneLineAt(lines, 3), '一')
assert.equal(sceneLineAt(lines, -1), null)
assert.equal(sceneLineAt([], 0), null)

const market = scenePlaceFor('foods')
assert.equal(market?.placeEn, 'Night Market')
assert.equal(market?.placeZh, '夜市')
assert.equal(scenePlaceFor('open'), null)

console.log('practicePartnerScene.smoke: ok')
