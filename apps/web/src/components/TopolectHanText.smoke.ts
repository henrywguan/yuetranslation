/**
 * Offline smoke for TopolectHanText helpers (Hakka / Teochew / Hokkien).
 * Run: `npx tsx apps/web/src/components/TopolectHanText.smoke.ts`
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { topolectHtmlLang, topolectSchemeLabel } from './TopolectHanText'

assert.equal(topolectSchemeLabel('hak'), 'Pha̍k-fa-sṳ')
assert.equal(topolectSchemeLabel('teo'), 'Peng’im')
assert.equal(topolectSchemeLabel('nan'), 'Tâi-lô')
assert.equal(topolectHtmlLang('hak'), 'hak')
assert.equal(topolectHtmlLang('teo'), 'zh-CN-teo')
assert.equal(topolectHtmlLang('nan'), 'nan-CN')

const here = dirname(fileURLToPath(import.meta.url))
const src = readFileSync(join(here, 'TopolectHanText.tsx'), 'utf8')
assert.match(src, /schemeLabel/, 'TopolectHanText takes a schemeLabel prop')
assert.match(src, /sichuanese-block/, 'Reuses Sichuanese layout classes')
assert.doesNotMatch(src, /CONVERSATION_PANE_UI|PRIMARY_LANGS|ttsVoice/, 'No voice/primary wiring')

const result = readFileSync(join(here, 'ResultWithDefinition.tsx'), 'utf8')
assert.match(result, /TopolectHanText/, 'Result pane renders TopolectHanText for hak/teo/nan')
assert.match(
  result,
  /chineseLang === 'hak' \|\| chineseLang === 'teo' \|\| chineseLang === 'nan'/,
  'Han topolect branch is before ceb Latin branch',
)

console.log('TopolectHanText.smoke: ok')
