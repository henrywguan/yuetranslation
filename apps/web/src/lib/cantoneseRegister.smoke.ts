import assert from 'node:assert/strict'
import { isSpokenCantonese, localWrittenCantonese } from './cantoneseRegister.ts'

assert.equal(isSpokenCantonese('食咗飯未'), true)
assert.equal(isSpokenCantonese('你們好嗎'), false)
assert.ok(localWrittenCantonese('係唔係').includes('是否'))
assert.ok(localWrittenCantonese('我哋冇嘢').includes('我們'))
assert.ok(localWrittenCantonese('我哋冇嘢').includes('沒有'))

console.log('cantoneseRegister.smoke: ok')
