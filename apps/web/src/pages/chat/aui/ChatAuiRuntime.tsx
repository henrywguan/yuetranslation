import {
  AssistantRuntimeProvider,
  useExternalStoreRuntime,
  type AppendMessage,
  type ThreadMessageLike,
} from '@assistant-ui/react'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import {
  execChatSandbox,
  fetchDeepseekChatPlugins,
  ocrDeepseekChatFile,
  streamDeepseekChat,
  uploadDeepseekChatFile,
  type DeepseekChatPlugin,
  type DeepseekChatPluginKeyHint,
  type DeepseekChatPluginKeyId,
} from '../../../lib/api'
import {
  applySandboxActivity,
  applyWorkspaceFilesToDiffs,
  emptyReviewActivity,
  mergeGitDiffs,
  type ChatReviewActivity,
} from '../../../lib/chatReviewActivity'
import { searchStepFromSandboxActivity } from '../../../lib/chatToolCards'
import {
  API_CHAT_MESSAGES_MAX,
  apiMessagesFromThread,
  appendChatMessage,
  deleteChatThread,
  emptyThread,
  hydrateChatThreadsAsync,
  LIVE_REASONING_KEEP,
  MAX_CONTENT_CHARS,
  patchAssistantContent,
  renameChatThread,
  rollupOldestChatMessages,
  seedCompactedWorkerThread,
  setChatThreadArchived,
  upsertChatThread,
  type ChatFileMeta,
  type ChatMessage,
  type ChatSearchStep,
  type ChatSource,
  type ChatThread,
} from '../../../lib/chatHistory'
import {
  agentForThread,
  CLOSE_STALL_ERROR,
  looksLikeDeferredClose,
  looksLikeDeferredOrchestration,
  mergeProjectMemoryWithCompacts,
  ORCHESTRATION_STALL_ERROR,
  resolveActiveSandboxSessionId,
  type ChatInboxAgent,
  type InboxAgentStatus,
} from '../../../lib/chatInbox'
import type { ChatWorkspaceTabId } from '../../../lib/chatUiPrefs'
import { humanizeThrownError } from '../../../lib/apiError'
import {
  isEmptyAgentReplyRecoverableError,
  summarizeAgentToolWork,
} from '../../../lib/chatAgentWorkRecovery'
import {
  looksLikeDeferredSearchTurn,
  looksLikeDeferredToolUse,
  SEARCH_STALL_ERROR,
  TOOL_STALL_ERROR,
} from '../../../lib/chatSearchStall'
import {
  deepseekChatTextLooksLeaked,
  sanitizeDeepseekChatVisibleText,
} from '../../../lib/chatVisibleSanitize'
import { StreamingDeepseekChatTts } from '../../../lib/chatDeepseekVoice'
import {
  displayChatDeepAvatarName,
  readChatDeepAvatarNames,
  readChatDeepAvatarNotes,
  readChatDeepAvatarTrait,
} from '../../../lib/chatDeepAvatarPersona'
import {
  inferChatDeepAvatarMoodFromText,
  requestChatDeepAvatarPlay,
  requestChatDeepAvatarReact,
} from '../../../lib/chatDeepAvatarPlayBus'
import { readChatDeepAvatarCharacter } from '../../../lib/chatDeepAvatarCharacter'
import {
  markChatDeepAvatarPlanBuild,
  setChatDeepAvatarPlanBuildChainBusy,
  settleChatDeepAvatarPlanBuild,
} from '../../../lib/chatDeepAvatarSignals'
import { useChatInboxContextOptional } from '../inbox/ChatInboxContext'
import {
  addScheduleJob,
  claimDueScheduleJobs,
  jobsForThread,
  readScheduleJobs,
  removeScheduleJob,
  setScheduleJobEnabled,
  type ChatScheduleCadence,
  type ChatScheduleJob,
} from '../../../lib/chatSchedule'
import {
  CHAT_AUTO_KEY,
  CHAT_RICH_LAYOUT_KEY,
  CHAT_SEARCH_KEY,
  CHAT_THINK_KEY,
  readChatComposerMode,
  readChatFlag,
  readChatPluginIds,
  writeChatComposerMode,
  writeChatFlag,
  writeChatPluginIds,
  type ChatComposerMode,
} from '../../../lib/chatUiPrefs'
import {
  buildPlanBuildPrompt,
  CHAT_PLAN_WORKSPACE_PATH,
  extractPlanArtifactText,
} from '../../../lib/chatComposerContext'
import { chatSpeakLang } from '../../../lib/chatVoice'
import {
  applyWorkspaceWireUpdate,
  ensureThreadWorkspace,
  upsertWorkspaceFile,
  maybeSeedArtifactsIntoWorkspace,
  patchThreadWorkspace,
  readHarnessFlag,
  workspaceWirePayload,
  writeHarnessFlag,
  type ChatWorkspace,
} from '../../../lib/chatWorkspace'
import {
  evaluateWorkspaceBuildConsent,
  writeWorkspaceLsConsent,
} from '../../../lib/chatWorkspaceConsent'
import { useYueStore } from '../../../lib/store'
import { convertChatMessage } from './convertChatMessage'

const BOOT_THREAD: ChatThread = {
  id: 'boot',
  title: 'New chat',
  updatedAt: 0,
  messages: [],
}

const STREAM_PAINT_MS = 100
/** Ignore spam-clicks on New chat after a create settles (sync latch + short UI cooldown). */
const NEW_CHAT_COOLDOWN_MS = 450

export type PendingChatFile = ChatFileMeta & { previewUrl?: string }

export type ChatAuiSession = {
  threads: ChatThread[]
  activeId: string
  historyReady: boolean
  busy: boolean
  /** True while New chat create is latched / in post-create cooldown. */
  newChatBusy: boolean
  error: string | null
  clearError: () => void
  setError: (message: string | null) => void
  /** Cursor-like Auto — server picks DeepThink / Search per turn. */
  autoOn: boolean
  setAutoOn: (on: boolean) => void
  deepThink: boolean
  setDeepThink: (on: boolean) => void
  searchOn: boolean
  setSearchOn: (on: boolean) => void
  /** Agent / Ask / Plan — persisted; DeepThink/Search stay capability toggles. */
  composerMode: ChatComposerMode
  setComposerMode: (mode: ChatComposerMode) => void
  /** Plan → Build: switch to Agent and enqueue Overseer-leaning handoff. */
  buildFromPlan: () => Promise<void>
  /** Editable Plan artifact (seeded from last assistant; used by Build). */
  planDraft: string
  setPlanDraft: (text: string) => void
  /** Persist current planDraft into the thread workspace as plans/latest.md. */
  savePlanToWorkspace: () => { ok: boolean; path?: string; error?: string }
  /** Focus Files / Plan / Tasks in the workspace rail (null = none). */
  workspaceFocusTab: ChatWorkspaceTabId | null
  requestWorkspaceTab: (tab: ChatWorkspaceTabId) => void
  clearWorkspaceFocusTab: () => void
  /** Project agents for the active thread (Tasks tab). */
  projectAgents: ChatInboxAgent[]
  projectTitle: string | null
  openProjectAgent: (agent: ChatInboxAgent) => void
  richLayout: boolean
  setRichLayout: (on: boolean) => void
  harnessOn: boolean
  setHarnessOn: (on: boolean) => void
  workspaceOpen: boolean
  setWorkspaceOpen: (on: boolean) => void
  activeWorkspace: ChatWorkspace | undefined
  setActiveWorkspace: (ws: ChatWorkspace) => void
  scheduleJobs: ChatScheduleJob[]
  addSchedule: (prompt: string, cadence: ChatScheduleCadence) => void
  removeSchedule: (id: string) => void
  toggleSchedule: (id: string, enabled: boolean) => void
  thinking: boolean
  searching: boolean
  /** SSE marked this Thinking / Searching turn as Auto-resolved. */
  thinkingAuto: boolean
  searchingAuto: boolean
  streamingId: string | null
  pendingFiles: PendingChatFile[]
  uploadingFile: boolean
  ocrBusy: boolean
  pluginCatalog: DeepseekChatPlugin[]
  enabledPlugins: string[]
  togglePlugin: (id: string) => void
  pluginKeyHints: Record<DeepseekChatPluginKeyId, DeepseekChatPluginKeyHint>
  refreshPlugins: () => Promise<void>
  pickFile: (file: File | null) => Promise<void>
  pickOcr: (file: File | null, setDraft: (text: string) => void) => Promise<void>
  removePendingFile: (fileId: string) => void
  /**
   * Create (or ignore during UI cooldown) a new empty thread.
   * Pass `{ force: true }` for project/agent binds so an empty active draft is never reused.
   */
  startNewChat: (opts?: { force?: boolean }) => string
  selectThread: (id: string) => void
  removeThread: (id: string) => void
  archiveThread: (id: string, archived: boolean) => void
  stopGeneration: () => void
  /** Enqueue a user prompt as a chat turn (scheduled jobs / Workspace). */
  enqueuePrompt: (text: string, threadId?: string) => Promise<boolean>
  /**
   * Follow-ups typed while a turn is running (keyed by threadId).
   * Behavior: Send/Enter/Queue while busy queues for the **current** thread;
   * after that turn finishes (or Stop settles), the next item for that thread
   * auto-sends. Stop does not clear the queue — dismiss chips or Clear.
   * Switching threads / New chat clears the queue so UI never implies old-thread items.
   */
  followUpQueue: Array<{ id: string; text: string; threadId: string }>
  queueFollowUp: (text: string) => void
  dismissFollowUp: (id: string) => void
  clearFollowUpQueue: () => void
  /** Diffs + Runs activity from sandbox/workspace tools. */
  reviewActivity: ChatReviewActivity
  reviewOpen: boolean
  setReviewOpen: (on: boolean) => void
  refreshGitDiff: () => Promise<void>
  gitDiffBusy: boolean
  /**
   * Agent + harness write gate: bind local folder OR localStorage consent.
   * Highlight pulses the WS tab/panel until resolved.
   */
  workspaceBuildConsentOpen: boolean
  workspaceBuildConsentHighlight: boolean
  dismissWorkspaceBuildConsent: () => void
  acceptWorkspaceLsConsent: () => void
  notifyWorkspaceFolderBound: () => void
}

const ChatAuiSessionContext = createContext<ChatAuiSession | null>(null)

export function useChatAuiSession(): ChatAuiSession {
  const ctx = useContext(ChatAuiSessionContext)
  if (!ctx) throw new Error('useChatAuiSession requires ChatAuiRuntimeProvider')
  return ctx
}

type Props = {
  children: ReactNode
  unlocked: boolean
}

export function ChatAuiRuntimeProvider({ children, unlocked }: Props) {
  const inbox = useChatInboxContextOptional()
  const inboxRef = useRef(inbox)
  inboxRef.current = inbox
  const [threads, setThreads] = useState<ChatThread[]>(() => [BOOT_THREAD])
  const [activeId, setActiveId] = useState(BOOT_THREAD.id)
  const [historyReady, setHistoryReady] = useState(false)
  const [busy, setBusy] = useState(false)
  const [newChatBusy, setNewChatBusy] = useState(false)
  /** Sync reentry guard (pre-paint double fire). */
  const creatingNewChatRef = useRef(false)
  /** Sync mirror of newChatBusy so UI spam is ignored before the disable re-render. */
  const newChatBusyRef = useRef(false)
  const newChatCooldownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [streamingId, setStreamingId] = useState<string | null>(null)
  const [thinking, setThinking] = useState(false)
  const [searching, setSearching] = useState(false)
  const [thinkingAuto, setThinkingAuto] = useState(false)
  const [searchingAuto, setSearchingAuto] = useState(false)
  const [autoOn, setAutoOnState] = useState(() => readChatFlag(CHAT_AUTO_KEY, true))
  const autoOnRef = useRef(autoOn)
  autoOnRef.current = autoOn
  const [deepThink, setDeepThinkState] = useState(() => readChatFlag(CHAT_THINK_KEY, true))
  const [searchOn, setSearchOnState] = useState(() => readChatFlag(CHAT_SEARCH_KEY, false))
  const [composerMode, setComposerModeState] = useState<ChatComposerMode>(() =>
    readChatComposerMode('agent'),
  )
  const composerModeRef = useRef(composerMode)
  composerModeRef.current = composerMode
  /** Per-thread Plan drafts — survive thread switches without clobbering edits. */
  const planDraftsByThreadRef = useRef<Record<string, string>>({})
  /**
   * Per-thread seed snapshot: assistant message id + exact text we wrote.
   * A newer assistant reply only reseeds when the draft still equals `text`
   * (user has not edited). Empty `msgId` = seeded with no assistant yet.
   */
  const planSeedByThreadRef = useRef<Record<string, { msgId: string; text: string }>>({})
  const [planDraft, setPlanDraftState] = useState('')
  const planDraftRef = useRef(planDraft)
  planDraftRef.current = planDraft
  const setPlanDraft = useCallback((text: string) => {
    const tid = activeIdRef.current
    if (tid && tid !== BOOT_THREAD.id) {
      planDraftsByThreadRef.current[tid] = text
    }
    planDraftRef.current = text
    setPlanDraftState(text)
  }, [])

  /** Sync Plan draft ref+state for a thread immediately (no post-paint lag on switch). */
  const applyPlanDraftForThread = useCallback((tid: string) => {
    const stored =
      !tid || tid === BOOT_THREAD.id ? '' : planDraftsByThreadRef.current[tid] ?? ''
    planDraftRef.current = stored
    setPlanDraftState(stored)
  }, [])
  const [richLayout, setRichLayoutState] = useState(() => readChatFlag(CHAT_RICH_LAYOUT_KEY, false))
  const [reviewActivity, setReviewActivity] = useState<ChatReviewActivity>(() => emptyReviewActivity())
  const [reviewOpen, setReviewOpenState] = useState(false)
  const [gitDiffBusy, setGitDiffBusy] = useState(false)
  type FollowUpItem = { id: string; text: string; threadId: string }
  const [followUpQueue, setFollowUpQueue] = useState<FollowUpItem[]>([])
  /** Keep in sync only via queue helpers — never mirror from render (avoids reclaim races). */
  const followUpQueueRef = useRef<FollowUpItem[]>([])
  const flushingFollowUpsRef = useRef(false)
  const [harnessOn, setHarnessOnState] = useState(() => readHarnessFlag(false))
  const [workspaceOpen, setWorkspaceOpenState] = useState(() => readHarnessFlag(false))
  /** Opening Diffs/Runs dismisses Harness sheet so Δ is never trapped under is-sheet. */
  const setReviewOpen = useCallback((on: boolean) => {
    setReviewOpenState(on)
    if (on) setWorkspaceOpenState(false)
  }, [])
  /** Opening Harness workspace dismisses the review rail (one sheet at a time). */
  const setWorkspaceOpen = useCallback((on: boolean) => {
    setWorkspaceOpenState(on)
    if (on) setReviewOpenState(false)
  }, [])
  const [scheduleJobs, setScheduleJobs] = useState<ChatScheduleJob[]>(() => readScheduleJobs())
  const [pendingFiles, setPendingFiles] = useState<PendingChatFile[]>([])
  const [workspaceBuildConsentOpen, setWorkspaceBuildConsentOpen] = useState(false)
  const [workspaceBuildConsentHighlight, setWorkspaceBuildConsentHighlight] = useState(false)
  type PendingAfterConsent =
    | { kind: 'build' }
    | { kind: 'prompt'; text: string; threadId?: string }
    | {
        kind: 'composer'
        content: string
        fileIds: string[]
        filesMeta: ChatFileMeta[]
      }
  const pendingAfterConsentRef = useRef<PendingAfterConsent | null>(null)
  const harnessOnRef = useRef(harnessOn)
  harnessOnRef.current = harnessOn
  const busyRef = useRef(busy)
  busyRef.current = busy
  const [uploadingFile, setUploadingFile] = useState(false)
  const [ocrBusy, setOcrBusy] = useState(false)
  const [pluginCatalog, setPluginCatalog] = useState<DeepseekChatPlugin[]>([])
  const [enabledPlugins, setEnabledPlugins] = useState<string[]>(
    () => readChatPluginIds() || ['image'],
  )
  const [pluginKeyHints, setPluginKeyHints] = useState<
    Record<DeepseekChatPluginKeyId, DeepseekChatPluginKeyHint>
  >({
    gemini: { set: false },
    image: { set: false },
    higgsfield: { set: false },
    adobe: { set: false },
    cursor: { set: false },
    fly: { set: false },
    fly_app: { set: false },
    github_app_id: { set: false },
    github_app_private_key: { set: false },
    github_app_installation_id: { set: false },
  })

  const abortRef = useRef<AbortController | null>(null)
  const enabledPluginsRef = useRef(enabledPlugins)
  const pendingFilesRef = useRef(pendingFiles)
  enabledPluginsRef.current = enabledPlugins
  pendingFilesRef.current = pendingFiles
  const streamTtsRef = useRef<StreamingDeepseekChatTts | null>(null)
  const thinkStartedAt = useRef<number | null>(null)
  const threadsRef = useRef(threads)
  const activeIdRef = useRef(activeId)
  threadsRef.current = threads
  activeIdRef.current = activeId
  /** Overseer project_* message queue — flushed after the current turn. */
  const pendingProjectMsgsRef = useRef<
    Array<{ agentId: string; message: string; projectId: string }>
  >([])
  const overseerReturnThreadRef = useRef<string | null>(null)
  const flushingProjectMsgsRef = useRef(false)

  const createSilentThread = useCallback(() => {
    const created = emptyThread()
    setThreads((prev) =>
      upsertChatThread(
        created,
        prev.filter((t) => t.id !== BOOT_THREAD.id),
      ),
    )
    return created.id
  }, [])

  const [workspaceFocusTab, setWorkspaceFocusTab] = useState<ChatWorkspaceTabId | null>(null)

  const requestWorkspaceTab = useCallback((tab: ChatWorkspaceTabId) => {
    setHarnessOnState(true)
    writeHarnessFlag(true)
    setWorkspaceOpenState(true)
    setWorkspaceFocusTab(tab)
  }, [])

  const clearWorkspaceFocusTab = useCallback(() => {
    setWorkspaceFocusTab(null)
  }, [])

  const applyProjectActions = useCallback(
    (actions: Array<Record<string, unknown>>, projectId: string) => {
      const api = inboxRef.current
      if (!api || !projectId) return
      let spawned = false
      let closed = false
      for (const raw of actions) {
        const type = String(raw.type || '')
        if (type === 'create_agent') {
          const agentId = String(raw.agentId || '').trim()
          const title = String(raw.title || 'Worker').trim() || 'Worker'
          if (!agentId) continue
          if (!api.state.agents.some((a) => a.id === agentId)) {
            api.spawnWorker(projectId, { id: agentId, title, status: 'queued' })
          }
          const message = typeof raw.message === 'string' ? raw.message.trim() : ''
          if (message) {
            pendingProjectMsgsRef.current.push({ agentId, message, projectId })
            setChatDeepAvatarPlanBuildChainBusy(true)
          }
          spawned = true
          continue
        }
        if (type === 'message_agent') {
          const agentId = String(raw.agentId || '').trim()
          const message = String(raw.message || '').trim()
          if (!agentId || !message) continue
          const existing = api.state.agents.find((a) => a.id === agentId)
          if (!existing) {
            api.spawnWorker(projectId, {
              id: agentId,
              title: `Worker · ${api.state.projects.find((p) => p.id === projectId)?.title || 'Project'}`,
              status: 'queued',
            })
          } else {
            if (
              existing.threadId &&
              (existing.status === 'done' ||
                existing.status === 'canceled' ||
                existing.compactSummary)
            ) {
              setThreads((prev) => {
                const cur = prev.find((t) => t.id === existing.threadId)
                if (!cur) return prev
                const seeded = seedCompactedWorkerThread(
                  setChatThreadArchived(cur, false),
                  existing.compactSummary || 'Prior work compacted.',
                  existing.title,
                )
                return upsertChatThread(
                  seeded,
                  prev.filter((t) => t.id !== BOOT_THREAD.id),
                )
              })
            }
            api.updateAgentStatus(agentId, 'queued')
          }
          pendingProjectMsgsRef.current.push({ agentId, message, projectId })
          setChatDeepAvatarPlanBuildChainBusy(true)
          spawned = true
          continue
        }
        if (type === 'set_status') {
          const agentId = String(raw.agentId || '').trim()
          const status = String(raw.status || '').trim() as InboxAgentStatus
          if (!agentId || !status) continue
          const reviewUrl =
            typeof raw.reviewUrl === 'string' ? raw.reviewUrl.trim() : undefined
          if (status === 'in_review' && reviewUrl) {
            api.markInReview(agentId, reviewUrl)
            setReviewActivity((prev) =>
              applySandboxActivity(prev, { kind: 'pr', reviewUrl, at: Date.now() }),
            )
            setReviewOpen(true)
          } else {
            api.updateAgentStatus(agentId, status, reviewUrl)
            if (status === 'in_review') setReviewOpen(true)
          }
          continue
        }
        if (type === 'compact_agent') {
          const agentId = String(raw.agentId || '').trim()
          const summary = typeof raw.summary === 'string' ? raw.summary.trim() : ''
          const statusRaw = String(raw.status || 'done').trim()
          const status: 'done' | 'canceled' =
            statusRaw === 'canceled' ? 'canceled' : 'done'
          if (!agentId || !summary) continue
          const agent = api.state.agents.find((a) => a.id === agentId)
          const threadId = agent?.threadId
          const title = agent?.title
          api.compactAgent(agentId, summary, status)
          if (threadId && raw.archive !== false) {
            setThreads((prev) => {
              const cur = prev.find((t) => t.id === threadId)
              if (!cur) return prev
              const archived = setChatThreadArchived(
                seedCompactedWorkerThread(cur, summary, title),
                true,
              )
              return upsertChatThread(
                archived,
                prev.filter((t) => t.id !== BOOT_THREAD.id),
              )
            })
          }
          closed = true
          continue
        }
        if (type === 'update_memory') {
          api.updateProjectMemory(projectId, String(raw.memory || ''))
        }
      }
      if (spawned || closed) {
        setHarnessOnState(true)
        writeHarnessFlag(true)
        setWorkspaceOpenState(true)
        setWorkspaceFocusTab('tasks')
      }
    },
    [],
  )

  const autoSpeak = useYueStore((s) => s.autoSpeak)
  const speakManual = useYueStore((s) => s.speakManual)
  const primaryLanguage = useYueStore((s) => s.primaryLanguage)
  const entitlement = useYueStore((s) => s.entitlement)
  // Optional-chain `allowed` too — Family unlock can mount before `allowed` hydrates;
  // reading `.autoSpeak` off a missing `allowed` throws and blanks #root (no error boundary).
  const canAutoSpeak = Boolean(entitlement?.allowed?.autoSpeak)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const result = await hydrateChatThreadsAsync()
      if (cancelled) return
      const list = result.threads.length ? result.threads : [emptyThread()]
      setThreads(list)
      setActiveId(list[0]!.id)
      setHistoryReady(true)
    })()
    return () => {
      cancelled = true
      abortRef.current?.abort()
    }
  }, [])

  const refreshPlugins = useCallback(async () => {
    try {
      const { plugins, keyHints } = await fetchDeepseekChatPlugins()
      setPluginCatalog(plugins)
      if (keyHints) setPluginKeyHints((prev) => ({ ...prev, ...keyHints }))
    } catch {
      /* offline / unpaid — keep fallback catalog in UI */
    }
  }, [])

  useEffect(() => {
    if (!unlocked) return
    void refreshPlugins()
  }, [refreshPlugins, unlocked])

  const persist = useCallback((thread: ChatThread) => {
    setThreads((prev) => upsertChatThread(thread, prev.filter((t) => t.id !== BOOT_THREAD.id)))
  }, [])

  const paintThread = useCallback((thread: ChatThread) => {
    setThreads((prev) => {
      const withoutBoot = prev.filter((t) => t.id !== BOOT_THREAD.id)
      const idx = withoutBoot.findIndex((t) => t.id === thread.id)
      if (idx < 0) return upsertChatThread(thread, withoutBoot)
      const next = withoutBoot.slice()
      next[idx] = thread
      return next
    })
  }, [])

  const setAutoOn = useCallback((on: boolean) => {
    setAutoOnState(on)
    autoOnRef.current = on
    writeChatFlag(CHAT_AUTO_KEY, on)
  }, [])

  const setDeepThink = useCallback((on: boolean) => {
    // Leaving Auto when the user forces DeepThink manually.
    setAutoOnState(false)
    autoOnRef.current = false
    writeChatFlag(CHAT_AUTO_KEY, false)
    setDeepThinkState(on)
    writeChatFlag(CHAT_THINK_KEY, on)
  }, [])

  const setSearchOn = useCallback((on: boolean) => {
    setAutoOnState(false)
    autoOnRef.current = false
    writeChatFlag(CHAT_AUTO_KEY, false)
    setSearchOnState(on)
    writeChatFlag(CHAT_SEARCH_KEY, on)
  }, [])

  const setComposerMode = useCallback((mode: ChatComposerMode) => {
    // Mode switch must not touch live mic / dictate — prefs only.
    // Sync ref immediately so Build → Agent handoff uses Agent tools on this turn.
    composerModeRef.current = mode
    setComposerModeState(mode)
    writeChatComposerMode(mode)
    if (mode === 'plan') {
      setHarnessOnState(true)
      writeHarnessFlag(true)
      setWorkspaceOpenState(true)
      setWorkspaceFocusTab('plan')
    }
  }, [])

  const setHarnessOn = useCallback(
    (on: boolean) => {
      setHarnessOnState(on)
      writeHarnessFlag(on)
      setWorkspaceOpen(on)
      if (on) {
        const cur = threadsRef.current.find((t) => t.id === activeIdRef.current)
        if (cur && cur.id !== BOOT_THREAD.id) {
          const seeded = ensureThreadWorkspace(cur)
          if (seeded !== cur) persist(seeded)
        }
      }
    },
    [persist, setWorkspaceOpen],
  )

  const setActiveWorkspace = useCallback(
    (ws: ChatWorkspace) => {
      const cur = threadsRef.current.find((t) => t.id === activeIdRef.current)
      if (!cur || cur.id === BOOT_THREAD.id) return
      persist(patchThreadWorkspace(cur, ws))
    },
    [persist],
  )

  const localWorkspaceIdsForConsent = useCallback((): string[] => {
    const state = inboxRef.current?.state
    if (!state) return []
    return state.workspaces.filter((w) => w.kind === 'local').map((w) => w.id)
  }, [])

  const buildFromPlanRef = useRef<(() => Promise<void>) | null>(null)
  const enqueuePromptRef = useRef<
    ((text: string, threadId?: string) => Promise<boolean>) | null
  >(null)
  const runAssistantRef = useRef<
    ((baseThread: ChatThread, fileIds?: string[]) => Promise<void>) | null
  >(null)

  const openWorkspaceBuildConsentGate = useCallback(() => {
    // Surface the WS affordance so the red shake is visible.
    setHarnessOn(true)
    setWorkspaceOpen(true)
    setWorkspaceBuildConsentOpen(true)
    setWorkspaceBuildConsentHighlight(true)
  }, [setHarnessOn, setWorkspaceOpen])

  const clearWorkspaceBuildConsentUi = useCallback(() => {
    setWorkspaceBuildConsentOpen(false)
    setWorkspaceBuildConsentHighlight(false)
  }, [])

  const resumeAfterWorkspaceConsent = useCallback(() => {
    const pending = pendingAfterConsentRef.current
    pendingAfterConsentRef.current = null
    clearWorkspaceBuildConsentUi()
    if (!pending) return
    if (pending.kind === 'build') {
      void buildFromPlanRef.current?.()
      return
    }
    if (pending.kind === 'prompt') {
      void enqueuePromptRef.current?.(pending.text, pending.threadId)
      return
    }
    if (pending.kind === 'composer') {
      void (async () => {
        if (!unlocked || busyRef.current) return
        const run = runAssistantRef.current
        if (!run) return
        setPendingFiles((prev) => {
          for (const f of prev) {
            if (f.previewUrl) URL.revokeObjectURL(f.previewUrl)
          }
          return []
        })
        busyRef.current = true
        setBusy(true)
        let cur =
          threadsRef.current.find((t) => t.id === activeIdRef.current) || emptyThread()
        if (harnessOnRef.current) cur = ensureThreadWorkspace(cur)
        const userStep = appendChatMessage(
          cur,
          'user',
          pending.content || '(attached file)',
        )
        let thread = userStep.thread
        if (pending.fileIds.length) {
          thread = {
            ...thread,
            messages: thread.messages.map((m) =>
              m.id === userStep.message.id
                ? { ...m, fileIds: pending.fileIds, files: pending.filesMeta }
                : m,
            ),
          }
        }
        persist(thread)
        await run(thread, pending.fileIds.length ? pending.fileIds : undefined)
      })()
    }
  }, [clearWorkspaceBuildConsentUi, persist, unlocked])

  /** Returns true when the Agent+harness write path may proceed. */
  const ensureWorkspaceBuildConsent = useCallback(async (): Promise<boolean> => {
    const check = await evaluateWorkspaceBuildConsent({
      harnessOn: harnessOnRef.current,
      composerMode: composerModeRef.current,
      localWorkspaceIds: localWorkspaceIdsForConsent(),
    })
    if (check.ok) return true
    openWorkspaceBuildConsentGate()
    return false
  }, [localWorkspaceIdsForConsent, openWorkspaceBuildConsentGate])

  const dismissWorkspaceBuildConsent = useCallback(() => {
    pendingAfterConsentRef.current = null
    clearWorkspaceBuildConsentUi()
    setError(
      'Agent builds need a local folder or browser-storage consent — open WS to choose.',
    )
  }, [clearWorkspaceBuildConsentUi])

  const acceptWorkspaceLsConsent = useCallback(() => {
    writeWorkspaceLsConsent(true)
    resumeAfterWorkspaceConsent()
  }, [resumeAfterWorkspaceConsent])

  const notifyWorkspaceFolderBound = useCallback(() => {
    resumeAfterWorkspaceConsent()
  }, [resumeAfterWorkspaceConsent])

  const refreshSchedules = useCallback(() => {
    setScheduleJobs(readScheduleJobs())
  }, [])

  const addSchedule = useCallback(
    (prompt: string, cadence: ChatScheduleCadence) => {
      const tid = activeIdRef.current
      if (!tid || tid === BOOT_THREAD.id) return
      addScheduleJob({ threadId: tid, prompt, cadence })
      refreshSchedules()
    },
    [refreshSchedules],
  )

  const removeSchedule = useCallback(
    (id: string) => {
      removeScheduleJob(id)
      refreshSchedules()
    },
    [refreshSchedules],
  )

  const toggleSchedule = useCallback(
    (id: string, enabled: boolean) => {
      setScheduleJobEnabled(id, enabled)
      refreshSchedules()
    },
    [refreshSchedules],
  )

  const setRichLayout = useCallback((on: boolean) => {
    setRichLayoutState(on)
    writeChatFlag(CHAT_RICH_LAYOUT_KEY, on)
  }, [])

  const togglePlugin = useCallback((id: string) => {
    setEnabledPlugins((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id].slice(0, 16)
      writeChatPluginIds(next)
      return next
    })
  }, [])

  const removePendingFile = useCallback((fileId: string) => {
    setPendingFiles((prev) => {
      const hit = prev.find((f) => f.fileId === fileId)
      if (hit?.previewUrl) URL.revokeObjectURL(hit.previewUrl)
      return prev.filter((f) => f.fileId !== fileId)
    })
  }, [])

  const pickFile = useCallback(
    async (file: File | null) => {
      if (!file || busy || !unlocked) return
      if (pendingFilesRef.current.length >= 5) {
        setError('You can attach up to 5 files per message.')
        return
      }
      if (file.size > 6_000_000) {
        setError('File too large (max 6 MB).')
        return
      }
      setUploadingFile(true)
      setError(null)
      try {
        const uploaded = await uploadDeepseekChatFile(file, { preferRichLayout: richLayout })
        const previewUrl = file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined
        setPendingFiles((prev) =>
          [
            ...prev,
            {
              fileId: uploaded.fileId,
              filename: uploaded.filename || file.name,
              mime: file.type || undefined,
              previewUrl,
            },
          ].slice(0, 5),
        )
      } catch (err) {
        setError(err instanceof Error ? err.message : 'File upload failed')
      } finally {
        setUploadingFile(false)
      }
    },
    [busy, richLayout, unlocked],
  )

  const pickOcr = useCallback(
    async (file: File | null, setDraft: (text: string) => void) => {
      if (!file || busy || ocrBusy || !unlocked) return
      if (file.size > 6_000_000) {
        setError('File too large (max 6 MB).')
        return
      }
      setOcrBusy(true)
      setError(null)
      try {
        const { text } = await ocrDeepseekChatFile(file, {
          purpose: richLayout ? 'rich_layout_recognition' : 'text_recognition',
        })
        setDraft(text)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'OCR failed')
      } finally {
        setOcrBusy(false)
      }
    },
    [busy, ocrBusy, richLayout, unlocked],
  )

  const stopGeneration = useCallback(() => {
    abortRef.current?.abort()
    streamTtsRef.current?.stop()
    streamTtsRef.current = null
  }, [])

  const armNewChatCooldown = useCallback(() => {
    if (newChatCooldownTimerRef.current) clearTimeout(newChatCooldownTimerRef.current)
    newChatBusyRef.current = true
    setNewChatBusy(true)
    newChatCooldownTimerRef.current = setTimeout(() => {
      newChatBusyRef.current = false
      setNewChatBusy(false)
      newChatCooldownTimerRef.current = null
    }, NEW_CHAT_COOLDOWN_MS)
  }, [])

  useEffect(
    () => () => {
      if (newChatCooldownTimerRef.current) clearTimeout(newChatCooldownTimerRef.current)
    },
    [],
  )

  const startNewChat = useCallback((opts?: { force?: boolean }) => {
    const force = Boolean(opts?.force)
    // UI spam latch — never block forced project/agent creates.
    if (!force && (creatingNewChatRef.current || newChatBusyRef.current)) {
      return activeIdRef.current
    }

    creatingNewChatRef.current = true
    try {
      stopGeneration()
      setFollowUpQueue([])
      followUpQueueRef.current = []
      const created = emptyThread()
      // Keep threadsRef in sync before paint so a rapid second UI click hits the latch.
      const next = upsertChatThread(
        created,
        threadsRef.current.filter((t) => t.id !== BOOT_THREAD.id),
      )
      threadsRef.current = next
      setThreads(next)
      activeIdRef.current = created.id
      setActiveId(created.id)
      applyPlanDraftForThread(created.id)
      setError(null)
      if (!force) armNewChatCooldown()
      return created.id
    } finally {
      creatingNewChatRef.current = false
    }
  }, [applyPlanDraftForThread, armNewChatCooldown, stopGeneration])

  const selectThread = useCallback(
    (id: string) => {
      if (id === activeIdRef.current) return
      stopGeneration()
      // Follow-ups are thread-local intent — never auto-send into a different chat.
      setFollowUpQueue([])
      followUpQueueRef.current = []
      // Sync activeId + Plan draft before paint so Save/Build cannot hit the wrong thread.
      activeIdRef.current = id
      setActiveId(id)
      applyPlanDraftForThread(id)
      setError(null)
    },
    [applyPlanDraftForThread, stopGeneration],
  )

  const removeThread = useCallback(
    (id: string) => {
      stopGeneration()
      setThreads((prev) => {
        const withoutBoot = prev.filter((t) => t.id !== BOOT_THREAD.id)
        const next = deleteChatThread(id, withoutBoot)
        const live = next.filter((t) => !t.archived)
        // Clearing the last active agent → fresh empty new-chat window (no leftover messages).
        if (!live.length) {
          const created = emptyThread()
          setActiveId(created.id)
          activeIdRef.current = created.id
          applyPlanDraftForThread(created.id)
          return [created, ...next]
        }
        if (activeIdRef.current === id) {
          const nextId = live[0]!.id
          setActiveId(nextId)
          activeIdRef.current = nextId
          applyPlanDraftForThread(nextId)
        }
        return next
      })
    },
    [applyPlanDraftForThread, stopGeneration],
  )

  const archiveThread = useCallback(
    (id: string, archived: boolean) => {
      setThreads((prev) => {
        const withoutBoot = prev.filter((t) => t.id !== BOOT_THREAD.id)
        const cur = withoutBoot.find((t) => t.id === id)
        if (!cur) return prev
        const next = upsertChatThread(setChatThreadArchived(cur, archived), withoutBoot)
        const live = next.filter((t) => !t.archived)
        if (archived) {
          // Archiving the last live agent (or the active one with none left) → empty new chat.
          if (!live.length) {
            const created = emptyThread()
            setActiveId(created.id)
            activeIdRef.current = created.id
            applyPlanDraftForThread(created.id)
            return [created, ...next]
          }
          if (activeIdRef.current === id) {
            const nextId = live[0]!.id
            setActiveId(nextId)
            activeIdRef.current = nextId
            applyPlanDraftForThread(nextId)
          }
        }
        return next
      })
    },
    [applyPlanDraftForThread],
  )

  const runAssistant = useCallback(
    async (baseThread: ChatThread, fileIds?: string[]) => {
      let thread = baseThread
      const assistantStep = appendChatMessage(thread, 'assistant', '')
      thread = assistantStep.thread
      const assistantId = assistantStep.message.id
      persist(thread)
      setStreamingId(assistantId)
      setThinking(false)
      setSearching(false)
      setThinkingAuto(false)
      setSearchingAuto(false)
      thinkStartedAt.current = null

      const controller = new AbortController()
      abortRef.current = controller

      streamTtsRef.current?.stop()
      streamTtsRef.current = null
      const liveTts =
        canAutoSpeak && autoSpeak ? new StreamingDeepseekChatTts({ voiceId: 'stella' }) : null
      streamTtsRef.current = liveTts

      let assembled = ''
      let reasoning = ''
      let sources: ChatSource[] | undefined
      let searchSteps: ChatSearchStep[] = []
      let paintTimer: number | null = null
      let needsPaint = false
      const workspacePathsThisTurn: string[] = []
      let imagesThisTurn = 0
      let projectActionsThisTurn = 0
      let overseerTurn = false

      const schedulePaint = () => {
        needsPaint = true
        if (paintTimer != null) return
        paintTimer = window.setTimeout(() => {
          paintTimer = null
          if (!needsPaint) return
          needsPaint = false
          paintThread(thread)
        }, STREAM_PAINT_MS)
      }
      const flushPaint = () => {
        if (paintTimer != null) {
          window.clearTimeout(paintTimer)
          paintTimer = null
        }
        needsPaint = false
        paintThread(thread)
      }
      const markThinking = () => {
        if (!thinkStartedAt.current) thinkStartedAt.current = Date.now()
        setThinking(true)
      }
      const dropEmpty = (t: ChatThread) => ({
        ...t,
        messages: t.messages.filter((m) => m.id !== assistantId),
      })
      const recoverEmptyFromWork = (): boolean => {
        const summary = summarizeAgentToolWork({
          workspacePaths: workspacePathsThisTurn,
          imageCount: imagesThisTurn,
          projectActions: projectActionsThisTurn,
        })
        if (!summary) return false
        assembled = summary.slice(0, MAX_CONTENT_CHARS)
        thread = patchAssistantContent(thread, assistantId, assembled, {
          reasoning: reasoning || undefined,
          sources,
          searchSteps: searchSteps.length ? searchSteps : undefined,
        })
        return true
      }

      try {
        let sendThread = thread
        if (sendThread.messages.length > API_CHAT_MESSAGES_MAX - 2) {
          sendThread = rollupOldestChatMessages(sendThread)
          thread = sendThread
          persist(sendThread)
        }
        const wireMessages = apiMessagesFromThread(sendThread).filter((m) => m.content.trim())
        const inboxState = inboxRef.current?.state
        const linkedAgent = inboxState ? agentForThread(inboxState, thread.id) : undefined
        const inboxRole =
          linkedAgent?.role === 'overseer' || linkedAgent?.role === 'worker'
            ? linkedAgent.role
            : undefined
        const rawProjectMemory = linkedAgent?.projectId
          ? inboxState?.projects.find((p) => p.id === linkedAgent.projectId)?.memory
          : undefined
        const projectMemory =
          linkedAgent?.projectId && inboxState
            ? mergeProjectMemoryWithCompacts(inboxState, linkedAgent.projectId, rawProjectMemory)
            : rawProjectMemory
        const sandboxSessionId = inboxState
          ? resolveActiveSandboxSessionId(inboxState, linkedAgent?.projectId)
          : undefined
        const projectId =
          linkedAgent?.role === 'overseer' && linkedAgent.projectId
            ? linkedAgent.projectId
            : undefined
        const projectAgents =
          projectId && inboxState
            ? inboxState.agents
                .filter((a) => a.projectId === projectId)
                .map((a) => ({
                  id: a.id,
                  title: a.title,
                  status: a.status,
                  role: a.role,
                  ...(a.threadId ? { threadId: a.threadId } : null),
                }))
            : undefined
        overseerTurn = linkedAgent?.role === 'overseer' && Boolean(projectId)
        // Overseer chat without projectId means tools cannot attach — surface immediately.
        if (linkedAgent?.role === 'overseer' && !projectId) {
          setError(
            'Overseer is missing a Project link — open the Project from Inbox so orchestration tools can run.',
          )
        }
        if (linkedAgent && inboxRef.current) {
          inboxRef.current.updateAgentStatus(linkedAgent.id, 'working')
        }
        if (linkedAgent?.role === 'overseer') {
          overseerReturnThreadRef.current = thread.id
        }
        const avatarCharacter = readChatDeepAvatarCharacter()
        const avatarName = displayChatDeepAvatarName(avatarCharacter, readChatDeepAvatarNames())
        const avatarTrait = readChatDeepAvatarTrait()
        const avatarNotes = readChatDeepAvatarNotes()
        let avatarReacted = false
        await streamDeepseekChat(wireMessages, {
          thinking: autoOnRef.current ? 'auto' : deepThink,
          search: autoOnRef.current ? 'auto' : searchOn,
          harness: harnessOnRef.current,
          chatMode: composerModeRef.current,
          workspace: harnessOnRef.current
            ? workspaceWirePayload(thread.workspace)
            : undefined,
          fileIds,
          plugins: enabledPluginsRef.current,
          primaryLang: primaryLanguage,
          avatarCharacter,
          avatarName,
          avatarTrait,
          avatarNotes,
          inboxRole,
          projectMemory,
          sandboxSessionId,
          projectId,
          projectAgents,
          signal: controller.signal,
          onAvatar: (event) => {
            if (event.action === 'play' && event.mood) {
              avatarReacted = true
              requestChatDeepAvatarPlay(event.mood, { forceFullscreen: true, source: 'play' })
            } else if (event.action === 'react' && event.mood) {
              avatarReacted = true
              requestChatDeepAvatarReact(event.mood)
            }
          },
          onWorkspace: (files) => {
            for (const f of files) {
              if (f?.path) workspacePathsThisTurn.push(f.path)
            }
            thread = patchThreadWorkspace(
              thread,
              applyWorkspaceWireUpdate(thread.workspace, files),
            )
            setReviewActivity((prev) => applyWorkspaceFilesToDiffs(prev, files))
            setReviewOpen(true)
            schedulePaint()
          },
          onSandbox: (activity) => {
            setReviewActivity((prev) => applySandboxActivity(prev, activity))
            setReviewOpen(true)
            const reviewUrl =
              typeof activity.reviewUrl === 'string' ? activity.reviewUrl.trim() : ''
            if (reviewUrl && linkedAgent && inboxRef.current) {
              inboxRef.current.markInReview(linkedAgent.id, reviewUrl)
            }
            // Mirror into searchSteps so inline tool cards stream in the reply.
            const step = searchStepFromSandboxActivity(activity)
            if (step) {
              searchSteps = [...searchSteps, step].slice(-24)
              thread = patchAssistantContent(thread, assistantId, assembled, {
                reasoning: reasoning || undefined,
                sources,
                searchSteps,
              })
              schedulePaint()
            }
          },
          onProject: (actions) => {
            projectActionsThisTurn += actions.length
            if (projectId) applyProjectActions(actions, projectId)
          },
          onStatus: (status, meta) => {
            if (status === 'searching') {
              setSearching(true)
              if (meta?.auto) setSearchingAuto(true)
              return
            }
            if (meta?.auto) setThinkingAuto(true)
            markThinking()
          },
          onReasoning: (delta) => {
            markThinking()
            reasoning += delta
            reasoning = sanitizeDeepseekChatVisibleText(reasoning)
            if (reasoning.length > LIVE_REASONING_KEEP) {
              reasoning = reasoning.slice(-LIVE_REASONING_KEEP)
            }
            thread = patchAssistantContent(thread, assistantId, assembled, { reasoning })
            schedulePaint()
          },
          onSources: (next) => {
            sources = next
            thread = patchAssistantContent(thread, assistantId, assembled, {
              reasoning: reasoning || undefined,
              sources,
              searchSteps: searchSteps.length ? searchSteps : undefined,
            })
            schedulePaint()
          },
          onSearchStep: (step) => {
            setSearching(true)
            searchSteps = [...searchSteps, step].slice(-24)
            thread = patchAssistantContent(thread, assistantId, assembled, {
              reasoning: reasoning || undefined,
              sources,
              searchSteps,
            })
            schedulePaint()
          },
          onTitle: (title) => {
            thread = renameChatThread(thread, title)
            schedulePaint()
          },
          onImage: (image) => {
            imagesThisTurn += 1
            const md = `\n\n![${image.prompt.slice(0, 80)}](${image.url})`
            if (!assembled.includes(image.url)) {
              assembled = `${assembled}${md}`.slice(0, MAX_CONTENT_CHARS)
              thread = patchAssistantContent(thread, assistantId, assembled, {
                reasoning: reasoning || undefined,
                sources,
                searchSteps: searchSteps.length ? searchSteps : undefined,
              })
              schedulePaint()
            }
          },
          onContentReplace: (text) => {
            assembled = sanitizeDeepseekChatVisibleText(text).slice(0, MAX_CONTENT_CHARS)
            thread = patchAssistantContent(thread, assistantId, assembled, {
              reasoning: reasoning || undefined,
              sources,
              searchSteps: searchSteps.length ? searchSteps : undefined,
            })
            schedulePaint()
          },
          onDelta: (delta) => {
            const firstToken = assembled.length === 0
            if (firstToken) {
              setThinking(false)
              setSearching(false)
            }
            assembled += delta
            assembled = sanitizeDeepseekChatVisibleText(assembled)
            if (assembled.length > MAX_CONTENT_CHARS) {
              assembled = assembled.slice(0, MAX_CONTENT_CHARS)
            }
            if (!deepseekChatTextLooksLeaked(delta)) liveTts?.feed(delta)
            thread = firstToken
              ? patchAssistantContent(thread, assistantId, assembled, {
                  reasoning: reasoning || undefined,
                  thoughtMs: thinkStartedAt.current
                    ? Date.now() - thinkStartedAt.current
                    : undefined,
                  sources,
                  searchSteps: searchSteps.length ? searchSteps : undefined,
                })
              : patchAssistantContent(thread, assistantId, assembled)
            schedulePaint()
          },
        })
        flushPaint()
        assembled = sanitizeDeepseekChatVisibleText(assembled).slice(0, MAX_CONTENT_CHARS)
        if (!assembled.trim()) {
          // Agent tools often land workspace files before a final prose bubble.
          // Prefer a durable summary over a false "No reply" + concern mood.
          recoverEmptyFromWork()
        }
        if (!avatarReacted && assembled.trim()) {
          const inferred = inferChatDeepAvatarMoodFromText(assembled)
          if (inferred) requestChatDeepAvatarReact(inferred)
        }
        if (!assembled.trim()) {
          liveTts?.stop()
          thread = dropEmpty(thread)
          persist(thread)
          setError('No reply — try again.')
        } else {
          if (harnessOnRef.current) {
            const assistant = thread.messages.find((m) => m.id === assistantId)
            thread = maybeSeedArtifactsIntoWorkspace(thread, assistant)
          }
          persist(thread)
          // Never leave silent ATTENTION: Overseer promised workers but emitted no project.actions.
          if (
            overseerTurn &&
            projectActionsThisTurn === 0 &&
            looksLikeDeferredOrchestration(assembled)
          ) {
            setError(ORCHESTRATION_STALL_ERROR)
          } else if (
            overseerTurn &&
            projectActionsThisTurn === 0 &&
            looksLikeDeferredClose(assembled)
          ) {
            setError(CLOSE_STALL_ERROR)
          } else {
            // call_started search_steps alone are not evidence — need source URLs.
            const hadSearchChrome = Boolean(sources?.length)
            if (
              searchOn &&
              !hadSearchChrome &&
              looksLikeDeferredSearchTurn(assembled, reasoning)
            ) {
              setError(SEARCH_STALL_ERROR)
            } else if (
              !hadSearchChrome &&
              looksLikeDeferredToolUse(assembled) &&
              !looksLikeDeferredSearchTurn(assembled, reasoning)
            ) {
              setError(TOOL_STALL_ERROR)
            }
          }
          if (liveTts) {
            void liveTts.finish().catch(() => {
              /* ignore */
            })
          } else if (canAutoSpeak && autoSpeak && assembled.trim()) {
            void speakManual(assembled.trim(), chatSpeakLang(assembled))
          }
        }
      } catch (err) {
        flushPaint()
        liveTts?.stop()
        if ((err as Error)?.name === 'AbortError') {
          if (!assembled.trim() && !recoverEmptyFromWork()) thread = dropEmpty(thread)
          persist(thread)
        } else {
          const message = humanizeThrownError(err)
          if (
            !assembled.trim() &&
            isEmptyAgentReplyRecoverableError(message) &&
            recoverEmptyFromWork()
          ) {
            // Tools already wrote files / images — keep the recovery bubble, no red banner.
            persist(thread)
          } else {
            setError(message)
            thread = {
              ...thread,
              messages: thread.messages.filter((m) => m.id !== assistantId || m.content.trim()),
            }
            persist(thread)
          }
        }
      } finally {
        if (paintTimer != null) window.clearTimeout(paintTimer)
        setStreamingId(null)
        setThinking(false)
        setSearching(false)
        setThinkingAuto(false)
        setSearchingAuto(false)
        setBusy(false)
        abortRef.current = null
        if (streamTtsRef.current === liveTts) streamTtsRef.current = null
        const inboxApi = inboxRef.current
        const inboxState = inboxApi?.state
        const linkedAgent = inboxState ? agentForThread(inboxState, thread.id) : undefined
        if (linkedAgent && inboxApi) {
          const fresh = inboxApi.state.agents.find((a) => a.id === linkedAgent.id) || linkedAgent
          const hasPendingWorkers = pendingProjectMsgsRef.current.some(
            (p) =>
              p.projectId === fresh.projectId ||
              (fresh.role === 'overseer' && Boolean(p.agentId)),
          )
          // Keep Overseer Working while worker prompts are queued; otherwise Needs Attention.
          // Do not revive closed workers that were compacted this turn.
          if (fresh.status === 'done' || fresh.status === 'canceled') {
            /* keep closed */
          } else {
            let nextStatus: InboxAgentStatus =
              fresh.role === 'worker' || fresh.role === 'overseer'
                ? 'needs_attention'
                : 'idle'
            if (fresh.role === 'overseer' && hasPendingWorkers) {
              nextStatus = 'working'
            }
            inboxApi.updateAgentStatus(fresh.id, nextStatus)
          }
        }
      }
    },
    [
      applyProjectActions,
      autoSpeak,
      canAutoSpeak,
      deepThink,
      paintThread,
      persist,
      primaryLanguage,
      searchOn,
      speakManual,
    ],
  )
  runAssistantRef.current = runAssistant

  const active =
    threads.find((t) => t.id === activeId) ||
    ({
      id: activeId,
      title: 'New chat',
      updatedAt: 0,
      messages: [] as ChatMessage[],
    } satisfies ChatThread)

  const convertMessage = useCallback(
    (message: ChatMessage): ThreadMessageLike =>
      convertChatMessage(message, { streamingId }),
    [streamingId],
  )

  const queueFollowUp = useCallback((text: string) => {
    const content = text.trim().slice(0, MAX_CONTENT_CHARS)
    if (!content) return
    const threadId = activeIdRef.current
    if (!threadId || threadId === BOOT_THREAD.id) return
    const id =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? `fu_${crypto.randomUUID()}`
        : `fu_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`
    setFollowUpQueue((prev) => {
      const next = [...prev, { id, text: content, threadId }].slice(-8)
      followUpQueueRef.current = next
      return next
    })
  }, [])

  const dismissFollowUp = useCallback((id: string) => {
    setFollowUpQueue((prev) => {
      const next = prev.filter((x) => x.id !== id)
      followUpQueueRef.current = next
      return next
    })
  }, [])

  const clearFollowUpQueue = useCallback(() => {
    followUpQueueRef.current = []
    setFollowUpQueue([])
  }, [])

  const enqueuePrompt = useCallback(
    async (text: string, threadId?: string): Promise<boolean> => {
      if (!unlocked || busyRef.current) return false
      const content = text.trim().slice(0, MAX_CONTENT_CHARS)
      if (!content) return false
      if (!(await ensureWorkspaceBuildConsent())) {
        pendingAfterConsentRef.current = { kind: 'prompt', text: content, threadId }
        return false
      }
      const tid = threadId || activeIdRef.current
      if (tid !== activeIdRef.current) {
        activeIdRef.current = tid
        setActiveId(tid)
        applyPlanDraftForThread(tid)
      }
      setError(null)
      // Set busy synchronously so a concurrent follow-up flush cannot claim another send.
      busyRef.current = true
      setBusy(true)
      let cur = threadsRef.current.find((t) => t.id === tid) || emptyThread()
      if (harnessOnRef.current) cur = ensureThreadWorkspace(cur)
      const userStep = appendChatMessage(cur, 'user', content)
      persist(userStep.thread)
      await runAssistant(userStep.thread)
      return true
    },
    [applyPlanDraftForThread, ensureWorkspaceBuildConsent, persist, runAssistant, unlocked],
  )
  enqueuePromptRef.current = enqueuePrompt

  const refreshGitDiff = useCallback(async () => {
    const inboxState = inboxRef.current?.state
    if (!inboxState) return
    const thread = threadsRef.current.find((t) => t.id === activeIdRef.current)
    const linked = thread ? agentForThread(inboxState, thread.id) : undefined
    const sessionId = resolveActiveSandboxSessionId(inboxState, linked?.projectId)
    if (!sessionId) {
      setError('No sandbox session — create an Internal sandbox in Workspaces first.')
      return
    }
    setGitDiffBusy(true)
    try {
      const result = await execChatSandbox(sessionId, ['git', 'diff', '--no-color'])
      setReviewActivity((prev) => {
        const withRun = applySandboxActivity(prev, {
          kind: 'run',
          argv: result.argv?.length ? result.argv : ['git', 'diff', '--no-color'],
          stdout: result.stdout,
          stderr: result.stderr,
          exitCode: result.code ?? undefined,
          ok: result.ok,
          at: Date.now(),
        })
        return mergeGitDiffs(withRun, result.stdout || result.stderr || '')
      })
      setReviewOpen(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'git diff failed')
    } finally {
      setGitDiffBusy(false)
    }
  }, [])

  /**
   * Plan→Build Deep latch: keep chainBusy while workers are queued/flushing so the
   * Overseer handoff turn cannot consume Deep/eureka/fullscreen early. When the
   * chain goes idle, settle (deferred outro) if credit is still armed.
   */
  const syncPlanBuildChain = useCallback((opts?: { settleIfIdle?: boolean }) => {
    const chainBusy =
      flushingProjectMsgsRef.current || pendingProjectMsgsRef.current.length > 0
    setChatDeepAvatarPlanBuildChainBusy(chainBusy)
    if (opts?.settleIfIdle && !chainBusy && !busyRef.current) {
      settleChatDeepAvatarPlanBuild()
    }
  }, [])

  const savePlanToWorkspace = useCallback((): { ok: boolean; path?: string; error?: string } => {
    const tid = activeIdRef.current
    const cur = threadsRef.current.find((t) => t.id === tid)
    if (!cur || cur.id === BOOT_THREAD.id) {
      return { ok: false, error: 'Open a chat before saving the plan.' }
    }
    const text = planDraftRef.current.trim()
    if (!text) return { ok: false, error: 'Plan is empty — nothing to save.' }
    try {
      const seeded = ensureThreadWorkspace(cur)
      const ws = upsertWorkspaceFile(seeded.workspace, {
        path: CHAT_PLAN_WORKSPACE_PATH,
        text,
        mime: 'text/markdown',
      })
      persist(patchThreadWorkspace(seeded, ws))
      return { ok: true, path: CHAT_PLAN_WORKSPACE_PATH }
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'Save failed' }
    }
  }, [persist])

  const buildFromPlan = useCallback(async () => {
    // Keep Plan selected while a reply is in flight — never silent-switch to Agent.
    if (!unlocked) return
    if (busyRef.current) {
      setError('Wait for the current reply to finish, then Build.')
      return
    }
    const planText = planDraftRef.current.trim()
    if (!planText) {
      setError('Plan is empty — write or restore a plan before Build.')
      return
    }
    // Build always enables Agent + harness writes — require storage consent first.
    const consent = await evaluateWorkspaceBuildConsent({
      harnessOn: true,
      composerMode: 'agent',
      localWorkspaceIds: localWorkspaceIdsForConsent(),
    })
    if (!consent.ok) {
      pendingAfterConsentRef.current = { kind: 'build' }
      openWorkspaceBuildConsentGate()
      return
    }
    if (!harnessOnRef.current) setHarnessOn(true)
    const tid = activeIdRef.current
    const inboxState = inboxRef.current?.state
    const linked = inboxState ? agentForThread(inboxState, tid) : undefined
    const inProject = Boolean(linked?.projectId)
    // Prefer Overseer thread when building inside a Project.
    let targetThreadId = tid
    if (inProject && linked?.projectId && linked.role !== 'overseer') {
      const overseer = inboxState?.agents.find(
        (a) => a.projectId === linked.projectId && a.role === 'overseer' && a.threadId,
      )
      if (overseer?.threadId) targetThreadId = overseer.threadId
    }
    // Latch Deep credit. In-project Builds stay chain-busy until worker flush settles.
    markChatDeepAvatarPlanBuild()
    setChatDeepAvatarPlanBuildChainBusy(inProject)
    setComposerMode('agent')
    const prompt = buildPlanBuildPrompt(planText, inProject)
    await enqueuePrompt(prompt, targetThreadId)
  }, [
    enqueuePrompt,
    localWorkspaceIdsForConsent,
    openWorkspaceBuildConsentGate,
    setComposerMode,
    setHarnessOn,
    unlocked,
  ])
  buildFromPlanRef.current = buildFromPlan

  // Load the active thread's Plan draft when switching chats (edits are keyed by threadId).
  useEffect(() => {
    if (activeId === BOOT_THREAD.id) {
      setPlanDraftState('')
      planDraftRef.current = ''
      return
    }
    const stored = planDraftsByThreadRef.current[activeId] ?? ''
    setPlanDraftState(stored)
    planDraftRef.current = stored
  }, [activeId])

  // Seed / refresh editable Plan artifact from the latest assistant reply while in Plan mode.
  // Never overwrite a draft the user has edited away from the last seed snapshot.
  useEffect(() => {
    if (composerMode !== 'plan') return
    if (busy) return
    if (activeId === BOOT_THREAD.id) return
    const thread = threads.find((t) => t.id === activeId)
    const lastAssistant = [...(thread?.messages || [])]
      .reverse()
      .find((m) => m.role === 'assistant' && m.content.trim())
    const msgId = lastAssistant ? lastAssistant.id : ''
    const prev = planSeedByThreadRef.current[activeId]
    if (prev?.msgId === msgId) return
    const currentDraft = planDraftsByThreadRef.current[activeId] ?? planDraftRef.current
    // User edited since last seed — keep their text even if a new reply landed.
    if (prev && currentDraft !== prev.text) return
    // Prefer tagged plan fences; if the reply has none, leave an existing draft alone.
    const extracted = lastAssistant
      ? extractPlanArtifactText(lastAssistant.content)
      : ''
    if (
      lastAssistant &&
      extracted === lastAssistant.content.trim() &&
      !/```(plan|markdown|md)\b/i.test(lastAssistant.content) &&
      currentDraft.trim()
    ) {
      // Conversational follow-up without a plan fence — do not replace a curated draft.
      planSeedByThreadRef.current[activeId] = { msgId, text: currentDraft }
      return
    }
    planSeedByThreadRef.current[activeId] = { msgId, text: extracted }
    planDraftsByThreadRef.current[activeId] = extracted
    planDraftRef.current = extracted
    setPlanDraftState(extracted)
  }, [activeId, busy, composerMode, threads])

  // Flush Overseer project_message / create_agent messages sequentially, then return to Overseer.
  useEffect(() => {
    if (!unlocked || busy || flushingProjectMsgsRef.current) {
      syncPlanBuildChain({ settleIfIdle: !busy })
      return
    }
    if (!pendingProjectMsgsRef.current.length) {
      syncPlanBuildChain({ settleIfIdle: true })
      return
    }
    flushingProjectMsgsRef.current = true
    setChatDeepAvatarPlanBuildChainBusy(true)
    void (async () => {
      try {
        while (pendingProjectMsgsRef.current.length) {
          const next = pendingProjectMsgsRef.current.shift()!
          const api = inboxRef.current
          const agent = api?.state.agents.find((a) => a.id === next.agentId)
          let threadId = agent?.threadId
          if (!threadId || !threadsRef.current.some((t) => t.id === threadId)) {
            threadId = createSilentThread()
            api?.bindAgentThread(next.agentId, threadId)
            api?.linkThread(next.projectId, threadId)
          }
          await enqueuePrompt(next.message, threadId)
        }
        const returnTo = overseerReturnThreadRef.current
        overseerReturnThreadRef.current = null
        if (returnTo && returnTo !== activeIdRef.current) {
          selectThread(returnTo)
        }
      } finally {
        flushingProjectMsgsRef.current = false
        syncPlanBuildChain({ settleIfIdle: true })
      }
    })()
  }, [busy, createSilentThread, enqueuePrompt, selectThread, syncPlanBuildChain, unlocked])

  const onNew = useCallback(
    async (message: AppendMessage) => {
      if (!unlocked) return
      const textPart = message.content.find((p) => p.type === 'text')
      const content = (textPart && textPart.type === 'text' ? textPart.text : '').trim()
      const pending = pendingFilesRef.current
      if (!content && !pending.length) return
      if (content.length > MAX_CONTENT_CHARS) {
        setError(`Message is too long (max ${MAX_CONTENT_CHARS.toLocaleString()} characters).`)
        return
      }
      // While a turn is running: queue text follow-ups (attachments wait until idle).
      if (busyRef.current) {
        if (pending.length) {
          setError('Wait for the current reply to finish before attaching files.')
          return
        }
        if (!content) return
        queueFollowUp(content)
        return
      }
      if (!(await ensureWorkspaceBuildConsent())) {
        const fileIds = pending.map((f) => f.fileId)
        const filesMeta: ChatFileMeta[] = pending.map(({ fileId, filename, mime }) => ({
          fileId,
          filename,
          mime,
        }))
        pendingAfterConsentRef.current = {
          kind: 'composer',
          content,
          fileIds,
          filesMeta,
        }
        return
      }
      const fileIds = pending.map((f) => f.fileId)
      const filesMeta: ChatFileMeta[] = pending.map(({ fileId, filename, mime }) => ({
        fileId,
        filename,
        mime,
      }))
      setError(null)
      setPendingFiles((prev) => {
        for (const f of prev) {
          if (f.previewUrl) URL.revokeObjectURL(f.previewUrl)
        }
        return []
      })
      busyRef.current = true
      setBusy(true)
      let cur =
        threadsRef.current.find((t) => t.id === activeIdRef.current) || emptyThread()
      if (harnessOnRef.current) cur = ensureThreadWorkspace(cur)
      const userStep = appendChatMessage(cur, 'user', content || '(attached file)')
      let thread = userStep.thread
      if (fileIds.length) {
        thread = {
          ...thread,
          messages: thread.messages.map((m) =>
            m.id === userStep.message.id ? { ...m, fileIds, files: filesMeta } : m,
          ),
        }
      }
      persist(thread)
      await runAssistant(thread, fileIds.length ? fileIds : undefined)
    },
    [ensureWorkspaceBuildConsent, persist, queueFollowUp, runAssistant, unlocked],
  )

  // Auto-send one queued follow-up for the **active** thread after the turn settles.
  // Items are keyed by threadId; never flush into a different conversation.
  useEffect(() => {
    if (!unlocked || busy || flushingFollowUpsRef.current) return
    if (flushingProjectMsgsRef.current || pendingProjectMsgsRef.current.length) return
    const active = activeIdRef.current
    const head = followUpQueueRef.current.find((x) => x.threadId === active)
    if (!head) return
    flushingFollowUpsRef.current = true
    void (async () => {
      try {
        if (busyRef.current) return
        // Claim before await so a second effect pass cannot double-send the same id.
        const rest = followUpQueueRef.current.filter((x) => x.id !== head.id)
        followUpQueueRef.current = rest
        setFollowUpQueue(rest)
        // If the user left this thread after claim, drop — do not post elsewhere.
        if (activeIdRef.current !== head.threadId) return
        const sent = await enqueuePrompt(head.text, head.threadId)
        if (!sent) {
          // Only restore if we are still on the same thread (switch clears the queue).
          if (activeIdRef.current !== head.threadId) return
          setFollowUpQueue((prev) => {
            const next = [head, ...prev.filter((x) => x.id !== head.id)].slice(0, 8)
            followUpQueueRef.current = next
            return next
          })
        }
      } finally {
        flushingFollowUpsRef.current = false
      }
    })()
  }, [busy, enqueuePrompt, followUpQueue, unlocked])

  // In-tab scheduled prompts (Harness Phase 3) — only while tab open + Harness on.
  useEffect(() => {
    if (!harnessOn || !unlocked) return
    const tick = () => {
      if (busyRef.current || document.visibilityState === 'hidden') return
      const due = claimDueScheduleJobs()
      if (!due.length) return
      refreshSchedules()
      const job = due[0]!
      void enqueuePrompt(job.prompt, job.threadId)
    }
    const id = window.setInterval(tick, 15_000)
    tick()
    return () => window.clearInterval(id)
  }, [enqueuePrompt, harnessOn, refreshSchedules, unlocked])

  const onCancel = useCallback(async () => {
    stopGeneration()
  }, [stopGeneration])

  const threadList = useMemo(() => {
    const real = threads.filter((t) => t.id !== BOOT_THREAD.id)
    const regular = real
      .filter((t) => !t.archived)
      .map((t) => ({
        status: 'regular' as const,
        id: t.id,
        title: t.title,
      }))
    const archived = real
      .filter((t) => t.archived)
      .map((t) => ({
        status: 'archived' as const,
        id: t.id,
        title: t.title,
      }))
    return {
      threadId: activeId === BOOT_THREAD.id ? undefined : activeId,
      isLoading: !historyReady,
      threads: regular,
      archivedThreads: archived,
      onSwitchToNewThread: async () => {
        startNewChat()
      },
      onSwitchToThread: async (threadId: string) => {
        selectThread(threadId)
      },
      onRename: async (threadId: string, newTitle: string) => {
        const cur = threadsRef.current.find((t) => t.id === threadId)
        if (!cur) return
        persist(renameChatThread(cur, newTitle))
      },
      onArchive: async (threadId: string) => {
        archiveThread(threadId, true)
      },
      onUnarchive: async (threadId: string) => {
        archiveThread(threadId, false)
      },
      onDelete: async (threadId: string) => {
        removeThread(threadId)
      },
    }
  }, [
    activeId,
    archiveThread,
    historyReady,
    persist,
    removeThread,
    selectThread,
    startNewChat,
    threads,
  ])

  const runtime = useExternalStoreRuntime({
    isRunning: busy,
    isDisabled: !unlocked || !historyReady,
    messages: active.messages,
    convertMessage,
    onNew,
    onCancel,
    adapters: {
      threadList,
    },
  })

  const activeWorkspace = useMemo(() => {
    const t = threads.find((x) => x.id === activeId)
    return t?.workspace
  }, [activeId, threads])

  const threadScheduleJobs = useMemo(
    () => jobsForThread(activeId, scheduleJobs),
    [activeId, scheduleJobs],
  )

  const visibleThreads = useMemo(
    () => threads.filter((t) => t.id !== BOOT_THREAD.id),
    [threads],
  )

  const activeFollowUps = useMemo(
    () => followUpQueue.filter((x) => x.threadId === activeId),
    [followUpQueue, activeId],
  )

  const clearError = useCallback(() => setError(null), [])

  const activeProjectMeta = useMemo(() => {
    const state = inbox?.state
    if (!state) return { agents: [] as ChatInboxAgent[], title: null as string | null }
    const linked = agentForThread(state, activeId)
    const projectId = linked?.projectId
    if (!projectId) return { agents: [] as ChatInboxAgent[], title: null as string | null }
    const project = state.projects.find((p) => p.id === projectId)
    const agents = state.agents.filter(
      (a) => a.projectId === projectId && (a.role === 'overseer' || a.role === 'worker'),
    )
    return { agents, title: project?.title || null }
  }, [inbox?.state, activeId])

  const openProjectAgent = useCallback(
    (agent: ChatInboxAgent) => {
      if (!agent.threadId) return
      selectThread(agent.threadId)
    },
    [selectThread],
  )

  const session = useMemo<ChatAuiSession>(
    () => ({
      threads: visibleThreads,
      activeId,
      historyReady,
      busy,
      newChatBusy,
      error,
      clearError,
      setError,
      autoOn,
      setAutoOn,
      deepThink,
      setDeepThink,
      searchOn,
      setSearchOn,
      composerMode,
      setComposerMode,
      buildFromPlan,
      planDraft,
      setPlanDraft,
      savePlanToWorkspace,
      workspaceFocusTab,
      requestWorkspaceTab,
      clearWorkspaceFocusTab,
      projectAgents: activeProjectMeta.agents,
      projectTitle: activeProjectMeta.title,
      openProjectAgent,
      richLayout,
      setRichLayout,
      harnessOn,
      setHarnessOn,
      workspaceOpen,
      setWorkspaceOpen,
      activeWorkspace,
      setActiveWorkspace,
      scheduleJobs: threadScheduleJobs,
      addSchedule,
      removeSchedule,
      toggleSchedule,
      thinking,
      searching,
      thinkingAuto,
      searchingAuto,
      streamingId,
      pendingFiles,
      uploadingFile,
      ocrBusy,
      pluginCatalog,
      enabledPlugins,
      togglePlugin,
      pluginKeyHints,
      refreshPlugins,
      pickFile,
      pickOcr,
      removePendingFile,
      startNewChat,
      selectThread,
      removeThread,
      archiveThread,
      stopGeneration,
      enqueuePrompt,
      followUpQueue: activeFollowUps,
      queueFollowUp,
      dismissFollowUp,
      clearFollowUpQueue,
      reviewActivity,
      reviewOpen,
      setReviewOpen,
      refreshGitDiff,
      gitDiffBusy,
      workspaceBuildConsentOpen,
      workspaceBuildConsentHighlight,
      dismissWorkspaceBuildConsent,
      acceptWorkspaceLsConsent,
      notifyWorkspaceFolderBound,
    }),
    [
      acceptWorkspaceLsConsent,
      activeFollowUps,
      activeId,
      activeProjectMeta.agents,
      activeProjectMeta.title,
      activeWorkspace,
      addSchedule,
      archiveThread,
      buildFromPlan,
      busy,
      clearError,
      clearFollowUpQueue,
      clearWorkspaceFocusTab,
      newChatBusy,
      autoOn,
      composerMode,
      deepThink,
      openProjectAgent,
      planDraft,
      requestWorkspaceTab,
      savePlanToWorkspace,
      workspaceFocusTab,
      dismissFollowUp,
      dismissWorkspaceBuildConsent,
      enabledPlugins,
      enqueuePrompt,
      error,
      gitDiffBusy,
      harnessOn,
      historyReady,
      notifyWorkspaceFolderBound,
      ocrBusy,
      pendingFiles,
      pickFile,
      pickOcr,
      pluginCatalog,
      pluginKeyHints,
      queueFollowUp,
      refreshGitDiff,
      refreshPlugins,
      removePendingFile,
      removeSchedule,
      removeThread,
      reviewActivity,
      reviewOpen,
      richLayout,
      searchOn,
      searching,
      searchingAuto,
      selectThread,
      setActiveWorkspace,
      setAutoOn,
      setComposerMode,
      setDeepThink,
      setHarnessOn,
      setRichLayout,
      setSearchOn,
      startNewChat,
      stopGeneration,
      streamingId,
      thinking,
      thinkingAuto,
      threadScheduleJobs,
      togglePlugin,
      toggleSchedule,
      uploadingFile,
      visibleThreads,
      workspaceBuildConsentHighlight,
      workspaceBuildConsentOpen,
      workspaceFocusTab,
      workspaceOpen,
    ],
  )

  return (
    <ChatAuiSessionContext.Provider value={session}>
      <AssistantRuntimeProvider runtime={runtime}>{children}</AssistantRuntimeProvider>
    </ChatAuiSessionContext.Provider>
  )
}
