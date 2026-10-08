import assert from 'node:assert/strict'
import { formatConversationTranscript } from './conversationExport.ts'

const empty = formatConversationTranscript({
  face: { enTranslation: '', yueTranslation: '' },
  youLang: 'en',
  partnerLang: 'yue',
})
assert.equal(empty, '')

const both = formatConversationTranscript({
  face: { enTranslation: 'Where is the toilet?', yueTranslation: '洗手間喺邊度？' },
  youLang: 'en',
  partnerLang: 'yue',
})
assert.equal(both, 'Cantonese: 洗手間喺邊度？\nEnglish: Where is the toilet?')

const interim = formatConversationTranscript({
  face: { enTranslation: '', yueTranslation: '', enInterim: 'hello' },
  youLang: 'en',
  partnerLang: 'yue',
})
assert.equal(interim, 'English: hello')

console.log('conversationExport.smoke: ok')
