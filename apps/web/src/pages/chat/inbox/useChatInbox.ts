import { useCallback, useEffect, useRef, useState } from 'react'
import { CHAT_CLOUD_HYDRATE_EVENT } from '../../../lib/chatCloudSync'
import {
  attachThreadToProject,
  createProject,
  createWorker,
  setAgentCompactSummary,
  createWorkspace,
  deleteProject,
  deleteWorkspace,
  detachThreadFromProject,
  emptyInboxState,
  linkChatToProject,
  loadChatInbox,
  saveChatInbox,
  markAgentInReview,
  markProjectCloudSynced,
  renameProject,
  renameWorkspace,
  setAgentStatus,
  setAgentThread,
  setProjectDefaultWorkspace,
  setProjectMemory,
  setWorkspaceRef,
  touchWorkspace,
  type ChatInboxAgent,
  type ChatInboxProject,
  type ChatInboxState,
  type ChatInboxWorkspace,
  type ChatInboxWorkspaceKind,
  type InboxAgentStatus,
} from '../../../lib/chatInbox'

export function useChatInbox() {
  const [state, setState] = useState<ChatInboxState>(() => emptyInboxState())
  const [ready, setReady] = useState(false)
  const persistTimer = useRef<number | null>(null)
  const stateRef = useRef(state)
  stateRef.current = state

  useEffect(() => {
    let cancelled = false
    void loadChatInbox().then((loaded) => {
      if (cancelled) return
      setState(loaded)
      stateRef.current = loaded
      setReady(true)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const commit = useCallback((next: ChatInboxState) => {
    stateRef.current = next
    setState(next)
    if (persistTimer.current != null) window.clearTimeout(persistTimer.current)
    persistTimer.current = window.setTimeout(() => {
      void saveChatInbox(next)
    }, 180)
  }, [])

  // Cloud hydrate writes IDB directly — mirror into React without a second disk write.
  useEffect(() => {
    const onHydrate = (e: Event) => {
      const detail = (e as CustomEvent<{ inbox?: ChatInboxState }>).detail
      if (!detail?.inbox) return
      stateRef.current = detail.inbox
      setState(detail.inbox)
    }
    window.addEventListener(CHAT_CLOUD_HYDRATE_EVENT, onHydrate)
    return () => window.removeEventListener(CHAT_CLOUD_HYDRATE_EVENT, onHydrate)
  }, [])

  useEffect(() => {
    return () => {
      if (persistTimer.current != null) window.clearTimeout(persistTimer.current)
    }
  }, [])

  const addProject = useCallback(
    (
      title?: string,
      threadId?: string,
    ): { project: ChatInboxProject; overseer: ChatInboxAgent } => {
      let { state: next, project, overseer } = createProject(stateRef.current, title)
      if (threadId) {
        next = attachThreadToProject(next, project.id, threadId)
        next = setAgentThread(next, overseer.id, threadId)
      }
      project = next.projects.find((p) => p.id === project.id) || project
      overseer = next.agents.find((a) => a.id === overseer.id) || overseer
      commit(next)
      return { project, overseer }
    },
    [commit],
  )

  const removeProject = useCallback(
    (projectId: string) => {
      commit(deleteProject(stateRef.current, projectId))
    },
    [commit],
  )

  const renameProjectTitle = useCallback(
    (projectId: string, title: string) => {
      commit(renameProject(stateRef.current, projectId, title))
    },
    [commit],
  )

  const linkThread = useCallback(
    (projectId: string, threadId: string) => {
      commit(linkChatToProject(stateRef.current, projectId, threadId))
    },
    [commit],
  )

  const unlinkThread = useCallback(
    (threadId: string) => {
      commit(detachThreadFromProject(stateRef.current, threadId))
    },
    [commit],
  )

  const addWorkspace = useCallback(
    (
      kind: ChatInboxWorkspaceKind,
      title?: string,
      projectId?: string,
    ): ChatInboxWorkspace => {
      const { state: next, workspace } = createWorkspace(
        stateRef.current,
        kind,
        title,
        projectId,
      )
      commit(next)
      return workspace
    },
    [commit],
  )

  const removeWorkspace = useCallback(
    (workspaceId: string) => {
      commit(deleteWorkspace(stateRef.current, workspaceId))
    },
    [commit],
  )

  const bindWorkspaceRef = useCallback(
    (workspaceId: string, ref: string, projectId?: string, title?: string) => {
      let next = setWorkspaceRef(stateRef.current, workspaceId, ref)
      if (title?.trim()) next = renameWorkspace(next, workspaceId, title.trim())
      if (projectId) next = setProjectDefaultWorkspace(next, projectId, workspaceId)
      commit(next)
    },
    [commit],
  )

  const renameWorkspaceTitle = useCallback(
    (workspaceId: string, title: string) => {
      commit(renameWorkspace(stateRef.current, workspaceId, title))
    },
    [commit],
  )

  const touchWorkspaceAccess = useCallback(
    (workspaceId: string) => {
      commit(touchWorkspace(stateRef.current, workspaceId))
    },
    [commit],
  )

  const spawnWorker = useCallback(
    (
      projectId: string,
      opts?: { id?: string; title?: string; threadId?: string; status?: InboxAgentStatus },
    ): ChatInboxAgent => {
      const { state: next, worker } = createWorker(stateRef.current, projectId, opts)
      commit(next)
      return worker
    },
    [commit],
  )

  const bindAgentThread = useCallback(
    (agentId: string, threadId: string) => {
      commit(setAgentThread(stateRef.current, agentId, threadId))
    },
    [commit],
  )

  const updateAgentStatus = useCallback(
    (agentId: string, status: InboxAgentStatus, reviewUrl?: string) => {
      commit(setAgentStatus(stateRef.current, agentId, status, reviewUrl))
    },
    [commit],
  )

  const markInReview = useCallback(
    (agentId: string, reviewUrl: string) => {
      commit(markAgentInReview(stateRef.current, agentId, reviewUrl))
    },
    [commit],
  )

  const updateProjectMemory = useCallback(
    (projectId: string, memory: string) => {
      commit(setProjectMemory(stateRef.current, projectId, memory))
    },
    [commit],
  )

  const compactAgent = useCallback(
    (agentId: string, summary: string, status?: 'done' | 'canceled') => {
      commit(setAgentCompactSummary(stateRef.current, agentId, summary, status))
    },
    [commit],
  )

  /** Replace inbox state (cloud hydrate / move stamp). */
  const replaceState = useCallback(
    (next: ChatInboxState) => {
      commit(next)
    },
    [commit],
  )

  const stampProjectCloud = useCallback(
    (projectId: string, opts?: { cloudId?: string; cloudSyncedAt?: number }) => {
      commit(markProjectCloudSynced(stateRef.current, projectId, opts))
    },
    [commit],
  )

  return {
    ready,
    state,
    addProject,
    removeProject,
    renameProjectTitle,
    linkThread,
    unlinkThread,
    addWorkspace,
    removeWorkspace,
    bindWorkspaceRef,
    renameWorkspaceTitle,
    touchWorkspaceAccess,
    spawnWorker,
    bindAgentThread,
    updateAgentStatus,
    markInReview,
    updateProjectMemory,
    compactAgent,
    replaceState,
    stampProjectCloud,
  }
}
