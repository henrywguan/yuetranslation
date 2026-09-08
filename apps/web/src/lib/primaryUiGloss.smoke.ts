import assert from 'node:assert/strict'
import { resolvePrimaryUiGloss } from './primaryUiGloss'
import { ui } from './uiCopy'

/** Offline: primary ≠ Yue/English replaces Jyutping with a primary-language gloss. */
function main() {
  const solo = ui.modeSolo
  assert.equal(resolvePrimaryUiGloss(solo, 'yue'), undefined)
  assert.equal(resolvePrimaryUiGloss(solo, 'en'), undefined)
  assert.equal(resolvePrimaryUiGloss(solo, 'tl'), 'Solo')
  assert.equal(resolvePrimaryUiGloss(solo, 'es'), 'Solo')
  assert.equal(resolvePrimaryUiGloss(solo, 'vi'), 'Solo')

  const hold = ui.holdOrTapToSpeak
  assert.match(resolvePrimaryUiGloss(hold, 'tl') || '', /Pindutin|tap|magsalita/i)
  assert.match(resolvePrimaryUiGloss(hold, 'es') || '', /Mantén|habla/i)
  assert.match(resolvePrimaryUiGloss(hold, 'vi') || '', /Giữ|nói/i)

  const face = ui.modeFace
  assert.equal(resolvePrimaryUiGloss(face, 'tl'), 'Usapan')
  assert.equal(resolvePrimaryUiGloss(face, 'es'), 'Conversación')
  assert.equal(resolvePrimaryUiGloss(face, 'vi'), 'Hội thoại')

  const cam = ui.modeCamera
  assert.equal(resolvePrimaryUiGloss(cam, 'es'), 'Cámara')
  assert.equal(resolvePrimaryUiGloss(cam, 'vi'), 'Camera')

  console.log('primaryUiGloss.smoke: ok')
}

main()
