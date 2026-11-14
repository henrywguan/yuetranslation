import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  buildPluginTools,
  listChatPlugins,
  parseMcpToolName,
} from './deepseekChatMcp.js'
import { chatImageConfigured } from './deepseekChatImage.js'

const plugins = listChatPlugins()
assert.ok(plugins.some((p) => p.id === 'image'), 'Image plugin is in the marketplace')
assert.equal(plugins.find((p) => p.id === 'image')?.kind, 'builtin')

assert.deepEqual(parseMcpToolName('mcp__docs__search'), { serverId: 'docs', toolName: 'search' })
assert.equal(parseMcpToolName('generate_image'), null)

const toolsOff = await buildPluginTools([])
assert.equal(toolsOff.length, 0, 'Empty plugins array disables plugin tools')

const toolsDefault = await buildPluginTools(undefined)
if (chatImageConfigured()) {
  assert.ok(
    toolsDefault.some((t) => t.function.name === 'generate_image'),
    'Default plugins include generate_image when image key is set',
  )
} else {
  assert.ok(
    !toolsDefault.some((t) => t.function.name === 'generate_image'),
    'No generate_image when image API is not configured',
  )
}

const toolsImage = await buildPluginTools(['image'])
if (chatImageConfigured()) {
  assert.ok(toolsImage.some((t) => t.function.name === 'generate_image'))
}

const harnessSrc = readFileSync(
  path.resolve(path.dirname(fileURLToPath(import.meta.url)), './deepseekChatHarness.ts'),
  'utf8',
)
assert.match(harnessSrc, /buildPluginTools/, 'Harness merges plugin tools')
assert.match(harnessSrc, /kind: 'image'/, 'Harness yields image SSE events')

const routes = readFileSync(
  path.resolve(path.dirname(fileURLToPath(import.meta.url)), './deepseekChatRoutes.ts'),
  'utf8',
)
assert.match(routes, /event\.kind === 'image'/, 'Routes forward image SSE')

const appSrc = readFileSync(
  path.resolve(path.dirname(fileURLToPath(import.meta.url)), './app.ts'),
  'utf8',
)
assert.match(appSrc, /\/api\/chat\/plugins/, 'Plugins catalog route registered')
assert.match(appSrc, /generated-images/, 'Generated image route registered')

console.log('deepseekChatMcp.smoke: ok')
