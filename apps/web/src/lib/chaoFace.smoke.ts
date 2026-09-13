import assert from 'node:assert/strict'
import { isValidElement } from 'react'
import { withChaoFace } from './chaoFace.tsx'

assert.equal(withChaoFace('plain'), 'plain')
assert.equal(withChaoFace(''), '')

const mixed = withChaoFace('Use Noto Sans (˥ ˧˥ ˧ ˨˩ ˩˧ ˨).')
assert.ok(Array.isArray(mixed))
const nodes = mixed as unknown[]
const chaoSpans = nodes.filter(
  (n) => isValidElement(n) && (n as { props: { className?: string } }).props.className === 'chao-face',
)
assert.ok(chaoSpans.length >= 6, `expected Chao spans, got ${chaoSpans.length}`)

console.log('chaoFace.smoke: ok')
