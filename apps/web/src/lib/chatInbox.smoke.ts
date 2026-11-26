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
  detachThreadFromProject,
  emptyInboxState,
  filterAgentViews,
  isIdleStatus,
  linkChatToProject,
  looksLikeDeferredOrchestration,
  matchesSearch,
  normalizeInboxState,
  ORCHESTRATION_STALL_ERROR,
  projectIdForThread,
  projectNestedViews,
  projectTaskAgents,
  renameProject,
  resolveProjectGithubWorkspace,
  setAgentCompactSummary,
  setAgentStatus,
  setAgentThread,
  setProjectDefaultWorkspace,
  setProjectMemory,
  statusChipLabel,
  ungroupedAgentViews,
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

const linkedChat = linkChatToProject(
  {
    ...withProj,
    agents: [
      ...withProj.agents,
      {
        id: 'agent_chat',
        projectId: null,
        title: 'Loose chat agent',
        status: 'idle',
        role: 'thread',
        threadId: 'thread-loose',
        updatedAt: Date.now(),
      },
    ],
  },
  project.id,
  'thread-loose',
)
assert.ok(linkedChat.projects[0]?.threadIds.includes('thread-loose'))
assert.equal(
  linkedChat.agents.find((a) => a.id === 'agent_chat')?.projectId,
  project.id,
  'linkChatToProject moves thread-role agents under the Project',
)
const unlinked = detachThreadFromProject(linkedChat, 'thread-loose')
assert.ok(!unlinked.projects[0]?.threadIds.includes('thread-loose'))
assert.equal(
  unlinked.agents.find((a) => a.id === 'agent_chat')?.projectId,
  null,
  'detachThreadFromProject clears thread-role projectId',
)
assert.equal(
  unlinked.agents.find((a) => a.id === overseer.id)?.projectId,
  project.id,
  'detach does not rehome Overseer',
)

assert.equal(statusChipLabel('needs_attention'), 'You')
assert.equal(statusChipLabel('working'), 'Work')
assert.equal(isIdleStatus('idle'), true)
assert.equal(isIdleStatus('working'), false)

// Workspace Tasks: threadIds-only membership (Add-to-Project) must resolve agents.
{
  const { state: projState, project: proj, overseer: ov } = createProject(
    emptyInboxState(),
    'Tasks parity',
  )
  const withOverseerThread = setAgentThread(projState, ov.id, 'thread-overseer')
  const withWorker = createWorker(withOverseerThread, proj.id, {
    id: 'agent_worker_1',
    title: 'Worker · docs',
    status: 'working',
  }).state
  const withLoose = attachThreadToProject(withWorker, proj.id, 'thread-loose-only')
  assert.equal(
    projectIdForThread(withLoose, 'thread-loose-only'),
    proj.id,
    'projectIdForThread falls back to project.threadIds',
  )
  assert.equal(
    projectIdForThread(withLoose, 'thread-overseer'),
    proj.id,
    'projectIdForThread prefers agent.projectId',
  )
  const tasksFromLoose = projectTaskAgents(withLoose, 'thread-loose-only')
  assert.equal(tasksFromLoose.projectId, proj.id)
  assert.equal(tasksFromLoose.title, 'Tasks parity')
  assert.ok(
    tasksFromLoose.agents.some((a) => a.role === 'overseer'),
    'Tasks lists Overseer from threadIds-only chat',
  )
  assert.ok(
    tasksFromLoose.agents.some((a) => a.id === 'agent_worker_1'),
    'Tasks lists workers for the Project',
  )
  // Lifecycle: Working → Needs you → Done / Canceled
  const needsYou = setAgentStatus(withLoose, 'agent_worker_1', 'needs_attention')
  assert.equal(
    projectTaskAgents(needsYou, 'thread-loose-only').agents.find((a) => a.id === 'agent_worker_1')
      ?.status,
    'needs_attention',
  )
  const done = setAgentCompactSummary(needsYou, 'agent_worker_1', 'Docs landed', 'done')
  assert.equal(
    projectTaskAgents(done, 'thread-loose-only').agents.find((a) => a.id === 'agent_worker_1')
      ?.status,
    'done',
  )
  const canceled = setAgentCompactSummary(
    setAgentStatus(withLoose, 'agent_worker_1', 'working'),
    'agent_worker_1',
    'No longer needed',
    'canceled',
  )
  assert.equal(
    projectTaskAgents(canceled, 'thread-loose-only').agents.find((a) => a.id === 'agent_worker_1')
      ?.status,
    'canceled',
  )
  // Busy overlay: active streaming agent shows Working without mutating closed rows
  const busyOverlay = projectTaskAgents(needsYou, 'thread-overseer', {
    busy: true,
    activeId: 'thread-overseer',
  })
  assert.equal(
    busyOverlay.agents.find((a) => a.id === ov.id)?.status,
    'working',
    'busy overlay marks active Overseer Working',
  )
  assert.equal(
    busyOverlay.agents.find((a) => a.id === 'agent_worker_1')?.status,
    'needs_attention',
    'busy overlay does not rewrite other agents',
  )
  // done worker must stay done even if somehow active+busy
  const doneWithThread = setAgentThread(done, 'agent_worker_1', 'thread-worker-done')
  assert.equal(
    projectTaskAgents(doneWithThread, 'thread-worker-done', {
      busy: true,
      activeId: 'thread-worker-done',
    }).agents.find((a) => a.id === 'agent_worker_1')?.status,
    'done',
    'busy overlay never revives done/canceled',
  )
}

const renamed = renameProject(linked, project.id, 'Harbor Quest')
assert.equal(renamed.projects[0]?.title, 'Harbor Quest')
assert.ok(renamed.agents[0]?.title.includes('Harbor Quest'))

const { state: withWs } = createWorkspace(renamed, 'internal', 'Dev sandbox', project.id)
assert.equal(withWs.workspaces[0]?.kind, 'internal')
assert.equal(withWs.workspaces[0]?.projectId, project.id)

const { state: withFiles, workspace: filesWs } = createWorkspace(
  withWs,
  'files',
  'Rainmeter Splash',
  project.id,
)
assert.equal(filesWs.kind, 'files')
assert.equal(withFiles.workspaces[0]?.title, 'Rainmeter Splash')

const { state: withGh, workspace: ghWs } = createWorkspace(
  withWs,
  'github',
  'yuetranslation',
  project.id,
)
const ghBound = {
  ...withGh,
  workspaces: withGh.workspaces.map((w) =>
    w.id === ghWs.id ? { ...w, ref: 'henrywguan/yuetranslation' } : w,
  ),
}
assert.equal(resolveProjectGithubWorkspace(ghBound, null), undefined, 'no project → no @diff')
assert.equal(
  resolveProjectGithubWorkspace(ghBound, project.id)?.id,
  ghWs.id,
  'project-linked GitHub workspace resolves',
)
const otherProj = createProject(ghBound, 'Other')
assert.equal(
  resolveProjectGithubWorkspace(otherProj.state, otherProj.project.id),
  undefined,
  'unrelated project does not inherit GitHub bind',
)
const defaulted = setProjectDefaultWorkspace(ghBound, project.id, ghWs.id)
assert.equal(
  resolveProjectGithubWorkspace(defaulted, project.id)?.id,
  ghWs.id,
  'defaultWorkspaceId GitHub bind preferred',
)

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

const nested = projectNestedViews(views, project.id)
assert.ok(nested.every((v) => v.projectId === project.id))
assert.equal(nested[0]?.role, 'overseer', 'Overseer sorts first under project')
assert.ok(nested.some((v) => v.threadId === 'thread-1'))

const loose = ungroupedAgentViews(views)
assert.ok(loose.every((v) => !v.projectId))
assert.ok(loose.some((v) => v.threadId === 'thread-2'))
assert.ok(!loose.some((v) => v.threadId === 'thread-1'), 'project threads stay out of ungrouped Chats')

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
const auiShellFn = page.slice(page.indexOf('function AuiShell'), page.indexOf('function GateShell'))
assert.doesNotMatch(auiShellFn, /ds-chat-sidebar-foot/, 'sidebar foot removed — settings cog owns chrome')
assert.doesNotMatch(
  auiShellFn,
  /ds-chat-top[\s\S]*aria-label="Back to app"/,
  'AuiShell top bar no longer hosts Back to app',
)
assert.match(auiShellFn, /is-inbox-collapsed|Collapse inbox|Open inbox/, 'menu toggles Inbox open/closed')

const shell = readFileSync(join(root, 'pages/chat/inbox/InboxShell.tsx'), 'utf8')
assert.match(shell, /InboxSettingsMenu/, 'header cog settings menu')
assert.match(shell, /inbox-header-actions/, 'settings + New project share header actions')
assert.match(shell, /FilterTiles/, 'filter tiles')
assert.match(shell, /ProjectList/, 'projects list')
assert.match(shell, /ProjectPanel/, 'overseer project panel')
assert.match(shell, /collapseProjects|setActiveProjectId\(null\)/, 'Projects chevron closes panel')
assert.match(shell, /inbox-band/, 'Inbox/Projects/Workspaces section bands')
assert.match(shell, /WorkspaceList/, 'workspaces list')
assert.match(
  shell,
  /workspacesOpen\s*\?\s*\([\s\S]*LocalFolderBind/,
  'inbox-local-bind collapses with Workspaces section',
)
assert.match(shell, /ArchiveList/, 'archive browser section')
assert.match(shell, /renameProjectTitle/, 'project rename wired')
assert.match(shell, /ArchiveIcon|DeleteIcon/, 'archive/delete icons as children')
assert.doesNotMatch(shell, /Spawn worker/, 'no manual spawn worker button')
assert.doesNotMatch(shell, /ProjectDraftPanel/, 'no name-only draft panel')
assert.match(shell, /ProjectCreateWizard/, 'New Project uses name + workspace wizard')
assert.match(shell, /createAndFocusProject|Overseer chat/, 'New Project opens Overseer')
const settings = readFileSync(join(root, 'pages/chat/inbox/InboxSettingsMenu.tsx'), 'utf8')
assert.match(settings, /Classic chat UI/, 'classic toggle preserved in settings')
assert.match(settings, /Back to app/, 'Back to app preserved in settings')
assert.match(settings, /ThemeToggle/, 'theme toggle in settings')
assert.match(settings, /inbox-settings-notes-input/, 'Companion notes field in settings')
assert.match(
  settings,
  /onBlur[\s\S]*notes\.trim\(\)|trimmed !== notes/,
  'notes trim on blur so Space works mid-type',
)
assert.match(shell, /createChatSandbox/, 'Inbox creates internal sandboxes via API')
assert.match(shell, /needs_attention|in_review/, 'tile filter ids used')
assert.match(shell, /inboxSecondaryDefaultOpen|max-width: 899px/, 'narrow/short drawers collapse secondary')
assert.match(shell, /\+ New chat/, 'single primary New chat CTA')
assert.match(
  shell,
  /user expands stay open|Initial open only/,
  'collapse defaults do not force-close after user expands',
)
assert.match(shell, /ungroupedAgentViews|Ungrouped chats/, 'flat list is ungrouped chats only')
assert.match(shell, /projectNestedViews|projectChildren/, 'project agents nest under Projects')
assert.match(shell, /expandedProjectIds/, 'projects expand to reveal nested agents')
assert.doesNotMatch(
  shell,
  /filter === 'all' \? 'Agents'/,
  'no flat AGENTS mega-list label',
)
assert.match(shell, /Chats/, 'ungrouped section labeled Chats')
assert.match(shell, /StatusChip/, 'compact status chips')
assert.match(shell, /ChatProjectMenu|Add to Project|unlinkThread/, 'Add/Remove chat ↔ Project menu')
assert.match(shell, /CHAT_THREAD_DRAG_MIME|draggable|is-draggable/, 'drag chat → Project')
assert.match(
  readFileSync(join(root, 'lib/chatInbox.ts'), 'utf8'),
  /resolveProjectGithubWorkspace/,
  'GitHub @diff helper exported from inbox store',
)
assert.match(
  shell,
  /threads\.some\(\(t\) => t\.id === tid\)/,
  'Add-to-Project validates real thread ids',
)
assert.match(shell, /is-archive|is-delete/, 'Archive vs Delete contrast classes')
assert.match(shell, /inboxZero|inbox-empty--hero/, 'distinct empty Inbox state')
assert.match(shell, /No ungrouped chats|New chat/, 'distinct empty Chats CTA')
assert.match(shell, /dimEmpty|filterActive/, 'filter tiles dim empty project folders')

const archiveList = readFileSync(join(root, 'pages/chat/inbox/ArchiveList.tsx'), 'utf8')
assert.match(archiveList, /Restore/, 'archive restore control')
assert.match(archiveList, /UnarchiveIcon|DeleteIcon/, 'archive row action icons')

const projectList = readFileSync(join(root, 'pages/chat/inbox/ProjectList.tsx'), 'utf8')
assert.match(projectList, /onRename/, 'project list rename prop')
assert.match(projectList, /onDoubleClick/, 'double-click renames project')
assert.match(projectList, /inbox-project-children|projectChildren/, 'agents nest under project folders')
assert.match(projectList, /onToggleExpand|expandedProjectIds/, 'per-project expand chevron')
assert.match(projectList, /onOpenView/, 'nested rows open Overseer/workers/chats')
assert.match(projectList, /StatusChip/, 'nested rows use compact status chips')
assert.match(projectList, /ChatProjectMenu|onAddChatToProject|onRemoveChatFromProject/, 'project nest Add/Remove menu')
assert.match(projectList, /onDrop|is-drop-target|CHAT_THREAD_DRAG_MIME/, 'Project rows accept chat drops')
assert.match(projectList, /isChatThreadDrag/, 'drop target only claims chat MIME')
assert.doesNotMatch(
  projectList,
  /getData\('text\/plain'\)/,
  'Project drop ignores arbitrary text/plain',
)
assert.match(projectList, /is-archive|is-delete/, 'nested Archive/Delete contrast')
assert.match(projectList, /New project|inbox-empty-cta/, 'empty Projects CTA')
assert.match(projectList, /is-dimmed|dimEmpty/, 'dim empty folders under filter')
assert.match(projectList, /inbox-agent-role--overseer/, 'Overseer badge distinct from workers')
assert.match(projectList, /InboxTickerName|inbox-agent-trigger--ticker/, 'nested agent names use ticker wrapper')

const tickerName = readFileSync(join(root, 'pages/chat/inbox/InboxTickerName.tsx'), 'utf8')
assert.match(tickerName, /inbox-agent-name-marquee/, 'ticker viewport class')
assert.match(tickerName, /ResizeObserver|scrollWidth/, 'overflow detection for ticker')
assert.match(tickerName, /inbox-agent-name-label--dup|aria-hidden/, 'seamless ticker duplicate label')

const workspaceList = readFileSync(join(root, 'pages/chat/inbox/WorkspaceList.tsx'), 'utf8')
assert.match(workspaceList, /inbox-ws-menu/, 'workspaces + opens create menu')
assert.match(workspaceList, /Local folder/, 'local create still available')
assert.match(workspaceList, /GitHub repo/, 'github create still available')
assert.match(workspaceList, /Internal sandbox/, 'internal sandbox create still available')
assert.match(workspaceList, /files: 'Files'/, 'promoted Thread files kind label')
assert.match(workspaceList, /onOpen/, 'open promoted files workspace')
assert.match(workspaceList, /Save to Workspaces/, 'empty copy mentions promote path')
assert.match(
  workspaceList,
  /inbox-ws-connected/,
  'local folder shows Connected status when bound',
)
assert.match(workspaceList, /localConnected|kind === 'local'.*ref/, 'Connected only while local ref set')
assert.doesNotMatch(
  workspaceList,
  /kind: 'files'/,
  'files kind is promote-only — not in + create menu',
)
assert.doesNotMatch(
  workspaceList,
  /className="inbox-new-chat"[\s\S]*Local folder|className="inbox-new-chat"[\s\S]*GitHub repo/,
  'no full-width Local/GitHub CTAs competing with New chat',
)

const icons = readFileSync(join(root, 'pages/chat/inbox/InboxIcons.tsx'), 'utf8')
assert.match(icons, /function ArchiveIcon/, 'ArchiveIcon exported')
assert.match(icons, /function DeleteIcon/, 'DeleteIcon exported')
assert.match(icons, /Filled trash|fill="currentColor"/, 'DeleteIcon filled for contrast vs Archive stroke')
assert.match(icons, /function UnarchiveIcon/, 'UnarchiveIcon exported')

const inboxCss = readFileSync(join(root, 'pages/chat/inbox/Inbox.css'), 'utf8')
assert.match(inboxCss, /\.inbox-scroll/, 'inbox body scrolls inside drawer')
assert.match(inboxCss, /\.inbox-band/, 'horizontal separators between Inbox bands')
assert.match(inboxCss, /\.inbox-ws-connected/, 'Connected gold status styles')
assert.match(inboxCss, /inbox-ws-connected-sheen|inbox-ws-connected-pulse/, 'Connected animation')
assert.match(inboxCss, /#e8c547|#E8C547/, 'Connected uses brand gold')
assert.match(inboxCss, /\.inbox-project-panel[\s\S]*max-height/, 'project panel capped inside drawer')
assert.match(inboxCss, /\.inbox-band\s*\{[^}]*flex-shrink:\s*0/, 'bands do not shrink under neighbors')
assert.match(
  inboxCss,
  /\.inbox-section-head\s*\{[^}]*flex-shrink:\s*0/,
  'section headers stay content-sized',
)
assert.match(inboxCss, /\.inbox-new-chat\s*\{[^}]*flex-shrink:\s*0/, 'primary CTAs do not shrink')
assert.match(
  inboxCss,
  /\.inbox-agents\s*\{[^}]*flex:\s*1\s+0\s+auto/,
  'CHATS region grows into spare height but never shrinks under Projects/Workspaces',
)
assert.match(
  inboxCss,
  /\.inbox-agents-label\s*\{[^}]*flex-shrink:\s*0/,
  'CHATS label stays content-sized above the thread list',
)
assert.doesNotMatch(
  inboxCss,
  /\.inbox-agents\s*\{[^}]*min-height:\s*0/,
  'CHATS region must not min-height:0 crush label into list',
)
assert.match(inboxCss, /\.inbox-ws-menu/, 'workspace create menu styles')
assert.match(
  inboxCss,
  /@media \(max-width: 899px\),\s*\(max-height: 720px\)/,
  'mobile/short-drawer density rules',
)
assert.match(inboxCss, /\.inbox-project-children/, 'nested project agent list styles')
assert.match(
  inboxCss,
  /\.inbox-project-children \.inbox-agent-trigger--ticker/,
  'nested agent triggers drop ellipsis for ticker',
)
assert.match(inboxCss, /@keyframes inbox-agent-name-ticker/, 'agent name ticker keyframes')
assert.match(
  inboxCss,
  /\.inbox-agent-name-marquee\s*\{[^}]*overflow-x:\s*auto/,
  'agent name marquee keeps manual horizontal scroll',
)
assert.match(
  inboxCss,
  /prefers-reduced-motion: reduce[\s\S]*inbox-agent-name-marquee\.is-overflowing[\s\S]*animation:\s*none/,
  'reduced motion stills agent name ticker',
)
assert.match(
  inboxCss,
  /prefers-reduced-motion: reduce[\s\S]*inbox-agent-name-label--dup[\s\S]*display:\s*none/,
  'reduced motion hides ticker duplicate',
)
assert.match(
  inboxCss,
  /\.inbox-agent-row\s*\{[^}]*flex-shrink:\s*0/,
  'agent rows do not flex-squeeze/stack',
)
assert.match(
  inboxCss,
  /\.inbox-agent-row\s*\{[^}]*min-height:\s*2\.15rem/,
  'agent rows keep readable height',
)
assert.match(
  inboxCss,
  /\.inbox-list-item\s*\{[^}]*flex-shrink:\s*0/,
  'list rows do not compress into neighbors',
)
assert.match(inboxCss, /\.inbox-agent-status-dot/, 'status chip colored dot')
assert.match(
  inboxCss,
  /\.inbox-agent-status\.is-idle\s*\{\s*display:\s*none/,
  'idle chips hidden by default at all densities',
)
assert.match(
  inboxCss,
  /\.inbox-agent-row:hover \.inbox-agent-status\.is-idle/,
  'idle chips reveal on row hover',
)
assert.doesNotMatch(
  inboxCss,
  /@media \(max-width: 899px\),\s*\(max-height: 720px\)\s*\{[\s\S]*?\.inbox-agent-status\.is-idle/,
  'idle hide is not narrow-only',
)
assert.match(inboxCss, /\.inbox-empty--hero|\.inbox-empty-cta/, 'empty-state CTA styles')
assert.match(inboxCss, /\.inbox-project-node\.is-dimmed/, 'dim empty filtered projects')
assert.match(inboxCss, /\.inbox-chat-menu/, 'Add/Remove project menu styles')
assert.match(inboxCss, /\.inbox-list-action\.is-archive|\.is-delete/, 'Archive/Delete rest contrast CSS')
assert.match(inboxCss, /\.inbox-project-node\.is-drop-target/, 'drop target highlight')
assert.match(inboxCss, /\.inbox-rules-card|\.inbox-memory--rules/, 'Project Rules editor styles')
assert.match(
  inboxCss,
  /\.inbox-agent-status\.is-idle \.inbox-agent-status-label/,
  'quieter desktop IDLE label when revealed',
)

const panel = readFileSync(join(root, 'pages/chat/inbox/ProjectPanel.tsx'), 'utf8')
assert.doesNotMatch(panel, /Spawn worker/, 'no manual spawn worker button')
assert.doesNotMatch(panel, /onSpawnWorker/, 'no spawn callback prop')
assert.match(panel, /Project Rules|inbox-rules-card/, 'prominent Project Rules editor')
assert.match(panel, /Overseer/, 'auto-orchestrate rules panel copy')
assert.doesNotMatch(panel, /workers\.map|role === 'worker'/, 'workers listed under project tree, not panel')
assert.match(panel, /onRename|double-click to rename/, 'project panel supports rename')

const hook = readFileSync(join(root, 'pages/chat/inbox/useChatInbox.ts'), 'utf8')
assert.match(hook, /renameProjectTitle/, 'hook exposes renameProjectTitle')
assert.match(hook, /renameProject\(/, 'hook commits renameProject')
assert.match(hook, /unlinkThread|detachThreadFromProject|linkChatToProject/, 'hook Add/Remove Project APIs')

const tiles = readFileSync(join(root, 'pages/chat/inbox/FilterTiles.tsx'), 'utf8')
assert.match(tiles, /label: 'All'/)
assert.doesNotMatch(tiles, /All Agents/, 'All tile no longer says Agents mega-list')
assert.match(tiles, /Needs Attention/)
assert.match(tiles, /Working/)
assert.match(tiles, /In Review/)

const statusChip = readFileSync(join(root, 'pages/chat/inbox/StatusChip.tsx'), 'utf8')
assert.match(statusChip, /inbox-agent-status-dot/, 'StatusChip renders dot')
assert.match(statusChip, /statusChipLabel/, 'StatusChip uses short labels')
assert.match(statusChip, /all densities|hover\/focus|Wave B/, 'StatusChip documents global idle hide')

const chatMenu = readFileSync(join(root, 'pages/chat/inbox/ChatProjectMenu.tsx'), 'utf8')
assert.match(chatMenu, /Add to /, 'menu Add to Project items')
assert.match(chatMenu, /Remove from Project/, 'menu Remove from Project')

const runtime = readFileSync(join(root, 'pages/chat/aui/ChatAuiRuntime.tsx'), 'utf8')
assert.match(runtime, /inboxRole/, 'runtime forwards inbox role')
assert.match(runtime, /projectMemory/, 'runtime forwards project memory')
assert.match(runtime, /sandboxSessionId/, 'runtime forwards sandbox session')
assert.match(runtime, /projectId/, 'runtime forwards project id for Overseer tools')
assert.match(runtime, /projectAgents/, 'runtime forwards agent snapshot')
assert.match(runtime, /onProject|applyProjectActions/, 'runtime applies project_* actions')
assert.match(runtime, /projectTaskAgents/, 'Tasks tab uses shared projectTaskAgents helper')
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

const threadSrc = readFileSync(join(root, 'pages/chat/aui/ChatAuiThread.tsx'), 'utf8')
assert.match(threadSrc, /projectIdForThread/, 'strip/mentions share projectIdForThread')

const panelSrc = readFileSync(join(root, 'components/ChatWorkspacePanel.tsx'), 'utf8')
assert.match(panelSrc, /Needs you/, 'Tasks tab Needs you section')
assert.match(panelSrc, /Working/, 'Tasks tab Working section')
assert.match(panelSrc, /Canceled/, 'Tasks tab Canceled section')
assert.match(panelSrc, /match: \(s\) => s === 'done'/, 'Tasks tab Done section')

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
