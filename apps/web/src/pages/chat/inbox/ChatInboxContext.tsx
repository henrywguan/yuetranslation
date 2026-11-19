import { createContext, useContext, type ReactNode } from 'react'
import { useChatInbox } from './useChatInbox'

type ChatInboxApi = ReturnType<typeof useChatInbox>

const ChatInboxContext = createContext<ChatInboxApi | null>(null)

export function ChatInboxProvider({ children }: { children: ReactNode }) {
  const api = useChatInbox()
  return <ChatInboxContext.Provider value={api}>{children}</ChatInboxContext.Provider>
}

export function useChatInboxContext(): ChatInboxApi {
  const ctx = useContext(ChatInboxContext)
  if (!ctx) throw new Error('useChatInboxContext requires ChatInboxProvider')
  return ctx
}

/** Optional — Runtime may run before provider in tests; returns null then. */
export function useChatInboxContextOptional(): ChatInboxApi | null {
  return useContext(ChatInboxContext)
}
