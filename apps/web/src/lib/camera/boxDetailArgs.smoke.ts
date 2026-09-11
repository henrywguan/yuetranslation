import assert from 'node:assert/strict'
import { boxDetailArgs, type EditableBox } from './types'

function box(partial: Partial<EditableBox> & Pick<EditableBox, 'text' | 'translated' | 'from' | 'to'>): EditableBox {
  return {
    id: 't',
    box: { x: 0, y: 0, w: 0.2, h: 0.1 },
    dirty: false,
    ...partial,
  }
}

const bikol = boxDetailArgs(
  box({
    text: 'Natural Biodegradable',
    translated: 'Natural asin Nabubulok',
    from: 'en',
    to: 'bcl',
  }),
)
assert.equal(bikol.lang, 'bcl')
assert.equal(bikol.phrase, 'Natural asin Nabubulok')
assert.equal(bikol.translation, 'Natural Biodegradable')

const ceb = boxDetailArgs(
  box({
    text: 'Hello',
    translated: 'Kumusta',
    from: 'en',
    to: 'ceb',
  }),
)
assert.equal(ceb.lang, 'ceb')
assert.equal(ceb.phrase, 'Kumusta')
assert.equal(ceb.translation, 'Hello')

const ilo = boxDetailArgs(
  box({
    text: 'Thank you',
    translated: 'Agyamanak',
    from: 'en',
    to: 'ilo',
  }),
)
assert.equal(ilo.lang, 'ilo')
assert.equal(ilo.phrase, 'Agyamanak')
assert.equal(ilo.translation, 'Thank you')

const tl = boxDetailArgs(
  box({
    text: 'Good morning',
    translated: 'Magandang umaga',
    from: 'en',
    to: 'tl',
  }),
)
assert.equal(tl.lang, 'tl')
assert.equal(tl.phrase, 'Magandang umaga')
assert.equal(tl.translation, 'Good morning')

const yue = boxDetailArgs(
  box({
    text: 'Hello',
    translated: '你好',
    from: 'en',
    to: 'yue',
  }),
)
assert.equal(yue.lang, 'yue')
assert.equal(yue.phrase, '你好')
assert.equal(yue.translation, 'Hello')

console.log('boxDetailArgs.smoke: ok')
