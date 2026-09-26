/**
 * Offline layout check for the orbital globe (no WebGL / browser).
 * Desktop Practice Partner must keep the sphere centered; marketing pages stay right-anchored.
 */
import assert from 'node:assert/strict'
import * as THREE from 'three'
import {
  resolveOrbitalSphereLayout,
  type OrbitalSphereLayout,
} from './orbitalSphereRenderer.js'

function project(width: number, height: number, layout: OrbitalSphereLayout) {
  const camera = new THREE.PerspectiveCamera(45, width / Math.max(1, height), 0.1, 1000)
  camera.position.z = layout.cameraZ
  camera.updateMatrixWorld(true)
  camera.updateProjectionMatrix()
  const pos = new THREE.Vector3(layout.x, layout.y, layout.z)
  const center = pos.clone().project(camera)
  const edge = pos.clone()
  edge.x += 2.2 * layout.scale
  const rim = edge.project(camera)
  return {
    x: (center.x * 0.5 + 0.5) * width,
    radius: (Math.abs(rim.x - center.x) * width) / 2,
  }
}

const page = resolveOrbitalSphereLayout(1440, 900, 'harbor', 'page')
assert.ok(page.x > 1, 'marketing desktop keeps the globe on the right')

const narrowPage = resolveOrbitalSphereLayout(800, 900, 'harbor', 'page')
assert.equal(narrowPage.x, 0, 'narrow marketing pages stay centered')

const stage = resolveOrbitalSphereLayout(1440, 900, 'harbor', 'stage')
assert.equal(stage.x, 0)
assert.equal(stage.y, 0)
const framed = project(1440, 900, stage)
assert.ok(Math.abs(framed.x - 720) < 2, `desktop stage globe centered (x=${framed.x})`)
assert.ok(
  framed.radius > 900 * 0.7,
  `desktop stage globe fills the frame (radius=${framed.radius})`,
)

const card = resolveOrbitalSphereLayout(1280, 320, 'harbor', 'stage')
const cardFrame = project(1280, 320, card)
assert.ok(Math.abs(cardFrame.x - 640) < 2, 'desktop card globe is centered')
assert.ok(cardFrame.radius > 320 * 0.7, 'desktop card globe is large enough to read as spinning')

const phone = resolveOrbitalSphereLayout(390, 844, 'harbor', 'stage')
assert.equal(phone.x, 0)
assert.equal(phone.cameraZ, 6.5, 'portrait stage keeps the phone crop')

console.log('orbitalSphereLayout.smoke: ok')
