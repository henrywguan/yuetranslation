import assert from 'node:assert/strict'
import { jyutpingSyllableToYale, jyutpingTextToYale } from './yale.ts'

assert.equal(jyutpingSyllableToYale('nei5'), 'néih')
assert.equal(jyutpingSyllableToYale('hou2'), 'hóu')
assert.ok(jyutpingTextToYale('nei5 hou2').includes('néih'))
assert.ok(jyutpingTextToYale('si1').includes('sī') || jyutpingTextToYale('si1').includes('si'))
assert.equal(jyutpingSyllableToYale('sik6'), 'sihk')
assert.equal(jyutpingSyllableToYale('dung6'), 'duhng')
assert.equal(jyutpingSyllableToYale('coeng4'), 'chèuhng')
assert.equal(jyutpingSyllableToYale('m4'), 'm̀h')

console.log('yale.smoke: ok')
