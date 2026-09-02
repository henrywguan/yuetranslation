import assert from 'node:assert/strict'
import { groupTextItemsIntoLines } from './pdfTextLayout.ts'

// Merged lines should span from the leftmost glyph to the rightmost edge.
const lines = groupTextItemsIntoLines([
  { text: 'My', x: 0.1, y: 0.2, w: 0.04, h: 0.02 },
  { text: 'name', x: 0.15, y: 0.2, w: 0.06, h: 0.02 },
  { text: 'is', x: 0.22, y: 0.2, w: 0.03, h: 0.02 },
  { text: 'Henry', x: 0.26, y: 0.2, w: 0.07, h: 0.02 },
])
assert.equal(lines.length, 1)
assert.equal(lines[0]!.text, 'My name is Henry')
assert.equal(lines[0]!.x, 0.1)
assert.ok(lines[0]!.w >= 0.23, `expected full line width, got ${lines[0]!.w}`)

// Wide glyph runs must not be clipped to a short char cap.
const wide = groupTextItemsIntoLines([
  {
    text: 'Pomona Valley Hospital Medical Center',
    x: 0.05,
    y: 0.3,
    w: 0.72,
    h: 0.018,
  },
])
assert.equal(wide.length, 1)
assert.ok(wide[0]!.w >= 0.7, `wide line should keep full bbox width, got ${wide[0]!.w}`)

console.log('pdfDocTranslate.smoke: ok')
