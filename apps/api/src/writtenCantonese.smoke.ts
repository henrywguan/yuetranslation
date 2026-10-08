import assert from 'node:assert/strict'
import { localWrittenCantonese } from './translate.js'

// Offline only — never calls the model.
assert.equal(localWrittenCantonese('我哋唔係學生'), '我們不是學生')
assert.equal(localWrittenCantonese('佢冇嚟'), '他沒有來')
assert.equal(localWrittenCantonese(''), '')
console.log('writtenCantonese.smoke: ok')
