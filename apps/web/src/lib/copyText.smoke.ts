import assert from 'node:assert/strict'
import { copyableJyutpingChao, copyableText } from './copyText.ts'
import { rubyJpSyllable } from './jyutping.ts'

assert.equal(rubyJpSyllable('teng1'), 'teng1˥')
assert.equal(rubyJpSyllable('m4'), 'm4˨˩')
assert.equal(rubyJpSyllable('hou2'), 'hou2˧˥')
assert.equal(rubyJpSyllable('dak1'), 'dak1˥')

assert.equal(copyableText('聽唔聽得', 'yue'), '聽唔聽得')

const jpChao = await copyableJyutpingChao('聽唔聽得')
assert.equal(jpChao, 'teng1˥ m4˨˩ teng1˥ dak1˥')

const greeting = await copyableJyutpingChao('你好')
assert.equal(greeting, 'nei5˩˧ hou2˧˥')

assert.equal(await copyableJyutpingChao('hello'), '')
assert.equal(await copyableJyutpingChao(''), '')

console.log('copyText.smoke: ok')
