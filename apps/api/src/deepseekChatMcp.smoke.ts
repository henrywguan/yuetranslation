import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  GENERATION_MCP_PRESETS,
  buildPluginTools,
  extractImageUrlsFromMcpResult,
  listChatPlugins,
  parseMcpToolName,
} from './deepseekChatMcp.js'
import { chatImageConfigured } from './deepseekChatImage.js'
import {
  credentialsToHints,
  parseChatPluginCredentialsBody,
  saveChatPluginCredentials,
} from './deepseekChatPluginKeys.js'

const plugins = listChatPlugins()
assert.ok(plugins.some((p) => p.id === 'image'), 'Image plugin is in the marketplace')
assert.equal(plugins.find((p) => p.id === 'image')?.kind, 'builtin')

for (const preset of GENERATION_MCP_PRESETS) {
  const row = plugins.find((p) => p.id === `mcp:${preset.id}`)
  assert.ok(row, `${preset.id} generation MCP preset is listed`)
  assert.equal(row?.kind, 'mcp')
  assert.equal(row?.category, 'generation')
  assert.equal(row?.defaultEnabled, false)
  if (preset.id === 'cursor' && !preset.defaultUrl) {
    assert.equal(row?.status, 'coming_soon', 'Cursor stays coming_soon until URL is set')
    assert.equal(row?.configured, false)
  } else {
    assert.ok(
      row?.status === 'needs_token' || row?.status === 'ready',
      `${preset.id} should be needs_token or ready`,
    )
  }
}

assert.deepEqual(parseMcpToolName('mcp__docs__search'), { serverId: 'docs', toolName: 'search' })
assert.equal(parseMcpToolName('generate_image'), null)

assert.deepEqual(
  extractImageUrlsFromMcpResult('See ![cat](https://cdn.example/a.png) and https://cdn.example/b.jpg'),
  ['https://cdn.example/a.png', 'https://cdn.example/b.jpg'],
)

const withUserGemini = listChatPlugins({ gemini: 'AIza-test-user-key' })
assert.equal(withUserGemini.find((p) => p.id === 'image')?.configured, true, 'User Gemini key enables plugin')
assert.match(withUserGemini.find((p) => p.id === 'image')?.name || '', /Gemini/)

const withUserImage = listChatPlugins({ image: 'sk-test-user-key' })
assert.equal(withUserImage.find((p) => p.id === 'image')?.configured, true, 'User OpenAI key enables plugin')

const withUserHf = listChatPlugins({ higgsfield: 'hf-test-token' })
assert.equal(withUserHf.find((p) => p.id === 'mcp:higgsfield')?.configured, true)

const parsedKeys = parseChatPluginCredentialsBody({
  keys: { image: 'sk-abc', higgsfield: ' tok ' },
  clear: ['adobe'],
})
assert.equal(parsedKeys.ok, true)
if (parsedKeys.ok) {
  assert.equal(parsedKeys.creds.image, 'sk-abc')
  assert.equal(parsedKeys.creds.higgsfield, 'tok')
  assert.deepEqual(parsedKeys.clear, ['adobe'])
}
const hints = credentialsToHints({ image: 'sk-abcdefgh' })
assert.equal(hints.image.set, true)
assert.equal(hints.image.hint, 'efgh')
assert.equal(hints.fly.set, false)
assert.equal(hints.github_app_id.set, false)
const savedMem = await saveChatPluginCredentials('smoke-user-byok', {
  adobe: 'adobe-tok',
  fly: 'fo1_x',
  fly_app: 'app-x',
  github_app_id: '42',
})
assert.equal(savedMem.adobe, 'adobe-tok')
assert.equal(savedMem.fly, 'fo1_x')
assert.equal(savedMem.fly_app, 'app-x')
assert.equal(savedMem.github_app_id, '42')

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

// Without tokens, enabling MCP presets must not throw / must yield no MCP tools
const toolsMcp = await buildPluginTools(['mcp:higgsfield', 'mcp:adobe', 'mcp:cursor'])
assert.ok(
  !toolsMcp.some((t) => t.function.name.startsWith('mcp__')),
  'Unconfigured generation MCPs add no tools',
)

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
assert.match(appSrc, /plugin-keys/, 'BYOK plugin-keys routes registered')
assert.match(appSrc, /generated-images/, 'Generated image route registered')

const envSrc = readFileSync(
  path.resolve(path.dirname(fileURLToPath(import.meta.url)), './env.ts'),
  'utf8',
)
assert.match(envSrc, /chatMcpHiggsfieldToken/, 'Higgsfield token env')
assert.match(envSrc, /chatMcpAdobeToken/, 'Adobe token env')
assert.match(envSrc, /chatMcpCursorUrl/, 'Cursor URL env')
assert.match(envSrc, /geminiApiKey/, 'Gemini API key env')
assert.match(envSrc, /chatGeminiImageModel/, 'Gemini image model env')

const imageSrc = readFileSync(
  path.resolve(path.dirname(fileURLToPath(import.meta.url)), './deepseekChatImage.ts'),
  'utf8',
)
assert.match(imageSrc, /generateViaGemini/, 'Gemini image path implemented')
assert.match(imageSrc, /geminiAspectRatio/, 'Gemini aspect ratio helper')

const { geminiAspectRatio } = await import('./deepseekChatImage.js')
assert.equal(geminiAspectRatio('1024x1024'), '1:1')
assert.equal(geminiAspectRatio('1024x1792'), '9:16')
assert.equal(geminiAspectRatio('1792x1024'), '16:9')

console.log('deepseekChatMcp.smoke: ok')
