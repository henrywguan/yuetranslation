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
  apiMessagesFromThread,
  appendChatMessage,
  deleteChatThread,
  emptyThread,
  hydrateChatThreadsAsync,
  LIVE_REASONING_KEEP,
  MAX_CONTENT_CHARS,
  patchAssistantContent,
  renameChatThread,
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
  looksLikeDeferredOrchestration,
  ORCHESTRATION_STALL_ERROR,
  resolveActiveSandboxSessionId,
  type InboxAgentStatus,
} from '../../../lib/chatInbox'
import { humanizeThrownError } from '../../../lib/apiError'
import {
  looksLikeDeferredSearchTurn,
  looksLikeDeferredToolUse,
  SEARCH_STALL_ERROR,
  TOOL_STALL_ERROR,
} from '../../../lib/chatSearchStall'
import { StreamingDeepseekChatTts } from '../../../lib/chatDeepseekVoice'
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
import { buildPlanBuildPrompt } from '../../../lib/chatComposerContext'
import { chatSpeakLang } from '../../../lib/chatVoice'
import {
  applyWorkspaceWireUpdate,
  ensureThreadWorkspace,
  maybeSeedArtifactsIntoWorkspace,
  patchThreadWorkspace,
  readHarnessFlag,
  workspaceWirePayload,
  writeHarnessFlag,
  type ChatWorkspace,
} from '../../../lib/chatWorkspace'
import { useYueStore } from '../../../lib/store'
import { convertChatMessage } from './convertChatMessage'

const BOOT_THREAD: ChatThread = {
  id: 'boot',
  title: 'New chat',
  updatedAt: 0,
  messages: [],
}

const THINK_KEY = CHAT_THINK_KEY
const SEARCH_KEY = CHAT_SEARCH_KEY
const RICH_LAYOUT_KEY = CHAT_RICH_LAYOUT_KEY
const STREAM_PAINT_MS = 100

export type PendingChatFile = ChatFileMeta & { previewUrl?: string }

const readFlag = readChatFlag
const writeFlag = writeChatFlag
const readPluginIds = readChatPluginIds
const writePluginIds = writeChatPluginIds

export type ChatAuiSession = {
  threads: ChatThread[]
  activeId: string
  historyReady: boolean
  busy: boolean
  error: string | null
  clearError: () => void
  setError: (message: string | null) => void
  deepThink: boolean
  setDeepThink: (on: boolean) => void
  searchOn: boolean
  setSearchOn: (on: boolean) => void
  /** Agent / Ask / Plan — persisted; DeepThink/Search stay capability toggles. */
  composerMode: ChatComposerMode
  setComposerMode: (mode: ChatComposerMode) => void
  /** Plan → Build: switch to Agent and enqueue Overseer-leaning handoff. */
  buildFromPlan: () => Promise<void>
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
  startNewChat: () => string
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
  const [error, setError] = useState<string | null>(null)
  const [streamingId, setStreamingId] = useState<string | null>(null)
  const [thinking, setThinking] = useState(false)
  const [searching, setSearching] = useState(false)
  const [deepThink, setDeepThinkState] = useState(() => readFlag(THINK_KEY, true))
  const [searchOn, setSearchOnState] = useState(() => readFlag(SEARCH_KEY, false))
  const [composerMode, setComposerModeState] = useState<ChatComposerMode>(() =>
    readChatComposerMode('agent'),
  )
  const composerModeRef = useRef(composerMode)
  composerModeRef.current = composerMode
  const [richLayout, setRichLayoutState] = useState(() => readFlag(RICH_LAYOUT_KEY, false))
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
  const harnessOnRef = useRef(harnessOn)
  harnessOnRef.current = harnessOn
  const busyRef = useRef(busy)
  busyRef.current = busy
  const [uploadingFile, setUploadingFile] = useState(false)
  const [ocrBusy, setOcrBusy] = useState(false)
  const [pluginCatalog, setPluginCatalog] = useState<DeepseekChatPlugin[]>([])
  const [enabledPlugins, setEnabledPlugins] = useState<string[]>(
    () => readPluginIds() || ['image'],
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

  const applyProjectActions = useCallback(
    (actions: Array<Record<string, unknown>>, projectId: string) => {
      const api = inboxRef.current
      if (!api || !projectId) return
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
          }
          continue
        }
        if (type === 'message_agent') {
          const agentId = String(raw.agentId || '').trim()
          const message = String(raw.message || '').trim()
          if (!agentId || !message) continue
          if (!api.state.agents.some((a) => a.id === agentId)) {
            api.spawnWorker(projectId, {
              id: agentId,
              title: `Worker · ${api.state.projects.find((p) => p.id === projectId)?.title || 'Project'}`,
              status: 'queued',
            })
          } else {
            api.updateAgentStatus(agentId, 'queued')
          }
          pendingProjectMsgsRef.current.push({ agentId, message, projectId })
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
        if (type === 'update_memory') {
          api.updateProjectMemory(projectId, String(raw.memory || ''))
        }
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

  const setDeepThink = useCallback((on: boolean) => {
    setDeepThinkState(on)
    writeFlag(THINK_KEY, on)
  }, [])

  const setSearchOn = useCallback((on: boolean) => {
    setSearchOnState(on)
    writeFlag(SEARCH_KEY, on)
  }, [])

  const setComposerMode = useCallback((mode: ChatComposerMode) => {
    // Mode switch must not touch live mic / dictate — prefs only.
    // Sync ref immediately so Build → Agent handoff uses Agent tools on this turn.
    composerModeRef.current = mode
    setComposerModeState(mode)
    writeChatComposerMode(mode)
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
    writeFlag(RICH_LAYOUT_KEY, on)
  }, [])

  const togglePlugin = useCallback((id: string) => {
    setEnabledPlugins((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id].slice(0, 16)
      writePluginIds(next)
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

  const startNewChat = useCallback(() => {
    stopGeneration()
    setFollowUpQueue([])
    followUpQueueRef.current = []
    const created = emptyThread()
    setThreads((prev) => upsertChatThread(created, prev.filter((t) => t.id !== BOOT_THREAD.id)))
    setActiveId(created.id)
    setError(null)
    return created.id
  }, [stopGeneration])

  const selectThread = useCallback(
    (id: string) => {
      if (id === activeIdRef.current) return
      stopGeneration()
      // Follow-ups are thread-local intent — never auto-send into a different chat.
      setFollowUpQueue([])
      followUpQueueRef.current = []
      setActiveId(id)
      setError(null)
    },
    [stopGeneration],
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
          return [created, ...next]
        }
        if (activeIdRef.current === id) {
          setActiveId(live[0]!.id)
          activeIdRef.current = live[0]!.id
        }
        return next
      })
    },
    [stopGeneration],
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
            return [created, ...next]
          }
          if (activeIdRef.current === id) {
            setActiveId(live[0]!.id)
            activeIdRef.current = live[0]!.id
          }
        }
        return next
      })
    },
    [],
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

      let projectActionsThisTurn = 0
      let overseerTurn = false
      try {
        const wireMessages = apiMessagesFromThread(thread).filter((m) => m.content.trim())
        const inboxState = inboxRef.current?.state
        const linkedAgent = inboxState ? agentForThread(inboxState, thread.id) : undefined
        const inboxRole =
          linkedAgent?.role === 'overseer' || linkedAgent?.role === 'worker'
            ? linkedAgent.role
            : undefined
        const projectMemory = linkedAgent?.projectId
          ? inboxState?.projects.find((p) => p.id === linkedAgent.projectId)?.memory
          : undefined
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
        await streamDeepseekChat(wireMessages, {
          thinking: deepThink,
          search: searchOn,
          harness: harnessOnRef.current,
          chatMode: composerModeRef.current,
          workspace: harnessOnRef.current
            ? workspaceWirePayload(thread.workspace)
            : undefined,
          fileIds,
          plugins: enabledPluginsRef.current,
          primaryLang: primaryLanguage,
          inboxRole,
          projectMemory,
          sandboxSessionId,
          projectId,
          projectAgents,
          signal: controller.signal,
          onWorkspace: (files) => {
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
          onStatus: (status) => {
            if (status === 'searching') {
              setSearching(true)
              return
            }
            markThinking()
          },
          onReasoning: (delta) => {
            markThinking()
            reasoning += delta
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
            assembled = text.slice(0, MAX_CONTENT_CHARS)
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
            if (assembled.length > MAX_CONTENT_CHARS) {
              assembled = assembled.slice(0, MAX_CONTENT_CHARS)
            }
            liveTts?.feed(delta)
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
          if (!assembled.trim()) thread = dropEmpty(thread)
          persist(thread)
        } else {
          setError(humanizeThrownError(err))
          thread = {
            ...thread,
            messages: thread.messages.filter((m) => m.id !== assistantId || m.content.trim()),
          }
          persist(thread)
        }
      } finally {
        if (paintTimer != null) window.clearTimeout(paintTimer)
        setStreamingId(null)
        setThinking(false)
        setSearching(false)
        setBusy(false)
        abortRef.current = null
        if (streamTtsRef.current === liveTts) streamTtsRef.current = null
        const inboxState = inboxRef.current?.state
        const linkedAgent = inboxState ? agentForThread(inboxState, thread.id) : undefined
        if (linkedAgent && inboxRef.current) {
          const hasPendingWorkers = pendingProjectMsgsRef.current.some(
            (p) =>
              p.projectId === linkedAgent.projectId ||
              (linkedAgent.role === 'overseer' && Boolean(p.agentId)),
          )
          // Keep Overseer Working while worker prompts are queued; otherwise Needs Attention.
          // Workers always surface under Needs Attention when their turn ends.
          let nextStatus: InboxAgentStatus =
            linkedAgent.role === 'worker' || linkedAgent.role === 'overseer'
              ? 'needs_attention'
              : 'idle'
          if (linkedAgent.role === 'overseer' && hasPendingWorkers) {
            nextStatus = 'working'
          }
          inboxRef.current.updateAgentStatus(linkedAgent.id, nextStatus)
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
      const tid = threadId || activeIdRef.current
      if (tid !== activeIdRef.current) {
        setActiveId(tid)
        activeIdRef.current = tid
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
    [persist, runAssistant, unlocked],
  )

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

  const buildFromPlan = useCallback(async () => {
    // Keep Plan selected while a reply is in flight — never silent-switch to Agent.
    if (!unlocked) return
    if (busyRef.current) {
      setError('Wait for the current reply to finish, then Build.')
      return
    }
    const tid = activeIdRef.current
    const thread = threadsRef.current.find((t) => t.id === tid)
    const lastAssistant = [...(thread?.messages || [])]
      .reverse()
      .find((m) => m.role === 'assistant' && m.content.trim())
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
    setComposerMode('agent')
    const prompt = buildPlanBuildPrompt(lastAssistant?.content || '', inProject)
    await enqueuePrompt(prompt, targetThreadId)
  }, [enqueuePrompt, setComposerMode, unlocked])

  // Flush Overseer project_message / create_agent messages sequentially, then return to Overseer.
  useEffect(() => {
    if (!unlocked || busy || flushingProjectMsgsRef.current) return
    if (!pendingProjectMsgsRef.current.length) return
    flushingProjectMsgsRef.current = true
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
      }
    })()
  }, [busy, createSilentThread, enqueuePrompt, selectThread, unlocked])

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
    [persist, queueFollowUp, runAssistant, unlocked],
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

  const session = useMemo<ChatAuiSession>(
    () => ({
      threads: threads.filter((t) => t.id !== BOOT_THREAD.id),
      activeId,
      historyReady,
      busy,
      error,
      clearError: () => setError(null),
      setError,
      deepThink,
      setDeepThink,
      searchOn,
      setSearchOn,
      composerMode,
      setComposerMode,
      buildFromPlan,
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
      followUpQueue: followUpQueue.filter((x) => x.threadId === activeId),
      queueFollowUp,
      dismissFollowUp,
      clearFollowUpQueue,
      reviewActivity,
      reviewOpen,
      setReviewOpen,
      refreshGitDiff,
      gitDiffBusy,
    }),
    [
      activeId,
      activeWorkspace,
      addSchedule,
      archiveThread,
      buildFromPlan,
      busy,
      clearFollowUpQueue,
      composerMode,
      deepThink,
      dismissFollowUp,
      enabledPlugins,
      enqueuePrompt,
      error,
      followUpQueue,
      gitDiffBusy,
      harnessOn,
      historyReady,
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
      selectThread,
      setActiveWorkspace,
      setComposerMode,
      setDeepThink,
      setHarnessOn,
      setRichLayout,
      setSearchOn,
      startNewChat,
      stopGeneration,
      streamingId,
      thinking,
      threadScheduleJobs,
      threads,
      togglePlugin,
      toggleSchedule,
      uploadingFile,
      workspaceOpen,
    ],
  )

  return (
    <ChatAuiSessionContext.Provider value={session}>
      <AssistantRuntimeProvider runtime={runtime}>{children}</AssistantRuntimeProvider>
    </ChatAuiSessionContext.Provider>
  )
}
