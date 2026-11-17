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
  fetchDeepseekChatPlugins,
  ocrDeepseekChatFile,
  streamDeepseekChat,
  uploadDeepseekChatFile,
  type DeepseekChatPlugin,
  type DeepseekChatPluginKeyHint,
  type DeepseekChatPluginKeyId,
} from '../../../lib/api'
import {
  apiMessagesFromThread,
  appendChatMessage,
  deleteChatThread,
  emptyThread,
  hydrateChatThreadsAsync,
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
import { StreamingDeepseekChatTts } from '../../../lib/chatDeepseekVoice'
import { chatSpeakLang } from '../../../lib/chatVoice'
import { useYueStore } from '../../../lib/store'
import { convertChatMessage } from './convertChatMessage'

const BOOT_THREAD: ChatThread = {
  id: 'boot',
  title: 'New chat',
  updatedAt: 0,
  messages: [],
}

const THINK_KEY = 'yue-deepseek-chat-deepthink-v1'
const SEARCH_KEY = 'yue-deepseek-chat-search-v1'
const RICH_LAYOUT_KEY = 'yue-deepseek-chat-rich-layout-v1'
const PLUGINS_KEY = 'yue-deepseek-chat-plugins-v1'
const LIVE_REASONING_KEEP = 24_000
const STREAM_PAINT_MS = 80

export type PendingChatFile = ChatFileMeta & { previewUrl?: string }

function readFlag(key: string, fallback: boolean): boolean {
  try {
    const v = localStorage.getItem(key)
    if (v === '0') return false
    if (v === '1') return true
  } catch {
    /* ignore */
  }
  return fallback
}

function writeFlag(key: string, on: boolean) {
  try {
    localStorage.setItem(key, on ? '1' : '0')
  } catch {
    /* ignore */
  }
}

function readPluginIds(): string[] | null {
  try {
    const raw = localStorage.getItem(PLUGINS_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return null
    return parsed.map(String).filter(Boolean).slice(0, 16)
  } catch {
    return null
  }
}

function writePluginIds(ids: string[]) {
  try {
    localStorage.setItem(PLUGINS_KEY, JSON.stringify(ids.slice(0, 16)))
  } catch {
    /* ignore */
  }
}

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
  richLayout: boolean
  setRichLayout: (on: boolean) => void
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
  startNewChat: () => void
  selectThread: (id: string) => void
  removeThread: (id: string) => void
  archiveThread: (id: string, archived: boolean) => void
  stopGeneration: () => void
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
  const [richLayout, setRichLayoutState] = useState(() => readFlag(RICH_LAYOUT_KEY, false))
  const [pendingFiles, setPendingFiles] = useState<PendingChatFile[]>([])
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

  const autoSpeak = useYueStore((s) => s.autoSpeak)
  const speakManual = useYueStore((s) => s.speakManual)
  const primaryLanguage = useYueStore((s) => s.primaryLanguage)
  const entitlement = useYueStore((s) => s.entitlement)
  const canAutoSpeak = Boolean(entitlement?.allowed.autoSpeak)

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
    const created = emptyThread()
    setThreads((prev) => upsertChatThread(created, prev.filter((t) => t.id !== BOOT_THREAD.id)))
    setActiveId(created.id)
    setError(null)
  }, [stopGeneration])

  const selectThread = useCallback(
    (id: string) => {
      if (id === activeIdRef.current) return
      stopGeneration()
      setActiveId(id)
      setError(null)
    },
    [stopGeneration],
  )

  const removeThread = useCallback(
    (id: string) => {
      stopGeneration()
      setThreads((prev) => {
        const next = deleteChatThread(id, prev.filter((t) => t.id !== BOOT_THREAD.id))
        if (!next.length) {
          const created = emptyThread()
          setActiveId(created.id)
          return [created]
        }
        if (activeIdRef.current === id) setActiveId(next[0]!.id)
        return next
      })
    },
    [stopGeneration],
  )

  const archiveThread = useCallback((id: string, archived: boolean) => {
    setThreads((prev) => {
      const cur = prev.find((t) => t.id === id)
      if (!cur) return prev
      return upsertChatThread(setChatThreadArchived(cur, archived), prev)
    })
  }, [])

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

      try {
        const wireMessages = apiMessagesFromThread(thread).filter((m) => m.content.trim())
        await streamDeepseekChat(wireMessages, {
          thinking: deepThink,
          search: searchOn,
          fileIds,
          plugins: enabledPluginsRef.current,
          primaryLang: primaryLanguage,
          signal: controller.signal,
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
          persist(thread)
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
          const message = err instanceof Error ? err.message : 'Chat failed'
          setError(message)
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
      }
    },
    [
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

  const onNew = useCallback(
    async (message: AppendMessage) => {
      if (!unlocked || busy) return
      const textPart = message.content.find((p) => p.type === 'text')
      const content = (textPart && textPart.type === 'text' ? textPart.text : '').trim()
      const pending = pendingFilesRef.current
      if (!content && !pending.length) return
      if (content.length > MAX_CONTENT_CHARS) {
        setError(`Message is too long (max ${MAX_CONTENT_CHARS.toLocaleString()} characters).`)
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
      setBusy(true)
      const cur =
        threadsRef.current.find((t) => t.id === activeIdRef.current) || emptyThread()
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
    [busy, persist, runAssistant, unlocked],
  )

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
      richLayout,
      setRichLayout,
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
    }),
    [
      activeId,
      archiveThread,
      busy,
      deepThink,
      enabledPlugins,
      error,
      historyReady,
      ocrBusy,
      pendingFiles,
      pickFile,
      pickOcr,
      pluginCatalog,
      pluginKeyHints,
      refreshPlugins,
      removePendingFile,
      removeThread,
      richLayout,
      searchOn,
      searching,
      selectThread,
      setDeepThink,
      setRichLayout,
      setSearchOn,
      startNewChat,
      stopGeneration,
      streamingId,
      thinking,
      threads,
      togglePlugin,
      uploadingFile,
    ],
  )

  return (
    <ChatAuiSessionContext.Provider value={session}>
      <AssistantRuntimeProvider runtime={runtime}>{children}</AssistantRuntimeProvider>
    </ChatAuiSessionContext.Provider>
  )
}
