import { useCallback, useEffect, useRef, useState } from 'react'
import {
  attachThreadToProject,
  createProject,
  createWorkspace,
  deleteProject,
  deleteWorkspace,
  emptyInboxState,
  loadChatInbox,
  saveChatInbox,
  type ChatInboxProject,
  type ChatInboxState,
  type ChatInboxWorkspace,
  type ChatInboxWorkspaceKind,
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
      let { state: next, project } = createProject(stateRef.current, title)
      if (threadId) next = attachThreadToProject(next, project.id, threadId)
      // Refresh project snapshot after attach.
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

  return {
    ready,
    state,
    addProject,
    removeProject,
    linkThread,
    addWorkspace,
    removeWorkspace,
  }
}
