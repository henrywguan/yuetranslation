/**
 * Offline smoke: tab/favicon needs-you helpers.
 * Run: npx tsx apps/web/src/lib/chatNeedsYouAttention.smoke.ts
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  CHAT_NEEDS_YOU_TITLE_PREFIX,
  shouldShowNeedsYouAttention,
  withNeedsYouTitle,
} from './chatNeedsYouAttention.js'

assert.equal(
  shouldShowNeedsYouAttention({ documentHidden: true, hasNeedsAttention: true }),
  true,
)
assert.equal(
  shouldShowNeedsYouAttention({ documentHidden: false, hasNeedsAttention: true }),
  false,
)
assert.equal(
  shouldShowNeedsYouAttention({ documentHidden: true, hasNeedsAttention: false }),
  false,
)

assert.equal(withNeedsYouTitle('DeepSeek Chat — JyutTranslate', true), `${CHAT_NEEDS_YOU_TITLE_PREFIX}DeepSeek Chat — JyutTranslate`)
assert.equal(withNeedsYouTitle(`${CHAT_NEEDS_YOU_TITLE_PREFIX}DeepSeek Chat`, false), 'DeepSeek Chat')
assert.equal(
  withNeedsYouTitle(`${CHAT_NEEDS_YOU_TITLE_PREFIX}DeepSeek Chat`, true),
  `${CHAT_NEEDS_YOU_TITLE_PREFIX}DeepSeek Chat`,
)

const here = dirname(fileURLToPath(import.meta.url))
const page = readFileSync(join(here, '../pages/chat/aui/ChatAuiPage.tsx'), 'utf8')
assert.match(page, /shouldShowNeedsYouAttention|withNeedsYouTitle|setNeedsYouFavicon/, 'AUI page wires needs-you')
assert.match(page, /visibilitychange|document\.hidden/, 'clears / arms on visibility')

console.log('chatNeedsYouAttention.smoke: ok')
