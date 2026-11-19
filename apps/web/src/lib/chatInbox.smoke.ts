/**
 * Offline smoke: Chat Inbox store + filter helpers (Phase A).
 * Run: npx tsx apps/web/src/lib/chatInbox.smoke.ts
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  attachThreadToProject,
  buildAgentViews,
  countByFilter,
  createProject,
  createWorker,
  createWorkspace,
  deleteProject,
  emptyInboxState,
  filterAgentViews,
  looksLikeDeferredOrchestration,
  matchesSearch,
  normalizeInboxState,
  ORCHESTRATION_STALL_ERROR,
  renameProject,
  setProjectMemory,
} from './chatInbox'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..')

const empty = emptyInboxState()
assert.equal(empty.projects.length, 0)
assert.equal(empty.agents.length, 0)

const { state: withProj, project, overseer } = createProject(empty, 'Harbor')
assert.equal(withProj.projects.length, 1)
assert.equal(project.title, 'Harbor')
assert.equal(overseer.role, 'overseer')
assert.equal(overseer.projectId, project.id)
assert.ok(withProj.agents.some((a) => a.id === overseer.id))

const linked = attachThreadToProject(withProj, project.id, 'thread-1')
assert.deepEqual(
  linked.projects.find((p) => p.id === project.id)?.threadIds,
  ['thread-1'],
)

const renamed = renameProject(linked, project.id, 'Harbor Quest')
assert.equal(renamed.projects[0]?.title, 'Harbor Quest')
assert.ok(renamed.agents[0]?.title.includes('Harbor Quest'))

const { state: withWs } = createWorkspace(renamed, 'internal', 'Dev sandbox', project.id)
assert.equal(withWs.workspaces[0]?.kind, 'internal')
assert.equal(withWs.workspaces[0]?.projectId, project.id)

const cleared = deleteProject(withWs, project.id)
assert.equal(cleared.projects.length, 0)
assert.equal(cleared.agents.length, 0)
assert.equal(cleared.workspaces.length, 0)

const views = buildAgentViews({
  agents: withProj.agents,
  projects: linked.projects,
  threads: [
    { id: 'thread-1', title: 'Cantonese tips' },
    { id: 'thread-2', title: 'Loose chat' },
  ],
  busy: true,
  activeId: 'thread-2',
})
assert.ok(views.some((v) => v.role === 'overseer'))
assert.ok(views.some((v) => v.threadId === 'thread-1' && v.projectId === project.id))
assert.ok(views.some((v) => v.threadId === 'thread-2' && v.status === 'working'))

const counts = countByFilter(views)
assert.equal(counts.working, 1)
assert.ok(counts.all >= 3)

const projectOnly = filterAgentViews(views, 'all', project.id)
assert.ok(projectOnly.every((v) => v.projectId === project.id))
assert.ok(projectOnly.some((v) => v.threadId === 'thread-1'))
assert.ok(!projectOnly.some((v) => v.threadId === 'thread-2'))

assert.equal(matchesSearch('Harbor Quest', 'quest'), true)
assert.equal(matchesSearch('Harbor Quest', 'xyz'), false)

const normalized = normalizeInboxState({
  projects: [{ id: 'p1', title: '  ', threadIds: ['a', 2, 'b'] }],
  agents: [{ id: 'a1', status: 'nope', role: 'wizard' }],
  workspaces: [{ kind: 'usb' }],
})
assert.equal(normalized.projects[0]?.title, 'Untitled project')
assert.deepEqual(normalized.projects[0]?.threadIds, ['a', 'b'])
assert.equal(normalized.agents[0]?.status, 'idle')
assert.equal(normalized.agents[0]?.role, 'thread')
assert.equal(normalized.workspaces[0]?.kind, 'internal')

const withMemory = setProjectMemory(withProj, project.id, 'Shared brief')
assert.equal(withMemory.projects[0]?.memory, 'Shared brief')

const { state: withWorker, worker } = createWorker(withMemory, project.id, {
  title: 'Worker · docs',
  threadId: 'w-thread',
})
assert.equal(worker.role, 'worker')
assert.equal(worker.status, 'queued')
assert.ok(withWorker.agents.some((a) => a.id === worker.id))
assert.ok(withWorker.projects[0]?.threadIds.includes('w-thread'))

const page = readFileSync(join(root, 'pages/chat/aui/ChatAuiPage.tsx'), 'utf8')
assert.match(page, /InboxShell/, 'AUI page mounts InboxShell')
assert.match(page, /ChatInboxProvider/, 'Inbox provider wraps runtime')
assert.match(page, /aria-label="Inbox"/, 'sidebar labeled Inbox')
assert.match(page, /Classic chat UI/, 'classic toggle preserved')
assert.match(
  page,
  /Classic chat UI[\s\S]*Back to app/,
  'Back to app sits under Classic chat UI in sidebar foot',
)
const auiShellFn = page.slice(page.indexOf('function AuiShell'), page.indexOf('function GateShell'))
assert.doesNotMatch(
  auiShellFn,
  /ds-chat-top[\s\S]*aria-label="Back to app"/,
  'AuiShell top bar no longer hosts Back to app',
)
assert.match(auiShellFn, /is-inbox-collapsed|Collapse inbox|Open inbox/, 'menu toggles Inbox open/closed')

const shell = readFileSync(join(root, 'pages/chat/inbox/InboxShell.tsx'), 'utf8')
assert.match(shell, /FilterTiles/, 'filter tiles')
assert.match(shell, /ProjectList/, 'projects list')
assert.match(shell, /ProjectPanel/, 'overseer project panel')
assert.match(shell, /collapseProjects|setActiveProjectId\(null\)/, 'Projects chevron closes panel')
assert.match(shell, /inbox-band/, 'Inbox/Projects/Workspaces section bands')
assert.match(shell, /WorkspaceList/, 'workspaces list')
assert.match(shell, /ArchiveList/, 'archive browser section')
assert.match(shell, /renameProjectTitle/, 'project rename wired')
assert.match(shell, /ArchiveIcon|DeleteIcon/, 'archive/delete icons as children')
assert.doesNotMatch(shell, /Spawn worker/, 'no manual spawn worker button')
assert.doesNotMatch(shell, /ProjectDraftPanel/, 'no draft new-project panel (auto-orchestrate)')
assert.match(shell, /createAndFocusProject|Overseer chat only/, 'New Project opens Overseer')
assert.match(shell, /createChatSandbox/, 'Inbox creates internal sandboxes via API')
assert.match(shell, /All Agents|needs_attention|in_review/, 'tile filter ids used')
assert.match(shell, /inboxSecondaryDefaultOpen|max-width: 899px/, 'narrow/short drawers collapse secondary')
assert.match(shell, /\+ New chat/, 'single primary New chat CTA')
assert.match(
  shell,
  /user expands stay open|Initial open only/,
  'collapse defaults do not force-close after user expands',
)

const archiveList = readFileSync(join(root, 'pages/chat/inbox/ArchiveList.tsx'), 'utf8')
assert.match(archiveList, /Restore/, 'archive restore control')
assert.match(archiveList, /UnarchiveIcon|DeleteIcon/, 'archive row action icons')

const projectList = readFileSync(join(root, 'pages/chat/inbox/ProjectList.tsx'), 'utf8')
assert.match(projectList, /onRename/, 'project list rename prop')
assert.match(projectList, /onDoubleClick/, 'double-click renames project')

const workspaceList = readFileSync(join(root, 'pages/chat/inbox/WorkspaceList.tsx'), 'utf8')
assert.match(workspaceList, /inbox-ws-menu/, 'workspaces + opens create menu')
assert.match(workspaceList, /Local folder/, 'local create still available')
assert.match(workspaceList, /GitHub repo/, 'github create still available')
assert.match(workspaceList, /Internal sandbox/, 'internal sandbox create still available')
assert.doesNotMatch(
  workspaceList,
  /className="inbox-new-chat"[\s\S]*Local folder|className="inbox-new-chat"[\s\S]*GitHub repo/,
  'no full-width Local/GitHub CTAs competing with New chat',
)

const icons = readFileSync(join(root, 'pages/chat/inbox/InboxIcons.tsx'), 'utf8')
assert.match(icons, /function ArchiveIcon/, 'ArchiveIcon exported')
assert.match(icons, /function DeleteIcon/, 'DeleteIcon exported')
assert.match(icons, /function UnarchiveIcon/, 'UnarchiveIcon exported')

const inboxCss = readFileSync(join(root, 'pages/chat/inbox/Inbox.css'), 'utf8')
assert.match(inboxCss, /\.inbox-scroll/, 'inbox body scrolls inside drawer')
assert.match(inboxCss, /\.inbox-band/, 'horizontal separators between Inbox bands')
assert.match(inboxCss, /\.inbox-project-panel[\s\S]*max-height/, 'project panel capped inside drawer')
assert.match(inboxCss, /\.inbox-band\s*\{[^}]*flex-shrink:\s*0/, 'bands do not shrink under neighbors')
assert.match(
  inboxCss,
  /\.inbox-section-head\s*\{[^}]*flex-shrink:\s*0/,
  'section headers stay content-sized',
)
assert.match(inboxCss, /\.inbox-new-chat\s*\{[^}]*flex-shrink:\s*0/, 'primary CTAs do not shrink')
assert.match(inboxCss, /\.inbox-ws-menu/, 'workspace create menu styles')
assert.match(
  inboxCss,
  /@media \(max-width: 899px\),\s*\(max-height: 720px\)/,
  'mobile/short-drawer density rules',
)

const panel = readFileSync(join(root, 'pages/chat/inbox/ProjectPanel.tsx'), 'utf8')
assert.doesNotMatch(panel, /Spawn worker/, 'no manual spawn worker button')
assert.doesNotMatch(panel, /onSpawnWorker/, 'no spawn callback prop')
assert.match(panel, /Overseer will create them/, 'auto-orchestrate copy')
assert.match(panel, /onRename|double-click to rename/, 'project panel supports rename')

const hook = readFileSync(join(root, 'pages/chat/inbox/useChatInbox.ts'), 'utf8')
assert.match(hook, /renameProjectTitle/, 'hook exposes renameProjectTitle')
assert.match(hook, /renameProject\(/, 'hook commits renameProject')

const tiles = readFileSync(join(root, 'pages/chat/inbox/FilterTiles.tsx'), 'utf8')
assert.match(tiles, /All Agents/)
assert.match(tiles, /Needs Attention/)
assert.match(tiles, /Working/)
assert.match(tiles, /In Review/)

const runtime = readFileSync(join(root, 'pages/chat/aui/ChatAuiRuntime.tsx'), 'utf8')
assert.match(runtime, /inboxRole/, 'runtime forwards inbox role')
assert.match(runtime, /projectMemory/, 'runtime forwards project memory')
assert.match(runtime, /sandboxSessionId/, 'runtime forwards sandbox session')
assert.match(runtime, /projectId/, 'runtime forwards project id for Overseer tools')
assert.match(runtime, /projectAgents/, 'runtime forwards agent snapshot')
assert.match(runtime, /onProject|applyProjectActions/, 'runtime applies project_* actions')
assert.match(runtime, /needs_attention/, 'turn end marks Needs Attention')
assert.match(runtime, /looksLikeDeferredOrchestration/, 'runtime detects stalled Overseer promises')
assert.match(runtime, /ORCHESTRATION_STALL_ERROR/, 'runtime surfaces orchestration stall error')
assert.match(runtime, /SEARCH_STALL_ERROR|looksLikeDeferredSearchTurn/, 'runtime surfaces deferred-search stalls')
assert.match(runtime, /hasPendingWorkers/, 'Overseer stays Working while workers are queued')
assert.match(
  runtime,
  /!live\.length[\s\S]*emptyThread\(\)/,
  'clearing last live agents opens a fresh empty thread',
)

assert.equal(
  looksLikeDeferredOrchestration(
    "I'll get grounded in the RuneScape Dragonwilds docs and mechanics, then set up the knowledge-base project with workers.",
  ),
  true,
  'Henry stall phrase flagged on client',
)
assert.match(ORCHESTRATION_STALL_ERROR, /did not create or message/)

const api = readFileSync(join(here, 'api.ts'), 'utf8')
assert.match(api, /inboxRole/, 'web API client sends inboxRole')
assert.match(api, /createChatSandbox/, 'web API creates sandboxes')
assert.match(api, /sandboxSessionId/, 'web API client sends sandboxSessionId')
assert.match(api, /projectAgents/, 'web API client sends projectAgents')
assert.match(api, /onProject/, 'web API client handles project SSE')

console.log('chatInbox.smoke: ok')
