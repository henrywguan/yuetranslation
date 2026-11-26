/**
 * Offline smoke: selection quote helpers, scrubber ticks, agent pill sort, mood picker.
 * Run: npx tsx apps/web/src/lib/chatSelectionChrome.smoke.ts
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { CHAT_DEEP_AVATAR_MOODS } from './chatDeepAvatarCharacter.js'
import { CHAT_DEEP_AVATAR_SHOWCASE } from './chatDeepAvatarPersona.js'
import {
  __resetChatDeepAvatarPlayBusForTests,
  peekChatDeepAvatarOutroSuppression,
  requestChatDeepAvatarPlay,
} from './chatDeepAvatarPlayBus.js'
import {
  applySelectionInclude,
  applySelectionReply,
  buildMoodPickerEntries,
  buildScrubberTicks,
  formatSelectionIncludeBlock,
  formatSelectionReplyQuote,
  pickActiveAgentStripItem,
  scrubberActiveIndex,
  scrubberSnippet,
  sortAgentStripDropdown,
} from './chatSelectionChrome.js'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..')

assert.equal(formatSelectionReplyQuote('hello'), '> hello')
assert.equal(formatSelectionReplyQuote('a\nb'), '> a\n> b')
assert.equal(formatSelectionReplyQuote('  '), '')

assert.equal(applySelectionReply('', 'hi'), '> hi\n\n')
assert.equal(applySelectionReply('draft', 'hi'), '> hi\n\ndraft')
{
  const replied = applySelectionReply('keep typing', 'quote me')
  const caret = replied.indexOf('\n\n') + 2
  assert.equal(replied.slice(0, caret), '> quote me\n\n')
  assert.equal(replied.slice(caret), 'keep typing')
}

assert.equal(
  formatSelectionIncludeBlock('excerpt'),
  'Included:\n"""\nexcerpt\n"""',
)
assert.equal(applySelectionInclude('', 'x'), 'Included:\n"""\nx\n"""')
assert.match(applySelectionInclude('keep me', 'x'), /^keep me\n\nIncluded:/)

assert.equal(scrubberSnippet('one two three', 7), 'one tw…')
assert.equal(scrubberSnippet('  hi  '), 'hi')

const ticks = buildScrubberTicks([
  { id: 'u1', role: 'user', content: 'Hello world from user' },
  { id: 'a1', role: 'assistant', text: 'Reply here' },
])
assert.equal(ticks.length, 2)
assert.equal(ticks[0]!.id, 'u1')
assert.equal(ticks[0]!.role, 'user')
assert.match(ticks[0]!.snippet, /Hello/)
assert.equal(ticks[1]!.id, 'a1')

assert.equal(scrubberActiveIndex(0, 5), 0)
assert.equal(scrubberActiveIndex(1, 5), 4)
assert.equal(scrubberActiveIndex(0.5, 5), 2)
assert.equal(scrubberActiveIndex(0.5, 0), -1)

const agents = [
  { id: 'w1', threadId: 't-w', title: 'Worker A', role: 'worker' as const, status: 'idle' },
  { id: 'o1', threadId: 't-o', title: 'Overseer', role: 'overseer' as const, status: 'working' },
  { id: 'w2', threadId: 't-w2', title: 'Worker B', role: 'worker' as const, status: 'idle' },
]
assert.equal(pickActiveAgentStripItem(agents, 't-w')?.id, 'w1')
assert.equal(pickActiveAgentStripItem(agents, 'missing')?.id, 'w1')
const sorted = sortAgentStripDropdown(agents, 't-w2')
assert.equal(sorted[0]!.id, 'w2', 'active first')
assert.equal(sorted[1]!.role, 'overseer', 'then overseer')

const moods = buildMoodPickerEntries([...CHAT_DEEP_AVATAR_MOODS], [...CHAT_DEEP_AVATAR_SHOWCASE])
assert.equal(moods.length, CHAT_DEEP_AVATAR_MOODS.length)
assert.ok(moods.some((m) => m.id === 'celebrate' && m.highEnergy))
assert.ok(moods.some((m) => m.id === 'idle' && m.label === 'Idle'))

__resetChatDeepAvatarPlayBusForTests()
requestChatDeepAvatarPlay('happy', { source: 'picker', forceFullscreen: false })
assert.equal(peekChatDeepAvatarOutroSuppression(), false, 'picker must not steal next outro')
requestChatDeepAvatarPlay('celebrate', { source: 'play', forceFullscreen: true })
assert.equal(peekChatDeepAvatarOutroSuppression(), true, 'play still suppresses natural outro')
__resetChatDeepAvatarPlayBusForTests()

const thread = readFileSync(join(root, 'pages/chat/aui/ChatAuiThread.tsx'), 'utf8')
assert.match(thread, /SelectionToolbarPrimitive|ChatSelectionMenu|aui-selection-menu/, 'selection menu')
assert.match(thread, /ChatHistoryScrubber|aui-scrubber/, 'history scrubber')
assert.match(thread, /aria-expanded|listbox|aui-agent-pill/, 'agent pill dropdown')
assert.match(thread, /ChatMoodPicker|requestChatDeepAvatarPlay|aui-mood-picker/, 'mood overlay')
assert.match(thread, /margin-top:\s*auto|aui-composer-toolbar/, 'toolbar present')

const menuSrc = readFileSync(join(root, 'pages/chat/aui/ChatSelectionMenu.tsx'), 'utf8')
assert.match(menuSrc, /SELECTION_MENU_Z_INDEX\s*=\s*150/, 'z-index constant above .ds-chat 120')
assert.match(menuSrc, /style=\{\{\s*zIndex:\s*SELECTION_MENU_Z_INDEX\s*\}\}/, 'override body-portal default z=50')
assert.match(menuSrc, />\s*Copy\s*</, 'Copy action')
assert.match(menuSrc, />\s*Reply\s*</, 'Reply action')
assert.match(menuSrc, />\s*Include\s*</, 'Include / Add to chat action')
assert.match(menuSrc, /SelectionToolbarPrimitive\.Root/, 'assistant-ui selection primitive')

const css = readFileSync(join(root, 'pages/chat/aui/ChatAui.css'), 'utf8')
assert.match(css, /\.aui-selection-menu/, 'selection menu CSS')
assert.match(
  css,
  /\.aui-selection-menu[\s\S]*?z-index:\s*150\s*!important/,
  'selection menu CSS z-index above .ds-chat',
)
assert.match(css, /\.aui-scrubber/, 'scrubber CSS')
assert.match(css, /\.aui-agent-pill/, 'agent pill CSS')
assert.match(css, /\.aui-composer-toolbar[\s\S]*margin-top:\s*auto|\.aui-composer-row-wrap[\s\S]*flex:\s*1/, 'toolbar bottom pin')
assert.match(css, /\.aui-mood-picker/, 'mood picker CSS')

// Message bodies must opt into quote-selectable so SelectionToolbar accepts user+assistant text.
assert.match(thread, /is-user[\s\S]*data-aui-quote-selectable/, 'user msgs quote-selectable')
assert.match(thread, /is-assistant[\s\S]*data-aui-quote-selectable/, 'assistant msgs quote-selectable')

console.log('chatSelectionChrome.smoke.ts: ok')
