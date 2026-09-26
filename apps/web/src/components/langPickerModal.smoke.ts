import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const btn = readFileSync(join(here, 'LangLabelButton.tsx'), 'utf8')
const css = readFileSync(join(here, '../App.css'), 'utf8')
const solo = readFileSync(join(here, 'SoloView.tsx'), 'utf8')
const convo = readFileSync(join(here, 'ConversationView.tsx'), 'utf8')

assert.match(btn, /lang-modal-layer/, 'Lang picker opens a centered modal layer')
assert.match(btn, /langPickerTitle/, 'Modal title uses Choose a language copy')
assert.match(btn, /langPickerVoice/, 'Voice languages are sectioned')
assert.match(btn, /langPickerType/, 'Text-only langs get a Type only section')
assert.match(btn, /staggerChildren/, 'Tiles stagger in for polish')
assert.match(btn, /type: 'spring'/, 'Modal opens with a spring')
assert.match(css, /\.lang-modal-grid/, 'Harbor CSS grid for language tiles')
assert.match(css, /\.lang-modal-tile/, 'Interactive language tiles')
assert.doesNotMatch(btn, /lang-dd-menu/, 'Anchored dropdown menu is gone')
assert.match(solo, /variant="dropdown"/, 'Solo still uses the dropdown trigger → modal path')
assert.match(convo, /variant="dropdown"/, 'Conversation still uses the dropdown trigger → modal path')
assert.match(convo, /scope="conversation"/, 'Conversation still hides text-only langs')

const cam = readFileSync(join(here, 'CamTargetPicker.tsx'), 'utf8')
const docs = readFileSync(join(here, 'CameraDocSession.tsx'), 'utf8')
assert.match(cam, /lang-modal-layer/, 'AR Cam target opens the same centered modal')
assert.match(cam, /lang-modal-layer--\$\{tone\}/, 'AR tone gets the viewport-safe modal class')
assert.doesNotMatch(cam, /cam-target-dd-menu/, 'AR no longer uses anchored off-screen menu')
assert.doesNotMatch(cam, /menuPos|getBoundingClientRect/, 'AR modal is not positioned from the trigger')
assert.match(
  readFileSync(join(here, '../App.css'), 'utf8'),
  /\.lang-modal-layer--ar/,
  'AR modal CSS caps height inside the camera viewport',
)
assert.match(docs, /CamTargetPicker/, 'Documents use modal language pickers')
assert.match(docs, /includeAuto=\{false\}/, 'Documents omit Auto detect')
assert.match(docs, /cam-back--icon/, 'Documents back is an arrow icon')
assert.match(
  readFileSync(join(here, '../lib/docsApi.ts'), 'utf8'),
  /'th'[\s\S]*'lo'[\s\S]*'ceb'/,
  'DocLang includes Thai / Lao / text-only langs',
)

console.log('langPickerModal.smoke: ok')
