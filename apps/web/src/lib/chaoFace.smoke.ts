import assert from 'node:assert/strict'
import { CHAO_TONE_CHAR_RE } from './chaoFace.tsx'

function stripChao(text: string) {
  return text.replace(CHAO_TONE_CHAR_RE, '')
}

assert.equal(stripChao('teng1˥ m4˨˩'), 'teng1 m4')
assert.match('˥˧˥˧˨˩˩˧˨', CHAO_TONE_CHAR_RE)
assert.equal('hello'.replace(CHAO_TONE_CHAR_RE, ''), 'hello')

console.log('chaoFace.smoke: ok')
