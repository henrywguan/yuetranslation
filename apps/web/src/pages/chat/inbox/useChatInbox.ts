import { useCallback, useEffect, useRef, useState } from 'react'
import {
  attachThreadToProject,
  createProject,
  createWorker,
  createWorkspace,
  deleteProject,
  deleteWorkspace,
  emptyInboxState,
  loadChatInbox,
  saveChatInbox,
  setAgentStatus,
  setAgentThread,
  setProjectMemory,
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

  useEffect(() => {
    return () => {
      if (persistTimer.current != null) window.clearTimeout(persistTimer.current)
    }
  }, [])

  const addProject = useCallback(
    (title?: string, threadId?: string): ChatInboxProject => {
      let { state: next, project, overseer } = createProject(stateRef.current, title)
      if (threadId) {
        next = attachThreadToProject(next, project.id, threadId)
        next = setAgentThread(next, overseer.id, threadId)
      }
      project = next.projects.find((p) => p.id === project.id) || project
      commit(next)
      return project
    },
    [commit],
  )

  const removeProject = useCallback(
    (projectId: string) => {
      commit(deleteProject(stateRef.current, projectId))
    },
    [commit],
  )

  const linkThread = useCallback(
    (projectId: string, threadId: string) => {
      commit(attachThreadToProject(stateRef.current, projectId, threadId))
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

  const spawnWorker = useCallback(
    (projectId: string, opts?: { title?: string; threadId?: string }): ChatInboxAgent => {
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
    (agentId: string, status: InboxAgentStatus) => {
      commit(setAgentStatus(stateRef.current, agentId, status))
    },
    [commit],
  )

  const updateProjectMemory = useCallback(
    (projectId: string, memory: string) => {
      commit(setProjectMemory(stateRef.current, projectId, memory))
    },
    [commit],
  )

  return {
    ready,
    state,
    addProject,
    removeProject,
    linkThread,
    addWorkspace,
    removeWorkspace,
    spawnWorker,
    bindAgentThread,
    updateAgentStatus,
    updateProjectMemory,
  }
}
