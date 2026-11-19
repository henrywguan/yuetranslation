/**
 * Offline smoke: Chat Inbox project_* orchestration store.
 * Run: npx tsx apps/api/src/deepseekChatProject.smoke.ts
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  createProjectStore,
  drainProjectActions,
  projectCreateAgent,
  projectListJson,
  projectMessageAgent,
  projectSetStatus,
  projectUpdateMemory,
} from './deepseekChatProject.js'
import { DEEPSEEK_CHAT_PROJECT_TOOLS, executeDeepseekChatTool } from './deepseekChatTools.js'
import {
  buildDeepseekChatToolList,
  looksLikeDeferredOrchestration,
} from './deepseekChatHarness.js'
import { buildDeepseekChatSystem } from './deepseekChatPrompt.js'

const here = dirname(fileURLToPath(import.meta.url))

assert.ok(DEEPSEEK_CHAT_PROJECT_TOOLS.some((t) => t.function.name === 'project_create_agent'))
assert.ok(DEEPSEEK_CHAT_PROJECT_TOOLS.some((t) => t.function.name === 'project_message_agent'))
assert.ok(DEEPSEEK_CHAT_PROJECT_TOOLS.some((t) => t.function.name === 'project_list_agents'))
assert.ok(DEEPSEEK_CHAT_PROJECT_TOOLS.some((t) => t.function.name === 'project_set_status'))
assert.ok(DEEPSEEK_CHAT_PROJECT_TOOLS.some((t) => t.function.name === 'project_update_memory'))

const tools = buildDeepseekChatToolList(false, [], false, false, true) as Array<{
  function?: { name?: string }
}>
assert.ok(tools.some((t) => t.function?.name === 'project_create_agent'))
assert.ok(!buildDeepseekChatToolList(false, [], false, false, false).some(
  (t) => (t as { function?: { name?: string } }).function?.name === 'project_create_agent',
))

const store = createProjectStore({
  projectId: 'proj_1',
  memory: 'Ship auto-orchestrate',
  agents: [
    {
      id: 'agent_overseer',
      title: 'Demo · Overseer',
      status: 'idle',
      role: 'overseer',
      threadId: 't1',
    },
  ],
})
assert.ok(store)

const listed = JSON.parse(projectListJson(store)) as { agents: unknown[] }
assert.equal(listed.agents.length, 1)

const created = projectCreateAgent(store, 'Worker · docs', 'Write the README')
assert.equal(created.ok, true)
if (!created.ok) throw new Error('create failed')
assert.ok(created.agentId)
assert.equal(created.action.type, 'create_agent')
assert.match(created.action.message || '', /README/)

const messaged = projectMessageAgent(store, created.agentId, 'Also add smoke')
assert.equal(messaged.ok, true)

const status = projectSetStatus(store, created.agentId, 'in_review', 'https://example.com/pr/1')
assert.equal(status.ok, true)
if (!status.ok) throw new Error('status failed')
assert.equal(status.action.reviewUrl, 'https://example.com/pr/1')

projectUpdateMemory(store, 'Updated brief')
const drained = drainProjectActions(store)
assert.ok(drained.length >= 3)

const actions: unknown[] = []
const toolCreate = JSON.parse(
  await executeDeepseekChatTool(
    'project_create_agent',
    JSON.stringify({ title: 'Worker · API', message: 'Wire routes' }),
    {
      project: store,
      onProjectActions: (a) => actions.push(...a),
    },
  ),
) as { ok?: boolean; agentId?: string }
assert.equal(toolCreate.ok, true)
assert.ok(toolCreate.agentId)
assert.equal(actions.length, 1)

const noProject = JSON.parse(
  await executeDeepseekChatTool('project_list_agents', '{}', {}),
) as { error?: string }
assert.match(String(noProject.error || ''), /Project/)

const overseerPrompt = buildDeepseekChatSystem({
  inboxRole: 'overseer',
  now: new Date('2026-11-19T00:00:00.000Z'),
  mode: 'tools',
})
assert.match(overseerPrompt, /project_create_agent/)
assert.match(overseerPrompt, /Never ask the user to click Spawn/)
assert.match(overseerPrompt, /never announce that you will create/)
assert.doesNotMatch(overseerPrompt, /ask the user to spawn/)

const createTool = DEEPSEEK_CHAT_PROJECT_TOOLS.find((t) => t.function.name === 'project_create_agent')
assert.ok(createTool)
assert.deepEqual(
  (createTool!.function.parameters as { required?: string[] }).required,
  ['title', 'message'],
  'create_agent requires message so workers auto-start',
)

assert.equal(
  looksLikeDeferredOrchestration(
    "I'll get grounded… then set up the knowledge-base project with workers.",
  ),
  true,
)

const harness = readFileSync(join(here, 'deepseekChatHarness.ts'), 'utf8')
assert.match(harness, /DEEPSEEK_CHAT_PROJECT_TOOLS/)
assert.match(harness, /kind: 'project'/)
assert.match(harness, /deferred-orchestration recovery/)

const routes = readFileSync(join(here, 'deepseekChatRoutes.ts'), 'utf8')
assert.match(routes, /projectId/)
assert.match(routes, /projectAgents/)
assert.match(routes, /project: \{ actions/)

console.log('deepseekChatProject.smoke: ok')
