import assert from 'node:assert/strict'
import {
  applyInlineCitationMarkers,
  parseUrlCitationAnnotations,
  sourcesFromInlineCitations,
} from './deepseekChatCitations.js'

const parsed = parseUrlCitationAnnotations([
  {
    type: 'url_citation',
    url_citation: {
      url: 'https://example.com/a',
      title: 'Alpha',
      start_index: 0,
      end_index: 5,
    },
  },
  {
    type: 'url_citation',
    url_citation: {
      url: 'https://example.com/b',
      title: 'Beta',
      start_index: 10,
      end_index: 15,
    },
  },
])
assert.equal(parsed.length, 2)
assert.equal(parsed[0]!.url, 'https://example.com/a')

const content = 'Hello world there'
const { text, citations } = applyInlineCitationMarkers(content, [
  { url: 'https://example.com/a', title: 'A', startIndex: 0, endIndex: 5 },
  { url: 'https://example.com/b', title: 'B', startIndex: 6, endIndex: 11 },
])
assert.match(text, /Hello\[1\]/)
assert.match(text, /world\[2\]/)
assert.equal(citations.length, 2)
assert.equal(citations[0]!.index, 1)

const sameUrl = applyInlineCitationMarkers('Foo bar', [
  { url: 'https://example.com/x', startIndex: 0, endIndex: 3 },
  { url: 'https://example.com/x', startIndex: 4, endIndex: 7 },
])
assert.match(sameUrl.text, /Foo\[1\]/)
assert.match(sameUrl.text, /bar\[1\]/)
assert.equal(sameUrl.citations.length, 1)

const sources = sourcesFromInlineCitations(citations)
assert.equal(sources.length, 2)
assert.equal(sources[0]!.title, 'A')

// CJK code points (not UTF-16 units)
const cjk = applyInlineCitationMarkers('你好世界', [
  { url: 'https://example.com/zh', title: 'ZH', startIndex: 0, endIndex: 2 },
])
assert.equal(cjk.text, '你好[1]世界')

console.log('deepseekChatCitations.smoke: ok')
