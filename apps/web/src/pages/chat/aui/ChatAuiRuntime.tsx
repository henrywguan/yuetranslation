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
import { streamDeepseekChat } from '../../../lib/api'
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
const LIVE_REASONING_KEEP = 24_000
const STREAM_PAINT_MS = 80

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

export type ChatAuiSession = {
  threads: ChatThread[]
  activeId: string
  historyReady: boolean
  busy: boolean
  error: string | null
  clearError: () => void
  deepThink: boolean
  setDeepThink: (on: boolean) => void
  searchOn: boolean
  setSearchOn: (on: boolean) => void
  thinking: boolean
  searching: boolean
  streamingId: string | null
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

  const abortRef = useRef<AbortController | null>(null)
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
    async (baseThread: ChatThread) => {
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
      if (!content) return
      if (content.length > MAX_CONTENT_CHARS) {
        setError(`Message is too long (max ${MAX_CONTENT_CHARS.toLocaleString()} characters).`)
        return
      }
      setError(null)
      setBusy(true)
      const cur =
        threadsRef.current.find((t) => t.id === activeIdRef.current) || emptyThread()
      const { thread } = appendChatMessage(cur, 'user', content)
      persist(thread)
      await runAssistant(thread)
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
      deepThink,
      setDeepThink,
      searchOn,
      setSearchOn,
      thinking,
      searching,
      streamingId,
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
      error,
      historyReady,
      removeThread,
      searchOn,
      searching,
      selectThread,
      setDeepThink,
      setSearchOn,
      startNewChat,
      stopGeneration,
      streamingId,
      thinking,
      threads,
    ],
  )

  return (
    <ChatAuiSessionContext.Provider value={session}>
      <AssistantRuntimeProvider runtime={runtime}>{children}</AssistantRuntimeProvider>
    </ChatAuiSessionContext.Provider>
  )
}
